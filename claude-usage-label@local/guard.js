/* Guarda de consultas (F-001): impede rajadas e requisições concorrentes e
 * respeita a pausa depois de um 429. Sem dependências do GNOME Shell, para
 * poder ser testada com gjs. Tempos em segundos (relógio monotônico). */
var MIN_INTERVAL = 30;
var DEFAULT_PAUSE = 600;
var MIN_PAUSE = 300;
var MAX_PAUSE = 3600;

var RefreshGuard = class RefreshGuard {
    constructor() {
        this._inflight = false;
        this._lastQuery = null;
        this._pauseUntil = 0;
    }

    // Devolve true (e marca em andamento) se pode consultar agora.
    tryStart(now) {
        if (this._inflight || now < this._pauseUntil)
            return false;
        if (this._lastQuery !== null && now - this._lastQuery < MIN_INTERVAL)
            return false;
        this._inflight = true;
        this._lastQuery = now;
        return true;
    }

    finish() {
        this._inflight = false;
    }

    pause(now, seconds) {
        this._pauseUntil = now + seconds;
    }
};

// Retry-After (segundos) limitado a 300-3600; ausente ou inválido = 600.
function pauseSeconds(retryAfter) {
    const n = parseInt(retryAfter, 10);
    if (!Number.isFinite(n))
        return DEFAULT_PAUSE;
    return Math.min(MAX_PAUSE, Math.max(MIN_PAUSE, n));
}
