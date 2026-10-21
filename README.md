# Baan C / Infor LN Support

Complete language support for Baan C and Infor LN (3GL and 4GL) inside Visual Studio Code.

**Marketplace:** https://marketplace.visualstudio.com/items?itemName=AnonymousGCA.baan-c-vscode

**Full documentation:** [docs/README.md](./docs/README.md)  
**Hosted documentation:** [gabryca.github.io/baan-c-vscode](https://gabryca.github.io/baan-c-vscode)  
**Generated site:** [docs/index.html](./docs/index.html)

| Guide | Description |
| --- | --- |
| [Getting started](./docs/getting-started.md) | Install, open files, first steps |
| [Features](./docs/features.md) | Highlighting, formatting, diagnostics, navigation, completions |
| [Configuration](./docs/configuration.md) | All `baanc.*` settings |
| [Commands](./docs/commands.md) | Command Palette and templates |
| [Snippets](./docs/snippets.md) | Prefix catalog |
| [Library memory](./docs/library-memory.md) | BECS-friendly memory and auto-import |
| [Development](./docs/development.md) | Build, debug, package |
| [Troubleshooting](./docs/troubleshooting.md) | FAQ and known limits |

---

## Features

- **Syntax highlighting**: keywords, embedded SQL, 4GL sections, types, preprocessors, strings, comments, and numeric literals.
- **Code formatting**: document and range formatting (`Shift + Alt + F`), optional format on save. Indents control blocks, loops, functions, and multi-line arguments. Embedded SQL clauses (`select`, `from`, `where`, `and`, and others) are aligned so operands share a column.
- **Block diagnostics**: real-time checks for unmatched `if`, `while`, `for`, `repeat`, `select`, `on case`, preprocessor regions, and function braces. Quick Fixes cover `for ... by` to `step` and stray `while ... do`.
- **Naming hints**: Hint-level suggestions based on Infor LN design principles, with lowercase dotted names and no single-letter or `temp` identifiers. Quick Fix can rename across the file. Toggle with `baanc.diagnostics.namingConventions`.
- **Built-in completions**: 1,125 API functions with snippet inserts and hover docs, including `db.*`, `dal.*`, strings, dates, SQL, reports, XML, JSON, HTTP, cURL, SOAP, digests, BLOBs, dialogs, RDI, parallel processing, eMessage Connector (`cmf.*`), Chart Manager (`chm.*`), and ARTM (`artm.*`).
- **Error constants**: completions and hovers for common ES and DB codes such as `ELOCKED`, `EDUPL`, `ENOREC`, and `EREFERENCE`.
- **Signature help**: parameter hints while typing calls (`Ctrl+Shift+Space`) for builtins and local functions.
- **Hover documentation**: keywords, API functions, error codes, and local function definitions.
- **Go to Definition**: functions, tables, domains, and typed variables declared in the current file (`F12`).
- **Find All References**: every use of an identifier in the current file (`Shift+F12`).
- **Rename Symbol**: rename identifiers across the current file (`F2`), with guards for builtins and keywords.
- **Document highlights**: occurrences of the symbol under the cursor.
- **Code folding**: `if`, `while`, `for`, `select`, `function` blocks, preprocessor regions, and 4GL sections.
- **Document symbols**: functions, domains, tables, and 4GL sections in the Outline view.
- **Workspace symbols**: search symbols across all open Baan C files with Go to Symbol in Workspace (`Ctrl+T`).
- **Snippets**: shortcuts such as `if`, `ife`, `while`, `selectf`, `txselect`, `httpget`, `dalgs`, and `domain`.
- **Insert templates**: transaction with select, and full select skeletons, from the Command Palette or editor context menu.
- **Status bar quick actions**: a **Baan C** item appears while a Baan C file is active and opens a Quick Pick with the most used commands.
- **Library memory**: opening a library or include `.bc` file records its exported functions, even after BECS closes and deletes the temporary file. The functions then appear in completions in other scripts.
- **IntelliJ-style auto-import**: accepting a memorized completion inserts the correct import when it is missing.
  - Include scripts such as `itxadv0000` use `#include "itxadv0000"`.
  - Compiled DLLs such as `tccomdll0200` use `#pragma used dll "otccomdll0200"`.
  Information hints and Quick Fixes cover calls that already exist without the import. The import kind can be overridden in **Manage Memorized Libraries**.
- **Library manager**: inspect libraries, switch between include and DLL, remove individual libraries or functions, or clear all memory.

---

## Extension structure

```text
baan-c-vscode/
├── .vscode/
│   ├── launch.json              Extension Development Host configs
│   └── tasks.json               compile and watch tasks
├── docs/
│   ├── *.md                     source guides
│   └── index.html               generated single-file documentation site
├── icons/                       extension and language icons
├── scripts/
│   └── build-docs.js            Markdown to static HTML generator
├── snippets/
│   └── baanc.json               snippet catalog
├── src/
│   ├── extension.js             activation, providers, parser, formatter, diagnostics
│   ├── builtins.js              builtin API catalog and lookup tables
│   ├── libraryMemory.js         persistent library store, imports, manager UI
│   ├── docsViewer.js            documentation webview host
│   └── test/
│       ├── libraryMemory.smoke.js
│       ├── diagnostics.smoke.js
│       └── run-all.js           npm test entry point
├── syntaxes/
│   └── baanc.tmLanguage.json    TextMate grammar
├── dist/
│   └── extension.js             generated bundle, loaded by VSCode
├── esbuild.js                   bundle script
├── language-configuration.json  comments, brackets, indentation, word pattern
├── package.json                 manifest, contributions, scripts
├── CHANGELOG.md
└── README.md
```

### Runtime entry points

| Item | Value |
| --- | --- |
| Extension entry (`main`) | `./dist/extension.js` |
| Source entry | `src/extension.js` |
| Activation event | `onLanguage:baanc` |
| Supported extensions | `.bc`, `.cl`, `.bcl`, `.script` |
| Language id | `baanc` |

---

## Architecture

The extension runs entirely in the VSCode extension host. It does not start a language server, a worker process, or a background indexer. This keeps startup fast and makes the extension a single CommonJS bundle with no runtime dependencies.

### Source modules

| File | Responsibility |
| --- | --- |
| `src/extension.js` | `activate` and `deactivate`, provider registration, document parsing, formatting, diagnostics, code actions, and command handlers |
| `src/builtins.js` | Builtin function metadata, error constants, lookup maps, and signature text |
| `src/libraryMemory.js` | Persistent library store, import classification, import edits, builtin DLL resolution, and the library manager |
| `src/docsViewer.js` | Webview panel that hosts the generated documentation site |
| `scripts/build-docs.js` | Markdown renderer and static site generator for `docs/index.html` |

### Provider map

| Provider | Main behavior |
| --- | --- |
| Completion | Keywords, snippets, 4GL sections, SQL, builtins, error constants, document symbols, memorized libraries |
| Hover | Keyword guides, builtin docs, error descriptions, local function headers, memorized imports |
| Signature help | Builtin signatures and parameters parsed from local function headers |
| Definition | Local functions, tables, domains, and typed variables |
| References | Word-bounded identifier matches in the current file |
| Rename | Reference edits with guards for keywords and builtins |
| Document highlights | Identifier occurrences in the current file |
| Folding | Control blocks, functions, preprocessor regions, 4GL sections |
| Document symbols | Outline entries for functions, tables, domains, and 4GL sections |
| Workspace symbols | The same symbol scan across all open Baan C documents |
| Formatting | Full document and range edits |
| Code actions | Import fixes, `for ... by` fix, `while ... do` fix, naming rename |

### Parsing model

Baan C mixes 3GL, 4GL sections, embedded SQL, and preprocessor directives. The extension uses a line-based, string-aware parser instead of a full grammar:

- Every `"` toggles string state. Baan C has no backslash escapes and doubled quotes balance by parity.
- `|` starts a line comment only outside strings.
- Block comments are masked while preserving line numbers.
- A stack tracks block openers and closers for diagnostics and folding.
- Function headers are parsed with focused regular expressions, including multi-line headers.
- Embedded SQL clauses are recognized by keyword and aligned without reformatting the rest of the line.

This approach handles incomplete code while typing, which is the normal state of an editor buffer. It also avoids a parser dependency and keeps the bundle small. The tradeoff is that cross-file semantic analysis is intentionally limited.

### Diagnostics flow

1. Document changes are debounced.
2. The block stack reports unmatched or mismatched closers.
3. Naming checks emit Hint-level diagnostics with quick-fix codes.
4. Import checks compare calls against memorized libraries and known builtin DLL mappings.
5. Results replace the previous diagnostic set for that URI.

### Library memory flow

1. A Baan C document is opened or changed.
2. After a 400 ms debounce, exported functions are extracted and stored in `ExtensionContext.globalState`.
3. Libraries are pruned with a least-recently-used cap.
4. Completions look up the function index and attach the correct import edit when needed.
5. The import kind is chosen from the script name and content:
   - Names containing `dll` map to `#pragma used dll`.
   - Classic include names such as `itxadv0000` map to `#include`.
   - Content with `function extern` maps to a DLL, otherwise to an include.
6. A manual override in **Manage Memorized Libraries** is preserved.

### Formatting flow

The formatter walks the document line by line and maintains an indentation stack. It preserves blank lines and comments, aligns multi-line function parameters, aligns SQL clause operands, and returns `TextEdit` objects instead of rewriting the whole file. This keeps undo history and cursor behavior predictable.

### Build flow

`esbuild.js` bundles `src/extension.js` into `dist/extension.js`:

| Option | Development | Production |
| --- | --- | --- |
| Format | CommonJS | CommonJS |
| Platform | Node | Node |
| Bundle | Yes | Yes |
| Minify | No | Yes |
| Source map | Yes | No |
| External | `vscode` | `vscode` |

The production bundle is created by `npm run package` or automatically by `vscode:prepublish` before packaging.

---

## Extension settings

See [docs/configuration.md](./docs/configuration.md) for the full reference. Summary:

| Setting | Default | Purpose |
| --- | --- | --- |
| `baanc.indentSize` | `4` | Spaces per indent when formatting |
| `baanc.formatOnSave` | `false` | Format on save |
| `baanc.diagnostics.enabled` | `true` | Block-matching diagnostics |
| `baanc.diagnostics.strictComments` | `true` | Ignore comments when analyzing blocks |
| `baanc.diagnostics.namingConventions` | `true` | Naming style hints |
| `baanc.diagnostics.namingArgPrefixes` | `false` | `i.`, `o.`, and `io.` argument hints |
| `baanc.completion.includeSql` | `true` | SQL keywords in completions |
| `baanc.completion.includePreprocessor` | `true` | Preprocessor directives in completions |
| `baanc.completion.include4gl` | `true` | 4GL section names |
| `baanc.completion.includeBuiltins` | `true` | Builtin APIs |
| `baanc.completion.includeErrors` | `true` | Error constants |
| `baanc.libraryMemory.enabled` | `true` | Remember opened libraries |
| `baanc.libraryMemory.maxLibraries` | `40` | LRU library cap |
| `baanc.libraryMemory.maxFunctionsPerLibrary` | `200` | Per-library function cap |
| `baanc.libraryMemory.autoImportOnCompletion` | `true` | Automatic `#include` or `#pragma used dll` |
| `baanc.libraryMemory.showImportHints` | `true` | Missing-import hints and Quick Fix |
| `baanc.autoImport.builtinsOnCompletion` | `true` | Mapped builtin pragma on accept |
| `baanc.autoImport.builtinImportHints` | `true` | Soft hints for mapped builtins |

---

## Commands

| Command | Description |
| --- | --- |
| `Baan C: Format Document` | Format the active Baan C file |
| `Baan C: Run Diagnostics` | Refresh diagnostics and open the output channel |
| `Baan C: Insert Select Template` | Insert a full `select`, `selectdo`, and `selecterror` skeleton |
| `Baan C: Insert Transaction + Select Template` | Insert `db.retry.point`, `for update`, and the commit or abort pattern |
| `Baan C: Manage Memorized Libraries...` | Inspect, switch import kind, remove, or list functions |
| `Baan C: Clear Memorized Libraries` | Remove all remembered library and include exports |
| `Baan C: Add Library Import (#include / #pragma used dll)` | Insert the correct import for the symbol under the cursor |
| `Baan C: Open Documentation` | Open the generated documentation site in a webview |
| `Baan C: Show Quick Actions` | Open the status bar Quick Pick |

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
npm run compile              # development bundle with source map
npm run watch                # rebuild on change
npm run lint                 # ESLint over src and scripts
npm test                     # library-memory and diagnostics smoke tests
npx @vscode/vsce package     # production build and .vsix
```

Then in VSCode use **Extensions: Install from VSIX...** and select the generated `.vsix`.

Full contributor guide: [docs/development.md](./docs/development.md).

---

## Debugging the extension

The repository contains two launch configurations in `.vscode/launch.json`:

| Configuration | Purpose |
| --- | --- |
| **Run Extension (isolated)** | Starts the Extension Development Host with `--disable-extensions`. Recommended for daily work |
| **Run Extension (with installed extensions)** | Starts the host with your installed extensions enabled, for integration checks |

Both configurations compile the extension first (`npm: compile`), load source maps for `dist/**/*.js`, and set `outFiles` so breakpoints in `src/*.js` bind correctly.

### Why isolated mode is the default

On Windows, the Extension Development Host can close immediately after startup with exit code `134` (`SIGABRT`). The host log shows:

```text
Extension host with pid <pid> exited with code: 134
[UtilityProcess ... type: extensionHost ...]: crashed with code 134 and reason 'crashed'
```

This is an Electron and VSCode crash in the extension host process, not a normal window close. In this workspace it reproduced only with installed extensions enabled. A clean profile with `--disable-extensions` stayed open, loaded the development extension, and activated normally. GitHub Copilot Chat matches a known upstream crash signature in `microsoft/vscode#333717`, including an in-memory database fallback in its logs.

Use **Run Extension (isolated)** if you hit this. To keep other extensions but exclude Copilot Chat, add this argument to the second configuration:

```json
"--disable-extension=github.copilot-chat"
```

Logs are written under `%APPDATA%\Code\logs\<timestamp>\main.log` and `...\window1\exthost\exthost.log`.

---

## Testing

- `npm test` runs the smoke suite through `src/test/run-all.js`.
  - `libraryMemory.smoke.js` covers library learning, include and DLL classification, object-name conversion, function header parsing, import detection, and string handling.
  - `diagnostics.smoke.js` covers block accounting, including the `else if` form that needs an additional `endif`.
- `npm run lint` runs ESLint 10 with the flat config.
- `npm run package` creates the production bundle.
- Manual checks use real Baan C sessions, DLL sources, and include files, including renamed and temporary BECS files.

The smoke tests are intentionally dependency-free so they can run in CI or a fresh clone. The diagnostics test installs a small `vscode` mock and calls the exported `runDiagnostics` function with plain document objects.

---

## Known issues

- Advanced macro definitions can confuse block diagnostics when blocks are opened and closed in different files.
- Find References and Rename operate on the current file. Workspace Symbols (`Ctrl+T`) search all open Baan C files, but there is no persistent workspace index.
- Library memory classifies sources as include or DLL by name and content heuristics. Use **Manage Memorized Libraries** to override ambiguous names.
- Builtin auto-import only runs for APIs with an explicit optional DLL mapping. Core bshell functions never force a pragma.
- On Windows, an installed extension can crash the Extension Development Host with code 134. Use the isolated launch configuration. See the debugging section above.

More: [docs/troubleshooting.md](./docs/troubleshooting.md).

---

## Release notes

See [CHANGELOG.md](./CHANGELOG.md) for the full history.

### [1.1.0] - 21-10-2026

- **Development tooling updated**: `@types/vscode` 1.140.0, `@types/node` 24.19.2, `esbuild` 0.28.2, and `eslint` 10.13.0. The Node types now match the Node 24 runtime used by current VSCode versions.
- **Minimum VSCode version** raised to 1.140.0 to match the type definitions.
- **Marketplace icon fixed**: the extension, language, command, and documentation panel icons are now PNG files instead of WebP, the format the Marketplace accepts.
- **Debugging made deterministic**: launch configurations now compile first, map `dist/**/*.js` for source-level breakpoints, and provide an isolated mode with `--disable-extensions`.
- **Fixed `else if` block accounting**: the form needs an additional `endif` compared with `elif`, so nested `on case` code no longer reports a false unmatched `endif`. Verified against real Baan C DLL sources.
- **Documented the exit code 134 crash** seen when an installed extension such as Copilot Chat activates in the Extension Development Host.
- **JSDoc expanded** across the activation, provider, formatting, diagnostics, and library-memory modules, with parameter and return types for editor IntelliSense.
- **README expanded** with the extension structure, provider map, parsing model, diagnostics flow, library-memory flow, formatting flow, build flow, and debugging notes.

### [1.0.9] - 07-08-2026

- **Fixed string highlighting**: Baan C has no backslash escapes and uses doubled quotes. Strings, trailing `|` comments, diagnostics, formatting, signature help, and library-memory parsing now follow the same rule.

Earlier releases: see [CHANGELOG.md](./CHANGELOG.md).

---

## License

[MIT](./LICENSE)
