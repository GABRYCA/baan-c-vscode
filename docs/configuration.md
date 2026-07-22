# Configuration

All settings use the `baanc.` prefix. Open them via:

- **File → Preferences → Settings** and search `baanc`
- Or edit `settings.json` directly (User or Workspace)

Settings take effect for open Baan documents when configuration changes (diagnostics are re-run automatically).

---

## Settings reference

### Formatting

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `baanc.indentSize` | integer (1–16) | `4` | Spaces per indent level when formatting |
| `baanc.formatOnSave` | boolean | `false` | Format the document automatically on save |

> Editor tab size for Baan files is also defaulted via `configurationDefaults` for `[baanc]` (`editor.tabSize`: 4). Keep `baanc.indentSize` and tab size in sync if you customize either.

---

### Diagnostics

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `baanc.diagnostics.enabled` | boolean | `true` | Block-matching and structural diagnostics |
| `baanc.diagnostics.strictComments` | boolean | `true` | Ignore `\|` and `/* */` comments when analyzing blocks |
| `baanc.diagnostics.namingConventions` | boolean | `true` | Hint when identifiers break Infor LN naming style (Hint severity only) |
| `baanc.diagnostics.namingArgPrefixes` | boolean | `false` | Also hint when function args lack `i.` / `o.` / `io.` prefixes |

---

### Completions

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `baanc.completion.includeSql` | boolean | `true` | SQL / embedded-select keywords |
| `baanc.completion.includePreprocessor` | boolean | `true` | Preprocessor directives |
| `baanc.completion.include4gl` | boolean | `true` | Common 4GL section names |
| `baanc.completion.includeBuiltins` | boolean | `true` | Built-in Baan C / Infor LN API functions |
| `baanc.completion.includeErrors` | boolean | `true` | Database / ES error constants (`ELOCKED`, …) |

Local symbols (functions, tables declared in the file) are always candidates for completion when parseable.

---

### Library memory

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `baanc.libraryMemory.enabled` | boolean | `true` | Remember functions from opened library/include `.bc` files |
| `baanc.libraryMemory.maxLibraries` | integer (1–200) | `40` | Max memorized libraries (LRU pruning) |
| `baanc.libraryMemory.maxFunctionsPerLibrary` | integer (10–2000) | `200` | Cap on functions stored per library |
| `baanc.libraryMemory.autoImportOnCompletion` | boolean | `true` | On accepting a memorized completion, insert `#include` or `#pragma used dll` if missing |
| `baanc.libraryMemory.showImportHints` | boolean | `true` | Information hints + Quick Fix for calls missing the import |

Deep dive: [Library memory](./library-memory.md).

---

### Builtin auto-import

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `baanc.autoImport.builtinsOnCompletion` | boolean | `true` | When accepting a **mapped** builtin completion, insert `#pragma used dll` if missing |
| `baanc.autoImport.builtinImportHints` | boolean | `true` | Soft hints for mapped builtins used without the pragma |

Only APIs with an **explicit** optional DLL mapping are considered. Core bshell functions never force a pragma. Package DLLs are not guessed across LN installations.

---

## Example `settings.json`

Minimal personalization for a strict naming + always-format workflow:

```json
{
  "baanc.indentSize": 4,
  "baanc.formatOnSave": true,
  "baanc.diagnostics.enabled": true,
  "baanc.diagnostics.namingConventions": true,
  "baanc.diagnostics.namingArgPrefixes": false,
  "baanc.completion.includeBuiltins": true,
  "baanc.completion.includeErrors": true,
  "baanc.libraryMemory.enabled": true,
  "baanc.libraryMemory.autoImportOnCompletion": true,
  "baanc.libraryMemory.showImportHints": true
}
```

Disable library memory entirely (pure single-file editing):

```json
{
  "baanc.libraryMemory.enabled": false,
  "baanc.libraryMemory.autoImportOnCompletion": false,
  "baanc.libraryMemory.showImportHints": false
}
```

Lighter completions (keywords + local only):

```json
{
  "baanc.completion.includeBuiltins": false,
  "baanc.completion.includeErrors": false,
  "baanc.completion.includeSql": true,
  "baanc.completion.include4gl": true,
  "baanc.completion.includePreprocessor": true
}
```

---

## Language-specific editor defaults

Contributed under `configurationDefaults` for `[baanc]` (user settings override these):

| Key | Value |
| --- | --- |
| `editor.tabSize` | `4` |
| `editor.insertSpaces` | `true` |
| `editor.detectIndentation` | `false` |
| `editor.wordBasedSuggestions` | `"allDocuments"` |
| `editor.suggest.localityBonus` | `true` |
| `editor.suggest.showWords` | `true` |
| `editor.quickSuggestions.other` | `true` |
| `editor.quickSuggestions.comments` | `false` |
| `editor.quickSuggestions.strings` | `false` |
| `editor.acceptSuggestionOnEnter` | `"on"` |
| `editor.suggestSelection` | `"first"` |
| `editor.parameterHints.enabled` | `true` |
| `editor.folding` | `true` |
| `files.trimTrailingWhitespace` | `true` |

Example override (2-space indent for Baan only):

```json
{
  "baanc.indentSize": 2,
  "[baanc]": {
    "editor.tabSize": 2
  }
}
```

---

## Where memory is stored

Library memory uses VS Code **Extension global state** (not workspace files):

- Key: `baanc.libraryMemory.v1`
- Survives reloads and window restarts
- Independent of whether the original temp file still exists
- Cleared via **Baan C: Clear Memorized Libraries** or the manage UI

Global state is per user profile / machine for that VS Code installation, not committed to git.
