# Baan C VSCode — Documentation

Complete language support for **Baan C** and **Infor LN** (3GL and 4GL) in Visual Studio Code.

> **Preferred reading experience:** open the single-file docs site  
> [`docs/index.html`](./index.html) in a browser, or run **Baan C: Open Documentation**  
> from the Command Palette. Rebuild with `npm run docs:build` after editing these `.md` sources.

| | |
| --- | --- |
| **Extension ID** | `AnonymousGCA.baan-c-vscode` |
| **Version** | 1.0.6 |
| **License** | [MIT](../LICENSE) |
| **Marketplace** | [Baan C VSCode](https://marketplace.visualstudio.com/items?itemName=AnonymousGCA.baan-c-vscode) |
| **Repository** | [GABRYCA/baan-c-vscode](https://github.com/GABRYCA/baan-c-vscode) |
| **Engine** | VS Code `^1.125.0` |

---

## What you get

- Syntax highlighting for Baan C / Infor LN (keywords, SQL, 4GL sections, types, preprocessor)
- Document formatting with SQL clause alignment
- Block and naming diagnostics (Hint-level naming, structural errors)
- 980+ built-in API completions with hovers and signature help
- Database / ES error constants (`ELOCKED`, `EDUPL`, …)
- Go to Definition, Find References, Rename, Outline, folding
- Snippets and insert templates for selects, transactions, 4GL, HTTP, DAL
- **Library memory** for BECS temp-file workflows with IntelliJ-style auto-import  
  (`#include` vs `#pragma used dll`)

---

## Documentation map

| Guide | Description |
| --- | --- |
| [Getting started](./getting-started.md) | Install, open Baan files, first steps |
| [Features](./features.md) | Full feature reference and how each capability works |
| [Configuration](./configuration.md) | All `baanc.*` settings with defaults |
| [Commands](./commands.md) | Command Palette actions and editor shortcuts |
| [Snippets](./snippets.md) | Prefix catalog for control flow, SQL, 4GL, APIs |
| [Library memory](./library-memory.md) | Memorized libraries, auto-import, BECS workflow |
| [Development](./development.md) | Clone, build, debug, package, project layout |
| [Troubleshooting](./troubleshooting.md) | Known limits, FAQ, and fixes |

Release history lives in the root [CHANGELOG.md](../CHANGELOG.md).

---

## Supported file types

The language id is `baanc`. These extensions activate language support automatically:

| Extension | Typical use |
| --- | --- |
| `.bc` | Baan C / Infor LN script |
| `.cl` | Client / library script |
| `.bcl` | Baan C library |
| `.script` | Generic script extension |

You can also set the language mode manually: **Command Palette → “Change Language Mode” → Baan C**.

---

## Quick links for users

1. Install [Visual Studio Code](./getting-started.md#install-visual-studio-code) (path `C:\apps\VSCODE` for LN) and set **Development Parameters = VSCODE** in LN — see [Getting started](./getting-started.md).
2. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=AnonymousGCA.baan-c-vscode) or from a `.vsix`.
3. Open a `.bc` file — highlighting, completions, and diagnostics start immediately.
4. Format with `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (macOS).
5. For BECS workflows, open library/include files once so **Library memory** can learn them — see [Library memory](./library-memory.md).

---

## Quick links for contributors

```bash
npm install
npm run compile          # build dist/extension.js
npm run watch            # rebuild on change
npx @vscode/vsce package # produce .vsix
```

Details: [Development](./development.md).

---

## License

MIT — see [LICENSE](../LICENSE).
