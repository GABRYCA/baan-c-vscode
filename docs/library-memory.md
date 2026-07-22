# Library memory

Library memory is designed for **BECS** and other workflows where library or include sources open as temporary `.bc` files and then disappear. The extension **learns** exported functions while the file is open and keeps them for completions, hovers, signature help, and auto-import—even after the temp file is deleted.

---

## Why it exists

Typical BECS flow:

1. You open a session script in VS Code.
2. You jump to a library/include; BECS dumps a temporary `.bc` path.
3. You close the temp buffer; the file may be deleted from disk.
4. Without memory, completions for that library vanish.

With library memory enabled, step 4 no longer loses the API surface.

Storage: VS Code **extension global state** key `baanc.libraryMemory.v1` (survives reloads).

---

## How learning works

When a `baanc` document is opened or edited (debounced), the extension:

1. Derives a **script name** from the URI (filename without extension).
2. Parses `function` headers (skips block-comment noise).
3. Classifies the source as **include** or **dll** (see below).
4. Stores functions:
   - **DLL:** only `function extern …` (linkable exports)
   - **Include:** non-static functions (includes expose callable helpers more broadly)
5. Updates `lastSeen` and optional `sourceHint` (filesystem path when available).
6. Prunes by LRU when over `baanc.libraryMemory.maxLibraries`.
7. Caps functions per library with `baanc.libraryMemory.maxFunctionsPerLibrary`.

Empty parses do **not** wipe a previously good memory (protects mid-edit stubs and incomplete BECS buffers).

Disable entirely with `baanc.libraryMemory.enabled: false`.

---

## Include vs DLL import forms

Baan/Infor uses two different import styles:

| Kind | Typical source | Import written by the extension |
| --- | --- | --- |
| **include** | Include scripts such as `itxadv0000` | `#include "itxadv0000"` |
| **dll** | Compiled DLL objects such as `tccomdll0200` | `#pragma used dll "otccomdll0200"` |

Object names for DLLs commonly use a leading `o` (`otccomdll0200`). The extension normalizes this when generating the pragma.

### Automatic classification heuristics

`detectImportKind` (simplified):

1. Name contains `dll` → **dll**
2. Classic include pattern: leading `i` + package-like name (e.g. `itxadv0000`), excluding session-like codes → **include**
3. Content heuristics:
   - No `function extern`, but several `#define` / `prototype` → **include**
   - Has `function extern` → **dll**
4. Fallback → **include**

If classification is wrong for your naming scheme, open **Baan C: Manage Memorized Libraries…** and switch the kind (can be locked so later learns do not flip it back, depending on manager actions).

---

## Completions and documentation

Memorized exports appear with detail labels similar to:

- `include · itxadv0000`
- `dll · otccomdll0200`

Hover and signature help use the stored function header when available.

---

## Auto-import on completion

When `baanc.libraryMemory.autoImportOnCompletion` is `true` (default):

1. You accept a completion that comes from a memorized library.
2. If the document does not already import that library, the extension inserts:

   ```baanc
   #include "itxadv0000"
   ```

   or

   ```baanc
   #pragma used dll "otccomdll0200"
   ```

3. Insertion prefers a clean location near existing includes/pragmas (top of file, after last `#include` or `#pragma` as appropriate).

Duplicate detection is tolerant of `o` prefix variants and path/extension noise on includes.

---

## Import hints and Quick Fix

When `baanc.libraryMemory.showImportHints` is `true`:

- Calls that match a memorized export without a matching import get an **Information** diagnostic.
- **Quick Fix** (`Ctrl+.` / `Cmd+.`) inserts the correct import.

Diagnostic codes (internal):

- `missing-library-import`
- `missing-builtin-library-import` (for mapped builtins)

---

## Builtin auto-import (conservative)

Separate from library memory, some built-ins may declare an optional DLL:

| Setting | Role |
| --- | --- |
| `baanc.autoImport.builtinsOnCompletion` | Insert `#pragma used dll` on completion accept when mapping exists |
| `baanc.autoImport.builtinImportHints` | Soft hints when such a builtin is used without the pragma |

The default mapping tables are **intentionally sparse**. The extension does **not** invent package DLL names for arbitrary APIs, because Infor LN installations differ. Prefer opening real DLL sources so library memory learns the truth.

---

## Managing memory

### Command: Manage Memorized Libraries…

Quick Pick lists each library with:

- Import target and kind tag (`include` / `dll`)
- Function count
- Age (`lastSeen`)
- Generated import statement and optional source path

Actions typically include:

- Open details / list functions
- Switch import kind
- Remove one library
- Clear all

### Command: Clear Memorized Libraries

Modal confirmation, then wipes the entire store and refreshes diagnostics on open Baan documents.

### Command: Add Library Import

- Cursor on a memorized symbol → insert that library’s import
- Otherwise → choose style and name manually

---

## Recommended BECS workflow

1. Keep `baanc.libraryMemory.enabled` and `autoImportOnCompletion` on (defaults).
2. When you need a library API, open the library/include from BECS once.
3. Wait a moment (learn is debounced ~400 ms) or edit/save so the document is processed.
4. Return to your session script; type the function name and accept the completion.
5. Confirm the auto-inserted `#include` or `#pragma used dll` at the top.
6. If kind is wrong, fix it once in **Manage Memorized Libraries…**.

Optional hygiene:

- Raise `maxLibraries` if you jump across many packages in one day.
- Clear memory after finishing a large unrelated project to reduce stale completions.

---

## Settings summary

| Setting | Default |
| --- | --- |
| `baanc.libraryMemory.enabled` | `true` |
| `baanc.libraryMemory.maxLibraries` | `40` |
| `baanc.libraryMemory.maxFunctionsPerLibrary` | `200` |
| `baanc.libraryMemory.autoImportOnCompletion` | `true` |
| `baanc.libraryMemory.showImportHints` | `true` |
| `baanc.autoImport.builtinsOnCompletion` | `true` |
| `baanc.autoImport.builtinImportHints` | `true` |

Full descriptions: [Configuration](./configuration.md).

---

## Limitations

- Memory is **not** a full project indexer; it only knows libraries you actually opened (or previously learned).
- Classification heuristics can mis-tag unusual names — use the manager to override.
- Cross-file **rename** / **find all references** still operate on the current file only.
- Untitled buffers without a usable name are not learned.
- Empty or incomplete temp buffers will not overwrite a good prior extract.
