# Claude Usage Label

Uma extensão minúscula do GNOME Shell que mostra o seu **uso do Claude** na barra superior:

```
5h 8% · 7d 3%
```

Clique nela para ver quanto tempo falta para cada limite reiniciar. O texto fica amarelo a partir de 75% e vermelho a partir de 90%.

> 🇺🇸 English version: [README.md](README.md)

> **Não oficial.** Sem relação com a Anthropic nem aprovada por ela. Depende de um endpoint não documentado, que pode mudar ou parar de funcionar a qualquer momento.

## Requisitos

- Linux com **GNOME Shell 42** (testado no Pop!_OS 22.04, X11).
- [Claude Code](https://claude.com/claude-code) instalado e logado com uma conta Claude, de forma que `~/.claude/.credentials.json` exista.

Outras versões do GNOME não são suportadas: o `metadata.json` lista só a `42`. Versões mais novas usam outra API de extensões.

## Instalação

```bash
git clone https://github.com/thomm-011/gnome-claude-usage-label.git
cd gnome-claude-usage-label

mkdir -p ~/.local/share/gnome-shell/extensions
cp -r claude-usage-label@local ~/.local/share/gnome-shell/extensions/
```

Reinicie o GNOME Shell para ele detectar a extensão nova:

- **X11:** aperte `Alt+F2`, digite `r` e dê Enter. As janelas continuam abertas.
- **Wayland:** saia da sessão e entre de novo.

Depois, ative:

```bash
gnome-extensions enable claude-usage-label@local
```

O texto deve aparecer na barra superior em alguns segundos.

## Uso

- A barra mostra `5h <percentual> · 7d <percentual>`: sua janela de 5 horas e o uso da semana.
- Clique para ver quando cada limite reinicia, o horário da última consulta e o botão **Atualizar agora**.
- Atualiza a cada 5 minutos.

### Mensagens de status

| Texto | Significado |
|---|---|
| `Claude: abra o Claude Code` | O token de acesso expirou. Use o Claude Code uma vez: ele renova o token e o texto volta na próxima atualização. |
| `Claude: sem credenciais` / `sem token` | O `~/.claude/.credentials.json` não existe ou não tem token. Faça login no Claude Code. |
| `Claude: sem rede` | Sem conexão com a internet. |
| `Claude: erro <código>` | O servidor respondeu com erro HTTP. |

### Configurações

Não há interface. Edite as constantes no começo do `extension.js` e reinicie o shell:

| Constante | Padrão | Significado |
|---|---|---|
| `INTERVAL_SECONDS` | `300` | Segundos entre consultas |
| `WARN` | `75` | Percentual em que o texto fica amarelo |
| `CRIT` | `90` | Percentual em que o texto fica vermelho |

## Como funciona e no que ela mexe

- A cada 5 minutos envia um `GET https://api.anthropic.com/api/oauth/usage` com o token de acesso do Claude Code. Isso só **lê** os números de uso. Não roda nenhum modelo, então **não gasta tokens**.
- Só **lê** o `~/.claude/.credentials.json`. Nunca escreve nele nem renova o token, então não atrapalha o login do Claude Code.
- O token vai apenas para `api.anthropic.com` e nunca é registrado em log nem guardado em outro lugar.
- Não há telemetria nem outra requisição de rede.

O código é um arquivo só (`claude-usage-label@local/extension.js`, cerca de 185 linhas), então dá para ler em poucos minutos antes de instalar.

## Problemas comuns

O texto não aparece depois de ativar:

```bash
gnome-extensions list | grep claude          # foi detectada?
gnome-extensions info claude-usage-label@local
journalctl /usr/bin/gnome-shell -n 50 | grep -i claude
```

Se o `list` não mostrar nada, reinicie o shell de novo (veja **Instalação**).

## Desinstalar

```bash
gnome-extensions disable claude-usage-label@local
rm -r ~/.local/share/gnome-shell/extensions/claude-usage-label@local
```

## Limitações

- O endpoint de uso não é documentado e pode mudar sem aviso.
- Testada apenas no GNOME Shell 42.9 (X11) com uma conta Claude Pro.
- Mostra só os dois números principais (janela de 5 horas e semanal).

## Licença

[MIT](LICENSE)
