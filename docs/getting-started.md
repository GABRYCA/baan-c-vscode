# Getting started

This guide covers installing **Baan C VSCode**, opening scripts, and the essentials you need on day one.

---

## Requirements

- **Visual Studio Code** 1.125.0 or newer (or a compatible fork such as Cursor that supports VS Code extensions)
- No Infor LN runtime is required for editor features (highlighting, format, completions, etc.)
- Optional: access to library/include `.bc` sources if you want [Library memory](./library-memory.md) to learn project APIs

---

## Install from the Marketplace

1. Open VS Code.
2. Open **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **Baan C VSCode** (publisher: `AnonymousGCA`).
4. Click **Install**.

Marketplace page:  
https://marketplace.visualstudio.com/items?itemName=AnonymousGCA.baan-c-vscode

---

## Install from a VSIX

Useful for private builds or offline machines.

1. Obtain a `.vsix` file (from a release, or by packaging — see [Development](./development.md)).
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **Extensions: Install from VSIX…**
4. Select the `.vsix` and confirm **Install**.
5. Reload the window if prompted.

---

## Open a Baan C file

1. Open any file with extension `.bc`, `.cl`, `.bcl`, or `.script`.
2. The status bar language mode should show **Baan C**.
3. If it does not, run **Change Language Mode** and pick **Baan C**.

The extension activates on `onLanguage:baanc` — features load when a Baan document is open.

---

## First-day workflow

### 1. Explore syntax and Outline

- Keywords, SQL, 4GL sections, and types are colored automatically.
- Open the **Outline** view (Explorer sidebar) to jump between functions, tables, domains, and 4GL sections.

### 2. Use completions

Type part of a name and accept a suggestion (`Tab` / `Enter`):

| You type | You may get |
| --- | --- |
| `db.` | Built-in DB API (`db.bind`, `db.update`, …) |
| `ELOCK` | Error constant `ELOCKED` |
| `select` | Snippet or SQL keywords |
| `before.` | 4GL section names |
| Local function names | Functions declared in the same file |
| Memorized library exports | Functions learned from other opened `.bc` files |

Hover a symbol for documentation. While inside `function(`, parameter hints appear (or press `Ctrl+Shift+Space`).

### 3. Format the document

| Action | Shortcut (Windows/Linux) | Shortcut (macOS) |
| --- | --- | --- |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |
| Command | **Baan C: Format Document** | same |

Optional: enable format on save with `baanc.formatOnSave` (see [Configuration](./configuration.md)).

Embedded SQL is indented so clause keywords and operands line up:

```baanc
select  tcmcs001.*
from    tcmcs001
where   tcmcs001.compnr = 100
selectdo
	| ...
endselect
```

### 4. Insert a select or transaction skeleton

From the Command Palette or the editor context menu (right-click in a Baan file):

- **Baan C: Insert Select Template**
- **Baan C: Insert Transaction + Select Template**

Snippets such as `selectf` and `txselect` do the same from the keyboard — see [Snippets](./snippets.md).

### 5. Fix structure and naming

- Unmatched `endif` / `endwhile` / `endselect` and similar issues appear as diagnostics.
- Naming convention issues are **Hints** only (not errors). Use **Quick Fix** to rename when suggested.
- Refresh diagnostics with **Baan C: Run Diagnostics** (also opens the **Baan C** output channel).

### 6. (Optional) Library memory with BECS

If you edit via BECS temp files:

1. Open the library or include `.bc` once (so the extension can learn its functions).
2. Switch back to your session script.
3. Completions offer memorized exports; accepting them can auto-insert:

   - `#include "itxadv0000"` for include scripts  
   - `#pragma used dll "otccomdll0200"` for DLLs  

Full details: [Library memory](./library-memory.md).

---

## Default editor behavior for Baan C

When the language is `baanc`, the extension sets sensible defaults (overridable in your settings):

| Setting | Default for `[baanc]` |
| --- | --- |
| Tab size | 4 spaces |
| Insert spaces | yes |
| Detect indentation | off |
| Quick suggestions | on (not in comments/strings) |
| Parameter hints | on |
| Folding | on |
| Trim trailing whitespace | on |

---

## Next steps

- [Features](./features.md) — complete capability list  
- [Configuration](./configuration.md) — tune completions, diagnostics, memory  
- [Commands](./commands.md) — palette and context menu actions  
- [Library memory](./library-memory.md) — BECS / multi-script workflows  
