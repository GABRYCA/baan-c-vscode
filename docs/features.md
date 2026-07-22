# Features

Language support is registered for the `baanc` language id. Everything below applies to `.bc`, `.cl`, `.bcl`, and `.script` files (and any file set to language mode **Baan C**).

---

## Syntax highlighting

TextMate grammar: `syntaxes/baanc.tmLanguage.json` (`source.baanc`).

Colored elements include:

| Category | Examples |
| --- | --- |
| Comments | `\| line comment`, `/* block */` |
| Preprocessor | `#include`, `#define`, `#pragma`, `#ifdef`, … |
| Strings & numbers | `"…"`, numeric literals |
| Booleans | `true` / `false` style tokens where applicable |
| Keywords | `if` / `then` / `endif`, `while`, `for`, `function`, SQL verbs, … |
| Types | `long`, `double`, `string`, `boolean`, `table`, `domain` |
| Storage | `extern`, `static`, `common` |
| 4GL sections | `declaration:`, `before.program:`, `field.…`, `choice.…`, … |
| Function definitions & calls | `function name(…)` and `name(…)` |
| Table fields | `table.field` patterns |
| Operators | arithmetic, comparison, assignment |

Primitive type keywords do not incorrectly paint the trailing segment of domain-like names (e.g. `txamg.type.long`). Markers such as `TODO` / `FIXME` in comments stay comment-colored.

---

## Language configuration

`language-configuration.json` provides editor ergonomics:

- Line comment: `|`
- Block comment: `/*` … `*/`
- Auto-closing brackets, quotes, and block comments
- Indent increase/decrease rules for control blocks and select branches
- On-Enter indent for `if`/`while`/`for`/`selectdo`/… and stable indent for SQL clause lines
- Word pattern that includes dots and `$` (Baan identifiers often use both)
- Folding markers for control blocks and 4GL sections

---

## Code formatting

**Document formatting provider** + command **Baan C: Format Document**.

What it does:

- Indents control structures (`if`/`else`/`elif`/`endif`, loops, `on case`, functions)
- Indents embedded SQL branches (`selectdo`, `selectempty`, `selecteos`, `selecterror`)
- Aligns multi-line argument lists
- Aligns embedded SQL clause keywords so operands share a column:

  ```baanc
  select  table.*
  from    table
  where   table.field
  and     table.other = value
  order by table.key
  ```

Indent width is controlled by `baanc.indentSize` (default `4`).  
Optional format-on-save: `baanc.formatOnSave`.

---

## Diagnostics

Diagnostics run on open/edit (when enabled) and via **Baan C: Run Diagnostics**.

### Structural / block matching

`baanc.diagnostics.enabled` (default `true`).

Catches unmatched or mis-nested block keywords, for example:

- `if` / `endif`
- `while` / `endwhile`
- `for` / `endfor`
- `on case` / `endcase`
- `select` / `endselect`
- related branch keywords

With `baanc.diagnostics.strictComments` (default `true`), `|` and `/* */` comments are ignored when analyzing structure.

### Naming conventions (Hint severity only)

`baanc.diagnostics.namingConventions` (default `true`).

Soft suggestions aligned with Infor LN style:

| Rule | Intent |
| --- | --- |
| Prefer lowercase | Avoid mixed/upper identifiers where convention expects lower |
| Prefer dots as separators | e.g. `my.beautiful.function` |
| Avoid single-letter / `temp`-style names | Prefer expressive names |

**Quick Fix** can rename across the **current file**.  
These never report as Errors/Warnings by design.

Optional argument-prefix hints (`i.` / `o.` / `io.` on function parameters):  
`baanc.diagnostics.namingArgPrefixes` (default `false` — can be noisy).

### Import hints (Information)

When [Library memory](./library-memory.md) (or conservative builtin DLL mappings) knows a function but the file lacks the matching import:

- Information diagnostic + **Quick Fix** to insert `#include "…"` or `#pragma used dll "…"`

Toggles: `baanc.libraryMemory.showImportHints`, `baanc.autoImport.builtinImportHints`.

---

## Completions

Completion items can include:

| Source | Setting | Notes |
| --- | --- | --- |
| Built-in APIs (~980+) | `baanc.completion.includeBuiltins` | `db.*`, `dal.*`, strings, dates, HTTP, cURL, SOAP, XML/JSON, dialogs, RDI, parallel, … |
| Error constants | `baanc.completion.includeErrors` | `ELOCKED`, `EDUPL`, `ENOREC`, … |
| SQL keywords | `baanc.completion.includeSql` | Embedded select / join / where, … |
| Preprocessor | `baanc.completion.includePreprocessor` | `#include`, `#define`, … (avoids `##define` duplication) |
| 4GL section names | `baanc.completion.include4gl` | Dotted names stay one unit (`before.` still matches) |
| Local functions / tables | always | Parsed from the current document |
| Memorized library exports | `baanc.libraryMemory.enabled` | Survives temp-file deletion |

Accepting a memorized (or mapped builtin) completion can auto-insert the correct import when enabled — see [Library memory](./library-memory.md).

---

## Signature help

Parameter hints while typing a call (`Ctrl+Shift+Space` / `Cmd+Shift+Space`):

- Built-in functions (from insert/signature metadata)
- Local functions in the current file
- Memorized library function headers when available

---

## Hover documentation

Hover shows context for:

- Keywords and language constructs
- Built-in API functions (signature + short doc)
- Error constants (code + meaning)
- Local function definitions
- Memorized library exports (with import kind label)

---

## Navigation and editing

| Feature | Shortcut (typical) | Scope |
| --- | --- | --- |
| **Go to Definition** | `F12` | Functions, tables, domains, typed variables in the **current file** |
| **Find All References** | `Shift+F12` | Identifier uses in the **current file** |
| **Rename Symbol** | `F2` | Rename in the **current file**; guards against renaming builtins/keywords |
| **Document Highlights** | automatic | Occurrences of the symbol under the cursor |
| **Document Symbols (Outline)** | Outline view | Functions, domains, tables, 4GL sections |
| **Code Folding** | editor folding | Control blocks, functions, preprocessor regions, 4GL sections |

> **Note:** References and rename are **single-file**, not a full workspace index. Cross-file discovery for libraries is handled via Library memory completions/imports, not via a global rename index.

---

## Snippets and templates

### Snippets

User snippets in `snippets/baanc.json` — type a prefix and accept.  
Catalog: [Snippets](./snippets.md).

Highlights:

- Control flow: `if`, `ife`, `while`, `for`, `oncase`, …
- SQL: `select`, `selectf`, `txselect` (aligned `table.*` style)
- Declarations: `domain`, `table`, `long`, `string`, …
- Preprocessor: `#include`, `#define`, `#ifdef`, …
- 4GL: `declaration`, `before.program`, `field.`, `choice.`, …
- Patterns: `httpget`, `curlget`, `dalgs`, `sqlpf`, `elocked`, …

### Insert templates (commands)

| Command | Inserts |
| --- | --- |
| **Baan C: Insert Select Template** | Full `select` / `selectdo` / `selectempty` / `selecterror` / `endselect` with linked table placeholders |
| **Baan C: Insert Transaction + Select Template** | `db.retry.point` + `for update` + update + commit/abort pattern |

Also available from the editor **context menu** on Baan files.

---

## Library memory & auto-import

Summarized here; full guide: [Library memory](./library-memory.md).

1. Opening a library/include `.bc` extracts exported functions into persistent memory (`globalState`).
2. Those symbols appear in completions elsewhere (even after BECS deletes the temp file).
3. On completion accept (optional), the extension inserts:
   - **Include scripts** → `#include "scriptname"`
   - **DLLs** → `#pragma used dll "o…"`
4. Soft hints + Quick Fix cover calls that already exist without an import.
5. Manage via **Baan C: Manage Memorized Libraries…** (inspect, switch kind, remove, clear).

Builtin auto-import only applies when an API has an **explicit** optional DLL mapping — never guesses package DLLs across LN installations.

---

## Output channel

Channel name: **Baan C**.

Used when running **Baan C: Run Diagnostics** (logs that diagnostics were refreshed for the active file). Open via the Output panel dropdown.

---

## Feature checklist (at a glance)

| Area | Supported |
| --- | --- |
| Highlighting | Yes |
| Snippets | Yes |
| Format document / format on save | Yes |
| Block diagnostics | Yes |
| Naming hints + Quick Fix rename | Yes |
| Completions (builtins, SQL, PP, 4GL, local, memory) | Yes |
| Signature help | Yes |
| Hover | Yes |
| Go to Definition | Yes (file) |
| Find References | Yes (file) |
| Rename | Yes (file) |
| Document highlights | Yes |
| Folding | Yes |
| Outline / symbols | Yes |
| Library memory + auto-import | Yes |
| Workspace-wide rename / project index | No |
| Language Server Protocol (external process) | No (extension-hosted providers) |
