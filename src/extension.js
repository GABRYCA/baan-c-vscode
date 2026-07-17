const vscode = require('vscode');
const { BUILTIN_FUNCTIONS, BUILTIN_BY_NAME } = require('./builtins');

/** @typedef {{ type: string, line: number, text: string }} BlockFrame */

/** Diagnostic codes for naming convention hints (used by quick fixes). */
const NAMING_CODE = {
  case: 'naming-case',
  separator: 'naming-separator',
  singleLetter: 'naming-single-letter',
  temp: 'naming-temp',
  argPrefix: 'naming-arg-prefix'
};

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
  'refers to',
  'and', 'or', 'not',
  'as set with'
];

/**
 * Preprocessor directives from Baan docs.
 * Labels include the leading "#". Completions replace any already-typed
 * "#partial" so you never get "##define".
 */
const PREPROCESSOR_DIRECTIVES = [
  {
    label: '#include',
    insertText: new vscode.SnippetString('#include "${1:filename}"'),
    detail: 'preprocessor · #include "file"',
    documentation: 'Include a file (quotes use redirection; <file> uses $BSE/include).'
  },
  {
    label: '#include<>',
    insertText: new vscode.SnippetString('#include <${1:filename}>'),
    detail: 'preprocessor · #include <system>',
    documentation: 'Include a system header from $BSE/include.'
  },
  {
    label: '#define',
    insertText: new vscode.SnippetString('#define ${1:NAME} ${2:value}'),
    detail: 'preprocessor · #define',
    documentation: 'Define a macro (optional parameters; continue long bodies with ^).'
  },
  {
    label: '#undef',
    insertText: new vscode.SnippetString('#undef ${1:NAME}'),
    detail: 'preprocessor · #undef',
    documentation: 'Remove a macro definition (argument count must match definition).'
  },
  {
    label: '#if',
    insertText: new vscode.SnippetString('#if ${1:expression}\n\t$0\n#endif'),
    detail: 'preprocessor · #if',
    documentation: 'Compile block if constant expression is true.'
  },
  {
    label: '#ifdef',
    insertText: new vscode.SnippetString('#ifdef ${1:MACRO}\n\t$0\n#endif'),
    detail: 'preprocessor · #ifdef',
    documentation: 'Compile block if MACRO is defined.'
  },
  {
    label: '#ifndef',
    insertText: new vscode.SnippetString('#ifndef ${1:MACRO}\n\t$0\n#endif'),
    detail: 'preprocessor · #ifndef',
    documentation: 'Compile block if MACRO is not defined.'
  },
  {
    label: '#else',
    insertText: '#else',
    detail: 'preprocessor · #else'
  },
  {
    label: '#elif',
    insertText: new vscode.SnippetString('#elif ${1:expression}'),
    detail: 'preprocessor · #elif'
  },
  {
    label: '#endif',
    insertText: '#endif',
    detail: 'preprocessor · #endif'
  },
  {
    label: '#pragma',
    insertText: new vscode.SnippetString(
      '#pragma ${1|debug,nowarnings,warnings,notransactions,strict_boolean,sticky,warning,fatal,used|} ${2}'
    ),
    detail: 'preprocessor · #pragma',
    documentation: 'Compiler options / where-used hints (used session|table|dll|...).'
  },
  {
    label: '#ident',
    insertText: new vscode.SnippetString('#ident "@(#)${1:Identification of object}"'),
    detail: 'preprocessor · #ident',
    documentation: 'Custom object identification string for the what(1) utility.'
  }
];

const PREPROCESSOR_BUILTINS = [
  '__FILE__',
  '__LINE__',
  '__FUNCTION__',
  '__FUNCTION_CP__',
  '__OBJECT__'
];

/**
 * 4GL main sections + subsections from the Infor LN programming guide.
 * Dotted names are one completion unit so typing "before." keeps matching.
 */
const FOURGL_SECTIONS = [
  'declaration:',
  'before.program:',
  'after.form.read:',
  'on.error:',
  'after.program:',
  'after.update.db.commit:',
  'before.display.object:',
  'after.display.object:',
  'before.new.object:',
  'on.display.total.line:',
  'functions:',
  'field.${1:table.field}:',
  'field.all:',
  'field.other:',
  'form.${1:1}:',
  'form.all:',
  'form.other:',
  'group.${1:1}:',
  'choice.${1:command}:',
  'zoom.from.${1:name}:',
  'zoom.from.all:',
  'zoom.from.other:',
  'main.table.io:',
  'init.field:',
  'before.field:',
  'after.field:',
  'before.input:',
  'after.input:',
  'before.display:',
  'after.display:',
  'selection.filter:',
  'before.zoom:',
  'after.zoom:',
  'before.checks:',
  'domain.error:',
  'ref.input:',
  'ref.display:',
  'check.input:',
  'on.input:',
  'when.field.changes:',
  'before.choice:',
  'on.choice:',
  'after.choice:',
  'init.form:',
  'before.form:',
  'after.form:',
  'init.group:',
  'before.group:',
  'after.group:',
  'read.view:',
  'before.read:',
  'after.read:',
  'before.write:',
  'after.write:',
  'before.rewrite:',
  'after.rewrite:',
  'after.skip.write:',
  'after.skip.rewrite:',
  'before.delete:',
  'after.delete:',
  'after.skip.delete:',
  'on.main.table:',
  'on.entry:',
  'on.exit:'
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
  function: '```baanc\nfunction [extern|static] [type] name([REF|CONST] type arg, ...)\n{\n    ...\n    return[(value)]\n}\n```\nTypes: `long`, `double`, `string`, `domain <name>`, `void` (default). Body is brace-delimited.',
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
  extern: 'Export variable / function name to the object symbol table. Used as `function extern name(...)`.',
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
  and: 'Logical AND (3GL) / boolean search condition AND (embedded SQL).',
  or: 'Logical OR (3GL) / boolean search condition OR (embedded SQL).',
  not: 'Logical NOT (unary).',
  void: 'Function return type meaning “no value”.',
  include: '```baanc\n#include "filename"\n#include <filename>\n```\nPreprocessor include. Quotes use file redirection; angle brackets use $BSE/include.',
  define: '```baanc\n#define NAME value\n```\nDefine a preprocessor macro.',
  pragma: 'Preprocessor compiler option / where-used hint (`#pragma used table ...`).'
};

/**
 * Activates the extension.
 * @param {import('vscode').ExtensionContext} context
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

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    selector,
    {
      /**
       * @param {vscode.TextDocument} document
       * @param {vscode.Position} position
       */
      provideCompletionItems(document, position) {
        const line = document.lineAt(position).text;
        const prefix = line.slice(0, position.character);
        /** @type {vscode.CompletionItem[]} */
        const items = [];
        const seen = new Set();

        /**
         * @param {string} label
         * @param {vscode.CompletionItemKind} kind
         * @param {string} detail
         * @param {{ insertText?: string|vscode.SnippetString, range?: vscode.Range, filterText?: string, sortText?: string, documentation?: string }} [opts]
         */
        const add = (label, kind, detail, opts = {}) => {
          const key = `${label}||${detail}`;
          if (seen.has(key)) {
            return;
          }
          seen.add(key);
          const item = new vscode.CompletionItem(label, kind);
          item.detail = detail;
          if (opts.insertText !== undefined) {
            item.insertText = opts.insertText;
          }
          if (opts.range) {
            item.range = opts.range;
          }
          if (opts.filterText) {
            item.filterText = opts.filterText;
          }
          if (opts.sortText) {
            item.sortText = opts.sortText;
          }
          if (opts.documentation) {
            item.documentation = new vscode.MarkdownString(opts.documentation);
          }
          items.push(item);
        };

        // Preprocessor: replace "#partial" as a unit (never "##define")
        const ppPartial = getPreprocessorPartial(prefix, position);
        if (ppPartial && cfg.completionIncludePreprocessor) {
          for (const d of PREPROCESSOR_DIRECTIVES) {
            add(d.label, vscode.CompletionItemKind.Snippet, d.detail, {
              insertText: d.insertText,
              range: ppPartial.range,
              filterText: d.label,
              sortText: `0_${d.label}`,
              documentation: d.documentation
            });
          }
          return items;
        }

        if (cfg.completionIncludePreprocessor) {
          PREPROCESSOR_BUILTINS.forEach(k =>
            add(k, vscode.CompletionItemKind.Constant, 'preprocessor macro', {
              sortText: `2_${k}`
            })
          );
        }

        // 4GL dotted sections: keep suggesting after "before."
        if (cfg.completionInclude4gl) {
          const sectionPartial = getDottedSectionPartial(prefix, position);
          for (const sec of FOURGL_SECTIONS) {
            const isSnippet = sec.includes('${');
            const label = isSnippet
              ? sec.replace(/\$\{\d+:?([^}]*)\}/g, '$1')
              : sec;
            const insert = isSnippet
              ? new vscode.SnippetString(sec)
              : sec;
            /** @type {{ insertText: string|vscode.SnippetString, filterText: string, sortText: string, range?: vscode.Range }} */
            const opts = {
              insertText: insert,
              filterText: label,
              sortText: `1_${label}`
            };
            if (sectionPartial) {
              opts.range = sectionPartial.range;
            }
            add(label, vscode.CompletionItemKind.Module, '4GL section', opts);
          }
        }

        CONTROL_KEYWORDS.forEach(k =>
          add(k, vscode.CompletionItemKind.Keyword, 'keyword', {
            sortText: `3_${k}`
          })
        );
        TYPE_KEYWORDS.forEach(k =>
          add(k, vscode.CompletionItemKind.TypeParameter, 'type', {
            sortText: `3_${k}`
          })
        );
        STORAGE_KEYWORDS.forEach(k =>
          add(k, vscode.CompletionItemKind.Keyword, 'storage', {
            sortText: `3_${k}`
          })
        );
        CONSTANTS.forEach(k =>
          add(k, vscode.CompletionItemKind.Constant, 'constant', {
            sortText: `3_${k}`
          })
        );

        if (cfg.completionIncludeSql) {
          SQL_KEYWORDS.forEach(k =>
            add(k, vscode.CompletionItemKind.Keyword, 'SQL', {
              sortText: `4_${k}`
            })
          );
        }

        // Built-in language / API functions (dotted names complete after ".")
        if (cfg.completionIncludeBuiltins) {
          const dottedPartial = getDottedSectionPartial(prefix, position);
          for (const fn of BUILTIN_FUNCTIONS) {
            /** @type {{ insertText: string|vscode.SnippetString, filterText: string, sortText: string, documentation?: string, range?: vscode.Range }} */
            const opts = {
              insertText: fn.insert
                ? new vscode.SnippetString(fn.insert)
                : new vscode.SnippetString(`${fn.name}($0)`),
              filterText: fn.name,
              sortText: `2_fn_${fn.name}`,
              documentation: fn.doc || undefined
            };
            if (dottedPartial) {
              opts.range = dottedPartial.range;
            }
            add(fn.name, vscode.CompletionItemKind.Function, fn.detail, opts);
          }
        }

        // Directives also without having typed '#' yet
        if (cfg.completionIncludePreprocessor && !ppPartial) {
          for (const d of PREPROCESSOR_DIRECTIVES) {
            add(d.label, vscode.CompletionItemKind.Snippet, d.detail, {
              insertText: d.insertText,
              filterText: d.label.replace(/^#/, '') + ' ' + d.label,
              sortText: `5_${d.label}`,
              documentation: d.documentation
            });
          }
        }

        // Document-local symbols (tables, functions, declarations)
        const locals = collectDocumentCompletions(document);
        for (const t of locals.tables) {
          add(t, vscode.CompletionItemKind.Struct, 'table (this file)', {
            sortText: `0_table_${t}`
          });
        }
        for (const f of locals.functions) {
          add(f, vscode.CompletionItemKind.Function, 'function (this file)', {
            insertText: new vscode.SnippetString(`${f}($0)`),
            sortText: `0_fn_${f}`,
            filterText: f
          });
        }
        for (const v of locals.variables) {
          add(v, vscode.CompletionItemKind.Variable, 'declaration (this file)', {
            sortText: `0_var_${v}`
          });
        }

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
            label: 'function-extern',
            body: 'function extern ${1:name}(${2})\n{\n\t$0\n}'
          },
          {
            label: 'select-endselect',
            body: 'select ${1:*}\nfrom ${2:table}\nwhere ${3:cond}\nselectdo\n\t$0\nendselect'
          },
          {
            label: 'include-file',
            body: '#include "${1:itxadv0000}"'
          }
        ];
        blockSnippets.forEach(s => {
          const item = new vscode.CompletionItem(
            s.label,
            vscode.CompletionItemKind.Snippet
          );
          item.insertText = new vscode.SnippetString(s.body);
          item.detail = 'Baan C block';
          item.sortText = `6_${s.label}`;
          items.push(item);
        });

        return items;
      }
    },
    '#',
    '.'
  );

  const hoverProvider = vscode.languages.registerHoverProvider(selector, {
    provideHover(document, position) {
      const wordRange = document.getWordRangeAtPosition(
        position,
        /#?[A-Za-z_][\w.$]*/
      );
      if (!wordRange) {
        return null;
      }
      const word = document.getText(wordRange);
      const key = word.replace(/^#/, '').toLowerCase();

      const line = document.lineAt(position.line).text;
      const lower = line.toLowerCase();
      if (/\bon\s+case\b/.test(lower) && (key === 'on' || key === 'case')) {
        return makeHover(
          '```baanc\non case <expression>\ncase <value>:\n    ...\n    break\ndefault:\n    ...\nendcase\n```\nMulti-way branch. CASE labels fall through; use `break`. Expression must be long or string.',
          wordRange
        );
      }

      if (Object.prototype.hasOwnProperty.call(HOVER_DOCS, key)) {
        return makeHover(HOVER_DOCS[key], wordRange);
      }

      const builtin = BUILTIN_BY_NAME.get(key);
      if (builtin) {
        const body =
          builtin.doc ||
          `\`\`\`baanc\n${builtin.name}(...)\n\`\`\`\nBuilt-in: ${builtin.detail}`;
        return makeHover(body, wordRange);
      }

      const after = document.getText(
        new vscode.Range(
          position.line,
          wordRange.end.character,
          position.line,
          wordRange.end.character + 1
        )
      );
      if (after === '(') {
        return makeHover(`Function call: \`${word}(...)\``, wordRange);
      }

      return null;
    }
  });

  const symbolProvider = vscode.languages.registerDocumentSymbolProvider(selector, {
    provideDocumentSymbols(document) {
      /** @type {vscode.DocumentSymbol[]} */
      const symbols = [];
      const functionRe =
        /^\s*function(?:\s+(?:extern|static))?(?:\s+(?:long|double|string|void|domain\s+[\w.]+))?\s+([A-Za-z_][\w.]*)\s*\(/i;
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
        `^\\s*function(?:\\s+(?:extern|static))?(?:\\s+(?:long|double|string|void|domain\\s+[\\w.]+))?\\s+(${escapeRegExp(
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

  const formattingProvider =
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      provideDocumentFormattingEdits(document) {
        return formatDocument(document, cfg.indentSize);
      }
    });

  const rangeFormattingProvider =
    vscode.languages.registerDocumentRangeFormattingEditProvider(selector, {
      provideDocumentRangeFormattingEdits(document, range) {
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

  vscode.workspace.textDocuments
    .filter(d => d.languageId === 'baanc')
    .forEach(d => runDiagnostics(d, diagnosticCollection, cfg));

  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    selector,
    {
      /**
       * @param {vscode.TextDocument} document
       * @param {vscode.Range} range
       * @param {vscode.CodeActionContext} context
       */
      provideCodeActions(document, range, context) {
        /** @type {vscode.CodeAction[]} */
        const actions = [];
        for (const d of context.diagnostics) {
          if (d.source !== 'baanc' || !d.code) {
            continue;
          }
          const code = String(d.code);
          if (
            code !== NAMING_CODE.case &&
            code !== NAMING_CODE.separator &&
            code !== NAMING_CODE.temp &&
            code !== NAMING_CODE.argPrefix
          ) {
            continue;
          }
          const name = document.getText(d.range);
          if (!name) {
            continue;
          }
          let suggested = suggestBaanName(name);
          if (code === NAMING_CODE.argPrefix) {
            suggested = suggestArgPrefixName(name, d.message);
          }
          if (!suggested || suggested === name) {
            continue;
          }
          const action = new vscode.CodeAction(
            `Rename to '${suggested}'`,
            vscode.CodeActionKind.QuickFix
          );
          action.diagnostics = [d];
          action.isPreferred = true;
          action.edit = new vscode.WorkspaceEdit();
          // Rename all occurrences of this identifier in the document
          let renames = findIdentifierRanges(document, name);
          if (renames.length === 0) {
            renames = [d.range];
          }
          for (const r of renames) {
            action.edit.replace(document.uri, r, suggested);
          }
          actions.push(action);
        }
        return actions;
      }
    },
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
  );

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
    codeActionProvider,
    willSave,
    diagnosticCollection,
    output
  );

  output.appendLine('Baan C Support activated.');
}

function deactivate() {}

function loadConfig() {
  const c = vscode.workspace.getConfiguration('baanc');
  return {
    indentSize: c.get('indentSize', 4),
    formatOnSave: c.get('formatOnSave', false),
    diagnosticsEnabled: c.get('diagnostics.enabled', true),
    strictComments: c.get('diagnostics.strictComments', true),
    namingConventions: c.get('diagnostics.namingConventions', true),
    namingArgPrefixes: c.get('diagnostics.namingArgPrefixes', false),
    completionIncludeSql: c.get('completion.includeSql', true),
    completionIncludePreprocessor: c.get('completion.includePreprocessor', true),
    completionInclude4gl: c.get('completion.include4gl', true),
    completionIncludeBuiltins: c.get('completion.includeBuiltins', true)
  };
}

/**
 * If typing a preprocessor directive (optional leading spaces then "#..."),
 * return the range covering "#partial" so acceptance never produces "##define".
 * @param {string} prefix
 * @param {vscode.Position} position
 * @returns {{ range: vscode.Range, text: string } | null}
 */
function getPreprocessorPartial(prefix, position) {
  const m = /^(\s*)(#\w*)$/.exec(prefix);
  if (!m) {
    return null;
  }
  const startCol = m[1].length;
  return {
    text: m[2],
    range: new vscode.Range(
      position.line,
      startCol,
      position.line,
      position.character
    )
  };
}

/**
 * Dotted identifier for 4GL sections / table.field, e.g. "before." or "before.ch".
 * @param {string} prefix
 * @param {vscode.Position} position
 * @returns {{ range: vscode.Range, text: string } | null}
 */
function getDottedSectionPartial(prefix, position) {
  const m = /([A-Za-z_][\w.]*)\s*$/.exec(prefix);
  if (!m) {
    const m2 = /([A-Za-z_][\w.]*\.)\s*$/.exec(prefix);
    if (!m2) {
      return null;
    }
    const startCol = position.character - m2[1].length;
    return {
      text: m2[1],
      range: new vscode.Range(
        position.line,
        startCol,
        position.line,
        position.character
      )
    };
  }
  const startCol = position.character - m[1].length;
  return {
    text: m[1],
    range: new vscode.Range(
      position.line,
      startCol,
      position.line,
      position.character
    )
  };
}

/**
 * Scan the current document for tables, functions and named declarations.
 * @param {vscode.TextDocument} document
 */
function collectDocumentCompletions(document) {
  /** @type {Set<string>} */
  const tables = new Set();
  /** @type {Set<string>} */
  const functions = new Set();
  /** @type {Set<string>} */
  const variables = new Set();

  const functionRe =
    /^\s*function(?:\s+(?:extern|static))?(?:\s+(?:long|double|string|void|domain\s+[\w.]+))?\s+([A-Za-z_][\w.]*)\s*\(/i;
  const tableRe = /^\s*table\s+(t[\w.]+)/i;
  const domainRe = /^\s*domain\s+[\w.]+\s+([A-Za-z_][\w.]*)/i;
  const typedVarRe =
    /^\s*(?:extern\s+)?(?:long|double|boolean|string)\s+([A-Za-z_][\w.]*)/i;
  const tableUseRe = /\b(t[a-z]{2,6}\d{3}[a-z0-9]*)\b/gi;

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const text = stripLineComment(raw);
    if (!text.trim()) {
      continue;
    }

    let m = functionRe.exec(text);
    if (m) {
      functions.add(m[1]);
    }
    m = tableRe.exec(text);
    if (m) {
      tables.add(m[1]);
    }
    m = domainRe.exec(text);
    if (m) {
      variables.add(m[1]);
    }
    m = typedVarRe.exec(text);
    if (m) {
      variables.add(m[1]);
    }

    tableUseRe.lastIndex = 0;
    let um;
    while ((um = tableUseRe.exec(text)) !== null) {
      tables.add(um[1]);
    }
  }

  return {
    tables: [...tables],
    functions: [...functions],
    variables: [...variables]
  };
}

/**
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

/**
 * @param {string} line
 * @returns {{ open: number, close: number, delta: number }}
 */
function parenDelta(line) {
  const code = stripLineComment(line);
  let inString = false;
  let open = 0;
  let close = 0;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"' && (i === 0 || code[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (ch === '(') {
      open++;
    } else if (ch === ')') {
      close++;
    }
  }
  return { open, close, delta: open - close };
}

/**
 * @param {string} raw
 * @param {number} fallback
 */
function firstParamColumn(raw, fallback) {
  const openIdx = raw.indexOf('(');
  if (openIdx < 0) {
    return fallback;
  }
  let align = openIdx + 1;
  while (align < raw.length && (raw[align] === ' ' || raw[align] === '\t')) {
    align++;
  }
  if (align >= raw.length) {
    return fallback;
  }
  return align;
}

/**
 * @param {string} lower
 */
function isSqlClauseKeyword(lower) {
  return (
    /^(from|where|having|union)\b/.test(lower) ||
    /^group\s+by\b/.test(lower) ||
    /^order\s+by\b/.test(lower) ||
    /^(and|or)\b/.test(lower) ||
    /^as\s+set\s+with\b/.test(lower) ||
    /^for\s+update\b/.test(lower) ||
    /^with\s+retry\b/.test(lower) ||
    /^(inner|left|right|cross)\s+join\b/.test(lower) ||
    /^join\b/.test(lower)
  );
}

/**
 * @param {string} lower
 */
function isSelectBranch(lower) {
  return /^(selectdo|selectempty|selecteos|selecterror)\b/.test(lower);
}

/**
 * @param {string} lower
 */
function isFunctionHeaderStart(lower) {
  return /^function\b/.test(lower);
}

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
  /** @type {number[]} */
  const stack = [];

  /** @type {'none' | 'if' | 'elif'} */
  let pendingCond = 'none';
  let inBlockComment = false;

  let paramParenDepth = 0;
  let paramAlignCol = 0;
  let functionHeaderLevel = 0;

  let inSelectHeader = false;
  let selectBaseLevel = 0;

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

    if (
      /^#\s*(include|define|undef|if|ifdef|ifndef|else|elif|endif|pragma|ident)\b/i.test(
        trimmed
      )
    ) {
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

    if (paramParenDepth > 0) {
      const expected = ' '.repeat(paramAlignCol) + trimmed;
      if (raw !== expected) {
        edits.push(vscode.TextEdit.replace(line.range, expected));
      }

      const pd = parenDelta(raw);
      paramParenDepth += pd.delta;
      if (paramParenDepth < 0) {
        paramParenDepth = 0;
      }

      if (paramParenDepth === 0 && /\{/.test(code)) {
        stack.push(functionHeaderLevel);
        level = functionHeaderLevel + 1;
      }
      continue;
    }

    const isCondContinuation =
      pendingCond !== 'none' &&
      !/^(endif|else|elif|endwhile|endfor|endcase|endselect|until)\b/.test(
        lower
      ) &&
      !/^(if|while|for|repeat|on\s+case|function|select)\b/.test(lower);

    if (isCondContinuation) {
      current = level;
      const expected = indentStr.repeat(current) + trimmed;
      if (raw !== expected) {
        edits.push(vscode.TextEdit.replace(line.range, expected));
      }
      if (/\bthen\b/.test(lower)) {
        pendingCond = 'none';
        level = current + 1;
      }
      continue;
    }

    if (inSelectHeader && isSqlClauseKeyword(lower)) {
      current = selectBaseLevel;
      const expected = indentStr.repeat(current) + trimmed;
      if (raw !== expected) {
        edits.push(vscode.TextEdit.replace(line.range, expected));
      }
      continue;
    }

    const isCloser =
      /^(endif|endwhile|endfor|endcase|endselect)\b/.test(lower) ||
      lower === '}' ||
      /^until\b/.test(lower);

    const isMid =
      /^(else|elif)\b/.test(lower) ||
      isSelectBranch(lower) ||
      /^case\b/.test(lower) ||
      /^default\s*:/.test(lower);

    if (isCloser) {
      if (/^endselect\b/.test(lower)) {
        inSelectHeader = false;
      }
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
      if (isSelectBranch(lower)) {
        inSelectHeader = false;
      }
    } else {
      current = level;
    }

    if (!isCloser) {
      if (/^if\b/.test(lower)) {
        stack.push(current);
        if (/\bthen\b/.test(lower)) {
          level = current + 1;
          pendingCond = 'none';
        } else {
          pendingCond = 'if';
          level = current + 1;
        }
      } else if (/^elif\b/.test(lower)) {
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
      } else if (isSelectBranch(lower)) {
        level = current + 1;
      } else if (/^case\b/.test(lower) || /^default\s*:/.test(lower)) {
        level = current + 1;
      } else if (
        /^while\b/.test(lower) ||
        /^for\b/.test(lower) ||
        /^repeat\b/.test(lower) ||
        /^on\s+case\b/.test(lower)
      ) {
        stack.push(current);
        level = current + 1;
      } else if (
        /^select\b/.test(lower) &&
        !/^(selectdo|selectempty|selecteos|selecterror|selectbind)\b/.test(
          lower
        )
      ) {
        stack.push(current);
        selectBaseLevel = current;
        inSelectHeader = true;
        level = current;
      } else if (isFunctionHeaderStart(lower)) {
        functionHeaderLevel = current;
        const pd = parenDelta(raw);
        if (pd.delta > 0) {
          paramParenDepth = pd.delta;
          paramAlignCol = firstParamColumn(
            raw,
            current * indentSize + indentSize
          );
        } else if (/\{/.test(code)) {
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
  /** @type {BlockFrame[]} */
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

    if (/\bthen\b/.test(lower)) {
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].type === 'if-pending') {
          stack[s].type = 'if';
          break;
        }
      }
    }

    if (/^if\b/.test(lower)) {
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

    if (/^(else|elif)\b/.test(lower)) {
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
        diagnostics.push(
          diag(
            document,
            i,
            `"${lower.startsWith('elif') ? 'elif' : 'else'}" before "then" of the matching "if" (line ${top.line + 1})`,
            vscode.DiagnosticSeverity.Error
          )
        );
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

    if (/^endif\b/.test(lower)) {
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

  if (cfg.namingConventions) {
    collectNamingDiagnostics(document, diagnostics, cfg);
  }

  collection.set(document.uri, diagnostics);
}

/**
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

// ── Naming conventions (Infor LN design principles) ─────────────────────

const TEMP_NAME_RE = /^(temp|tmp|tmp\d+|temp\d+|dummy)$/i;
const TYPE_IN_NAME_RE =
  /^(string|long|double|boolean|table|domain)\./i;
/** 4GL sections / reserved labels — never rename-check */
const RESERVED_NAME_RE =
  /^(declaration|before|after|on|when|field|form|group|choice|zoom|main|functions|init|read|check|ref|domain|selection|default|case)$/i;

/**
 * Convert CamelCase / snake_case / mixed identifiers to Baan dotted lowercase.
 * @param {string} name
 */
function suggestBaanName(name) {
  if (!name) {
    return name;
  }
  // Keep leading i./o./io. argument prefixes
  let prefix = '';
  const argM = /^(i|o|io)\./i.exec(name);
  if (argM) {
    prefix = argM[1].toLowerCase() + '.';
    name = name.slice(argM[0].length);
  }
  // g. / b. style prefixes
  const styleM = /^(g|b)\./i.exec(name);
  if (styleM) {
    prefix = styleM[1].toLowerCase() + '.';
    name = name.slice(styleM[0].length);
  }

  let body;
  if (name.includes('.')) {
    body = name
      .split('.')
      .map(s => s.replace(/_/g, ''))
      .map(s =>
        s
          .replace(/([a-z0-9])([A-Z])/g, '$1.$2')
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1.$2')
      )
      .join('.')
      .split('.')
      .map(s => s.toLowerCase())
      .filter(Boolean)
      .join('.');
  } else if (name.includes('_')) {
    body = name
      .split('_')
      .filter(Boolean)
      .map(s => s.toLowerCase())
      .join('.');
  } else {
    body = name
      .replace(/([a-z0-9])([A-Z])/g, '$1.$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1.$2')
      .split('.')
      .map(s => s.toLowerCase())
      .filter(Boolean)
      .join('.');
  }
  return prefix + body;
}

/**
 * @param {string} name
 * @param {string} message
 */
function suggestArgPrefixName(name, message) {
  const base = suggestBaanName(name.replace(/^(i|o|io)\./i, ''));
  if (/input and output|io\./i.test(message)) {
    return `io.${base}`;
  }
  if (/output|o\./i.test(message)) {
    return `o.${base}`;
  }
  return `i.${base}`;
}

/**
 * @param {string} name
 */
function isTableLikeName(name) {
  return /^t[a-z]{2,6}\d{3}[a-z0-9]*$/i.test(name);
}

/**
 * Skip names that are clearly not user identifiers we should lint.
 * @param {string} name
 */
function shouldSkipNaming(name) {
  if (!name || name.length === 0) {
    return true;
  }
  if (BUILTIN_BY_NAME.has(name.toLowerCase())) {
    return true;
  }
  if (isTableLikeName(name)) {
    return true;
  }
  // Table field access: tccom001.item or rcd.t...
  if (/^t[a-z]{2,6}\d{3}/i.test(name) || /^rcd\./i.test(name)) {
    return true;
  }
  if (RESERVED_NAME_RE.test(name.split('.')[0])) {
    // only skip pure section keywords; allow before.program as declaration label etc.
    if (!name.includes('.') || /^(before|after|on|when|field|form|group|choice|zoom|main)\./i.test(name)) {
      // 4GL style section names — skip if looks like section (ends handled elsewhere)
      if (
        /^(before|after|on|when|field|form|group|choice|zoom\.from|main\.table\.io|functions|declaration)(\.|$)/i.test(
          name
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {vscode.TextDocument} document
 * @param {string} name
 * @returns {vscode.Range[]}
 */
function findIdentifierRanges(document, name) {
  /** @type {vscode.Range[]} */
  const ranges = [];
  const re = new RegExp(`(?<![\\w.])${escapeRegExp(name)}(?![\\w.])`, 'g');
  for (let i = 0; i < document.lineCount; i++) {
    const text = document.lineAt(i).text;
    const code = stripLineComment(text);
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code)) !== null) {
      // Skip if inside a string on this line (simple check)
      const before = code.slice(0, m.index);
      const quotes = (before.match(/"/g) || []).length;
      if (quotes % 2 === 1) {
        continue;
      }
      ranges.push(new vscode.Range(i, m.index, i, m.index + name.length));
    }
  }
  return ranges.length ? ranges : [];
}

/**
 * Emit Hint-level naming diagnostics for declarations and function names.
 * @param {vscode.TextDocument} document
 * @param {vscode.Diagnostic[]} diagnostics
 * @param {ReturnType<typeof loadConfig>} cfg
 */
function collectNamingDiagnostics(document, diagnostics, cfg) {
  const functionRe =
    /^\s*function(?:\s+(?:extern|static))?(?:\s+(?:long|double|string|void|domain\s+[\w.]+))?\s+([A-Za-z_][\w.]*)\s*\(/i;
  const typedVarRe =
    /^\s*(?:extern\s+|static\s+|common\s+)?(?:long|double|boolean|string)\s+([A-Za-z_][\w.]*)/i;
  const domainVarRe =
    /^\s*(?:extern\s+)?domain\s+[\w.]+\s+([A-Za-z_][\w.]*)/i;
  const forVarRe = /^\s*for\s+([A-Za-z_][\w.]*)\s*=/i;

  /** @type {Set<string>} already reported names */
  const seen = new Set();

  /**
   * @param {string} name
   * @param {number} line
   * @param {number} col
   * @param {'function'|'variable'|'argument'|'for'} kind
   * @param {{ isRef?: boolean }} [meta]
   */
  const checkName = (name, line, col, kind, meta = {}) => {
    if (shouldSkipNaming(name) || seen.has(`${line}:${name}`)) {
      return;
    }
    seen.add(`${line}:${name}`);

    const range = new vscode.Range(line, col, line, col + name.length);

    // Capitals not allowed (except #define macros which we never pass here)
    if (/[A-Z]/.test(name)) {
      const suggested = suggestBaanName(name);
      pushNamingDiag(
        diagnostics,
        range,
        `Naming: use lowercase with dots (suggested: '${suggested}')`,
        NAMING_CODE.case
      );
      return; // one hint is enough
    }

    // Underscores → prefer dots
    if (name.includes('_')) {
      const suggested = suggestBaanName(name);
      pushNamingDiag(
        diagnostics,
        range,
        `Naming: prefer dots over underscores (suggested: '${suggested}')`,
        NAMING_CODE.separator
      );
      return;
    }

    // Single-letter names (docs forbid i, j, k, …)
    const base = name.includes('.')
      ? name.split('.').pop() || name
      : name;
    if (base.length === 1) {
      pushNamingDiag(
        diagnostics,
        range,
        `Naming: avoid single-letter names like '${name}' — use an expressive name (e.g. work.center)`,
        NAMING_CODE.singleLetter
      );
      return;
    }

    // temp / tmp
    if (TEMP_NAME_RE.test(base) || TEMP_NAME_RE.test(name)) {
      pushNamingDiag(
        diagnostics,
        range,
        `Naming: avoid temporary names like '${name}' — use an expressive name`,
        NAMING_CODE.temp
      );
      return;
    }

    // Type names embedded (string.item)
    if (TYPE_IN_NAME_RE.test(name)) {
      pushNamingDiag(
        diagnostics,
        range,
        `Naming: do not embed type names in identifiers ('${name}')`,
        NAMING_CODE.case
      );
      return;
    }

    // Multi-word camel was already handled via capitals.
    // Soft: function args without i./o./io. (optional)
    if (cfg.namingArgPrefixes && kind === 'argument') {
      if (!/^(i|o|io)\./i.test(name)) {
        const prefix = meta.isRef ? 'o' : 'i';
        pushNamingDiag(
          diagnostics,
          range,
          `Naming: function arguments should use ${prefix}. prefix (suggested: '${prefix}.${name}')`,
          NAMING_CODE.argPrefix
        );
      }
    }
  };

  for (let i = 0; i < document.lineCount; i++) {
    const raw = document.lineAt(i).text;
    const text = stripLineComment(raw);
    if (!text.trim() || /^\s*#/.test(text)) {
      continue;
    }

    let m = functionRe.exec(text);
    if (m) {
      const name = m[1];
      const col = text.indexOf(name, m.index);
      checkName(name, i, col, 'function');

      // Parse argument list on same line (simple)
      const open = text.indexOf('(', m.index);
      const close = text.indexOf(')', open + 1);
      if (open >= 0 && close > open) {
        const args = text.slice(open + 1, close);
        parseFunctionArgs(args, (argName, isRef) => {
          const absCol = open + 1 + args.indexOf(argName);
          checkName(argName, i, absCol, 'argument', { isRef });
        });
      }
      continue;
    }

    m = domainVarRe.exec(text);
    if (m) {
      checkName(m[1], i, text.indexOf(m[1], m.index), 'variable');
      continue;
    }

    m = typedVarRe.exec(text);
    if (m) {
      checkName(m[1], i, text.indexOf(m[1], m.index), 'variable');
      continue;
    }

    m = forVarRe.exec(text);
    if (m) {
      checkName(m[1], i, text.indexOf(m[1], m.index), 'for');
    }
  }
}

/**
 * @param {string} argsText
 * @param {(name: string, isRef: boolean) => void} cb
 */
function parseFunctionArgs(argsText, cb) {
  if (!argsText.trim()) {
    return;
  }
  // Split on commas not perfect for nested but args are flat
  const parts = argsText.split(',');
  for (const part of parts) {
    const p = part.trim();
    if (!p) {
      continue;
    }
    const isRef = /^(ref|reference)\b/i.test(p);
    // last identifier token
    const tokens = p.match(/[A-Za-z_][\w.]*/g);
    if (!tokens || tokens.length === 0) {
      continue;
    }
    const name = tokens[tokens.length - 1];
    // skip type-only tokens
    if (/^(long|double|string|boolean|void|domain|ref|reference|const|based|fixed|mb)$/i.test(name)) {
      continue;
    }
    cb(name, isRef);
  }
}

/**
 * @param {vscode.Diagnostic[]} diagnostics
 * @param {vscode.Range} range
 * @param {string} message
 * @param {string} code
 */
function pushNamingDiag(diagnostics, range, message, code) {
  const d = new vscode.Diagnostic(
    range,
    message,
    vscode.DiagnosticSeverity.Hint
  );
  d.source = 'baanc';
  d.code = code;
  diagnostics.push(d);
}

module.exports = {
  activate,
  deactivate,
  suggestBaanName
};