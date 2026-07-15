const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const selector = { language: 'baanc', scheme: 'file' };

    // ----- Configuration -----
    const config = vscode.workspace.getConfiguration('baanc');
    let indentSize = config.get('indentSize', 4);
    let formatOnSave = config.get('formatOnSave', false);

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('baanc')) {
                const newConfig = vscode.workspace.getConfiguration('baanc');
                indentSize = newConfig.get('indentSize', 4);
                formatOnSave = newConfig.get('formatOnSave', false);
            }
        })
    );

    // ==========================================
    // 1. AUTO-COMPLETE
    // ==========================================
    const completionProvider = vscode.languages.registerCompletionItemProvider(selector, {
        provideCompletionItems(document, position) {
            const completions = [];
            const keywords = [
                'if', 'then', 'else', 'endif',
                'select', 'selectdo', 'selectempty', 'endselect',
                'function', 'extern', 'domain', 'string', 'long', 'double',
                'return', 'while', 'do', 'endwhile', 'for', 'to', 'by', 'endfor',
                'case', 'caseelse', 'endcase', 'local', 'global', 'constant'
            ];
            keywords.forEach(keyword => {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                completions.push(item);
            });
            return completions;
        }
    });

    // ==========================================
    // 2. CODE FORMATTING
    // ==========================================
    const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(selector, {
        provideDocumentFormattingEdits(document) {
            const edits = [];
            const indentStr = ' '.repeat(indentSize);
            let indentLevel = 0;
            const stack = []; // stores indent levels for block openings

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const text = line.text;
                const trimmed = text.trim();

                // Skip empty lines (keep them as they are)
                if (trimmed.length === 0) continue;

                let currentIndent = indentLevel;

                // Determine if line is a block closer
                if (trimmed.startsWith('endif') || trimmed.startsWith('endselect')) {
                    if (stack.length > 0) {
                        currentIndent = stack.pop();
                    } else {
                        currentIndent = 0; // unmatched closer, reset
                    }
                    indentLevel = currentIndent; // after closing, level is same as closer
                }
                // else-if / selectdo / selectempty – same indent as opening
                else if (trimmed.startsWith('else') || trimmed.startsWith('selectdo') || trimmed.startsWith('selectempty')) {
                    if (stack.length > 0) {
                        currentIndent = stack[stack.length - 1];
                    } else {
                        currentIndent = indentLevel;
                    }
                    // keep indentLevel unchanged (block continues)
                }
                // block openers
                else if (trimmed.startsWith('if') || trimmed.startsWith('select')) {
                    currentIndent = indentLevel;
                    stack.push(indentLevel);
                    indentLevel++; // content will be indented one level more
                }
                // normal line
                else {
                    currentIndent = indentLevel;
                }

                // Build formatted line
                const expectedIndent = indentStr.repeat(currentIndent);
                const formattedLine = expectedIndent + trimmed;

                if (text !== formattedLine) {
                    const range = new vscode.Range(line.range.start, line.range.end);
                    edits.push(vscode.TextEdit.replace(range, formattedLine));
                }
            }

            return edits;
        }
    });

    // Format on save if enabled
    const formatOnSaveProvider = vscode.workspace.onWillSaveTextDocument(e => {
        if (formatOnSave && e.document.languageId === 'baanc') {
            const edit = vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', e.document.uri);
            e.waitUntil(edit.then(edits => edits || []));
        }
    });

    // ==========================================
    // 3. DIAGNOSTICS (Block matching)
    // ==========================================
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('baanc-diagnostics');

    const runDiagnostics = (document) => {
        if (document.languageId !== 'baanc') return;
        const diagnostics = [];
        const stack = []; // { type: 'if'|'select', line: number }

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();

            // skip comments
            if (text.startsWith('|') || text.startsWith('/*')) continue;

            if (text.startsWith('if ')) {
                stack.push({ type: 'if', line: i });
            } else if (text.startsWith('select')) {
                stack.push({ type: 'select', line: i });
            } else if (text.startsWith('endif')) {
                if (stack.length === 0 || stack[stack.length - 1].type !== 'if') {
                    const range = new vscode.Range(i, 0, i, line.text.length);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        'Unmatched "endif" (no matching "if")',
                        vscode.DiagnosticSeverity.Error
                    ));
                } else {
                    stack.pop();
                }
            } else if (text.startsWith('endselect')) {
                if (stack.length === 0 || stack[stack.length - 1].type !== 'select') {
                    const range = new vscode.Range(i, 0, i, line.text.length);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        'Unmatched "endselect" (no matching "select")',
                        vscode.DiagnosticSeverity.Error
                    ));
                } else {
                    stack.pop();
                }
            }
        }

        // Unclosed blocks
        while (stack.length) {
            const block = stack.pop();
            const line = document.lineAt(block.line);
            const range = new vscode.Range(block.line, 0, block.line, line.text.length);
            diagnostics.push(new vscode.Diagnostic(
                range,
                `Unclosed "${block.type}" block (missing matching "end${block.type}")`,
                vscode.DiagnosticSeverity.Error
            ));
        }

        diagnosticCollection.set(document.uri, diagnostics);
    };

    // Diagnostic triggers
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => runDiagnostics(e.document)),
        vscode.workspace.onDidOpenTextDocument(doc => runDiagnostics(doc)),
        vscode.workspace.onDidCloseTextDocument(doc => diagnosticCollection.delete(doc.uri))
    );

    // ==========================================
    // 4. HOVER PROVIDER (Documentation)
    // ==========================================
    const hoverProvider = vscode.languages.registerHoverProvider(selector, {
        provideHover(document, position) {
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) return null;
            const word = document.getText(wordRange);

            const docs = {
                'if': 'Conditional statement. Syntax: if <condition> then ... else ... endif',
                'then': 'Part of an if statement, usually on the same line as if.',
                'else': 'Alternative branch for an if statement.',
                'endif': 'Closes an if block.',
                'select': 'Query loop over a table. Syntax: select <field> ... selectdo ... selectempty ... endselect',
                'selectdo': 'Branch executed when select finds records.',
                'selectempty': 'Branch executed when select finds no records.',
                'endselect': 'Closes a select block.',
                'function': 'Defines a function. Syntax: function <name>(<params>) ... endfunction',
                'extern': 'Declares an external function or variable.',
                'domain': 'Defines a user-defined data type.',
                'string': 'String data type.',
                'long': 'Integer data type (32-bit).',
                'double': 'Floating-point data type.',
                'return': 'Returns a value from a function.',
                'while': 'Loop while a condition is true. Syntax: while <cond> do ... endwhile',
                'do': 'Used with while loop.',
                'endwhile': 'Closes a while loop.',
                'for': 'For-loop. Syntax: for <var> = <start> to <end> [by <step>] ... endfor',
                'to': 'Part of for-loop.',
                'by': 'Optional step in for-loop.',
                'endfor': 'Closes a for-loop.',
                'case': 'Switch/case statement. Syntax: case <expr> ... caseelse ... endcase',
                'caseelse': 'Default branch in a case statement.',
                'endcase': 'Closes a case block.',
                'local': 'Declares a local variable.',
                'global': 'Declares a global variable.',
                'constant': 'Declares a constant.'
            };

            if (word in docs) {
                const range = new vscode.Range(wordRange.start, wordRange.end);
                const markdown = new vscode.MarkdownString(docs[word]);
                return new vscode.Hover(markdown, range);
            }
            return null;
        }
    });

    // ==========================================
    // 5. SYMBOL PROVIDER (Functions & Domains)
    // ==========================================
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(selector, {
        provideDocumentSymbols(document) {
            const symbols = [];
            const text = document.getText();
            const lines = text.split('\n');

            // Regex for function: "function name("
            const functionRegex = /^\s*function\s+(\w+)\s*\(/;
            // Regex for domain: "domain name type"
            const domainRegex = /^\s*domain\s+(\w+)\s+\w+/;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let match = functionRegex.exec(line);
                if (match) {
                    const name = match[1];
                    const range = new vscode.Range(i, 0, i, line.length);
                    const symbol = new vscode.DocumentSymbol(
                        name,
                        'Function',
                        vscode.SymbolKind.Function,
                        range,
                        range
                    );
                    symbols.push(symbol);
                    continue;
                }
                match = domainRegex.exec(line);
                if (match) {
                    const name = match[1];
                    const range = new vscode.Range(i, 0, i, line.length);
                    const symbol = new vscode.DocumentSymbol(
                        name,
                        'Domain',
                        vscode.SymbolKind.Struct,
                        range,
                        range
                    );
                    symbols.push(symbol);
                }
            }
            return symbols;
        }
    });

    // ==========================================
    // REGISTER ALL PROVIDERS
    // ==========================================
    context.subscriptions.push(
        completionProvider,
        formattingProvider,
        formatOnSaveProvider,
        diagnosticCollection,
        hoverProvider,
        symbolProvider
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};