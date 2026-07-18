# Change Log

All notable changes to the "baan-c-support" extension will be documented in this file.

Based on [Keep a Changelog](http://keepachangelog.com/).

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
