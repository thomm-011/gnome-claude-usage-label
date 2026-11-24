/* Teste do achado F-001. Rodar: gjs tests/guard-test.js
 * Simula 10 ativações de "Atualizar agora" com uma sessão falsa que conta
 * chamadas a queue_message. */
imports.searchPath.unshift('claude-usage-label@local');
const { RefreshGuard, pauseSeconds, MIN_INTERVAL } = imports.guard;

let failed = 0;
function check(name, cond) {
    print(`${cond ? 'ok  ' : 'FALHA'} ${name}`);
    if (!cond)
        failed++;
}

// Sessão falsa: guarda os callbacks para completar a requisição depois.
class FakeSession {
    constructor() { this.calls = 0; this.pending = []; }
    queue_message(_m, cb) { this.calls++; this.pending.push(cb); }
}

function refresh(guard, session, now) {
    if (!guard.tryStart(now))
        return;
    session.queue_message({}, () => {});
}

// 1. Rajada de 10 ativações com requisição em andamento: 1 só consulta.
{
    const g = new RefreshGuard(), s = new FakeSession();
    for (let i = 0; i < 10; i++)
        refresh(g, s, 1000 + i * 0.1);
    check('10 ativações seguidas geram 1 requisição', s.calls === 1);
}

// 2. Terminada a requisição, ainda dentro do intervalo mínimo: nada novo.
{
    const g = new RefreshGuard(), s = new FakeSession();
    refresh(g, s, 1000);
    g.finish();
    refresh(g, s, 1000 + MIN_INTERVAL - 1);
    check('dentro de 30 s da última consulta não consulta', s.calls === 1);
    refresh(g, s, 1000 + MIN_INTERVAL);
    check('após 30 s consulta de novo', s.calls === 2);
}

// 3. 429: nenhuma requisição antes de pauseUntil.
{
    const g = new RefreshGuard(), s = new FakeSession();
    refresh(g, s, 1000);
    g.finish();
    g.pause(1000, 600);
    refresh(g, s, 1000 + 599);
    check('429 pausa por 600 s (padrão)', s.calls === 1);
    refresh(g, s, 1000 + 600);
    check('após a pausa volta a consultar', s.calls === 2);
}

// 4. Retry-After limitado a 300-3600 s, padrão 600.
check('Retry-After ausente -> 600', pauseSeconds(null) === 600);
check('Retry-After lixo -> 600', pauseSeconds('abc') === 600);
check('Retry-After 5 -> 300', pauseSeconds('5') === 300);
check('Retry-After 99999 -> 3600', pauseSeconds('99999') === 3600);
check('Retry-After 900 -> 900', pauseSeconds('900') === 900);

if (failed > 0) {
    print(`${failed} falha(s)`);
    imports.system.exit(1);
}
print('todos passaram');
