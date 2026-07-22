# Baan C / Infor LN Support

Complete language support for Baan C and Infor LN (3GL and 4GL) inside Visual Studio Code.

**Marketplace:** https://marketplace.visualstudio.com/items?itemName=AnonymousGCA.baan-c-vscode

**Full documentation:** [docs/README.md](./docs/README.md)  
As well as here: [Github Pages](https://gabryca.github.io/baan-c-vscode)  
Which's essentially an hosted page of: [docs/index.html](./docs/index.html)

| Guide | Description |
| --- | --- |
| [Getting started](./docs/getting-started.md) | Install, open files, first steps |
| [Features](./docs/features.md) | Highlighting, format, diagnostics, navigation, completions |
| [Configuration](./docs/configuration.md) | All `baanc.*` settings |
| [Commands](./docs/commands.md) | Command Palette & templates |
| [Snippets](./docs/snippets.md) | Prefix catalog |
| [Library memory](./docs/library-memory.md) | BECS-friendly memory & auto-import |
| [Development](./docs/development.md) | Build, debug, package |
| [Troubleshooting](./docs/troubleshooting.md) | FAQ & known limits |

---

## Features

- **Syntax Highlighting**: Comprehensive coloring for keywords, SQL embedded statements, 4GL sections, types, preprocessors, and more.
- **Code Formatting**: Automatic document formatting (`Shift + Alt + F` or on-save). Perfectly indents conditional blocks, loops, embedded SQL branches (`selectdo`, `selectempty`), and multi-line arguments. Embedded SQL clauses (`select` / `from` / `where` / `and` / …) are aligned so operands share the same column.
- **Block Diagnostics**: Real-time linting that catches structural errors like unmatched `endif`, `endwhile`, or `endselect` statements.
- **Naming Convention Hints**: Soft (Hint-level) suggestions based on Infor LN design principles — lowercase, dots as separators (`my.beautiful.function`), avoid single-letter / `temp` names. Quick Fix can rename across the file. Toggle with `baanc.diagnostics.namingConventions`.
- **Built-in Completions**: 980+ API functions with snippet inserts and hover docs — `db.*`, `dal.*`, strings, dates, SQL, reports, XML/JSON, **HTTP client**, **cURL**, SOAP, digests, BLOBs, dialogs, RDI/dictionary, parallel processing, and more.
- **Error Constants**: Completions and hovers for common ES/DB codes (`ELOCKED`, `EDUPL`, `ENOREC`, `EREFERENCE`, …).
- **Signature Help**: Parameter hints while typing function calls (`Ctrl+Shift+Space`) for builtins and local functions.
- **Hover Documentation**: Hover over keywords, API functions, error codes, and local functions for definitions and usage notes.
- **Go to Definition**: Jump to functions, tables, domains, and typed variables declared in the current file (`F12`).
- **Find All References**: Highlight and list every use of an identifier in the file (`Shift+F12`).
- **Rename Symbol**: Rename identifiers across the current file (`F2`), with guards against renaming builtins/keywords.
- **Document Highlights**: Occurrences of the symbol under the cursor are highlighted while editing.
- **Code Folding**: Fold `if`/`while`/`for`/`select`/`function` blocks, preprocessor regions, and 4GL sections.
- **Document Symbols (Outline)**: Navigate functions, domains, tables, and 4GL sections in the Outline view.
- **Snippets**: Shortcuts like `if`, `ife`, `while`, `selectf`, `txselect`, `httpget`, `dalgs`, `domain`, and more. Select snippets insert `table.*` (not bare `*`) with linked table name placeholders and column-aligned clauses.
- **Insert Templates**: Command Palette / context menu — transaction+select and full select skeletons (same `table.*` + aligned clause style).
- **Library Memory (BECS-friendly)**: When you open a library or include `.bc` file, the extension remembers its functions even after BECS closes and deletes the temp file. Those functions appear in completions in other scripts.
- **IntelliJ-style Auto-Import (include vs pragma)**: Accepting a completion inserts the **correct** import form when missing:
  - Include scripts (e.g. `itxadv0000`) → `#include "itxadv0000"`
  - Compiled DLLs (e.g. `tccomdll0200`) → `#pragma used dll "otccomdll0200"`
  Soft Information hints + Quick Fix cover calls that already exist without the import. You can toggle include/DLL kind in **Manage Memorized Libraries**. Optional builtin DLL mappings stay conservative (never aggressive guessing across LN installations).
- **Manage Memorized Libraries**: Command Palette actions to inspect, switch import kind (`#include` ↔ `#pragma used dll`), remove individual libraries/functions, or clear all.

---

## Extension Settings

See **[docs/configuration.md](./docs/configuration.md)** for the full reference. Summary:

| Setting | Default | Purpose |
| --- | --- | --- |
| `baanc.indentSize` | `4` | Spaces per indent when formatting |
| `baanc.formatOnSave` | `false` | Format on save |
| `baanc.diagnostics.enabled` | `true` | Block-matching diagnostics |
| `baanc.diagnostics.strictComments` | `true` | Ignore comments when analyzing blocks |
| `baanc.diagnostics.namingConventions` | `true` | Naming style hints |
| `baanc.diagnostics.namingArgPrefixes` | `false` | `i.`/`o.`/`io.` arg hints |
| `baanc.completion.includeSql` | `true` | SQL keywords in completions |
| `baanc.completion.includePreprocessor` | `true` | Preprocessor in completions |
| `baanc.completion.include4gl` | `true` | 4GL section names |
| `baanc.completion.includeBuiltins` | `true` | Built-in APIs |
| `baanc.completion.includeErrors` | `true` | Error constants |
| `baanc.libraryMemory.enabled` | `true` | Remember opened libraries |
| `baanc.libraryMemory.maxLibraries` | `40` | LRU library cap |
| `baanc.libraryMemory.maxFunctionsPerLibrary` | `200` | Per-library function cap |
| `baanc.libraryMemory.autoImportOnCompletion` | `true` | Auto `#include` / `#pragma used dll` |
| `baanc.libraryMemory.showImportHints` | `true` | Missing-import hints + Quick Fix |
| `baanc.autoImport.builtinsOnCompletion` | `true` | Mapped-builtin pragma on accept |
| `baanc.autoImport.builtinImportHints` | `true` | Soft hints for mapped builtins |

---

## Commands

| Command | Description |
| --- | --- |
| `Baan C: Format Document` | Format the active Baan C file |
| `Baan C: Run Diagnostics` | Refresh block diagnostics and open the output channel |
| `Baan C: Insert Select Template` | Insert a full `select` / `selectdo` / `selecterror` skeleton |
| `Baan C: Insert Transaction + Select Template` | Insert `db.retry.point` + `for update` + commit/abort pattern |
| `Baan C: Manage Memorized Libraries…` | Inspect, switch include/DLL kind, remove, or list functions |
| `Baan C: Clear Memorized Libraries` | Wipe all remembered library/include exports |
| `Baan C: Add Library Import (#include / #pragma used dll)` | Insert the right import for the symbol under the cursor (or choose style + name) |

Details: [docs/commands.md](./docs/commands.md).

---

## Supported files

| Extension | Language id |
| --- | --- |
| `.bc`, `.cl`, `.bcl`, `.script` | `baanc` |

---

## Building

```bash
npm install
npm run compile              # development bundle → dist/extension.js
npm run watch                # rebuild on change
npx @vscode/vsce package     # production build + .vsix
```

Then in VS Code: **Extensions: Install from VSIX…** and select the generated `.vsix`.

Full contributor guide: [docs/development.md](./docs/development.md).

---

## Known Issues

- Advanced macro definitions inside block diagnostics might occasionally confuse the linter if blocks are opened/closed in different files.
- Find References / Rename operate on the **current file** only (not a full workspace index).
- Library memory classifies sources as include vs DLL by name/content heuristics (`*dll*` → pragma; classic `i…` includes like `itxadv0000` → `#include`). Use **Manage Memorized Libraries** to override if a name is ambiguous. Unusual temp names may need a manual import.
- Builtin auto-import only runs for APIs with an explicit optional DLL mapping (core bshell functions never force a pragma).

More: [docs/troubleshooting.md](./docs/troubleshooting.md).

---

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md) for the full history.

### [1.0.6] - 22-07-2026

- Select snippets and insert templates use `table.*` with linked placeholders and aligned clauses.
- Document formatter aligns embedded SQL clause keywords so operands share one column.

### [1.0.5] - 21-07-2026

- Library memory for BECS / temp `.bc` workflows; include vs DLL auto-import; manage/clear commands.

### [1.0.4] - 18-07-2026

- 980+ builtins, error constants, signature help, references/rename/highlights, folding, templates.

### [1.0.3] – [1.0.1](./CHANGELOG.md)

Earlier releases: naming hints, initial language support — see changelog.

---

## License

[MIT](./LICENSE)
