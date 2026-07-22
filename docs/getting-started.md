# Getting started

This guide covers installing **Visual Studio Code**, connecting it to **Infor LN**, installing **Baan C VSCode**, opening scripts, and the essentials you need on day one.

---

## Requirements

Before you use the extension, make sure you have:

- **Visual Studio Code** 1.125.0 or newer (see [Install Visual Studio Code](#install-visual-studio-code) below)
- **Infor LN** user defaults with **Development Parameters** set to **VSCODE** (see [Set VS Code as the default editor in LN](#set-vs-code-as-the-default-editor-in-ln))
- No Infor LN runtime is required for *editor* features alone (highlighting, format, completions, etc.)
- Optional: access to library/include `.bc` sources if you want [Library memory](./library-memory.md) to learn project APIs

---

## Install Visual Studio Code

If VS Code is not on your PC yet, install it first. These steps match the AlteaIn internal guide (custom path used with LN / BECS).

1. Download the installer from the official site:  
   **https://code.visualstudio.com/**
2. Run the installer and follow the wizard until you reach the **installation path** step.
3. **Important (company / LN setup):** choose a **custom** install path:

   ```text
   C:\apps\VSCODE
   ```

   Do **not** leave the default user-profile path if your LN environment expects `C:\apps\VSCODE`.
4. Finish the installation.
5. Verify the folder exists and contains **`Code.exe`** (and the usual VS Code files), for example:

   ```text
   C:\apps\VSCODE\Code.exe
   ```

6. Start VS Code once (from the Start menu or by running `Code.exe`) to complete first-run setup.

> **Tip:** If your IT department already deploys VS Code to `C:\apps\VSCODE`, skip the installer and open that copy instead.

---

## Set VS Code as the default editor in LN

Infor LN must open sources in VS Code (not the legacy editor). Configure this on **your LN user** via **LNUI**.

### Select VSCODE in User Data

1. Open **LNUI**.
2. Go to:  
   **Tools → User Management → General User Data → User Data** (session).
3. Search for **your user** and open it (use the **→** / open button).
4. On the top bar, open the **Defaults** tab.
5. Find **Development Parameters**.
6. Click the **Zoom / lens** icon, select **VSCODE**, then click **OK**.
7. **Save** the user record.

You should now have:

> User Data → Defaults → Development Parameters = **VSCODE**

### If VSCODE is not in the list

Create the development-parameter entry first, then select it:

1. Still in **User Data**, on the relevant parameters area, click **New**.
2. In **Edit**, define the **VSCODE** development parameter so it points at your VS Code install (typically under `C:\apps\VSCODE` / `Code.exe`, as required by your site).
3. **Save** the new parameter.
4. Return to **Defaults → Development Parameters**, select the new **VSCODE** entry, click **OK**.
5. **Save** your user again.

Exact field labels can vary slightly by LN version; if **New** fields are unclear, ask your LN administrator for the site-standard **VSCODE** development-parameter definition.

### Check that LN opens VS Code

1. From LN / BECS, open any script or library for edit.
2. The file should open in **Visual Studio Code** (not the old built-in editor).
3. If it still opens elsewhere, re-check Development Parameters and that `C:\apps\VSCODE\Code.exe` exists.

---

## Install the Baan C extension from the Marketplace

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
