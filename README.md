# Claude Usage Label

A tiny GNOME Shell extension that shows your **Claude usage** in the top bar:

```
5h 8% · 7d 3%
```

Click it for the time left until each limit resets. The label turns yellow at 75% and red at 90%.

> 🇧🇷 Versão em português: [README.pt-BR.md](README.pt-BR.md)

> **Unofficial.** Not affiliated with or endorsed by Anthropic. It relies on an undocumented endpoint that can change or stop working at any time.

## Requirements

- Linux with **GNOME Shell 42** (tested on Pop!_OS 22.04, X11).
- [Claude Code](https://claude.com/claude-code) installed and logged in with a Claude account, so that `~/.claude/.credentials.json` exists.

Other GNOME versions are not supported: `metadata.json` lists only `42`. Newer versions need a different extension API.

## Install

```bash
git clone https://github.com/<your-user>/gnome-claude-usage-label.git
cd gnome-claude-usage-label

mkdir -p ~/.local/share/gnome-shell/extensions
cp -r claude-usage-label@local ~/.local/share/gnome-shell/extensions/
```

Then restart GNOME Shell so it detects the new extension:

- **X11:** press `Alt+F2`, type `r` and press Enter. Your windows stay open.
- **Wayland:** log out and log back in.

Finally, enable it:

```bash
gnome-extensions enable claude-usage-label@local
```

The label should appear in the top bar within a few seconds.

## Usage

- The bar shows `5h <percent> · 7d <percent>`: your 5-hour window and your weekly usage.
- Click it to see when each limit resets, the time of the last check, and an **Update now** button.
- It refreshes every 5 minutes.

### Status messages

| Label | Meaning |
|---|---|
| `Claude: abra o Claude Code` | The access token expired. Use Claude Code once; it renews the token and the label recovers on the next refresh. |
| `Claude: sem credenciais` / `sem token` | `~/.claude/.credentials.json` is missing or has no token. Log in with Claude Code. |
| `Claude: sem rede` | No network connection. |
| `Claude: erro <code>` | The server answered with an HTTP error. |

### Settings

There is no UI. Edit the constants at the top of `extension.js`, then restart the shell:

| Constant | Default | Meaning |
|---|---|---|
| `INTERVAL_SECONDS` | `300` | Seconds between checks |
| `WARN` | `75` | Percent where the label turns yellow |
| `CRIT` | `90` | Percent where the label turns red |

## How it works and what it touches

- Every 5 minutes it sends `GET https://api.anthropic.com/api/oauth/usage` with your Claude Code access token. This only **reads** the usage figures. It does not run a model, so **it does not spend tokens**.
- It only **reads** `~/.claude/.credentials.json`. It never writes to it and never renews the token, so it cannot interfere with Claude Code's login.
- The token is sent only to `api.anthropic.com` and is never logged or stored elsewhere.
- There is no telemetry and no other network request.

The code is a single file (`claude-usage-label@local/extension.js`, about 185 lines), so you can read it in a few minutes before installing.

## Troubleshooting

The label does not appear after enabling:

```bash
gnome-extensions list | grep claude          # is it detected?
gnome-extensions info claude-usage-label@local
journalctl /usr/bin/gnome-shell -n 50 | grep -i claude
```

If `list` shows nothing, restart the shell again (see **Install**).

## Uninstall

```bash
gnome-extensions disable claude-usage-label@local
rm -r ~/.local/share/gnome-shell/extensions/claude-usage-label@local
```

## Limitations

- The usage endpoint is undocumented and may change without notice.
- Tested only on GNOME Shell 42.9 (X11) with a Claude Pro account.
- Only the two main figures (5-hour and weekly) are shown.

## License

[MIT](LICENSE)
