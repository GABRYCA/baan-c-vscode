# Development

Guide for building, debugging, packaging, and navigating the **Baan C VSCode** codebase.

---

## Prerequisites

| Tool | Notes |
| --- | --- |
| **Node.js** | LTS recommended (for `npm` / `npx`) |
| **npm** | Ships with Node |
| **VS Code** | `^1.125.0` for Extension Development Host |
| **@vscode/vsce** | Only needed to package `.vsix` (`npx` is enough) |

---

## Clone and install

```bash
git clone https://github.com/GABRYCA/baan-c-vscode.git
cd baan-c-vscode
npm install
```

---

## Project layout

```text
baan-c-support/          # repository root (name may vary locally)
├── package.json         # extension manifest, contributes, scripts
├── esbuild.js           # bundles src → dist/extension.js
├── language-configuration.json
├── syntaxes/
│   └── baanc.tmLanguage.json
├── snippets/
│   └── baanc.json
├── icons/               # marketplace + language icons
├── src/
│   ├── extension.js     # activation, providers, formatter, diagnostics
│   ├── builtins.js      # ~980+ API + error constants
│   ├── libraryMemory.js # learn / store / auto-import / manager UI
│   └── test/            # tests / smoke helpers
├── dist/
│   └── extension.js     # bundled entry (runtime main)
├── docs/                # markdown sources + generated index.html site
├── scripts/
│   └── build-docs.js    # builds docs/index.html from docs/*.md
├── CHANGELOG.md
├── README.md
└── LICENSE
```

### Runtime entry

| Field | Value |
| --- | --- |
| `package.json` → `main` | `./dist/extension.js` |
| Source entry | `src/extension.js` |
| Activation | `onLanguage:baanc` |

### Source modules

| File | Responsibility |
| --- | --- |
| `src/extension.js` | `activate` / `deactivate`; completions, hover, definition, references, rename, highlights, folding, symbols, signature help, formatting, diagnostics, code actions, commands |
| `src/builtins.js` | `BUILTIN_FUNCTIONS`, `ERROR_CONSTANTS`, lookup maps, signature parsing |
| `src/libraryMemory.js` | Persistent library store, import edits, manager Quick Pick, builtin DLL resolve hooks |
| `src/docsViewer.js` | Webview host for the single-file documentation site |

There is **no** separate language server process; all providers run in the extension host.

### Documentation site

Markdown under `docs/*.md` is the source of truth. The professional SPA lives at `docs/index.html` (sidebar, search, light/dark theme). Regenerate after editing guides:

```bash
npm run docs:build
```

Open via **Baan C: Open Documentation** in the Command Palette, or open `docs/index.html` in a browser.

---

## Scripts

Defined in `package.json`:

| Script | Command | Purpose |
| --- | --- | --- |
| `compile` | `node esbuild.js` | One-shot development bundle (with sourcemap) |
| `watch` | `node esbuild.js --watch` | Rebuild on change |
| `package` | `node esbuild.js --production` | Minified production bundle |
| `docs:build` | `node scripts/build-docs.js` | Rebuild single-file docs site (`docs/index.html`) |
| `vscode:prepublish` | production esbuild + docs build | Runs automatically before `vsce package` / publish |
| `lint` | `eslint src` | Lint source |

### esbuild options

`esbuild.js` builds:

| Option | Value |
| --- | --- |
| Entry | `src/extension.js` |
| Outfile | `dist/extension.js` |
| Format | CommonJS |
| Platform | `node` |
| External | `vscode` |
| Production | minify on, sourcemap off |
| Development | minify off, sourcemap on |

---

## Debug in Extension Development Host

1. Open the repository folder in VS Code.
2. Run `npm run compile` (or `npm run watch` in a terminal).
3. Press **F5** or run the **Run Extension** launch configuration (`.vscode/launch.json`).
4. A new **Extension Development Host** window opens with the extension loaded from the workspace.
5. Open a `.bc` file and exercise features.
6. Set breakpoints in `src/*.js` (sourcemaps map into the bundle in non-production builds).
7. Reload the Extension Development Host (`Ctrl+R` / `Cmd+R`) after rebuilds if needed.

Launch config (simplified):

```json
{
  "name": "Run Extension",
  "type": "extensionHost",
  "request": "launch",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
}
```

---

## Lint

```bash
npm run lint
```

ESLint config: `eslint.config.mjs` (flat config). Scope: `src/`.

---

## Package a VSIX

```bash
npm install
npx @vscode/vsce package
```

This will:

1. Run `vscode:prepublish` → production esbuild
2. Package files according to `.vscodeignore`
3. Emit something like `baan-c-vscode-1.0.6.vsix` in the project root

Install locally:

1. Command Palette → **Extensions: Install from VSIX…**
2. Select the generated file

### What is excluded from the package

`.vscodeignore` omits (among other things):

- `src/**` (sources; only `dist/` is shipped)
- `node_modules/**`
- `.vscode/**`
- maps, TypeScript, eslint config, esbuild script, quickstart notes

Shipped essentials: `package.json`, `dist/extension.js`, `syntaxes/`, `snippets/`, `language-configuration.json`, `icons/`, README/CHANGELOG/LICENSE as applicable.

---

## Publish (maintainers)

Typical flow with `vsce` / Azure DevOps publisher account:

```bash
# bump version in package.json, update CHANGELOG.md
npm run package          # or rely on prepublish
npx @vscode/vsce publish
```

Publisher id in manifest: `AnonymousGCA`.  
Extension name: `baan-c-vscode`.  
Marketplace item: `AnonymousGCA.baan-c-vscode`.

Always update [CHANGELOG.md](../CHANGELOG.md) before a release.

---

## Adding features (pointers)

### New builtin completions

Edit `src/builtins.js` — append to `BUILTIN_FUNCTIONS`:

```js
{
  name: 'my.api.call',
  detail: 'long · short summary',
  doc: '```baanc\nlong my.api.call(...)\n```\nDescription.',
  insert: 'my.api.call(${1:arg})$0'
  // optional: dll: 'osome.object'  // only if truly required & known
}
```

### New snippets

Edit `snippets/baanc.json` — VS Code snippet schema (`prefix`, `body`, `description`).

### New settings / commands

1. Declare under `contributes.configuration` / `contributes.commands` in `package.json`.
2. Wire handlers in `src/extension.js` `activate()`.
3. Document in `docs/configuration.md` / `docs/commands.md` and CHANGELOG.

### Grammar / language config

| File | Change when… |
| --- | --- |
| `syntaxes/baanc.tmLanguage.json` | New highlight scopes / patterns |
| `language-configuration.json` | Comments, indent, folding markers, word pattern |

### Library memory behavior

All learning, import edits, and manager UI live in `src/libraryMemory.js`. Keep import classification conservative; prefer manager overrides over aggressive guessing.

---

## Versioning

Current version is read from `package.json` (`version` field). Documentation hub (`docs/README.md`) should stay aligned after releases.

Suggested release checklist:

- [ ] `CHANGELOG.md` entry with date
- [ ] Version bump in `package.json`
- [ ] `npm run lint`
- [ ] Manual smoke test in Extension Development Host
- [ ] `npx @vscode/vsce package` and install smoke
- [ ] Publish (if applicable)
- [ ] Update docs version badge/table if present

---

## Tests

Lightweight helpers live under `src/test/` (e.g. smoke for library memory). Expand coverage as features grow; there is no heavy CI suite required for basic packaging.

---

## Related docs

- [Features](./features.md)
- [Configuration](./configuration.md)
- [Library memory](./library-memory.md)
- [Troubleshooting](./troubleshooting.md)
