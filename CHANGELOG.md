# Change Log

All notable changes to the "baan-c-support" extension will be documented in this file.

Based on [Keep a Changelog](http://keepachangelog.com/).

## [1.1.0] - 21-10-2026

### Changed

- **Development tooling updated** to current versions: `@types/vscode` 1.140.0, `@types/node` 24.19.2, `esbuild` 0.28.2, and `eslint` 10.13.0. The Node types now match the Node 24 runtime used by current VSCode versions.
- **Minimum VSCode version** raised to 1.140.0 to match `@types/vscode`.
- **Debugging made deterministic**: `.vscode/launch.json` now compiles before launch, maps `dist/**/*.js` for source-level breakpoints, and provides an isolated configuration with `--disable-extensions`.
- **Task configuration simplified**: removed obsolete TypeScript watch tasks and kept `npm: compile` and `npm: watch`.
- **README expanded** with the extension structure, provider map, parsing model, diagnostics flow, library-memory flow, formatting flow, build flow, and debugging notes.
- **JSDoc expanded** across the activation, provider, formatting, diagnostics, and library-memory modules, including parameter and return types.
- **Smoke tests expanded**: a diagnostics test now runs alongside the library-memory test, and `npm test` runs both through `src/test/run-all.js`.

### Fixed

- **Marketplace icon rejected**: the extension icon and the language, command, and documentation panel icons were WebP files, which the Marketplace rejects with "The provided icon is not a supported image format. Use a PNG, JPEG, BMP, or ICO image." All icons are now PNG files and `package.json` and `src/docsViewer.js` point to them.
- **`else if` block accounting**: Baan C treats `else if ... then` as a nested if that needs its own `endif`. Diagnostics no longer report a false `Unmatched "endif"` when a nested `on case` uses this form. Verified against real Baan C DLL sources.
- Documented the Extension Development Host exit code 134 crash observed on Windows when an installed extension such as GitHub Copilot Chat activates. The isolated launch configuration keeps the development host stable.

## [1.0.9] - 07-08-2026

### Fixed

- **String highlighting no longer treats `\` as an escape.** Baan C string literals have **no** backslash escapes: a `\` is a plain character, and embedded quotes are written doubled (`""`). Previously the grammar ate the backslash *and* the next character, so when a `\` sat before the closing `"` it swallowed the closing quote, the string never terminated, and everything after it was mis-colored (and a real `|` comment that followed a string was no longer detected). Now `"C:\temp\file.txt"`, `"He said ""Hi"" to me"`, and a `|` comment after a string all color correctly.
- **String-aware parsing aligned to the same rule.** Diagnostics/formatting (`stripLineComment`, `parenDelta`, `findCallAtPosition`), library-memory import detection (`stripPipeComment`), and the smoke test now treat every `"` as a string toggle (doubled quotes balance by parity) instead of heuristically skipping `\"`.

### Changed

- Smoke test (`src/test/libraryMemory.smoke.js`) extended with backslash-in-string and doubled-quote cases.

## [1.0.8] - 02-08-2026

### Added

- **Workspace symbols**: symbols from all open Baan C files are now searchable with **Go to Symbol in Workspace** (`Ctrl+T`), in addition to the per-file Outline (`Ctrl+Shift+O`).
- **Status bar quick actions**: a **Baan C** item appears in the status bar while a Baan file is active and opens a Quick Pick with the most useful commands (Format Document, Run Diagnostics, insert templates, manage libraries, open documentation).
- **Quick Fixes** for two common language-idiom warnings:
  - `for … by` → **Replace 'by' with 'step'** (`for` loops use `step`)
  - `while … do` → **Remove 'do'** (Baan C `while` has no `do` keyword)
- **~140 more built-in API completions** from the official Baan C docs: the full **eMessage Connector** family (`cmf.*`, ~100 functions), **Chart Manager** (`chm.*`, ~35 functions) and **ARTM** (`artm.*`), for a total of 1,125 builtins.

### Changed

- **Docs site generator** (`scripts/build-docs.js`) hardened:
  - Prose is now HTML-escaped (raw angle brackets and the ampersand character can no longer leak through).
  - Table cells respect code spans and escaped pipes (`\|`), fixing a broken row in the Configuration guide.
  - CommonMark-style code fences: 3+ backticks **or** tildes, info strings with spaces, and correct closing rules (same character, at least as long).
  - Duplicate headings get unique anchor ids (`usage`, `usage-2`, …).
  - Search results now deep-link to the nearest section anchor, and tables/blockquotes are searchable.
  - Removed dead code in the client-side router and search.

### Fixed

- ESLint setup modernized: deprecated core formatting rule (`semi`) replaced with `@stylistic/semi`; lint scope extended to `scripts/`; `npm audit` clean.
- `npm test` script added (runs the library-memory smoke test).

## [1.0.7] - 23-07-2026

### Added

- New `Baan C: Open documentation` command to open the extension documentation.
- New `/docs` folder with .md documentation for commands, development, troubleshooting and more.
- New `/scripts/build-docs.js` script to generate the documentation as an `index.html` HTML file from `/docs/*.md`.
- New Github Action workflow to build the documentation and deploy it to GitHub Pages on every push to `master`.

### Changed

- Optimized build process to reduce the size of the extension package and improve performance.

## [1.0.6] - 22-07-2026

### Changed

- Select snippets (`select`, `selectf`, `txselect`) and insert templates now use `table.*` instead of bare `*`, with linked table placeholders and clause operands aligned on the same column:
  ```
  select  table.*
  from    table
  where   table.field
  ```
- Document formatter (`Shift + Alt + F` / Format Document / format-on-save) aligns embedded SQL clause keywords (`select`, `from`, `where`, `and`, `or`, `order by`, …) so operands share one column.

## [1.0.5] - 21-07-2026

### Added

- **Library memory** for BECS / temp `.bc` workflows: functions from opened libraries and includes are remembered after the file is closed and deleted.
- Completions, hovers, and signature help for memorized exports (`include · itxadv0000` / `dll · otccomdll0200`).
- **Better auto-import** that distinguishes import forms:
  - Include scripts → `#include "itxadv0000"`
  - Compiled DLLs → `#pragma used dll "otccomdll0200"`
  Information hints + Quick Fix for existing calls; toggle kind in Manage Memorized Libraries.
- Conservative **builtin auto-import** for APIs with an explicit optional DLL mapping only (no aggressive guessing across LN installs).
- Commands: Manage Memorized Libraries…, Clear Memorized Libraries, Add Library Import (`#include` / `#pragma used dll`).
- Settings: `baanc.libraryMemory.*`, `baanc.autoImport.builtinsOnCompletion`, `baanc.autoImport.builtinImportHints`.

## [1.0.4] - 18-07-2026

### Added

- Large expansion of built-in API completions (HTTP client, cURL, SOAP, digests, BLOBs, programmable dialogs/charts, RDI/dictionary, parallel processing, keyfields, selection helpers, images, composite sessions, random, varargs, and more), for 980+ functions.
- Database / ES error constant completions and hovers (`ELOCKED`, `EDUPL`, `ENOREC`, `EREFERENCE`, …) via `baanc.completion.includeErrors`.
- Signature help (parameter hints) for built-ins and local functions.
- Find All References, Rename Symbol, and Document Highlights for identifiers in the current file.
- Improved Go to Definition for tables, domains, and typed variables (in addition to functions).
- Folding ranges for control blocks, functions, preprocessor regions, and 4GL sections.
- Hover for local function definitions and richer builtin signature text.
- Commands: Insert Select Template, Insert Transaction + Select Template.
- New snippets: `txselect`, `dalgs`, `httpget`, `curlget`, `sqlpf`, `qext`, `funcex`, `elocked`, and more.

## [1.0.3] - 17-07-2026

### Added

- Naming convention hints (Infor LN style: lowercase, dots, expressive names) at Hint severity, with Quick Fix rename.
- Optional argument-prefix hints (`i.` / `o.` / `io.`) via `baanc.diagnostics.namingArgPrefixes` (default off).
- Built-in API completions and hovers (`db.*`, `strip$`, `message`, dates, DAL, form helpers, math, …).
- Setting `baanc.completion.includeBuiltins`.

### Fixed

- Primitive type keywords no longer highlight the trailing segment of domains/names like `txamg.type.long`.
- `TODO`/`FIXME`/`NOTE`/`XXX`/`HACK` in comments stay comment-colored instead of keyword/red.

## [1.0.2] - 16-07-2026

### Added

- Partially typing the name of a `table` already declared within the file automatically suggests it.
- Partially typing the name of a `function` already declared within the file automatically suggests it.
- Upgraded minimum engine version to `1.125.0` as well as `devDepencies: @types/vscode`.
- Upgraded `esbuild` and `eslint` to the latest version.
- Minor internal changes.

### Fixed

- Fixed an issue with `#` snippets that were duplicating the `#`.
- Fixed an issue were adding a dot after snippets like `before.` stopped showing them.

## [1.0.1] - 15-07-2026

- Initial release
