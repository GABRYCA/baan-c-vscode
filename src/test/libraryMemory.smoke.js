/**
 * Lightweight smoke tests for library extraction + import-kind detection.
 * Run: node src/test/libraryMemory.smoke.js
 */
const assert = require('assert');

/**
 * Convert a script name to the usual `o...` DLL object name.
 * @param {string} scriptName
 * @returns {string}
 */
function toObjectName(scriptName) {
  const s = scriptName.trim();
  if (!s) {
    return s;
  }
  if (/^o[a-z]{2,}/i.test(s)) {
    return s;
  }
  return `o${s}`;
}

/**
 * Classify a remembered source as an include or a compiled DLL.
 * @param {string} scriptName
 * @param {string} [text]
 * @returns {'include' | 'dll'}
 */
function detectImportKind(scriptName, text = '') {
  const base = (scriptName || '').replace(/\.(bc|cl|bcl|script)$/i, '');
  const name = base.replace(/^o/i, '');

  if (/dll/i.test(name)) {
    return 'dll';
  }

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
 * Build the target used by the matching import statement.
 * @param {'include' | 'dll'} kind
 * @param {string} scriptName
 * @param {string} objectName
 * @returns {string}
 */
function importTargetFor(kind, scriptName, objectName) {
  if (kind === 'include') {
    return (scriptName || '').replace(/^o/i, '') || scriptName;
  }
  return objectName || toObjectName(scriptName);
}

/**
 * Render a complete import directive without a trailing newline.
 * @param {'include' | 'dll'} kind
 * @param {string} target
 * @returns {string}
 */
function formatImportStatement(kind, target) {
  if (kind === 'include') {
    return `#include "${target}"`;
  }
  return `#pragma used dll "${target}"`;
}

/**
 * Remove a trailing `|` comment while ignoring pipes inside strings.
 * @param {string} line
 * @returns {string}
 */
function stripPipeComment(line) {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
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
 * Parse a normalized `function ...` header into name and storage class.
 * @param {string} header
 * @returns {{ name: string, isExtern: boolean, isStatic: boolean } | null}
 */
function parseFunctionHeader(header) {
  const re =
    /^function(?:\s+(extern|static))?(?:\s+(?:long|double|string|void|boolean|domain\s+[\w.]+))?\s+([A-Za-z_][\w.]*)\s*\(/i;
  const m = re.exec(header.replace(/\s+/g, ' ').trim());
  if (!m) {
    return null;
  }
  const storage = (m[1] || '').toLowerCase();
  return {
    name: m[2],
    isExtern: storage === 'extern',
    isStatic: storage === 'static'
  };
}

/**
 * Extract function headers from Baan C source, including multi-line headers.
 * @param {string} fullText
 * @returns {Array<{ name: string, header: string, isExtern: boolean, isStatic: boolean }>}
 */
function extractExportedFunctions(fullText) {
  const text = fullText.replace(/\/\*[\s\S]*?\*\//g, m =>
    m.replace(/[^\n]/g, ' ')
  );
  const lines = text.split(/\r?\n/);
  const out = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const code = stripPipeComment(lines[i]);
    if (!code.trim() || /^\s*#/.test(code)) {
      continue;
    }
    if (!/^\s*function\b/i.test(code)) {
      continue;
    }
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

// ── object names ──────────────────────────────────────────────────────
assert.strictEqual(toObjectName('tccomdll0200'), 'otccomdll0200');
assert.strictEqual(toObjectName('otccomdll0200'), 'otccomdll0200');

// ── import kind detection ─────────────────────────────────────────────
assert.strictEqual(detectImportKind('itxadv0000'), 'include');
assert.strictEqual(detectImportKind('itccom0001'), 'include');
assert.strictEqual(detectImportKind('tccomdll0200'), 'dll');
assert.strictEqual(detectImportKind('otccomdll0200'), 'dll');
assert.strictEqual(
  detectImportKind('helpers', 'function extern long foo()\n{\n}\n'),
  'dll'
);
assert.strictEqual(
  detectImportKind('helpers', '#define A 1\n#define B 2\n'),
  'include'
);

// ── import statements ─────────────────────────────────────────────────
assert.strictEqual(
  formatImportStatement('include', 'itxadv0000'),
  '#include "itxadv0000"'
);
assert.strictEqual(
  formatImportStatement('dll', 'otccomdll0200'),
  '#pragma used dll "otccomdll0200"'
);
assert.strictEqual(
  importTargetFor('include', 'itxadv0000', 'oitxadv0000'),
  'itxadv0000'
);
assert.strictEqual(
  importTargetFor('dll', 'tccomdll0200', 'otccomdll0200'),
  'otccomdll0200'
);

// ── function extraction ───────────────────────────────────────────────
const sample = `
| library sample
function extern long tccom.dll.browse(
	long i.mode)
{
	return(0)
}

function static void local.only()
{
}

function extern void other.export()
{
}
`;

const fns = extractExportedFunctions(sample);
assert.strictEqual(fns.length, 2);
assert.ok(fns.some(f => f.name === 'tccom.dll.browse' && f.isExtern));
assert.ok(fns.some(f => f.name === 'other.export' && f.isExtern));
assert.ok(!fns.some(f => f.name === 'local.only'));

const multi = `
function extern long
	foo.bar(
	domain tccom.item i.item)
{
}
`;
const multiFns = extractExportedFunctions(multi);
assert.strictEqual(multiFns.length, 1);
assert.strictEqual(multiFns[0].name, 'foo.bar');

// Include-style file: non-extern functions still extractable
const includeSample = `
function long itx.helper(long i.x)
{
	return(i.x)
}
`;
const incFns = extractExportedFunctions(includeSample);
assert.strictEqual(incFns.length, 1);
assert.strictEqual(incFns[0].name, 'itx.helper');
assert.strictEqual(incFns[0].isExtern, false);
assert.strictEqual(detectImportKind('itxadv0000', includeSample), 'include');

// ── string-aware comment stripping (Baan C has no backslash escapes) ─────────
// In Baan C every `"` toggles string state and embedded quotes are doubled (""),
// so a backslash is a plain character and must never hide a trailing `|` comment.
assert.strictEqual(
  stripPipeComment('msg("C:\\temp\\file.txt") | note'),
  'msg("C:\\temp\\file.txt") '
);
// Backslash immediately before the closing quote still ends the string.
assert.strictEqual(stripPipeComment('msg("a\\") | note'), 'msg("a\\") ');
// Doubled quotes ("" = embedded quote) balance out by parity.
assert.strictEqual(
  stripPipeComment('"He said ""Hi"" to me" | note'),
  '"He said ""Hi"" to me" '
);
// A `|` inside a string is part of the string, not a comment.
assert.strictEqual(stripPipeComment('select "a|b" from t | note'), 'select "a|b" from t ');
// A comment before a string removes the whole line.
assert.strictEqual(stripPipeComment('| full comment "a\\b"'), '');

// ── function extraction ───────────────────────────────────────────────────────
const withStr = `
| library sample
function extern long util.concat(
	long i.a,
	string i.b, | inline note with "C:\\tmp\\x"
	long i.c)
{
	return(0)
}
`;
const strFns = extractExportedFunctions(withStr);
assert.strictEqual(strFns.length, 1);
assert.strictEqual(strFns[0].name, 'util.concat');
assert.strictEqual(strFns[0].isExtern, true);

console.log('libraryMemory smoke tests passed');
