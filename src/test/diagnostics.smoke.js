/**
 * Smoke tests for block diagnostics.
 *
 * The extension module expects the `vscode` API. This test installs a small
 * mock before requiring the module, then calls the exported runDiagnostics
 * function with plain document objects.
 *
 * Run: node src/test/diagnostics.smoke.js
 */
const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

/** Minimal vscode API surface used by runDiagnostics. */
class Position {
  constructor(line, character) {
    this.line = line;
    this.character = character;
  }
}

class Range {
  constructor(startLine, startCharacter, endLine, endCharacter) {
    this.start = new Position(startLine, startCharacter);
    this.end = new Position(endLine, endCharacter);
  }
}

const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3
};

class Diagnostic {
  constructor(range, message, severity) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}

class SnippetString {
  constructor(value) {
    this.value = value;
  }
}

const vscodeMock = {
  Position,
  Range,
  Diagnostic,
  DiagnosticSeverity,
  SnippetString,
  TextEdit: { replace: (range, newText) => ({ range, newText }) },
  FoldingRange: class {},
  FoldingRangeKind: {},
  SymbolKind: {},
  CompletionItemKind: {},
  MarkdownString: class {},
  Hover: class {},
  CodeActionKind: { QuickFix: 'quickfix' }
};

const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'vscode') {
    return vscodeMock;
  }
  return originalLoad.apply(this, arguments);
};

const extensionPath = path.join(__dirname, '..', 'extension.js');
const extensionModule = new Module(extensionPath, module);
extensionModule.filename = extensionPath;
extensionModule.paths = Module._nodeModulePaths(path.dirname(extensionPath));
extensionModule._compile(fs.readFileSync(extensionPath, 'utf8'), extensionPath);

const { runDiagnostics } = extensionModule.exports;

/**
 * Build a document object with the small surface runDiagnostics needs.
 * @param {string} text
 * @returns {object}
 */
function makeDocument(text) {
  const lines = text.split('\n');
  return {
    uri: { scheme: 'untitled', path: 'diagnostics-smoke.bc', fsPath: 'diagnostics-smoke.bc' },
    languageId: 'baanc',
    lineCount: lines.length,
    getText: () => text,
    lineAt: lineNumber => ({
      text: lines[lineNumber],
      range: new Range(lineNumber, 0, lineNumber, lines[lineNumber].length)
    })
  };
}

const cfg = {
  diagnosticsEnabled: true,
  strictComments: true,
  namingConventions: false,
  namingArgPrefixes: false,
  libraryMemoryEnabled: false,
  autoImportBuiltinHints: false
};

/**
 * Run diagnostics and return the collected diagnostics.
 * @param {string} text
 * @returns {Array<{ message: string, severity: number }>}
 */
function diagnose(text) {
  const diagnostics = [];
  const collection = {
    set: (_uri, list) => {
      diagnostics.push(...list);
    }
  };
  runDiagnostics(makeDocument(text), collection, cfg, null);
  return diagnostics;
}

// `else if ... then` opens a nested if and needs its own endif.
// This mirrors the nested on case structure found in real Baan C DLL sources.
const nestedCase = `
on case txamd.type
case txamd.type.enumerated:
    if txamd.dept > 1 then
        if txamd.atyp = txamd.atyp.enumcode then
            count = count + 1
        else
            count = count + 1
        endif
    else if txamd.atyp = txamd.atyp.enumcode then
        count = count + 1
    else
        count = count + 1
    endif
    endif
    break
endcase
`;

const nestedDiagnostics = diagnose(nestedCase);
const nestedErrors = nestedDiagnostics.filter(
  d => d.severity === DiagnosticSeverity.Error
);
assert.strictEqual(
  nestedErrors.length,
  0,
  `expected no block errors, got: ${nestedErrors.map(d => d.message).join('; ')}`
);

// A genuinely unmatched endif must still be reported.
const unmatched = `
if value = 1 then
endif
endif
`;
const unmatchedErrors = diagnose(unmatched).filter(
  d => d.severity === DiagnosticSeverity.Error
);
assert.strictEqual(unmatchedErrors.length, 1);
assert.ok(/Unmatched "endif"/.test(unmatchedErrors[0].message));

console.log('diagnostics smoke tests passed');
