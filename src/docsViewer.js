'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

/** @type {vscode.WebviewPanel | undefined} */
let docsPanel;

/**
 * Open the single-file documentation site in a VS Code webview panel.
 * @param {import('vscode').ExtensionContext} context
 * @param {string} [route] Optional page id (e.g. "getting-started")
 */
function openDocumentation(context, route) {
  const docsPath = path.join(context.extensionPath, 'docs', 'index.html');
  if (!fs.existsSync(docsPath)) {
    vscode.window.showErrorMessage(
      'Documentation not found (docs/index.html). Run "npm run docs:build" to generate it.'
    );
    return;
  }

  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  const startRoute =
    route && typeof route === 'string' && /^[a-z0-9-]+$/i.test(route)
      ? route
      : 'overview';

  if (docsPanel) {
    docsPanel.reveal(column);
    docsPanel.webview.postMessage({ type: 'navigate', route: startRoute });
    return;
  }

  docsPanel = vscode.window.createWebviewPanel(
    'baancDocumentation',
    'Baan C Documentation',
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'docs'))]
    }
  );

  docsPanel.iconPath = {
    light: vscode.Uri.file(path.join(context.extensionPath, 'icons', 'baanc-light-icon.webp')),
    dark: vscode.Uri.file(path.join(context.extensionPath, 'icons', 'baanc-dark-icon.webp'))
  };

  let html = fs.readFileSync(docsPath, 'utf8');

  // Inject start route before the SPA boots (webview hash navigation is unreliable)
  const bootScript =
    `<script>window.__BAANC_DOCS_START__=${JSON.stringify(startRoute)};</script>`;
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${bootScript}\n</head>`);
  } else {
    html = bootScript + html;
  }

  // VS Code webviews need a CSP that still allows inline script/style (self-contained page)
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "img-src data: https:",
    "font-src 'none'",
    "connect-src 'none'"
  ].join('; ');

  if (!/<meta\s+http-equiv="Content-Security-Policy"/i.test(html)) {
    html = html.replace(
      /<head>/i,
      `<head>\n  <meta http-equiv="Content-Security-Policy" content="${csp}" />`
    );
  }

  docsPanel.webview.html = html;

  docsPanel.onDidDispose(
    () => {
      docsPanel = undefined;
    },
    null,
    context.subscriptions
  );
}

/**
 * Register documentation commands.
 * @param {import('vscode').ExtensionContext} context
 */
function registerDocsCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('baanc.openDocumentation', (route) => {
      const page =
        typeof route === 'string' && route
          ? route
          : undefined;
      openDocumentation(context, page);
    })
  );
}

module.exports = {
  openDocumentation,
  registerDocsCommands
};
