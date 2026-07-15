# Baan C / Infor LN Support

Complete language support for Baan C and Infor LN (3GL & 4GL) inside Visual Studio Code.

## Features

- **Syntax Highlighting**: Comprehensive coloring for keywords, SQL embedded statements, 4GL sections, types, preprocessors, and more.
- **Code Formatting**: Automatic document formatting (`Shift + Alt + F` or on-save). Perfectly indents conditional blocks, loops, embedded SQL branches (`selectdo`, `selectempty`), and multi-line arguments.
- **Block Diagnostics**: Real-time linting that catches structural errors like unmatched `endif`, `endwhile`, or `endselect` statements.
- **Hover Documentation**: Hover over built-in keywords (e.g., `if`, `select`, `function`, `long`, `commit.transaction()`) to see language definitions and usage examples.
- **Document Symbols (Outline)**: Easily navigate your script using the Outline view. Jump directly to functions, domains, tables, and 4GL sections.
- **Snippets**: Type shortcuts like `if`, `ife`, `while`, `selectf`, `domain`, etc., to instantly generate complete block structures.

## Extension Settings

This extension contributes the following settings that can be tweaked in VS Code settings:

* `baanc.indentSize`: Number of spaces per indent level when formatting (Default: `4`).
* `baanc.formatOnSave`: Automatically format the document on save (Default: `false`).
* `baanc.diagnostics.enabled`: Enable block-matching and structural diagnostics (Default: `true`).
* `baanc.diagnostics.strictComments`: Ignore pipe `|` and block `/* */` comments when analyzing code blocks (Default: `true`).
* `baanc.completion.includeSql`: Include SQL / embedded-select keywords in autocomplete.
* `baanc.completion.includePreprocessor`: Include preprocessor directives in autocomplete.
* `baanc.completion.include4gl`: Include common 4GL section names in autocomplete.

## Known Issues

- Advanced macro definitions inside block diagnostics might occasionally confuse the linter if blocks are opened/closed in different files. 

## Release Notes

### 1.0.1

- Initial release containing Syntax highlighting, Snippets, Formatter, Diagnostic linter, and Symbol definitions.