/* Teste do achado F-002. Rodar: gjs tests/format-test.js
 * Alimenta pct() e buildView() com valores hostis do servidor. */
imports.searchPath.unshift('claude-usage-label@local');
const { pct, buildView } = imports.format;

let failed = 0;
function check(name, cond) {
    print(`${cond ? 'ok  ' : 'FALHA'} ${name}`);
    if (!cond)
        failed++;
}

// pct: só número finito, limitado a 0-100.
check('pct(50) = 50', pct(50) === 50);
check('pct(12.6) = 13', pct(12.6) === 13);
check("pct('50') = null", pct('50') === null);
check('pct({}) = null', pct({}) === null);
check('pct(-5) = 0', pct(-5) === 0);
check('pct(1e21) = 100', pct(1e21) === 100);
check('pct(NaN) = null', pct(NaN) === null);
check('pct(Infinity) = null', pct(Infinity) === null);
check('pct(null) = null', pct(null) === null);
check('pct(undefined) = null', pct(undefined) === null);

const bad = /NaN|-\d|e\+|\[object|undefined|\d{4,}/;
const hostile = [
    { five_hour: { utilization: '50' }, seven_day: { utilization: {} } },
    { five_hour: { utilization: -5 }, seven_day: { utilization: 1e21 } },
    { five_hour: { utilization: NaN }, seven_day: { utilization: null } },
    { five_hour: { utilization: 10, resets_at: 123 }, seven_day: { utilization: 20, resets_at: {} } },
    { five_hour: null, seven_day: 'x' },
    {},
];
for (const d of hostile) {
    let v = null, threw = false;
    try { v = buildView(d); } catch (e) { threw = true; }
    check(`não lança: ${JSON.stringify(d)}`, !threw);
    if (v) {
        const all = [v.label, v.five, v.week].join('|');
        check(`texto limpo: ${all}`, !bad.test(all));
    }
}

// Valor ausente/inválido mostra '?', sem cor de alerta.
{
    const v = buildView({ five_hour: { utilization: 'x' }, seven_day: { utilization: 20 } });
    check("inválido vira '?'", v.label === '5h ?% · 7d 20%' && v.five.startsWith('Janela de 5h: ?'));
    check('sem alerta com valor inválido', v.peak === 20);
}

// Caso normal.
{
    const v = buildView({ five_hour: { utilization: 8 }, seven_day: { utilization: 93.4 } });
    check('caso normal', v.label === '5h 8% · 7d 93%' && v.peak === 93);
}

if (failed > 0) {
    print(`${failed} falha(s)`);
    imports.system.exit(1);
}
print('todos passaram');
