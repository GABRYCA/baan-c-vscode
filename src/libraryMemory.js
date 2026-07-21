/**
 * Persistent memory of Baan C library / include functions extracted from
 * temporarily opened .bc files (e.g. BECS workflow). Enables IntelliJ-style
 * completions and automatic imports, distinguishing:
 *   - `#include "itxadv0000"`     → include scripts
 *   - `#pragma used dll "o…"`    → compiled DLL objects
 *
 * Storage lives in ExtensionContext.globalState so it survives reloads and
 * works even when the original temp file has been deleted.
 */

const path = require('path');
const vscode = require('vscode');

const STORAGE_KEY = 'baanc.libraryMemory.v1';

/** Diagnostic / code-action codes */
const IMPORT_CODE = {
  library: 'missing-library-import',
  builtin: 'missing-builtin-library-import'
};

/**
 * @typedef {'dll' | 'include'} ImportKind
 *
 * @typedef {{
 *   name: string,
 *   header: string,
 *   isExtern: boolean
 * }} MemorizedFunction
 *
 * @typedef {{
 *   id: string,
 *   scriptName: string,
 *   objectName: string,
 *   importKind: ImportKind,
 *   importTarget: string,
 *   importKindLocked?: boolean,
 *   lastSeen: number,
 *   sourceHint?: string,
 *   functions: MemorizedFunction[]
 * }} MemorizedLibrary
 *
 * @typedef {{
 *   version: 1,
 *   libraries: MemorizedLibrary[]
 * }} MemoryStore
 */

/**
 * Optional DLL object names for builtins that are not always in the core
 * bshell and typically need `#pragma used dll`. Keep this list small —
 * many LN installations differ, so we only map well-known optional packages.
 * Keys are lowercase function names or prefixes ending with '.'.
 *
 * @type {Record<string, string>}
 */
const BUILTIN_DLL_MAP = {
  // Parallel / IDB helpers (package performance libs — often linked explicitly)
  // Left empty by default; prefix rules below cover optional APIs carefully.
};

/**
 * Prefix → DLL for optional APIs. Only used when auto-import for builtins is on.
 * Prefer conservative, rarely-assumed mappings.
 * @type {Array<{ prefix: string, dll: string, label: string }>}
 */
const BUILTIN_DLL_PREFIXES = [
  // None by default — package DLLs vary per installation.
  // Extension authors / users can rely on library memory for real DLL sources.
];

/**
 * @param {import('vscode').ExtensionContext} context
 */
function createLibraryMemory(context) {
  /** @type {MemoryStore} */
  let store = loadStore(context);

  /**
   * Rebuild name → libraries index (lowercase function name).
   * @returns {Map<string, MemorizedLibrary[]>}
   */
  function buildIndex() {
    /** @type {Map<string, MemorizedLibrary[]>} */
    const index = new Map();
    for (const lib of store.libraries) {
      const kind = normalizeImportKind(lib);
      for (const fn of lib.functions) {
        // DLLs only export function extern; includes expose all non-static fns
        if (kind === 'dll' && !fn.isExtern) {
          continue;
        }
        const key = fn.name.toLowerCase();
        const list = index.get(key) || [];
        list.push(lib);
        index.set(key, list);
      }
    }
    return index;
  }

  let index = buildIndex();

  function persist() {
    return context.globalState.update(STORAGE_KEY, store);
  }

  /**
   * @param {import('vscode').TextDocument} document
   * @param {{ maxLibraries?: number, maxFunctionsPerLibrary?: number, enabled?: boolean }} [opts]
   */
  function learnFromDocument(document, opts = {}) {
    if (opts.enabled === false) {
      return false;
    }
    if (!document || document.languageId !== 'baanc') {
      return false;
    }
    // Skip untitled buffers without a real name
    if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
      return false;
    }

    const scriptName = scriptNameFromUri(document.uri);
    if (!scriptName) {
      return false;
    }

    const text = document.getText();
    const extracted = extractExportedFunctions(text);
    const importKind = detectImportKind(scriptName, text);
    // DLL: only function extern are linkable. Include: all non-static functions.
    const candidates =
      importKind === 'dll'
        ? extracted.filter(f => f.isExtern)
        : extracted;
    const id = scriptName.toLowerCase();
    const existing = store.libraries.find(l => l.id === id);

    // Only persist real symbols — never wipe a good memory with an empty parse
    // (e.g. mid-edit stub or incomplete BECS buffer).
    if (candidates.length === 0) {
      if (existing && existing.functions.length > 0) {
        existing.lastSeen = Date.now();
        if (document.uri.scheme === 'file') {
          existing.sourceHint = document.uri.fsPath;
        }
        // Refresh kind if we can re-detect from name even without bodies
        ensureImportMeta(existing);
        void persist();
        return true;
      }
      return false;
    }

    const maxFn = opts.maxFunctionsPerLibrary ?? 200;
    const functions = candidates.slice(0, maxFn).map(f => ({
      name: f.name,
      header: f.header,
      isExtern: f.isExtern
    }));

    const objectName = toObjectName(scriptName);
    const importTarget = importTargetFor(importKind, scriptName, objectName);
    const entry = {
      id,
      scriptName,
      objectName,
      importKind,
      importTarget,
      lastSeen: Date.now(),
      sourceHint: document.uri.scheme === 'file' ? document.uri.fsPath : undefined,
      functions
    };

    if (existing) {
      // Preserve a user-chosen import kind if they toggled it in the manager
      if (existing.importKindLocked && existing.importKind) {
        entry.importKind = existing.importKind;
        entry.importTarget = importTargetFor(
          existing.importKind,
          scriptName,
          objectName
        );
        entry.importKindLocked = true;
      }
      Object.assign(existing, entry);
    } else {
      store.libraries.push(entry);
    }

    prune(opts.maxLibraries ?? 40);
    index = buildIndex();
    void persist();
    return true;
  }

  /**
   * @param {number} [maxLibraries]
   */
  function prune(maxLibraries = 40) {
    if (store.libraries.length <= maxLibraries) {
      return;
    }
    store.libraries.sort((a, b) => b.lastSeen - a.lastSeen);
    store.libraries = store.libraries.slice(0, maxLibraries);
  }

  /**
   * @param {string} functionName
   * @returns {MemorizedLibrary[]}
   */
  function findLibrariesForFunction(functionName) {
    if (!functionName) {
      return [];
    }
    return index.get(functionName.toLowerCase()) || [];
  }

  /**
   * @param {string} functionName
   * @returns {{ name: string, header: string, library: MemorizedLibrary } | null}
   */
  function findFunction(functionName) {
    const libs = findLibrariesForFunction(functionName);
    if (!libs.length) {
      return null;
    }
    // Prefer most recently seen library
    const sorted = [...libs].sort((a, b) => b.lastSeen - a.lastSeen);
    for (const lib of sorted) {
      const kind = normalizeImportKind(lib);
      const fn = lib.functions.find(f => {
        if (f.name.toLowerCase() !== functionName.toLowerCase()) {
          return false;
        }
        return kind === 'include' || f.isExtern;
      });
      if (fn) {
        ensureImportMeta(lib);
        return { name: fn.name, header: fn.header, library: lib };
      }
    }
    return null;
  }

  /**
   * Manually set import kind (include vs dll) for a memorized library.
   * @param {string} id
   * @param {ImportKind} kind
   */
  function setImportKind(id, kind) {
    const lib = store.libraries.find(l => l.id === id);
    if (!lib || (kind !== 'dll' && kind !== 'include')) {
      return false;
    }
    lib.importKind = kind;
    lib.importKindLocked = true;
    lib.importTarget = importTargetFor(kind, lib.scriptName, lib.objectName);
    index = buildIndex();
    void persist();
    return true;
  }

  /** @returns {MemorizedLibrary[]} */
  function listLibraries() {
    return [...store.libraries].sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * @param {string} id
   */
  function removeLibrary(id) {
    const before = store.libraries.length;
    store.libraries = store.libraries.filter(l => l.id !== id);
    if (store.libraries.length !== before) {
      index = buildIndex();
      void persist();
      return true;
    }
    return false;
  }

  /**
   * Remove a single function from a library (and drop empty libraries).
   * @param {string} libraryId
   * @param {string} functionName
   */
  function removeFunction(libraryId, functionName) {
    const lib = store.libraries.find(l => l.id === libraryId);
    if (!lib) {
      return false;
    }
    const before = lib.functions.length;
    lib.functions = lib.functions.filter(
      f => f.name.toLowerCase() !== functionName.toLowerCase()
    );
    if (lib.functions.length === before) {
      return false;
    }
    if (lib.functions.length === 0) {
      store.libraries = store.libraries.filter(l => l.id !== libraryId);
    }
    index = buildIndex();
    void persist();
    return true;
  }

  function clearAll() {
    store = { version: 1, libraries: [] };
    index = buildIndex();
    void persist();
  }

  /**
   * Touch lastSeen when a library is successfully used for import.
   * @param {string} id
   */
  function touch(id) {
    const lib = store.libraries.find(l => l.id === id);
    if (lib) {
      lib.lastSeen = Date.now();
      void persist();
    }
  }

  return {
    learnFromDocument,
    findLibrariesForFunction,
    findFunction,
    listLibraries,
    removeLibrary,
    removeFunction,
    setImportKind,
    clearAll,
    touch,
    get stats() {
      const libs = store.libraries.length;
      const fns = store.libraries.reduce((n, l) => n + l.functions.length, 0);
      return { libraries: libs, functions: fns };
    }
  };
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @returns {MemoryStore}
 */
function loadStore(context) {
  const raw = context.globalState.get(STORAGE_KEY);
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray(/** @type {MemoryStore} */ (raw).libraries)
  ) {
    const store = /** @type {MemoryStore} */ (raw);
    for (const lib of store.libraries) {
      ensureImportMeta(lib);
    }
    return store;
  }
  return { version: 1, libraries: [] };
}

/**
 * Ensure importKind / importTarget exist (migrates pre-1.0.5 entries).
 * @param {MemorizedLibrary & { importKindLocked?: boolean }} lib
 */
function ensureImportMeta(lib) {
  if (!lib.importKind || (lib.importKind !== 'dll' && lib.importKind !== 'include')) {
    lib.importKind = detectImportKind(lib.scriptName || lib.id || '', '');
  }
  if (!lib.objectName) {
    lib.objectName = toObjectName(lib.scriptName || lib.id || '');
  }
  if (!lib.importTarget) {
    lib.importTarget = importTargetFor(
      lib.importKind,
      lib.scriptName || lib.id || '',
      lib.objectName
    );
  }
  return lib;
}

/**
 * @param {MemorizedLibrary} lib
 * @returns {ImportKind}
 */
function normalizeImportKind(lib) {
  ensureImportMeta(lib);
  return lib.importKind === 'include' ? 'include' : 'dll';
}

/**
 * Decide whether a memorized source should be pulled in via `#include` or
 * `#pragma used dll`.
 *
 * Rules (first match wins):
 * 1. Name contains `dll` → DLL pragma (e.g. tccomdll0200 → otccomdll0200)
 * 2. Classic include script names like `itxadv0000`, `itccom0001` → `#include`
 * 3. Content heavy on `#define` / prototypes and no `function extern` → include
 * 4. Has `function extern` → DLL; otherwise → include
 *
 * @param {string} scriptName
 * @param {string} [text]
 * @returns {ImportKind}
 */
function detectImportKind(scriptName, text = '') {
  const base = (scriptName || '').replace(/\.(bc|cl|bcl|script)$/i, '');
  const name = base.replace(/^o/i, '');

  // Compiled DLL objects / library scripts
  if (/dll/i.test(name)) {
    return 'dll';
  }

  // Common Infor include naming: leading "i" + package + number, e.g. itxadv0000
  // Exclude session-like codes (…m000 / …s000) which are not includes.
  if (
    /^i[a-z]{2,8}[a-z0-9._-]*$/i.test(name) &&
    !/^[a-z]+\d{3,4}[ms]\d{3}$/i.test(name)
  ) {
    return 'include';
  }

  const src = text || '';
  const externCount = (src.match(/\bfunction\s+extern\b/gi) || []).length;
  const defineCount = (src.match(/#\s*define\b/gi) || []).length;
  const protoCount = (src.match(/\bprototype\b/gi) || []).length;

  if (externCount === 0 && (defineCount >= 2 || protoCount >= 2)) {
    return 'include';
  }
  if (externCount > 0) {
    return 'dll';
  }
  return 'include';
}

/**
 * @param {ImportKind} kind
 * @param {string} scriptName
 * @param {string} objectName
 */
function importTargetFor(kind, scriptName, objectName) {
  if (kind === 'include') {
    // #include uses the script / include name, not the "o…" object name
    return (scriptName || '').replace(/^o/i, '') || scriptName;
  }
  return objectName || toObjectName(scriptName);
}

/**
 * Full import directive line (without trailing newline).
 * @param {ImportKind} kind
 * @param {string} target
 */
function formatImportStatement(kind, target) {
  if (kind === 'include') {
    return `#include "${target}"`;
  }
  return `#pragma used dll "${target}"`;
}

/**
 * Human label for completions / diagnostics.
 * @param {MemorizedLibrary} lib
 */
function formatImportLabel(lib) {
  ensureImportMeta(lib);
  if (lib.importKind === 'include') {
    return `include · ${lib.importTarget}`;
  }
  return `dll · ${lib.importTarget}`;
}

/**
 * Markdown snippet describing how to import this library.
 * @param {MemorizedLibrary} lib
 */
function formatImportDoc(lib) {
  ensureImportMeta(lib);
  const stmt = formatImportStatement(lib.importKind, lib.importTarget);
  if (lib.importKind === 'include') {
    return `Include with: \`${stmt}\``;
  }
  return `Link with: \`${stmt}\``;
}

/**
 * @param {import('vscode').Uri} uri
 */
function scriptNameFromUri(uri) {
  let base = '';
  if (uri.scheme === 'file') {
    base = path.basename(uri.fsPath);
  } else {
    base = path.basename(uri.path || uri.fsPath || '');
  }
  if (!base) {
    return '';
  }
  // strip known extensions
  base = base.replace(/\.(bc|cl|bcl|script)$/i, '');
  // ignore pure temp hashes with no alpha
  if (!/[a-zA-Z]/.test(base)) {
    return '';
  }
  return base;
}

/**
 * Convert a script/package name to the usual object name used in
 * `#pragma used dll "..."`.
 * @param {string} scriptName
 */
function toObjectName(scriptName) {
  const s = scriptName.trim();
  if (!s) {
    return s;
  }
  // Already an object name (otccomdll0200, ottstprbhp, …)
  if (/^o[a-z]{2,}/i.test(s)) {
    return s;
  }
  return `o${s}`;
}

/**
 * Extract function headers from source. Handles multi-line headers:
 *   function extern long
 *   foo.bar(
 * @param {string} fullText
 * @returns {Array<{ name: string, header: string, isExtern: boolean, isStatic: boolean }>}
 */
function extractExportedFunctions(fullText) {
  // Mask block comments so we don't pick up examples inside them
  const text = fullText.replace(/\/\*[\s\S]*?\*\//g, m =>
    m.replace(/[^\n]/g, ' ')
  );
  const lines = text.split(/\r?\n/);
  /** @type {Array<{ name: string, header: string, isExtern: boolean, isStatic: boolean }>} */
  const out = [];
  /** @type {Set<string>} */
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const code = stripPipeComment(raw);
    if (!code.trim() || /^\s*#/.test(code)) {
      continue;
    }

    // Start of a function declaration?
    if (!/^\s*function\b/i.test(code)) {
      continue;
    }

    // Gather header lines until we see '{' or a line that isn't a continuation
    let header = code.trim();
    let j = i;
    while (j + 1 < lines.length && !/\{\s*$/.test(header) && !header.includes('(')) {
      j++;
      const next = stripPipeComment(lines[j]).trim();
      if (!next || next.startsWith('#')) {
        break;
      }
      header += ' ' + next;
    }
    // If we have '(' but not yet ')', keep pulling until ')' or '{'
    while (
      j + 1 < lines.length &&
      header.includes('(') &&
      !header.includes(')') &&
      !header.includes('{')
    ) {
      j++;
      const next = stripPipeComment(lines[j]).trim();
      if (!next) {
        continue;
      }
      header += ' ' + next;
    }

    const parsed = parseFunctionHeader(header);
    if (!parsed || parsed.isStatic) {
      continue;
    }
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(parsed);
  }

  return out;
}

/**
 * @param {string} header
 * @returns {{ name: string, header: string, isExtern: boolean, isStatic: boolean } | null}
 */
function parseFunctionHeader(header) {
  // function [extern|static] [type] name (
  const re =
    /^function(?:\s+(extern|static))?(?:\s+(?:long|double|string|void|boolean|domain\s+[\w.]+))?\s+([A-Za-z_][\w.]*)\s*\(/i;
  const m = re.exec(header.replace(/\s+/g, ' ').trim());
  if (!m) {
    return null;
  }
  const storage = (m[1] || '').toLowerCase();
  const fnName = m[2];
  if (!fnName) {
    return null;
  }
  // Clean header for display
  let clean = header.replace(/\s+/g, ' ').trim();
  const brace = clean.indexOf('{');
  if (brace >= 0) {
    clean = clean.slice(0, brace).trim();
  }
  return {
    name: fnName,
    header: clean,
    isExtern: storage === 'extern',
    isStatic: storage === 'static'
  };
}

/**
 * @param {string} line
 */
function stripPipeComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (!inString && ch === '|') {
      return line.slice(0, i);
    }
  }
  return line;
}

/**
 * Collect existing imports in a document.
 * @param {import('vscode').TextDocument} document
 * @returns {{ dlls: Set<string>, includes: Set<string> }}
 */
function collectUsedImports(document) {
  /** @type {Set<string>} */
  const dlls = new Set();
  /** @type {Set<string>} */
  const includes = new Set();
  const dllRe = /#\s*pragma\s+used\s+dll\s+("([^"]+)"|([^\s]+))/gi;
  const incRe = /#\s*include\s+(?:"([^"]+)"|<([^>]+)>)/gi;

  for (let i = 0; i < document.lineCount; i++) {
    const text = stripPipeComment(document.lineAt(i).text);

    dllRe.lastIndex = 0;
    let m;
    while ((m = dllRe.exec(text)) !== null) {
      const name = (m[2] || m[3] || '').trim();
      if (name) {
        dlls.add(name.toLowerCase());
        if (/^o/i.test(name)) {
          dlls.add(name.slice(1).toLowerCase());
        } else {
          dlls.add(`o${name}`.toLowerCase());
        }
      }
    }

    incRe.lastIndex = 0;
    while ((m = incRe.exec(text)) !== null) {
      const name = (m[1] || m[2] || '').trim();
      if (name) {
        // basename without extension for comparison
        const base = name
          .replace(/^.*[/\\]/, '')
          .replace(/\.(bc|cl|bcl|script|h)$/i, '');
        includes.add(name.toLowerCase());
        includes.add(base.toLowerCase());
        if (/^o/i.test(base)) {
          includes.add(base.slice(1).toLowerCase());
        }
      }
    }
  }
  return { dlls, includes };
}

/** @deprecated use collectUsedImports */
function collectUsedDlls(document) {
  return collectUsedImports(document).dlls;
}

/**
 * Whether a DLL object is already referenced via pragma.
 * @param {Set<string>} used
 * @param {string} objectName
 */
function isDllUsed(used, objectName) {
  const o = objectName.toLowerCase();
  if (used.has(o)) {
    return true;
  }
  if (o.startsWith('o') && used.has(o.slice(1))) {
    return true;
  }
  if (!o.startsWith('o') && used.has(`o${o}`)) {
    return true;
  }
  return false;
}

/**
 * @param {Set<string>} used
 * @param {string} includeName
 */
function isIncludeUsed(used, includeName) {
  const n = includeName.toLowerCase();
  if (used.has(n)) {
    return true;
  }
  const base = n
    .replace(/^.*[/\\]/, '')
    .replace(/\.(bc|cl|bcl|script|h)$/i, '');
  if (used.has(base)) {
    return true;
  }
  if (base.startsWith('o') && used.has(base.slice(1))) {
    return true;
  }
  return false;
}

/**
 * Whether the given library/import is already present in the document.
 * @param {import('vscode').TextDocument} document
 * @param {ImportKind} kind
 * @param {string} target
 */
function isImportPresent(document, kind, target) {
  const used = collectUsedImports(document);
  if (kind === 'include') {
    return isIncludeUsed(used.includes, target);
  }
  return isDllUsed(used.dlls, target);
}

/**
 * Find the best line to insert a new import.
 * - `#include` prefers after the last existing #include
 * - `#pragma used dll` prefers after includes / other pragmas
 * @param {import('vscode').TextDocument} document
 * @param {ImportKind} [kind]
 * @returns {number} line index
 */
function findImportInsertLine(document, kind = 'dll') {
  let lastInclude = -1;
  let lastPragma = -1;
  let insertAt = 0;
  let seenCode = false;

  for (let i = 0; i < Math.min(document.lineCount, 200); i++) {
    const raw = document.lineAt(i).text;
    const trimmed = raw.trim();
    if (!trimmed) {
      if (!seenCode) {
        insertAt = i + 1;
      }
      continue;
    }
    if (trimmed.startsWith('|') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      insertAt = i + 1;
      continue;
    }
    if (/^#\s*include\b/i.test(trimmed)) {
      lastInclude = i;
      insertAt = i + 1;
      seenCode = true;
      continue;
    }
    if (/^#\s*pragma\b/i.test(trimmed)) {
      lastPragma = i;
      insertAt = i + 1;
      seenCode = true;
      continue;
    }
    if (/^#\s*(define|undef|ifdef|ifndef|if|else|elif|endif|ident)\b/i.test(trimmed)) {
      insertAt = i + 1;
      seenCode = true;
      continue;
    }
    break;
  }

  if (kind === 'include' && lastInclude >= 0) {
    return lastInclude + 1;
  }
  if (kind === 'dll') {
    // After includes first, then after other pragmas
    if (lastPragma >= 0) {
      return lastPragma + 1;
    }
    if (lastInclude >= 0) {
      return lastInclude + 1;
    }
  }
  return Math.min(insertAt, document.lineCount);
}

/**
 * Build a TextEdit that inserts the correct import for a memorized library.
 * @param {import('vscode').TextDocument} document
 * @param {{ importKind?: ImportKind, importTarget?: string, objectName?: string, scriptName?: string }} lib
 * @returns {vscode.TextEdit | null}
 */
function createLibraryImportEdit(document, lib) {
  const kind =
    lib.importKind === 'include' || lib.importKind === 'dll'
      ? lib.importKind
      : detectImportKind(lib.scriptName || lib.importTarget || lib.objectName || '', '');
  const target =
    lib.importTarget ||
    importTargetFor(kind, lib.scriptName || '', lib.objectName || lib.importTarget || '');
  if (!target) {
    return null;
  }
  if (isImportPresent(document, kind, target)) {
    return null;
  }
  const line = findImportInsertLine(document, kind);
  const stmt = `${formatImportStatement(kind, target)}\n`;
  return vscode.TextEdit.insert(new vscode.Position(line, 0), stmt);
}

/**
 * Build a TextEdit that inserts `#pragma used dll "object"` (builtins / explicit DLL).
 * @param {import('vscode').TextDocument} document
 * @param {string} objectName
 * @returns {vscode.TextEdit | null}
 */
function createDllImportEdit(document, objectName) {
  return createLibraryImportEdit(document, {
    importKind: 'dll',
    importTarget: objectName,
    objectName
  });
}

/**
 * Build a TextEdit that inserts `#include "name"`.
 * @param {import('vscode').TextDocument} document
 * @param {string} includeName
 * @returns {vscode.TextEdit | null}
 */
function createIncludeImportEdit(document, includeName) {
  return createLibraryImportEdit(document, {
    importKind: 'include',
    importTarget: includeName,
    scriptName: includeName
  });
}

/**
 * Resolve optional builtin → DLL mapping (exact name, then prefix).
 * @param {string} functionName
 * @param {{ dll?: string } | null | undefined} [builtinMeta]
 * @returns {{ dll: string, label: string } | null}
 */
function resolveBuiltinDll(functionName, builtinMeta) {
  if (builtinMeta && builtinMeta.dll) {
    return { dll: builtinMeta.dll, label: builtinMeta.dll };
  }
  const lower = functionName.toLowerCase();
  if (BUILTIN_DLL_MAP[lower]) {
    return { dll: BUILTIN_DLL_MAP[lower], label: BUILTIN_DLL_MAP[lower] };
  }
  for (const rule of BUILTIN_DLL_PREFIXES) {
    if (lower.startsWith(rule.prefix.toLowerCase())) {
      return { dll: rule.dll, label: rule.label || rule.dll };
    }
  }
  return null;
}

/**
 * Scan document for call-like identifiers that may need a library import.
 * Returns unique function names that appear as `name(` and are not defined locally.
 * @param {import('vscode').TextDocument} document
 * @param {Set<string>} localFunctionNames lowercase
 * @returns {Array<{ name: string, line: number, col: number }>}
 */
function findCallSites(document, localFunctionNames) {
  /** @type {Array<{ name: string, line: number, col: number }>} */
  const sites = [];
  /** @type {Set<string>} */
  const reported = new Set();
  // identifier followed by '(' — Baan dotted names allowed
  const re = /(?<![.\w])([A-Za-z_][\w.]*)\s*\(/g;

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const code = stripPipeComment(raw);
    if (!code.trim() || /^\s*#/.test(code) || /^\s*function\b/i.test(code)) {
      continue;
    }
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code)) !== null) {
      const name = m[1];
      const key = name.toLowerCase();
      // Skip keywords / control
      if (CALL_SKIP.has(key)) {
        continue;
      }
      if (localFunctionNames.has(key)) {
        continue;
      }
      // Skip if inside string (odd number of quotes before)
      const before = code.slice(0, m.index);
      if ((before.match(/"/g) || []).length % 2 === 1) {
        continue;
      }
      if (reported.has(key)) {
        continue;
      }
      reported.add(key);
      sites.push({ name, line: i, col: m.index });
    }
  }
  return sites;
}

const CALL_SKIP = new Set(
  [
    'if', 'while', 'for', 'switch', 'return', 'case', 'on',
    'select', 'selectdo', 'selectempty', 'selecteos', 'selecterror',
    'where', 'from', 'and', 'or', 'not', 'in', 'between',
    'function', 'domain', 'table', 'long', 'double', 'string', 'boolean', 'void',
    'extern', 'static', 'common', 'ref', 'reference', 'const',
    'true', 'false', 'based', 'fixed', 'mb'
  ].map(s => s.toLowerCase())
);

/**
 * Human-readable relative time for the manage UI.
 * @param {number} ts
 */
function formatAge(ts) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) {
    return 'just now';
  }
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    return `${m}m ago`;
  }
  if (sec < 86400) {
    const h = Math.floor(sec / 3600);
    return `${h}h ago`;
  }
  const d = Math.floor(sec / 86400);
  return `${d}d ago`;
}

/**
 * Interactive manager (QuickPick) to inspect / remove memorized libraries.
 * @param {ReturnType<typeof createLibraryMemory>} memory
 */
async function showLibraryMemoryManager(memory) {
  const libs = memory.listLibraries();
  if (!libs.length) {
    await vscode.window.showInformationMessage(
      'No memorized Baan C libraries yet. Open a library/include .bc file while developing in BECS to remember its functions.'
    );
    return;
  }

  /** @type {vscode.QuickPickItem & { libraryId?: string, isClear?: boolean }} */
  const clearItem = {
    label: '$(trash) Clear all memorized libraries…',
    description: `${memory.stats.libraries} libraries · ${memory.stats.functions} functions`,
    isClear: true
  };

  const items = [
    clearItem,
    ...libs.map(lib => {
      ensureImportMeta(lib);
      const kindTag = lib.importKind === 'include' ? 'include' : 'dll';
      const n =
        lib.importKind === 'include'
          ? lib.functions.length
          : lib.functions.filter(f => f.isExtern).length;
      return {
        label: `$(library) ${lib.importTarget}`,
        description: `${kindTag} · ${n} functions · ${formatAge(lib.lastSeen)}`,
        detail: `${formatImportStatement(lib.importKind, lib.importTarget)} · script ${lib.scriptName}` +
          (lib.sourceHint ? ` · ${lib.sourceHint}` : ''),
        libraryId: lib.id
      };
    })
  ];

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Baan C: Memorized Libraries',
    placeHolder: 'Select a library to manage, or clear all',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (!picked) {
    return;
  }

  if (picked.isClear) {
    const confirm = await vscode.window.showWarningMessage(
      `Remove all ${memory.stats.libraries} memorized libraries (${memory.stats.functions} functions)?`,
      { modal: true },
      'Clear all'
    );
    if (confirm === 'Clear all') {
      memory.clearAll();
      vscode.window.showInformationMessage('Memorized libraries cleared.');
    }
    return;
  }

  if (!picked.libraryId) {
    return;
  }

  const lib = memory.listLibraries().find(l => l.id === picked.libraryId);
  if (!lib) {
    return;
  }
  ensureImportMeta(lib);

  const action = await vscode.window.showQuickPick(
    [
      {
        label: '$(trash) Remove this library',
        description: `Forget ${lib.importTarget} and all its functions`,
        action: 'remove-lib'
      },
      {
        label:
          lib.importKind === 'include'
            ? '$(symbol-misc) Treat as DLL (#pragma used dll)'
            : '$(file-code) Treat as include (#include)',
        description: `Currently: ${formatImportStatement(lib.importKind, lib.importTarget)}`,
        action: 'toggle-kind'
      },
      {
        label: '$(list-unordered) Remove individual functions…',
        description: `${lib.functions.length} functions`,
        action: 'remove-fn'
      },
      {
        label: '$(info) Show function list',
        description: 'Read-only list',
        action: 'list'
      }
    ],
    { title: lib.importTarget, placeHolder: 'Choose an action' }
  );

  if (!action) {
    return;
  }

  if (action.action === 'remove-lib') {
    memory.removeLibrary(lib.id);
    vscode.window.showInformationMessage(`Forgot library ${lib.importTarget}.`);
    return;
  }

  if (action.action === 'toggle-kind') {
    const next = lib.importKind === 'include' ? 'dll' : 'include';
    memory.setImportKind(lib.id, next);
    const updated = memory.listLibraries().find(l => l.id === lib.id);
    if (updated) {
      ensureImportMeta(updated);
      vscode.window.showInformationMessage(
        `Now imports as: ${formatImportStatement(updated.importKind, updated.importTarget)}`
      );
    }
    return;
  }

  if (action.action === 'list') {
    const list = lib.functions
      .map(f => `${f.isExtern ? 'extern' : '     '} ${f.name}`)
      .join('\n');
    const doc = await vscode.workspace.openTextDocument({
      content:
        `| Memorized from ${lib.scriptName}\n` +
        `| Import: ${formatImportStatement(lib.importKind, lib.importTarget)}\n` +
        `| Last seen: ${new Date(lib.lastSeen).toLocaleString()}\n\n` +
        `${list}\n`,
      language: 'baanc'
    });
    await vscode.window.showTextDocument(doc, { preview: true });
    return;
  }

  if (action.action === 'remove-fn') {
    const fnItems = lib.functions.map(f => ({
      label: f.name,
      description: f.isExtern ? 'extern' : '',
      detail: f.header,
      picked: false
    }));
    const selected = await vscode.window.showQuickPick(fnItems, {
      title: `Remove functions from ${lib.importTarget}`,
      placeHolder: 'Select functions to forget (multi-select)',
      canPickMany: true,
      matchOnDetail: true
    });
    if (!selected || !selected.length) {
      return;
    }
    for (const s of selected) {
      memory.removeFunction(lib.id, s.label);
    }
    vscode.window.showInformationMessage(
      `Removed ${selected.length} function(s) from ${lib.importTarget}.`
    );
  }
}

module.exports = {
  createLibraryMemory,
  extractExportedFunctions,
  collectUsedDlls,
  collectUsedImports,
  isDllUsed,
  isIncludeUsed,
  isImportPresent,
  findImportInsertLine,
  createLibraryImportEdit,
  createDllImportEdit,
  createIncludeImportEdit,
  resolveBuiltinDll,
  findCallSites,
  showLibraryMemoryManager,
  toObjectName,
  scriptNameFromUri,
  detectImportKind,
  importTargetFor,
  formatImportStatement,
  formatImportLabel,
  formatImportDoc,
  ensureImportMeta,
  IMPORT_CODE,
  BUILTIN_DLL_MAP,
  BUILTIN_DLL_PREFIXES,
  formatAge
};
