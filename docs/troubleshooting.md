# Troubleshooting

Common issues, known limitations, and how to recover.

---

## Extension does not activate

**Symptoms:** no highlighting, no Baan completions, language mode wrong.

**Checks:**

1. File extension is `.bc`, `.cl`, `.bcl`, or `.script` — or language mode is manually set to **Baan C**.
2. VS Code version ≥ **1.125.0**.
3. Extension is enabled (Extensions view → Baan C VSCode → not disabled for this workspace).
4. Reload window: Command Palette → **Developer: Reload Window**.

Activation event is `onLanguage:baanc` only — the extension does not load until a Baan document is involved.

---

## LN still opens the old editor (not VS Code)

**Checks:**

1. VS Code is installed where LN expects it — typically `C:\apps\VSCODE\Code.exe` (see [Getting started](./getting-started.md#install-visual-studio-code)).
2. Your LN user has **Defaults → Development Parameters = VSCODE** (see [Set VS Code as the default editor in LN](./getting-started.md#set-vs-code-as-the-default-editor-in-ln)).
3. If **VSCODE** is missing from the zoom list, create the development-parameter entry, save it, then select it on your user and save again.
4. Log out/in of LNUI (or restart the session) after changing Development Parameters.
5. Confirm with your LN administrator that the **VSCODE** parameter points at the correct `Code.exe` path for your site.

---

## Completions missing builtins or errors

1. Confirm settings:

   ```json
   {
     "baanc.completion.includeBuiltins": true,
     "baanc.completion.includeErrors": true
   }
   ```

2. Ensure you are not inside a comment or string (quick suggestions are off there by default).
3. Trigger manually: `Ctrl+Space` / `Ctrl+Space` (macOS: `Ctrl+Space`).
4. If only **library** APIs are missing, open the library `.bc` once so [Library memory](./library-memory.md) can learn them.

---

## Snippet inserts `##define` or odd `#` duplication

This was fixed in **1.0.2**. Preprocessor completions replace a partially typed `#…` prefix.

If you still see doubles:

- Update to the latest extension version.
- Prefer snippet prefixes (`define`, `#define`) from the extension, not outdated user snippets that hardcode an extra `#`.

---

## Dotted 4GL sections stop completing after typing `.`

Fixed in **1.0.2** for cases like `before.`. Update if you are on an older build.  
4GL names are registered as single completion units so the dotted form keeps matching.

---

## Format does not align SQL the way I expect

- Use **Baan C: Format Document** or `Shift+Alt+F` (not only generic formatters from other extensions).
- Ensure the language id is `baanc`.
- Check `baanc.indentSize` matches your `editor.tabSize` for `[baanc]`.
- Clause alignment targets standard embedded SQL keywords (`select`, `from`, `where`, `and`, `or`, `order by`, …). Highly unusual layouts may need a second manual pass.

---

## Diagnostics false positives in comments or macros

- Keep `baanc.diagnostics.strictComments: true` so `|` and `/* */` are ignored for block analysis.
- Advanced macros that open/close blocks across files can confuse structural analysis (known limitation).
- Temporarily disable with `baanc.diagnostics.enabled: false` if needed for a specific file.

---

## Naming hints are noisy

Naming diagnostics are **Hint** severity by design.

```json
{
  "baanc.diagnostics.namingConventions": false,
  "baanc.diagnostics.namingArgPrefixes": false
}
```

Or leave conventions on and keep `namingArgPrefixes` off (default) to avoid `i.`/`o.`/`io.` noise.

---

## Rename / Find References missed other files

**Expected.** These features operate on the **current file only**. There is no workspace-wide symbol index.

For cross-script APIs:

- Use Library memory + completions for discovery.
- Use VS Code workspace search (`Ctrl+Shift+F`) for text-level multi-file search.

---

## Auto-import inserted the wrong form (`#include` vs `#pragma`)

1. Open **Baan C: Manage Memorized Libraries…**
2. Select the library and switch import kind.
3. Remove a bad entry and re-open the source file so it is re-learned with a clearer name (`*dll*` → pragma; classic `i…` includes → `#include`).

Heuristics are documented in [Library memory](./library-memory.md).

---

## Auto-import did not run

Check:

| Setting | Should be |
| --- | --- |
| `baanc.libraryMemory.enabled` | `true` |
| `baanc.libraryMemory.autoImportOnCompletion` | `true` (for memorized APIs) |
| `baanc.autoImport.builtinsOnCompletion` | `true` (only for **mapped** builtins) |

Also:

- The library must already be memorized (open it once).
- Accept the **memorized** completion item, not a plain word-based suggestion.
- Import may already be present under an alternate `o` / path form (treated as present).

---

## Library memory empty or stale

1. Open the library/include `.bc` again and wait briefly (learn is debounced).
2. Confirm language id is `baanc` and scheme is `file` or `untitled` with a usable name.
3. **Manage Memorized Libraries…** to inspect what is stored.
4. **Clear Memorized Libraries** if the store is polluted, then re-open sources.

Memory is global to the VS Code profile — not per workspace folder.

---

## Builtin pragma inserted for a function that does not need a DLL

Builtin DLL mappings are meant to be rare. If one is wrong for your LN install:

- Turn off `baanc.autoImport.builtinsOnCompletion` and `baanc.autoImport.builtinImportHints`.
- Or delete the inserted pragma manually; prefer library memory for real DLL sources from your environment.

---

## Extension Development Host shows old code

```bash
npm run compile
# or leave npm run watch running
```

Then reload the Extension Development Host window. Ensure you are not packaging/running a stale `.vsix` while developing from source.

---

## Packaging / install from VSIX fails

1. `npm install` then `npx @vscode/vsce package` from the repo root.
2. Confirm `dist/extension.js` exists after prepublish.
3. Install via **Extensions: Install from VSIX…** (not by unzipping).
4. If an older version is stuck, uninstall it first, then install the new VSIX.

---

## Known limitations (summary)

| Limitation | Notes |
| --- | --- |
| Single-file references/rename | No workspace symbol database |
| Macro-heavy multi-file blocks | Structural diagnostics may mis-fire |
| Import kind heuristics | Override in Manage Memorized Libraries |
| Builtin DLL map sparse | By design — no aggressive guessing |
| No external LSP | All logic runs in the extension host |
| BECS temp names | Unusual names may need manual import / kind fix |

---

## Getting help

- Review [Features](./features.md) and [Configuration](./configuration.md)
- Check [CHANGELOG.md](../CHANGELOG.md) for behavior changes by version
- Open an issue on the repository: https://github.com/GABRYCA/baan-c-vscode

When filing a bug, include:

- Extension version (`package.json` / marketplace version)
- VS Code version
- Minimal `.bc` sample (sanitized)
- Relevant `baanc.*` settings
- Whether BECS / temp files are involved
