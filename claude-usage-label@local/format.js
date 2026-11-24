/* Validação e formatação da resposta do servidor (F-002, R-04). A resposta é
 * não confiável: só números finitos viram porcentagem (limitada a 0-100) e só
 * strings entram em remaining(). Sem dependências do GNOME Shell, para poder
 * ser testada com gjs. */
const { GLib } = imports.gi;

function remaining(iso) {
    if (typeof iso !== 'string' || !iso)
        return '';
    const dt = GLib.DateTime.new_from_iso8601(iso, null);
    if (!dt)
        return '';
    let secs = dt.to_unix() - GLib.DateTime.new_now_utc().to_unix();
    if (secs <= 0)
        return 'agora';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0)
        return `${d}d ${h}h`;
    if (h > 0)
        return `${h}h ${m}m`;
    return `${m}m`;
}

// Número finito limitado a 0-100; qualquer outra coisa vira null.
function pct(v) {
    return typeof v === 'number' && Number.isFinite(v)
        ? Math.min(100, Math.max(0, Math.round(v)))
        : null;
}

function obj(v) {
    return v !== null && typeof v === 'object' ? v : {};
}

function line(prefix, p, resetsAt) {
    const r = remaining(resetsAt);
    return `${prefix}: ${p === null ? '?' : p}%${r ? `  (reinicia em ${r})` : ''}`;
}

// Monta todos os textos antes de a interface ser tocada: se algo lançar, rótulo
// e menu continuam coerentes. `peak` é o maior valor válido (null se nenhum).
function buildView(data) {
    const five = obj(obj(data).five_hour);
    const week = obj(obj(data).seven_day);
    const p5 = pct(five.utilization);
    const p7 = pct(week.utilization);
    const valid = [p5, p7].filter(p => p !== null);
    return {
        label: `5h ${p5 === null ? '?' : p5}% · 7d ${p7 === null ? '?' : p7}%`,
        five: line('Janela de 5h', p5, five.resets_at),
        week: line('Semana', p7, week.resets_at),
        peak: valid.length ? Math.max(...valid) : null,
    };
}
