# Commands

All commands appear in the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).  
Most are limited to Baan C editors (`editorLangId == baanc`). Library memory management is always available.

---

## Command list

| Title | Command ID | When | Description |
| --- | --- | --- | --- |
| **Baan C: Format Document** | `baanc.formatDocument` | Baan editor | Format the active document using the extension formatter |
| **Baan C: Run Diagnostics** | `baanc.runDiagnostics` | Baan editor | Re-run diagnostics and open the **Baan C** output channel |
| **Baan C: Insert Select Template** | `baanc.insertSelectTemplate` | Baan editor | Insert a full select / selectdo / selectempty / selecterror skeleton |
| **Baan C: Insert Transaction + Select Template** | `baanc.insertTransactionTemplate` | Baan editor | Insert retry-point + for-update select + commit/abort pattern |
| **Baan C: Manage Memorized Libraries…** | `baanc.manageLibraryMemory` | always | Inspect, change import kind, remove libraries/functions, or clear all |
| **Baan C: Clear Memorized Libraries** | `baanc.clearLibraryMemory` | always | Wipe all remembered library/include exports (confirmation required) |
| **Baan C: Add Library Import (#include / #pragma used dll)** | `baanc.addLibraryImport` | Baan editor | Insert the right import for the symbol under the cursor, or pick style + name |

---

## Context menu

On Baan C editors, the right-click menu includes:

| Group | Command |
| --- | --- |
| Modification | Format Document |
| Modification | Insert Select Template |
| Modification | Insert Transaction + Select Template |

---

## Standard VS Code language actions

These are provided by the extension’s language providers (not custom command IDs):

| Action | Typical shortcut (Windows/Linux) | macOS |
| --- | --- | --- |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |
| Go to Definition | `F12` | `F12` |
| Peek Definition | `Alt+F12` | `Option+F12` |
| Find All References | `Shift+F12` | `Shift+F12` |
| Rename Symbol | `F2` | `F2` |
| Trigger Suggest | `Ctrl+Space` | `Ctrl+Space` |
| Trigger Parameter Hints | `Ctrl+Shift+Space` | `Cmd+Shift+Space` |
| Quick Fix | `Ctrl+.` | `Cmd+.` |
| Fold / Unfold | `Ctrl+Shift+[` / `]` | `Cmd+Option+[` / `]` |

---

## Template contents

### Insert Select Template

```baanc
select  table.*
from    table
where   table.field
selectdo
	|
selectempty
	| no records
selecterror
	message("SQL error: %d", db.error())
endselect
```

Placeholders link the table name across `select` / `from` / `where`.

### Insert Transaction + Select Template

```baanc
db.retry.point()
long ret = 0
select  table.*
from    table
for update
where   table.field
selectdo
	|
	ret = db.update(table.id, db.retry)
selectempty
	| no records
endselect
if ret = 0 then
	commit.transaction()
else
	abort.transaction()
endif
```

---

## Library memory commands

### Manage Memorized Libraries…

Opens a Quick Pick of memorized libraries. Per library you can typically:

- View import kind (`include` vs `dll`) and import statement
- Switch kind (`#include` ↔ `#pragma used dll`) when heuristics got it wrong
- Inspect function list
- Remove one library or clear everything

If nothing is memorized yet, a message explains that you should open a library/include `.bc` first.

### Clear Memorized Libraries

Modal confirmation:  
`Clear all N memorized libraries (M functions)?`

### Add Library Import

1. If the cursor is on a symbol found in library memory, inserts the matching import.
2. Otherwise, prompts for import style and name so you can add `#include "…"` or `#pragma used dll "…"` manually.

Import insertion prefers a sensible location near existing `#include` / `#pragma` lines at the top of the file.

---

## Output channel

**Baan C: Run Diagnostics** writes a short line to the **Baan C** output channel, for example:

```text
Diagnostics refreshed for C:\path\to\script.bc
```

Open **View → Output**, then select **Baan C** from the dropdown.
