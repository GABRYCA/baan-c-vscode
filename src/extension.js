const vscode = require('vscode');

/** @typedef {{ type: string, line: number, text: string }} BlockFrame */

const CONTROL_KEYWORDS = [
  'if', 'then', 'else', 'elif', 'endif',
  'while', 'endwhile',
  'for', 'to', 'step', 'endfor',
  'repeat', 'until',
  'on', 'case', 'default', 'endcase',
  'break', 'continue', 'goto', 'return',
  'function', 'prototype',
  'select', 'selectdo', 'selectempty', 'selecteos', 'selecterror', 'endselect',
  'selectbind', 'wherebind',
  'from', 'where', 'having', 'union', 'distinct', 'all', 'as', 'asc', 'desc',
  'join', 'inner', 'outer', 'left', 'right', 'cross',
  'in', 'between', 'like', 'alike', 'exists', 'null',
  'update', 'delete', 'set', 'into',
  'and', 'or', 'not',
  'void', 'ref', 'reference', 'const', 'based', 'fixed', 'mb'
];

const TYPE_KEYWORDS = [
  'long', 'double', 'boolean', 'string', 'table', 'domain'
];

const STORAGE_KEYWORDS = [
  'extern', 'static', 'common'
];

const SQL_KEYWORDS = [
  'select', 'from', 'where', 'group by', 'order by', 'having',
  'selectdo', 'selectempty', 'selecteos', 'selecterror', 'endselect',
  'selectbind', 'wherebind', 'for update', 'with retry',
  'union', 'distinct', 'join', 'inner join', 'left join', 'right join',
  'between', 'in', 'like', 'alike', 'exists', 'is null', 'not null',
  'refers to', 'order by', 'group by'
];

const PREPROCESSOR = [
  '#include', '#define', '#undef', '#if', '#ifdef', '#ifndef',
  '#else', '#elif', '#endif', '#pragma', '#ident',
  '__FILE__', '__LINE__', '__FUNCTION__', '__FUNCTION_CP__', '__OBJECT__'
];

const FOURGL_SECTIONS = [
  'declaration:', 'before.program:', 'after.program:', 'on.error:',
  'after.form.read:', 'after.update.db.commit:',
  'before.display.object:', 'after.display.object:',
  'main.table.io:', 'functions:',
  'before.input:', 'after.input:', 'before.display:', 'after.display:',
  'before.checks:', 'after.checks:', 'before.field:', 'after.field:',
  'when.field.changes:', 'before.zoom:', 'after.zoom:',
  'before.choice:', 'after.choice:', 'on.choice:',
  'before.form:', 'after.form:', 'before.group:', 'after.group:',
  'before.read:', 'after.read:', 'before.write:', 'after.write:',
  'before.rewrite:', 'after.rewrite:', 'before.delete:', 'after.delete:'
];

const CONSTANTS = ['true', 'false', 'pi', 'TRUE', 'FALSE', 'PI'];

const HOVER_DOCS = {
  if: '```baanc\nif <condition> then\n    ...\n[elif <condition> then\n    ...]\n[else\n    ...]\nendif\n```\nConditional transfer of control. Use **elif** (TIV 2330+) instead of nested else-if.',
  then: 'Part of `if <condition> then`. Required after the condition.',
  else: 'Alternative branch of an `if` / `elif` chain. Closed by `endif`.',
  elif: 'Else-if branch (TIV 2330+). Equal to `else if ... then` without an extra `endif`.',
  endif: 'Closes an `if` / `elif` / `else` block.',
  while: '```baanc\nwhile <expression>\n    ...\nendwhile\n```\nLoop while expression is TRUE (non-zero).',
  endwhile: 'Closes a `while` loop.',
  for: '```baanc\nfor <var> = <start> to <end> [step <step>]\n    ...\nendfor\n```\nNumeric for-loop. Default step is 1; step may be negative.',
  to: 'Upper bound of a `for` loop.',
  step: 'Optional step size of a `for` loop (default 1).',
  endfor: 'Closes a `for` loop.',
  repeat: '```baanc\nrepeat\n    ...\nuntil <expression>\n```\nPost-test loop; body runs at least once. Loop ends when expression becomes non-zero.',
  until: 'Condition of a `repeat ... until` loop.',
  case: 'Label inside `on case`. Acts as a fall-through label; use `break` to leave the case.',
  default: 'Default label inside `on case` (optional).',
  endcase: 'Closes an `on case` block.',
  break: 'Exit the innermost loop, or leave the current `on case` level.',
  continue: 'Continue with the next iteration of the innermost loop.',
  goto: '```baanc\ngoto LABEL_NAME\n...\nLABEL_NAME:\n```\nUnconditional jump. Label and `goto` must be in the same function.',
  return: '```baanc\nreturn\nreturn(value)\n```\nReturn from a function. Void functions must not return a value.',
  function: '```baanc\nfunction [type] name([REF|CONST] type arg, ...)\n{\n    ...\n    return[(value)]\n}\n```\nTypes: `long`, `double`, `string`, `domain <name>`, `void` (default). Body is brace-delimited.',
  select: '```baanc\nselect <columns>\nfrom <table>\n[where ...]\n[selectdo ...]\n[selecteos ...]\n[selectempty ...]\n[selecterror ...]\nendselect\n```\nEmbedded SQL loop.',
  selectdo: 'Body executed for each selected record.',
  selectempty: 'Branch when the query returns no rows.',
  selecteos: 'Executed after the last selected record (before leaving the loop).',
  selecterror: 'Error branch (needs `db.set.error.bypass.on()`). Default action is `break`.',
  endselect: 'Closes an embedded SQL `select` block.',
  selectbind: '```baanc\nselectbind(n, variable)\n```\nBind pseudo-variable `:n` in the select list.',
  wherebind: '```baanc\nwherebind(n, expression)\n```\nBind pseudo-variable `:n` in the WHERE clause.',
  long: 'Integer type (signed 32-bit, or 64-bit in 64-bit bshell mode).',
  double: 'Floating-point type (IEEE 64-bit, ~15 significant digits).',
  boolean: 'Boolean type: `true` / `false`.',
  string: '```baanc\nstring name(length) [MB] [FIXED] [BASED]\n```\nString variable. Max length 1024 characters.',
  table: '```baanc\ntable txxxxxx\n```\nDeclares a database table pointer. Name must start with `t`. Fields are auto-declared.',
  domain: '```baanc\ndomain <domain_name> var[, var2(n)]\n```\nVariable typed from the data dictionary (preferred for table fields / enums / sets).',
  extern: 'Export variable name to the object symbol table (forms, other programs, `expr.compile`, `get.var` / `put.var`).',
  static: 'Static local variable inside a function (retains value between calls).',
  const: 'Const function argument (or BASED variable).',
  ref: 'Pass-by-reference function argument (alias of `reference`).',
  reference: 'Pass-by-reference function argument.',
  based: 'Based string/array (size determined at runtime).',
  fixed: 'Fixed one-dimensional string.',
  mb: 'Multi-byte string option.',
  true: 'Boolean constant TRUE (value 1).',
  false: 'Boolean constant FALSE (value 0).',
  pi: 'Symbolic constant π ≈ 3.141592653589793.',
  and: 'Logical AND.',
  or: 'Logical OR.',
  not: 'Logical NOT (unary).',
  void: 'Function return type meaning “no value”.'
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const selector = { language: 'baanc', scheme: 'file' };
  const output = vscode.window.createOutputChannel('Baan C');
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('baanc');

  let cfg = loadConfig();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('baanc')) {
        cfg = loadConfig();
        vscode.workspace.textDocuments
          .filter(d => d.languageId === 'baanc')
          .forEach(d => runDiagnostics(d, diagnosticCollection, cfg));
      }
    })
  );

  // ---------- Completion ----------
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    selector,
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position).text;
        const prefix = line.slice(0, position.character);
        /** @type {vscode.CompletionItem[]} */
        const items = [];

        const add = (label, kind, detail, insertText) => {
          const item = new vscode.CompletionItem(label, kind);
          item.detail = detail;
          if (insertText) {
            item.insertText = insertText;
          }
          items.push(item);
        };

        CONTROL_KEYWORDS.forEach(k =>
          add(k, vscode.CompletionItemKind.Keyword, 'keyword')
        );
        TYPE_KEYWORDS.forEach(k =>
          add(k, vscode.CompletionItemKind.TypeParameter, 'type')
        );
        STORAGE_KEYWORDS.forEach(k =>
          add(k, vscode.CompletionItemKind.Keyword, 'storage')
        );
        CONSTANTS.forEach(k =>
          add(k, vscode.CompletionItemKind.Constant, 'constant')
        );

        if (cfg.completionIncludeSql) {
          SQL_KEYWORDS.forEach(k =>
            add(k, vscode.CompletionItemKind.Keyword, 'SQL')
          );
        }
        if (cfg.completionIncludePreprocessor) {
          PREPROCESSOR.forEach(k =>
            add(k, vscode.CompletionItemKind.Snippet, 'preprocessor')
          );
        }
        if (cfg.completionInclude4gl) {
          FOURGL_SECTIONS.forEach(k =>
            add(k, vscode.CompletionItemKind.Module, '4GL section')
          );
        }

        // Snippet-like multi-line completions for main blocks
        const blockSnippets = [
          {
            label: 'if-then-endif',
            body: 'if ${1:condition} then\n\t$0\nendif'
          },
          {
            label: 'while-endwhile',
            body: 'while ${1:condition}\n\t$0\nendwhile'
          },
          {
            label: 'for-endfor',
            body: 'for ${1:i} = ${2:1} to ${3:n}\n\t$0\nendfor'
          },
          {
            label: 'function-block',
            body: 'function ${1:name}(${2})\n{\n\t$0\n}'
          },
          {
            label: 'select-endselect',
            body: 'select ${1:*}\nfrom ${2:table}\nwhere ${3:cond}\nselectdo\n\t$0\nendselect'
          }
        ];
        blockSnippets.forEach(s => {
          const item = new vscode.CompletionItem(
            s.label,
            vscode.CompletionItemKind.Snippet
          );
          item.insertText = new vscode.SnippetString(s.body);
          item.detail = 'Baan C block';
          items.push(item);
        });

        // Context: after '#' suggest directives
        if (/^\s*#\w*$/.test(prefix.trimStart() === '#' ? '#' : prefix)) {
          // still return all; VS Code filters
        }

        return items;
      }
    },
    '#', '.'
  );

  // ---------- Hover ----------
  const hoverProvider = vscode.languages.registerHoverProvider(selector, {
    provideHover(document, position) {
      const wordRange = document.getWordRangeAtPosition(
        position,
        /[A-Za-z_][\w.]*/
      );
      if (!wordRange) {
        return null;
      }
      const word = document.getText(wordRange);
      const key = word.toLowerCase();

      // Multi-word: "on case", "group by", ...
      const line = document.lineAt(position.line).text;
      const lower = line.toLowerCase();
      if (/\bon\s+case\b/.test(lower) && (key === 'on' || key === 'case')) {
        return makeHover(
          '```baanc\non case <expression>\ncase <value>:\n    ...\n    break\ndefault:\n    ...\nendcase\n```\nMulti-way branch. CASE labels fall through; use `break`. Expression must be long or string.',
          wordRange
        );
      }
      if (key === 'group' || key === 'order') {
        // leave to docs if combined
      }

      if (Object.prototype.hasOwnProperty.call(HOVER_DOCS, key)) {
        return makeHover(HOVER_DOCS[key], wordRange);
      }

      // function() call hover: show "function call"
      const after = document.getText(
        new vscode.Range(position.line, wordRange.end.character, position.line, wordRange.end.character + 1)
      );
      if (after === '(') {
        return makeHover(`Function call: \`${word}(...)\``, wordRange);
      }

      return null;
    }
  });

  // ---------- Document symbols ----------
  const symbolProvider = vscode.languages.registerDocumentSymbolProvider(selector, {
    provideDocumentSymbols(document) {
      /** @type {vscode.DocumentSymbol[]} */
      const symbols = [];
      const functionRe =
        /^\s*function(?:\s+(?:long|double|string|void|domain\s+[\w.]+))?\s+([A-Za-z_][\w.]*)\s*\(/i;
      const domainRe = /^\s*domain\s+([\w.]+)\s+([A-Za-z_][\w.]*)/i;
      const tableRe = /^\s*table\s+(t[\w.]+)/i;
      const sectionRe =
        /^\s*((?:declaration|before\.program|after\.program|on\.error|main\.table\.io|functions)\s*:|(?:field|form|group|choice|zoom\.from)\.[\w.*]+\s*:)/i;
      const externRe =
        /^\s*extern\s+(?:long|double|boolean|string|domain\s+[\w.]+)\s+([A-Za-z_][\w.]*)/i;
      const labelRe = /^\s*([A-Za-z][\w.]*)\s*:\s*$/;

      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = stripLineComment(line.text);
        if (!text.trim() || isBlockCommentOnly(text)) {
          continue;
        }

        let m = functionRe.exec(text);
        if (m) {
          const name = m[1];
          // find closing brace roughly for full range
          const start = i;
          let end = i;
          let depth = 0;
          let seenBrace = false;
          for (let j = i; j < document.lineCount; j++) {
            const t = stripLineComment(document.lineAt(j).text);
            for (const ch of t) {
              if (ch === '{') {
                depth++;
                seenBrace = true;
              } else if (ch === '}') {
                depth--;
              }
            }
            if (seenBrace && depth <= 0) {
              end = j;
              break;
            }
          }
          const range = new vscode.Range(start, 0, end, document.lineAt(end).text.length);
          const sel = new vscode.Range(i, m.index, i, m.index + m[0].length);
          symbols.push(
            new vscode.DocumentSymbol(
              name,
              'function',
              vscode.SymbolKind.Function,
              range,
              sel
            )
          );
          continue;
        }

        m = tableRe.exec(text);
        if (m) {
          const range = line.range;
          symbols.push(
            new vscode.DocumentSymbol(
              m[1],
              'table',
              vscode.SymbolKind.Struct,
              range,
              range
            )
          );
          continue;
        }

        m = domainRe.exec(text);
        if (m) {
          const range = line.range;
          symbols.push(
            new vscode.DocumentSymbol(
              m[2],
              `domain ${m[1]}`,
              vscode.SymbolKind.Variable,
              range,
              range
            )
          );
          continue;
        }

        m = externRe.exec(text);
        if (m) {
          const range = line.range;
          symbols.push(
            new vscode.DocumentSymbol(
              m[1],
              'extern',
              vscode.SymbolKind.Variable,
              range,
              range
            )
          );
          continue;
        }

        m = sectionRe.exec(text);
        if (m) {
          const range = line.range;
          symbols.push(
            new vscode.DocumentSymbol(
              m[1].replace(/:$/, ''),
              '4GL section',
              vscode.SymbolKind.Namespace,
              range,
              range
            )
          );
          continue;
        }

        m = labelRe.exec(text);
        if (m && !/^(case|default)$/i.test(m[1])) {
          const range = line.range;
          symbols.push(
            new vscode.DocumentSymbol(
              m[1],
              'label',
              vscode.SymbolKind.Key,
              range,
              range
            )
          );
        }
      }
      return symbols;
    }
  });

  // ---------- Definition (goto function in same file) ----------
  const definitionProvider = vscode.languages.registerDefinitionProvider(selector, {
    provideDefinition(document, position) {
      const wordRange = document.getWordRangeAtPosition(
        position,
        /[A-Za-z_][\w.]*/
      );
      if (!wordRange) {
        return null;
      }
      const word = document.getText(wordRange);
      const functionRe = new RegExp(
        `^\\s*function(?:\\s+(?:long|double|string|void|domain\\s+[\\w.]+))?\\s+(${escapeRegExp(
          word
        )})\\s*\\(`,
        'i'
      );
      for (let i = 0; i < document.lineCount; i++) {
        const text = document.lineAt(i).text;
        const m = functionRe.exec(text);
        if (m) {
          return new vscode.Location(
            document.uri,
            new vscode.Position(i, m.index)
          );
        }
      }
      return null;
    }
  });

  // ---------- Formatting ----------
  const formattingProvider =
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      provideDocumentFormattingEdits(document) {
        return formatDocument(document, cfg.indentSize);
      }
    });

  const rangeFormattingProvider =
    vscode.languages.registerDocumentRangeFormattingEditProvider(selector, {
      provideDocumentRangeFormattingEdits(document, range) {
        // Format whole doc then restrict — simple & reliable for Baan blocks
        const all = formatDocument(document, cfg.indentSize);
        return all.filter(e => range.intersection(e.range));
      }
    });

  const willSave = vscode.workspace.onWillSaveTextDocument(e => {
    if (cfg.formatOnSave && e.document.languageId === 'baanc') {
      e.waitUntil(
        Promise.resolve(formatDocument(e.document, cfg.indentSize))
      );
    }
  });

  // ---------- Diagnostics ----------
  const schedule = debounce(doc => {
    runDiagnostics(doc, diagnosticCollection, cfg);
  }, 200);

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.languageId === 'baanc') {
        schedule(e.document);
      }
    }),
    vscode.workspace.onDidOpenTextDocument(doc => {
      if (doc.languageId === 'baanc') {
        runDiagnostics(doc, diagnosticCollection, cfg);
      }
    }),
    vscode.workspace.onDidCloseTextDocument(doc => {
      diagnosticCollection.delete(doc.uri);
    })
  );

  // Run once for already-open docs
  vscode.workspace.textDocuments
    .filter(d => d.languageId === 'baanc')
    .forEach(d => runDiagnostics(d, diagnosticCollection, cfg));

  // ---------- Commands ----------
  context.subscriptions.push(
    vscode.commands.registerCommand('baanc.formatDocument', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'baanc') {
        return;
      }
      const edits = formatDocument(editor.document, cfg.indentSize);
      await editor.edit(eb => {
        edits.forEach(e => eb.replace(e.range, e.newText));
      });
    }),
    vscode.commands.registerCommand('baanc.runDiagnostics', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'baanc') {
        return;
      }
      runDiagnostics(editor.document, diagnosticCollection, cfg);
      output.appendLine(
        `Diagnostics refreshed for ${editor.document.fileName}`
      );
      output.show(true);
    })
  );

  context.subscriptions.push(
    completionProvider,
    hoverProvider,
    symbolProvider,
    definitionProvider,
    formattingProvider,
    rangeFormattingProvider,
    willSave,
    diagnosticCollection,
    output
  );

  output.appendLine('Baan C Support activated.');
}

function deactivate() {}

// =============================================================================
// Config
// =============================================================================

function loadConfig() {
  const c = vscode.workspace.getConfiguration('baanc');
  return {
    indentSize: c.get('indentSize', 4),
    formatOnSave: c.get('formatOnSave', false),
    diagnosticsEnabled: c.get('diagnostics.enabled', true),
    strictComments: c.get('diagnostics.strictComments', true),
    completionIncludeSql: c.get('completion.includeSql', true),
    completionIncludePreprocessor: c.get('completion.includePreprocessor', true),
    completionInclude4gl: c.get('completion.include4gl', true)
  };
}

// =============================================================================
// Comment / line helpers
// =============================================================================

/**
 * Remove trailing | line comment, respecting double-quoted strings.
 * @param {string} line
 */
function stripLineComment(line) {
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
 * @param {string} text
 */
function isBlockCommentOnly(text) {
  const t = text.trim();
  return t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/');
}

/**
 * Very small block-comment stripper for analysis (not nested).
 * @param {string} fullText
 */
function maskBlockComments(fullText) {
  return fullText.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}

/**
 * @param {string} line
 */
function codeOf(line) {
  return stripLineComment(line).trim();
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * @param {vscode.TextDocument} document
 * @param {number} indentSize
 * @returns {vscode.TextEdit[]}
 */
function formatDocument(document, indentSize) {
  const indentStr = ' '.repeat(indentSize);
  /** @type {vscode.TextEdit[]} */
  const edits = [];
  let level = 0;
  /** @type {number[]} stack of indent levels for open blocks */
  const stack = [];

  /** @type {'none' | 'if' | 'elif'} multi-line condition waiting for "then" */
  let pendingCond = 'none';
  let inBlockComment = false;

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const raw = line.text;
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      if (raw.length > 0) {
        edits.push(vscode.TextEdit.replace(line.range, ''));
      }
      continue;
    }

    if (inBlockComment) {
      const formatted = raw.replace(/\s+$/, '');
      if (formatted !== raw) {
        edits.push(vscode.TextEdit.replace(line.range, formatted));
      }
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }
    if (trimmed.startsWith('/*')) {
      const expected = indentStr.repeat(level) + trimmed;
      if (raw !== expected) {
        edits.push(vscode.TextEdit.replace(line.range, expected));
      }
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (/^#\s*(include|define|undef|if|ifdef|ifndef|else|elif|endif|pragma|ident)\b/i.test(trimmed)) {
      if (raw !== trimmed) {
        edits.push(vscode.TextEdit.replace(line.range, trimmed));
      }
      continue;
    }

    if (trimmed.startsWith('^')) {
      const expected = indentStr.repeat(level + 1) + trimmed;
      if (raw !== expected) {
        edits.push(vscode.TextEdit.replace(line.range, expected));
      }
      continue;
    }

    const code = codeOf(raw);
    const lower = code.toLowerCase();
    let current = level;

    // Continuation of multi-line if/elif condition (and / or / (...) before then)
    const isCondContinuation =
      pendingCond !== 'none' &&
      !/^(endif|else|elif|endwhile|endfor|endcase|endselect|until)\b/.test(lower) &&
      !/^(if|while|for|repeat|on\s+case|function|select)\b/.test(lower);

    if (isCondContinuation) {
      // indent one more than the if/elif line
      current = level;
      const expected = indentStr.repeat(current) + trimmed;
      if (raw !== expected) {
        edits.push(vscode.TextEdit.replace(line.range, expected));
      }
      if (/\bthen\b/.test(lower)) {
        // condition finished → body is parent+1; stack already has parent level
        pendingCond = 'none';
        level = current + 1;
      }
      continue;
    }

    const isCloser =
      /^(endif|endwhile|endfor|endcase|endselect)\b/.test(lower) ||
      lower === '}' ||
      /^until\b/.test(lower);

    const isMid =
      /^(else|elif)\b/.test(lower) ||
      /^(selectdo|selectempty|selecteos|selecterror)\b/.test(lower) ||
      /^case\b/.test(lower) ||
      /^default\s*:/.test(lower);

    if (isCloser) {
      if (stack.length > 0) {
        current = stack.pop();
      } else {
        current = Math.max(0, level - 1);
      }
      level = current;
      pendingCond = 'none';
    } else if (isMid) {
      if (stack.length > 0) {
        current = stack[stack.length - 1];
      }
    } else {
      current = level;
    }

    // Openers
    if (!isCloser) {
      if (/^if\b/.test(lower)) {
        stack.push(current);
        if (/\bthen\b/.test(lower)) {
          level = current + 1;
          pendingCond = 'none';
        } else {
          // multi-line condition
          pendingCond = 'if';
          level = current + 1; // continuation lines
        }
      } else if (/^elif\b/.test(lower)) {
        // mid: already set current to parent
        if (/\bthen\b/.test(lower)) {
          level = current + 1;
          pendingCond = 'none';
        } else {
          pendingCond = 'elif';
          level = current + 1;
        }
      } else if (/^(else)\b/.test(lower)) {
        level = current + 1;
        pendingCond = 'none';
      } else if (
        /^(selectdo|selectempty|selecteos|selecterror)\b/.test(lower)
      ) {
        level = current + 1;
      } else if (/^case\b/.test(lower) || /^default\s*:/.test(lower)) {
        level = current + 1;
      } else if (
        /^while\b/.test(lower) ||
        /^for\b/.test(lower) ||
        /^repeat\b/.test(lower) ||
        /^on\s+case\b/.test(lower) ||
        (/^select\b/.test(lower) &&
          !/^(selectdo|selectempty|selecteos|selecterror|selectbind)\b/.test(
            lower
          ))
      ) {
        stack.push(current);
        level = current + 1;
      } else if (/^function\b/.test(lower)) {
        if (/\{/.test(code)) {
          stack.push(current);
          level = current + 1;
        }
      } else if (lower === '{' || /^\{\s*$/.test(lower)) {
        stack.push(current);
        level = current + 1;
      }
    }

    const expected = indentStr.repeat(current) + trimmed;
    if (raw !== expected) {
      edits.push(vscode.TextEdit.replace(line.range, expected));
    }
  }

  return edits;
}

// =============================================================================
// Diagnostics
// =============================================================================

/**
 * @param {vscode.TextDocument} document
 * @param {vscode.DiagnosticCollection} collection
 * @param {ReturnType<typeof loadConfig>} cfg
 */
function runDiagnostics(document, collection, cfg) {
  if (!cfg.diagnosticsEnabled || document.languageId !== 'baanc') {
    return;
  }

  /** @type {vscode.Diagnostic[]} */
  const diagnostics = [];
  /**
   * Block frames.
   * type:
   *   'if' | 'if-pending' | 'while' | 'for' | 'repeat' | 'case' | 'select' |
   *   'function' | 'function-pending' | 'brace' | 'pp-if'
   * @type {BlockFrame[]}
   */
  const stack = [];

  let full = document.getText();
  if (cfg.strictComments) {
    full = maskBlockComments(full);
  }
  const lines = full.split(/\r?\n/);

  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    let text = lines[i];
    if (cfg.strictComments) {
      text = stripLineComment(text);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      continue;
    }

    if (!cfg.strictComments) {
      if (inBlockComment) {
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }
      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) {
          inBlockComment = true;
        }
        continue;
      }
    }

    // Preprocessor
    if (/^\s*#/.test(trimmed)) {
      const pp = trimmed.toLowerCase();
      if (/^#\s*(if|ifdef|ifndef)\b/.test(pp)) {
        stack.push({ type: 'pp-if', line: i, text: trimmed });
      } else if (/^#\s*endif\b/.test(pp)) {
        const top = stack[stack.length - 1];
        if (!top || top.type !== 'pp-if') {
          diagnostics.push(
            diag(
              document,
              i,
              'Unmatched #endif (no matching #if/#ifdef/#ifndef)',
              vscode.DiagnosticSeverity.Error
            )
          );
        } else {
          stack.pop();
        }
      }
      continue;
    }

    const code = trimmed;
    const lower = code.toLowerCase();

    // ------------------------------------------------------------------
    // Resolve pending IF / ELIF when we finally see THEN
    // (handles: if cond and\n  (x or y) then)
    // ------------------------------------------------------------------
    if (/\bthen\b/.test(lower)) {
      // Close pending if/elif opened earlier
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].type === 'if-pending') {
          stack[s].type = 'if';
          break;
        }
      }
    }

    // ------------------------------------------------------------------
    // Openers
    // ------------------------------------------------------------------
    if (/^if\b/.test(lower)) {
      // Same-line: if ... then  → open immediately
      // Multi-line: if ...      → pending until then
      if (/\bthen\b/.test(lower)) {
        stack.push({ type: 'if', line: i, text: code });
      } else {
        stack.push({ type: 'if-pending', line: i, text: code });
      }
    } else if (/^while\b/.test(lower)) {
      stack.push({ type: 'while', line: i, text: code });
    } else if (/^for\b/.test(lower)) {
      stack.push({ type: 'for', line: i, text: code });
    } else if (/^repeat\b/.test(lower)) {
      stack.push({ type: 'repeat', line: i, text: code });
    } else if (/^on\s+case\b/.test(lower)) {
      stack.push({ type: 'case', line: i, text: code });
    } else if (
      /^select\b/.test(lower) &&
      !/^(selectdo|selectempty|selecteos|selecterror|selectbind)\b/.test(lower)
    ) {
      stack.push({ type: 'select', line: i, text: code });
    } else if (/^function\b/.test(lower)) {
      if (/\{/.test(code)) {
        stack.push({ type: 'function', line: i, text: code });
      } else {
        stack.push({ type: 'function-pending', line: i, text: code });
      }
    } else if (lower === '{' || /^\{\s*$/.test(lower)) {
      const top = stack[stack.length - 1];
      if (top && top.type === 'function-pending') {
        top.type = 'function';
      } else {
        stack.push({ type: 'brace', line: i, text: code });
      }
    }

    // ------------------------------------------------------------------
    // Mid-level checks
    // ------------------------------------------------------------------
    if (/^(else|elif)\b/.test(lower)) {
      // Accept open 'if' OR still-pending 'if-pending' (then on later line already resolved above if present)
      const top = findTop(stack, t => t === 'if' || t === 'if-pending');
      if (!top) {
        diagnostics.push(
          diag(
            document,
            i,
            `"${lower.startsWith('elif') ? 'elif' : 'else'}" without matching "if"`,
            vscode.DiagnosticSeverity.Error
          )
        );
      } else if (top.type === 'if-pending') {
        // else/elif arrived before then → real syntax problem
        diagnostics.push(
          diag(
            document,
            i,
            `"${lower.startsWith('elif') ? 'elif' : 'else'}" before "then" of the matching "if" (line ${top.line + 1})`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }

      // elif may itself be multi-line: elif cond and\n  x then
      if (/^elif\b/.test(lower) && !/\bthen\b/.test(lower)) {
        // does not nest a new if frame; elif is mid of existing if
      }
    }

    if (/^(selectdo|selectempty|selecteos|selecterror)\b/.test(lower)) {
      const top = findTop(stack, t => t === 'select');
      if (!top) {
        diagnostics.push(
          diag(
            document,
            i,
            `"${code.split(/\s+/)[0]}" without matching "select"`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    if (/^case\b/.test(lower) || /^default\s*:/.test(lower)) {
      const top = findTop(stack, t => t === 'case');
      if (!top) {
        diagnostics.push(
          diag(
            document,
            i,
            `"${/^default/.test(lower) ? 'default' : 'case'}" outside of "on case"`,
            vscode.DiagnosticSeverity.Warning
          )
        );
      }
    }

    // ------------------------------------------------------------------
    // Closers
    // ------------------------------------------------------------------
    if (/^endif\b/.test(lower)) {
      // Prefer matching 'if'; also allow stale 'if-pending' if then was never seen
      matchClose(stack, diagnostics, document, i, ['if', 'if-pending'], 'endif');
    } else if (/^endwhile\b/.test(lower)) {
      matchClose(stack, diagnostics, document, i, ['while'], 'endwhile');
    } else if (/^endfor\b/.test(lower)) {
      matchClose(stack, diagnostics, document, i, ['for'], 'endfor');
    } else if (/^until\b/.test(lower)) {
      matchClose(stack, diagnostics, document, i, ['repeat'], 'until');
    } else if (/^endcase\b/.test(lower)) {
      matchClose(stack, diagnostics, document, i, ['case'], 'endcase');
    } else if (/^endselect\b/.test(lower)) {
      matchClose(stack, diagnostics, document, i, ['select'], 'endselect');
    } else if (lower === '}' || /^\}\s*$/.test(lower)) {
      const top = stack[stack.length - 1];
      if (!top || (top.type !== 'function' && top.type !== 'brace')) {
        diagnostics.push(
          diag(document, i, 'Unmatched "}"', vscode.DiagnosticSeverity.Error)
        );
      } else {
        stack.pop();
      }
    }

    // Soft warnings
    if (/\bendfunction\b/i.test(lower)) {
      diagnostics.push(
        diag(
          document,
          i,
          'Baan C functions are closed with "}" — there is no "endfunction" keyword',
          vscode.DiagnosticSeverity.Warning
        )
      );
    }
    if (/^while\b/.test(lower) && /\bdo\b/.test(lower)) {
      diagnostics.push(
        diag(
          document,
          i,
          'Baan C WHILE has no "do" keyword: use "while <cond> ... endwhile"',
          vscode.DiagnosticSeverity.Warning
        )
      );
    }
    if (/^for\b/.test(lower) && /\bby\b/.test(lower)) {
      diagnostics.push(
        diag(
          document,
          i,
          'Use "step" instead of "by" in Baan C FOR loops',
          vscode.DiagnosticSeverity.Warning
        )
      );
    }
  }

  // Unclosed
  while (stack.length) {
    const b = stack.pop();
    if (b.type === 'function-pending') {
      diagnostics.push(
        diag(
          document,
          b.line,
          'Function is missing opening "{"',
          vscode.DiagnosticSeverity.Error
        )
      );
      continue;
    }
    if (b.type === 'if-pending') {
      diagnostics.push(
        diag(
          document,
          b.line,
          'Unclosed "if" (missing "then" and/or "endif")',
          vscode.DiagnosticSeverity.Error
        )
      );
      continue;
    }
    const closer =
      {
        if: 'endif',
        while: 'endwhile',
        for: 'endfor',
        repeat: 'until',
        case: 'endcase',
        select: 'endselect',
        function: '}',
        brace: '}',
        'pp-if': '#endif'
      }[b.type] || 'end';
    diagnostics.push(
      diag(
        document,
        b.line,
        `Unclosed "${b.type}" block (missing "${closer}")`,
        vscode.DiagnosticSeverity.Error
      )
    );
  }

  collection.set(document.uri, diagnostics);
}

/**
 * Match a closer against one of several acceptable open types.
 * @param {BlockFrame[]} stack
 * @param {vscode.Diagnostic[]} diagnostics
 * @param {vscode.TextDocument} document
 * @param {number} line
 * @param {string[]} expectedTypes
 * @param {string} closerName
 */
function matchClose(stack, diagnostics, document, line, expectedTypes, closerName) {
  if (stack.length === 0) {
    diagnostics.push(
      diag(
        document,
        line,
        `Unmatched "${closerName}" (no matching "${expectedTypes[0]}")`,
        vscode.DiagnosticSeverity.Error
      )
    );
    return;
  }
  const top = stack[stack.length - 1];
  if (!expectedTypes.includes(top.type)) {
    diagnostics.push(
      diag(
        document,
        line,
        `Unmatched "${closerName}" (found open "${top.type}" on line ${top.line + 1})`,
        vscode.DiagnosticSeverity.Error
      )
    );
    return;
  }
  stack.pop();
}

/**
 * @param {BlockFrame[]} stack
 * @param {(t: string) => boolean} pred
 */
function findTop(stack, pred) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (pred(stack[i].type)) {
      return stack[i];
    }
  }
  return null;
}

/**
 * @param {vscode.TextDocument} document
 * @param {number} line
 * @param {string} message
 * @param {vscode.DiagnosticSeverity} severity
 */
function diag(document, line, message, severity) {
  const text = document.lineAt(Math.min(line, document.lineCount - 1)).text;
  const range = new vscode.Range(line, 0, line, text.length);
  const d = new vscode.Diagnostic(range, message, severity);
  d.source = 'baanc';
  return d;
}

/**
 * @param {string} md
 * @param {vscode.Range} range
 */
function makeHover(md, range) {
  const m = new vscode.MarkdownString(md);
  m.supportCodeBlocks = true;
  return new vscode.Hover(m, range);
}

/**
 * @param {string} s
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @template T
 * @param {(arg: T) => void} fn
 * @param {number} ms
 */
function debounce(fn, ms) {
  let t = null;
  return /** @param {T} arg */ arg => {
    if (t) {
      clearTimeout(t);
    }
    t = setTimeout(() => fn(arg), ms);
  };
}

module.exports = {
  activate,
  deactivate
};