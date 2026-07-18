# Baan C / Infor LN Support

Complete language support for Baan C and Infor LN (3GL & 4GL) inside Visual Studio Code.

Available on VSCode Marketplace: https://marketplace.visualstudio.com/items?itemName=AnonymousGCA.baan-c-vscode

## Features

- **Syntax Highlighting**: Comprehensive coloring for keywords, SQL embedded statements, 4GL sections, types, preprocessors, and more. Dotted domain names like `txamg.type.long` are not mis-colored as type keywords.
- **Code Formatting**: Automatic document formatting (`Shift + Alt + F` or on-save). Perfectly indents conditional blocks, loops, embedded SQL branches (`selectdo`, `selectempty`), and multi-line arguments.
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
- **Snippets**: Shortcuts like `if`, `ife`, `while`, `selectf`, `txselect`, `httpget`, `dalgs`, `domain`, and more.
- **Insert Templates**: Command Palette / context menu — transaction+select and full select skeletons.

## Extension Settings

This extension contributes the following settings that can be tweaked in VS Code settings:

* `baanc.indentSize`: Number of spaces per indent level when formatting (Default: `4`).
* `baanc.formatOnSave`: Automatically format the document on save (Default: `false`).
* `baanc.diagnostics.enabled`: Enable block-matching and structural diagnostics (Default: `true`).
* `baanc.diagnostics.strictComments`: Ignore pipe `|` and block `/* */` comments when analyzing code blocks (Default: `true`).
* `baanc.diagnostics.namingConventions`: Hint when identifiers do not follow Baan naming conventions (Default: `true`).
* `baanc.diagnostics.namingArgPrefixes`: Also hint when function args lack `i.`/`o.`/`io.` prefixes (Default: `false`).
* `baanc.completion.includeSql`: Include SQL / embedded-select keywords in autocomplete.
* `baanc.completion.includePreprocessor`: Include preprocessor directives in autocomplete.
* `baanc.completion.include4gl`: Include common 4GL section names in autocomplete.
* `baanc.completion.includeBuiltins`: Include built-in API functions in autocomplete (Default: `true`).
* `baanc.completion.includeErrors`: Include database/ES error constants (`ELOCKED`, …) in autocomplete (Default: `true`).

## Commands

| Command | Description |
| --- | --- |
| `Baan C: Format Document` | Format the active Baan C file |
| `Baan C: Run Diagnostics` | Refresh block diagnostics and open the output channel |
| `Baan C: Insert Select Template` | Insert a full `select` / `selectdo` / `selecterror` skeleton |
| `Baan C: Insert Transaction + Select Template` | Insert `db.retry.point` + `for update` + commit/abort pattern |

## Known Issues

- Advanced macro definitions inside block diagnostics might occasionally confuse the linter if blocks are opened/closed in different files.
- Find References / Rename operate on the **current file** only (not a full workspace index).

## Building:

- Run: `npx @vscode/vsce package`
- Locate the built extension on the root folder (with the `.vsix` extension).
- Open VSCode and do `Ctrl+Shift+P` then `Extensions: Install from vsix`, select the file and click `Install`

## Release Notes

## [1.0.4] - 18-07-2026

### Added

- Large expansion of built-in API completions (HTTP client, cURL, SOAP, digests, BLOBs, programmable dialogs/charts, RDI/dictionary, parallel processing, keyfields, selection helpers, images, composite sessions, random, varargs, and more) — 980+ functions.
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
