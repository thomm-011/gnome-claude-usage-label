/* Claude Usage Label — GNOME Shell 42
 *
 * Mostra "5h 8% · 7d 3%" na barra superior.
 * - Consulta GET https://api.anthropic.com/api/oauth/usage (somente leitura,
 *   não executa modelo, não consome tokens).
 * - Apenas LÊ ~/.claude/.credentials.json. Nunca renova o token nem escreve
 *   no arquivo: quem renova é o Claude Code quando você o usa.
 */
const { GObject, St, GLib, Gio, Clutter } = imports.gi;
imports.gi.versions.Soup = '2.4';
const Soup = imports.gi.Soup;
const ByteArray = imports.byteArray;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const INTERVAL_SECONDS = 300;
const WARN = 75;
const CRIT = 90;

function readToken() {
    const path = GLib.build_filenamev([GLib.get_home_dir(), '.claude', '.credentials.json']);
    try {
        const [ok, bytes] = GLib.file_get_contents(path);
        if (!ok)
            return { error: 'sem credenciais' };
        const oauth = JSON.parse(ByteArray.toString(bytes)).claudeAiOauth;
        if (!oauth || !oauth.accessToken)
            return { error: 'sem token' };
        if (oauth.expiresAt && oauth.expiresAt < Date.now())
            return { error: 'token expirado' };
        return { token: oauth.accessToken };
    } catch (e) {
        return { error: 'sem credenciais' };
    }
}

function remaining(iso) {
    if (!iso)
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

function colorFor(pct) {
    if (pct >= CRIT)
        return '#ff5555';
    if (pct >= WARN)
        return '#f0b429';
    return '';
}

const Indicator = GObject.registerClass(
class ClaudeUsageIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Claude Usage Label', false);
        this._destroyed = false;

        this._label = new St.Label({
            text: 'Claude …',
            y_align: Clutter.ActorAlign.CENTER,
        });
        // Optional icon: drop any icon.svg next to this file to customise it.
        const box = new St.BoxLayout();
        const iconFile = Gio.File.new_for_path(GLib.build_filenamev([Me.path, 'icon.svg']));
        if (iconFile.query_exists(null)) {
            box.add_child(new St.Icon({
                gicon: new Gio.FileIcon({ file: iconFile }),
                icon_size: 16,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'margin-right: 6px;',
            }));
        }
        box.add_child(this._label);
        this.add_child(box);

        this._fiveItem = new PopupMenu.PopupMenuItem('Janela de 5h: …', { reactive: false });
        this._weekItem = new PopupMenu.PopupMenuItem('Semana: …', { reactive: false });
        this._checkItem = new PopupMenu.PopupMenuItem('Última consulta: —', { reactive: false });
        this._refreshItem = new PopupMenu.PopupMenuItem('Atualizar agora');
        this._refreshItem.connect('activate', () => this._refresh());

        this.menu.addMenuItem(this._fiveItem);
        this.menu.addMenuItem(this._weekItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._checkItem);
        this.menu.addMenuItem(this._refreshItem);

        this._session = new Soup.SessionAsync();
        this._session.timeout = 15;

        this._refresh();
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, INTERVAL_SECONDS, () => {
            this._refresh();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _setError(text) {
        this._label.set_text(`Claude: ${text}`);
        this._label.style = 'color: #888888;';
        this._checkItem.label.set_text(`Última consulta: ${text}`);
    }

    _refresh() {
        if (this._destroyed)
            return;

        const { token, error } = readToken();
        if (error) {
            this._setError(error === 'token expirado' ? 'abra o Claude Code' : error);
            return;
        }

        const message = Soup.Message.new('GET', USAGE_URL);
        message.request_headers.append('Authorization', `Bearer ${token}`);
        message.request_headers.append('anthropic-beta', 'oauth-2025-04-20');
        message.request_headers.append('Accept', 'application/json');
        message.request_headers.append('User-Agent', 'claude-usage-label/1');

        this._session.queue_message(message, (_session, msg) => {
            if (this._destroyed)
                return;
            if (msg.status_code === 401) {
                this._setError('abra o Claude Code');
                return;
            }
            if (msg.status_code !== 200) {
                this._setError(msg.status_code === 0 ? 'sem rede' : `erro ${msg.status_code}`);
                return;
            }
            try {
                this._update(JSON.parse(msg.response_body.data));
            } catch (e) {
                this._setError('resposta inválida');
            }
        });
    }

    _update(data) {
        const five = data.five_hour || {};
        const week = data.seven_day || {};
        const p5 = Math.round(five.utilization || 0);
        const p7 = Math.round(week.utilization || 0);

        this._label.set_text(`5h ${p5}% · 7d ${p7}%`);
        this._label.style = `color: ${colorFor(Math.max(p5, p7)) || 'inherit'};`;

        const r5 = remaining(five.resets_at);
        const r7 = remaining(week.resets_at);
        this._fiveItem.label.set_text(`Janela de 5h: ${p5}%${r5 ? `  (reinicia em ${r5})` : ''}`);
        this._weekItem.label.set_text(`Semana: ${p7}%${r7 ? `  (reinicia em ${r7})` : ''}`);
        this._checkItem.label.set_text(`Última consulta: ${new Date().toLocaleTimeString()}`);
    }

    destroy() {
        this._destroyed = true;
        if (this._timer) {
            GLib.Source.remove(this._timer);
            this._timer = null;
        }
        if (this._session) {
            this._session.abort();
            this._session = null;
        }
        super.destroy();
    }
});

let indicator = null;

function init() {}

function enable() {
    indicator = new Indicator();
    Main.panel.addToStatusArea('claude-usage-label', indicator, 0, 'right');
}

function disable() {
    if (indicator) {
        indicator.destroy();
        indicator = null;
    }
}
