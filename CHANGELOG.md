# Change Log

All notable changes to the "baan-c-support" extension will be documented in this file.

Based on [Keep a Changelog](http://keepachangelog.com/).

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