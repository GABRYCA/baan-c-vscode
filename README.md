# Baan C / Infor LN Support

Complete language support for Baan C and Infor LN (3GL & 4GL) inside Visual Studio Code.

Available on VSCode Marketplace: https://marketplace.visualstudio.com/items?itemName=AnonymousGCA.baan-c-vscode

## Features

- **Syntax Highlighting**: Comprehensive coloring for keywords, SQL embedded statements, 4GL sections, types, preprocessors, and more. Dotted domain names like `txamg.type.long` are not mis-colored as type keywords.
- **Code Formatting**: Automatic document formatting (`Shift + Alt + F` or on-save). Perfectly indents conditional blocks, loops, embedded SQL branches (`selectdo`, `selectempty`), and multi-line arguments.
- **Block Diagnostics**: Real-time linting that catches structural errors like unmatched `endif`, `endwhile`, or `endselect` statements.
- **Naming Convention Hints**: Soft (Hint-level) suggestions based on Infor LN design principles — lowercase, dots as separators (`my.beautiful.function`), avoid single-letter / `temp` names. Quick Fix can rename across the file. Toggle with `baanc.diagnostics.namingConventions`.
- **Built-in Completions**: Smart suggestions for common API functions (`commit.transaction`, `db.*`, `strip$`, `message`, `sprintf`, dates, DAL, form helpers, …) with hover docs.
- **Hover Documentation**: Hover over built-in keywords and API functions (e.g., `if`, `select`, `function`, `long`, `commit.transaction`) to see language definitions and usage examples.
- **Document Symbols (Outline)**: Easily navigate your script using the Outline view. Jump directly to functions, domains, tables, and 4GL sections.
- **Snippets**: Type shortcuts like `if`, `ife`, `while`, `selectf`, `domain`, etc., to instantly generate complete block structures.

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

## Known Issues

- Advanced macro definitions inside block diagnostics might occasionally confuse the linter if blocks are opened/closed in different files. 

## Building:

- Run: `npx @vscode/vsce package`
- Locate the built extension on the root folder (with the `.vsix` extension).
- Open VSCode and do `Ctrl+Shift+P` then `Extensions: Install from vsix`, select the file and click `Install`

## Release Notes

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
