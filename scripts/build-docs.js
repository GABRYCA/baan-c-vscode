/**
 * Builds a single-file professional documentation site from docs/*.md
 * Output: docs/index.html
 *
 * Usage: node scripts/build-docs.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUT_FILE = path.join(DOCS_DIR, 'index.html');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

/** @type {{ id: string, file: string, title: string, group: string, icon: string }[]} */
const PAGES = [
  { id: 'overview', file: 'README.md', title: 'Overview', group: 'Start', icon: 'home' },
  { id: 'getting-started', file: 'getting-started.md', title: 'Getting started', group: 'Start', icon: 'rocket' },
  { id: 'features', file: 'features.md', title: 'Features', group: 'Guides', icon: 'spark' },
  { id: 'configuration', file: 'configuration.md', title: 'Configuration', group: 'Guides', icon: 'gear' },
  { id: 'commands', file: 'commands.md', title: 'Commands', group: 'Guides', icon: 'terminal' },
  { id: 'snippets', file: 'snippets.md', title: 'Snippets', group: 'Guides', icon: 'snippet' },
  { id: 'library-memory', file: 'library-memory.md', title: 'Library memory', group: 'Guides', icon: 'memory' },
  { id: 'development', file: 'development.md', title: 'Development', group: 'Contribute', icon: 'code' },
  { id: 'troubleshooting', file: 'troubleshooting.md', title: 'Troubleshooting', group: 'Help', icon: 'help' }
];

// ── Markdown → HTML ──────────────────────────────────────────────────────────

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Inline markdown: links, code, bold, italic, strikethrough
 * @param {string} text
 */
function renderInline(text) {
  // Protect code spans first
  /** @type {string[]} */
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, code) => {
    const i = codes.length;
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000C${i}\u0000`;
  });

  // Images ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  });

  // Links [text](url) — rewrite sibling .md links to SPA routes
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    let h = href.trim();
    const hashIdx = h.indexOf('#');
    let hash = '';
    if (hashIdx >= 0) {
      hash = h.slice(hashIdx);
      h = h.slice(0, hashIdx);
    }
    // ../LICENSE, ../CHANGELOG.md → keep as external-ish text or relative
    if (h.startsWith('http://') || h.startsWith('https://') || h.startsWith('mailto:')) {
      return `<a href="${escapeHtml(h + hash)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    const base = path.posix.basename(h.replace(/\\/g, '/'));
    if (base.endsWith('.md')) {
      const page = PAGES.find(p => p.file === base || p.file === h.replace(/^\.\//, ''));
      if (page) {
        return `<a href="#/${page.id}${hash}" data-route="${page.id}">${label}</a>`;
      }
      // CHANGELOG etc.
      return `<a href="${escapeHtml(h)}" class="ext-link">${label}</a>`;
    }
    if (h === '' && hash) {
      return `<a href="${escapeHtml(hash)}">${label}</a>`;
    }
    return `<a href="${escapeHtml(h + hash)}">${label}</a>`;
  });

  // Bold **text** or __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic *text* or _text_ (avoid mid-word underscores roughly)
  s = s.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');
  s = s.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

  // Restore code
  s = s.replace(/\u0000C(\d+)\u0000/g, (_, i) => codes[Number(i)]);

  return s;
}

/**
 * Slugify heading text for anchors
 * @param {string} text
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * @param {string} md
 * @returns {{ html: string, toc: { id: string, text: string, level: number }[], plain: string }}
 */
function mdToHtml(md) {
  // Normalize line endings
  const lines = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  /** @type {string[]} */
  const out = [];
  /** @type {{ id: string, text: string, level: number }[]} */
  const toc = [];
  /** @type {string[]} */
  const plainParts = [];
  let i = 0;
  let inCode = false;
  /** @type {string[]} */
  let codeBuf = [];
  let codeLang = '';
  let inTable = false;
  /** @type {string[][]} */
  let tableRows = [];
  /** @type {'ul'|'ol'|null} */
  let listType = null;
  /** @type {string[]} */
  let listItems = [];
  let inBlockquote = false;
  /** @type {string[]} */
  let bqBuf = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    const tag = listType;
    out.push(`<${tag}>`);
    for (const item of listItems) {
      out.push(`<li>${renderInline(item)}</li>`);
    }
    out.push(`</${tag}>`);
    listType = null;
    listItems = [];
  };

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) {
      inTable = false;
      tableRows = [];
      return;
    }
    const [header, ...body] = tableRows;
    // Skip separator row if present
    const rows = body.filter(r => !r.every(c => /^[\s:|-]+$/.test(c)));
    out.push('<div class="table-wrap"><table>');
    out.push('<thead><tr>');
    for (const c of header) {
      out.push(`<th>${renderInline(c.trim())}</th>`);
    }
    out.push('</tr></thead><tbody>');
    for (const row of rows) {
      out.push('<tr>');
      for (let ci = 0; ci < header.length; ci++) {
        out.push(`<td>${renderInline((row[ci] || '').trim())}</td>`);
      }
      out.push('</tr>');
    }
    out.push('</tbody></table></div>');
    inTable = false;
    tableRows = [];
  };

  const flushBq = () => {
    if (!inBlockquote) {
      return;
    }
    out.push(`<blockquote>${renderInline(bqBuf.join(' '))}</blockquote>`);
    inBlockquote = false;
    bqBuf = [];
  };

  const flushCode = () => {
    if (!inCode) {
      return;
    }
    const code = codeBuf.join('\n');
    const lang = codeLang || 'text';
    out.push(
      `<div class="code-block" data-lang="${escapeHtml(lang)}">` +
        `<div class="code-head"><span class="code-lang">${escapeHtml(lang)}</span>` +
        `<button type="button" class="copy-btn" aria-label="Copy code">Copy</button></div>` +
        `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre></div>`
    );
    plainParts.push(code);
    inCode = false;
    codeBuf = [];
    codeLang = '';
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        flushCode();
      } else {
        flushList();
        flushTable();
        flushBq();
        inCode = true;
        codeLang = fence[1] || '';
        codeBuf = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    // Table row
    if (/^\s*\|/.test(line) && line.includes('|')) {
      flushList();
      flushBq();
      const cells = line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|')
        .map(c => c.trim());
      // separator
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        i++;
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(cells);
      i++;
      continue;
    }
    if (inTable) {
      flushTable();
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      flushList();
      inBlockquote = true;
      bqBuf.push(line.replace(/^>\s?/, ''));
      i++;
      continue;
    }
    if (inBlockquote) {
      flushBq();
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushList();
      out.push('<hr />');
      i++;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const raw = h[2].trim();
      // strip trailing # anchors sometimes used in md
      const text = raw.replace(/\s+#+\s*$/, '');
      const id = slugify(text);
      const inline = renderInline(text);
      if (level >= 2 && level <= 3) {
        toc.push({ id, text: text.replace(/[*_`]/g, ''), level });
      }
      out.push(`<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${inline}</h${level}>`);
      plainParts.push(text);
      i++;
      continue;
    }

    // Unordered list
    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ul) {
      flushBq();
      if (listType && listType !== 'ul') {
        flushList();
      }
      listType = 'ul';
      listItems.push(ul[1]);
      plainParts.push(ul[1]);
      i++;
      continue;
    }

    // Ordered list
    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ol) {
      flushBq();
      if (listType && listType !== 'ol') {
        flushList();
      }
      listType = 'ol';
      listItems.push(ol[1]);
      plainParts.push(ol[1]);
      i++;
      continue;
    }
    if (listType) {
      // continuation of list item (indented)
      if (/^\s{2,}\S/.test(line) && listItems.length) {
        listItems[listItems.length - 1] += ' ' + line.trim();
        i++;
        continue;
      }
      flushList();
    }

    // Empty line
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Paragraph (merge consecutive non-empty non-special lines)
    /** @type {string[]} */
    const para = [line];
    i++;
    while (i < lines.length) {
      const n = lines[i];
      if (
        /^\s*$/.test(n) ||
        /^#{1,6}\s/.test(n) ||
        /^```/.test(n) ||
        /^\s*\|/.test(n) ||
        /^>\s?/.test(n) ||
        /^\s*[-*+]\s+/.test(n) ||
        /^\s*\d+\.\s+/.test(n) ||
        /^(-{3,}|\*{3,}|_{3,})\s*$/.test(n)
      ) {
        break;
      }
      para.push(n);
      i++;
    }
    const ptext = para.join(' ').trim();
    out.push(`<p>${renderInline(ptext)}</p>`);
    plainParts.push(ptext);
  }

  flushCode();
  flushList();
  flushTable();
  flushBq();

  return {
    html: out.join('\n'),
    toc,
    plain: plainParts.join('\n')
  };
}

// ── Build pages ──────────────────────────────────────────────────────────────

/** @type {Record<string, { id: string, title: string, group: string, icon: string, html: string, toc: { id: string, text: string, level: number }[], plain: string }>} */
const pageData = {};

for (const meta of PAGES) {
  const filePath = path.join(DOCS_DIR, meta.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${meta.file}`);
    process.exit(1);
  }
  const md = fs.readFileSync(filePath, 'utf8');
  const { html, toc, plain } = mdToHtml(md);
  pageData[meta.id] = {
    id: meta.id,
    title: meta.title,
    group: meta.group,
    icon: meta.icon,
    html,
    toc,
    plain
  };
}

// Group for sidebar
/** @type {Map<string, typeof PAGES>} */
const groups = new Map();
for (const p of PAGES) {
  if (!groups.has(p.group)) {
    groups.set(p.group, []);
  }
  groups.get(p.group).push(p);
}

const navHtml = [...groups.entries()]
  .map(([group, items]) => {
    const links = items
      .map(
        p =>
          `<a class="nav-link" href="#/${p.id}" data-route="${p.id}" data-icon="${p.icon}">` +
          `<span class="nav-icon" data-icon="${p.icon}"></span>` +
          `<span class="nav-label">${escapeHtml(p.title)}</span></a>`
      )
      .join('\n');
    return `<div class="nav-group"><div class="nav-group-title">${escapeHtml(group)}</div>${links}</div>`;
  })
  .join('\n');

const pagesJson = JSON.stringify(pageData);
const orderJson = JSON.stringify(PAGES.map(p => p.id));
const version = PKG.version || '0.0.0';
const displayName = PKG.displayName || 'Baan C VSCode';

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="description" content="Documentation for ${escapeHtml(displayName)} — language support for Baan C / Infor LN in Visual Studio Code." />
  <title>${escapeHtml(displayName)} Documentation</title>
  <style>
/* ── Reset & tokens ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.65;
  color: var(--text);
  background: var(--bg);
  min-height: 100vh;
}
:root, [data-theme="dark"] {
  --bg: #0b0f14;
  --bg-elevated: #111820;
  --bg-sidebar: #0d1219;
  --bg-code: #0a0e13;
  --bg-hover: rgba(125, 180, 255, 0.08);
  --bg-active: rgba(56, 139, 253, 0.15);
  --border: #1e2a38;
  --border-subtle: #16202b;
  --text: #e6edf3;
  --text-muted: #8b9cb3;
  --text-faint: #5c6b80;
  --accent: #3b9eff;
  --accent-soft: #58a6ff;
  --accent-dim: rgba(59, 158, 255, 0.2);
  --link: #6cb6ff;
  --success: #3fb950;
  --warning: #d29922;
  --danger: #f85149;
  --code-text: #e6edf3;
  --shadow: 0 8px 30px rgba(0,0,0,0.35);
  --radius: 10px;
  --sidebar-w: 280px;
  --toc-w: 220px;
  --header-h: 56px;
  --font-mono: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, "Courier New", monospace;
  --selection: rgba(59, 158, 255, 0.28);
}
[data-theme="light"] {
  --bg: #f7f9fc;
  --bg-elevated: #ffffff;
  --bg-sidebar: #ffffff;
  --bg-code: #f0f4f8;
  --bg-hover: rgba(9, 105, 218, 0.06);
  --bg-active: rgba(9, 105, 218, 0.1);
  --border: #d8e0ea;
  --border-subtle: #e8eef5;
  --text: #1a2332;
  --text-muted: #5b6b7c;
  --text-faint: #8a97a8;
  --accent: #0969da;
  --accent-soft: #218bff;
  --accent-dim: rgba(9, 105, 218, 0.12);
  --link: #0969da;
  --code-text: #1a2332;
  --shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
  --selection: rgba(9, 105, 218, 0.18);
}
::selection { background: var(--selection); }
a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; }
button { font: inherit; cursor: pointer; border: none; background: none; color: inherit; }

/* ── Layout ─────────────────────────────────────────────────── */
.app {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  min-height: 100vh;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 40;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--border-subtle);
  text-decoration: none;
  color: var(--text);
}
.sidebar-brand:hover { text-decoration: none; }
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(145deg, #1a6fd4 0%, #0d3d7a 100%);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: -0.02em;
  box-shadow: 0 2px 8px rgba(26, 111, 212, 0.35);
  flex-shrink: 0;
}
.brand-text { min-width: 0; }
.brand-title {
  font-weight: 650;
  font-size: 14.5px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand-sub {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 2px;
}
.sidebar-search {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-subtle);
}
.search-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
  font-size: 13px;
  transition: border-color 0.15s, background 0.15s;
}
.search-trigger:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}
.search-trigger kbd {
  margin-left: auto;
  font-family: inherit;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-faint);
}
.sidebar-nav {
  flex: 1;
  padding: 12px 10px 24px;
  overflow-y: auto;
}
.nav-group { margin-bottom: 18px; }
.nav-group-title {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint);
  padding: 4px 10px 8px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  margin-bottom: 2px;
  transition: background 0.12s, color 0.12s;
}
.nav-link:hover {
  background: var(--bg-hover);
  color: var(--text);
  text-decoration: none;
}
.nav-link.active {
  background: var(--bg-active);
  color: var(--accent-soft);
}
.nav-icon {
  width: 18px;
  height: 18px;
  opacity: 0.75;
  flex-shrink: 0;
  background: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
}
.nav-link.active .nav-icon { opacity: 1; }
.sidebar-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-faint);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.version-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-dim);
  color: var(--accent-soft);
  font-weight: 600;
  font-size: 11px;
}

/* Icons via mask */
.nav-icon[data-icon="home"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-4 0h4'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-4 0h4'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="rocket"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M13 10V3L4 14h7v7l9-11h-7z'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M13 10V3L4 14h7v7l9-11h-7z'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="spark"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="gear"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'/%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'/%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="terminal"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="snippet"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="memory"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="code"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8 9l-4 3 4 3m8-6l4 3-4 3M14 5l-4 14'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8 9l-4 3 4 3m8-6l4 3-4 3M14 5l-4 14'/%3E%3C/svg%3E"); }
.nav-icon[data-icon="help"] { mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'/%3E%3C/svg%3E"); -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'/%3E%3C/svg%3E"); }

/* Main column */
.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
}
.menu-btn {
  display: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.menu-btn:hover { background: var(--bg-hover); }
.breadcrumbs {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.breadcrumbs strong { color: var(--text); font-weight: 600; }
.topbar-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-muted);
  transition: background 0.12s, color 0.12s;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--text); }
.content-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--toc-w);
  gap: 32px;
  padding: 28px 36px 80px;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}
.article {
  min-width: 0;
  max-width: 760px;
}
.article > :first-child { margin-top: 0; }
.page-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.page-badge {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent-soft);
  background: var(--accent-dim);
  padding: 3px 8px;
  border-radius: 999px;
}

/* Prose */
.article h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0 0 1rem;
  color: var(--text);
}
.article h2 {
  font-size: 1.35rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  margin: 2.4rem 0 0.85rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border-subtle);
  scroll-margin-top: calc(var(--header-h) + 16px);
}
.article h3 {
  font-size: 1.1rem;
  font-weight: 650;
  margin: 1.8rem 0 0.65rem;
  scroll-margin-top: calc(var(--header-h) + 16px);
}
.article h4, .article h5, .article h6 {
  font-size: 1rem;
  font-weight: 650;
  margin: 1.4rem 0 0.5rem;
}
.article h2 .anchor,
.article h3 .anchor,
.article h1 .anchor {
  opacity: 0;
  margin-right: 0.35em;
  color: var(--text-faint);
  font-weight: 500;
  text-decoration: none;
}
.article h2:hover .anchor,
.article h3:hover .anchor,
.article h1:hover .anchor { opacity: 1; }
.article p { margin: 0 0 1rem; color: var(--text); }
.article li { margin: 0.25rem 0; }
.article ul, .article ol { margin: 0 0 1rem; padding-left: 1.4rem; }
.article hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}
.article blockquote {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--accent);
  background: var(--bg-hover);
  border-radius: 0 var(--radius) var(--radius) 0;
  color: var(--text-muted);
}
.article blockquote p { margin: 0; }
.article strong { font-weight: 650; color: var(--text); }
.article code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--bg-code);
  border: 1px solid var(--border-subtle);
  padding: 0.12em 0.4em;
  border-radius: 5px;
  color: var(--code-text);
}
.article a { font-weight: 500; }

/* Tables */
.table-wrap {
  overflow-x: auto;
  margin: 0 0 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
}
.article table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.article th, .article td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}
.article th {
  font-weight: 650;
  background: var(--bg-hover);
  color: var(--text);
  white-space: nowrap;
}
.article tr:last-child td { border-bottom: none; }
.article tbody tr:hover td { background: var(--bg-hover); }

/* Code blocks */
.code-block {
  margin: 0 0 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-code);
}
.code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
}
.code-lang {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-faint);
}
.copy-btn {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 5px;
  color: var(--text-muted);
  border: 1px solid transparent;
}
.copy-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
  border-color: var(--border);
}
.copy-btn.copied { color: var(--success); }
.code-block pre {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.55;
}
.code-block code {
  font-family: inherit;
  font-size: inherit;
  background: none;
  border: none;
  padding: 0;
  color: var(--code-text);
  border-radius: 0;
}

/* TOC */
.toc {
  position: sticky;
  top: calc(var(--header-h) + 20px);
  align-self: start;
  max-height: calc(100vh - var(--header-h) - 40px);
  overflow-y: auto;
  padding-left: 4px;
}
.toc-title {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 10px;
}
.toc a {
  display: block;
  font-size: 12.5px;
  color: var(--text-muted);
  padding: 4px 0 4px 12px;
  border-left: 2px solid var(--border);
  text-decoration: none;
  line-height: 1.4;
}
.toc a:hover { color: var(--text); }
.toc a.active {
  color: var(--accent-soft);
  border-left-color: var(--accent);
  font-weight: 550;
}
.toc a.depth-3 { padding-left: 22px; font-size: 12px; }
.toc-empty { display: none; }

/* Pager */
.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
.pager a {
  display: block;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  text-decoration: none;
  color: var(--text);
  transition: border-color 0.12s, background 0.12s;
}
.pager a:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
  text-decoration: none;
}
.pager .label {
  display: block;
  font-size: 11.5px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.pager .title { font-weight: 600; font-size: 14px; }
.pager .next { text-align: right; }
.pager .disabled { visibility: hidden; }

/* Search modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: none;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
}
.modal-backdrop.open { display: flex; }
.search-modal {
  width: min(560px, 100%);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.search-input-wrap svg { color: var(--text-faint); flex-shrink: 0; }
#search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
}
#search-input::placeholder { color: var(--text-faint); }
.search-results {
  max-height: min(50vh, 360px);
  overflow-y: auto;
  padding: 8px;
}
.search-hit {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text);
}
.search-hit:hover, .search-hit.active {
  background: var(--bg-active);
}
.search-hit .hit-page {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent-soft);
  margin-bottom: 2px;
}
.search-hit .hit-snippet {
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-hit mark {
  background: var(--accent-dim);
  color: var(--text);
  border-radius: 2px;
  padding: 0 2px;
}
.search-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13.5px;
}
.search-hint {
  padding: 8px 16px 12px;
  font-size: 11.5px;
  color: var(--text-faint);
  border-top: 1px solid var(--border-subtle);
}

/* Mobile overlay */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 35;
}
.sidebar-overlay.open { display: block; }

/* Responsive */
@media (max-width: 1100px) {
  .content-wrap { grid-template-columns: 1fr; }
  .toc { display: none; }
}
@media (max-width: 860px) {
  .app { grid-template-columns: 1fr; }
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: min(var(--sidebar-w), 88vw);
    transform: translateX(-105%);
    transition: transform 0.2s ease;
    box-shadow: var(--shadow);
  }
  .sidebar.open { transform: translateX(0); }
  .menu-btn { display: inline-grid; }
  .content-wrap { padding: 20px 18px 64px; }
  .pager { grid-template-columns: 1fr; }
  .pager .next { text-align: left; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  * { transition: none !important; }
}
  </style>
</head>
<body>
  <div class="sidebar-overlay" id="sidebar-overlay" hidden></div>
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <a class="sidebar-brand" href="#/overview" data-route="overview">
        <div class="brand-mark">BC</div>
        <div class="brand-text">
          <div class="brand-title">${escapeHtml(displayName)}</div>
          <div class="brand-sub">Extension documentation</div>
        </div>
      </a>
      <div class="sidebar-search">
        <button type="button" class="search-trigger" id="open-search" aria-label="Search documentation">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3" stroke-linecap="round"/></svg>
          <span>Search docs…</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav" aria-label="Documentation">
${navHtml}
      </nav>
      <div class="sidebar-footer">
        <span class="version-badge">v${escapeHtml(version)}</span>
        <span>MIT License</span>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button type="button" class="menu-btn" id="menu-btn" aria-label="Open navigation">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/></svg>
        </button>
        <div class="breadcrumbs" id="breadcrumbs">Documentation</div>
        <div class="topbar-actions">
          <button type="button" class="icon-btn" id="theme-btn" title="Toggle theme" aria-label="Toggle theme">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="theme-icon"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke-linecap="round"/></svg>
          </button>
        </div>
      </header>

      <div class="content-wrap">
        <article class="article" id="article" aria-live="polite"></article>
        <aside class="toc" id="toc" aria-label="On this page">
          <div class="toc-title">On this page</div>
          <div id="toc-links"></div>
        </aside>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="search-modal" role="dialog" aria-modal="true" aria-label="Search">
    <div class="search-modal">
      <div class="search-input-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3" stroke-linecap="round"/></svg>
        <input id="search-input" type="search" placeholder="Search documentation…" autocomplete="off" spellcheck="false" />
        <kbd style="font-size:11px;color:var(--text-faint);border:1px solid var(--border);padding:2px 6px;border-radius:4px;">Esc</kbd>
      </div>
      <div class="search-results" id="search-results"></div>
      <div class="search-hint">Navigate with ↑ ↓ · Enter to open · Esc to close</div>
    </div>
  </div>

  <script>
(function () {
  'use strict';

  var PAGES = ${pagesJson};
  var ORDER = ${orderJson};

  var article = document.getElementById('article');
  var tocLinks = document.getElementById('toc-links');
  var breadcrumbs = document.getElementById('breadcrumbs');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var searchModal = document.getElementById('search-modal');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  var currentId = '';
  var activeHit = -1;

  // Theme (never throw — a failure here must not block content rendering)
  function getPreferredTheme() {
    try {
      var stored = localStorage.getItem('baanc-docs-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (e) {}
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (e2) {}
    return 'dark';
  }
  function applyTheme(theme) {
    try {
      document.documentElement.setAttribute('data-theme', theme || 'dark');
      localStorage.setItem('baanc-docs-theme', theme || 'dark');
    } catch (e) {
      try { document.documentElement.setAttribute('data-theme', theme || 'dark'); } catch (e2) {}
    }
  }
  applyTheme(getPreferredTheme());
  var themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  // Sidebar mobile
  function openSidebar() {
    sidebar.classList.add('open');
    overlay.hidden = false;
    overlay.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    overlay.hidden = true;
  }
  document.getElementById('menu-btn').addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  /**
   * VS Code webviews do not reliably fire hashchange or honor location.hash
   * navigation. We keep an in-memory route and call renderPage() directly.
   */
  var routeState = { id: 'overview', anchor: '' };

  function parseRouteString(raw) {
    var routePart = 'overview';
    var anchor = '';
    if (!raw) {
      return { id: 'overview', anchor: '' };
    }
    var full = String(raw).replace(/^#/, '');
    if (full.charAt(0) === '/') {
      full = full.slice(1);
    }
    // forms: "features", "features#section", "/features#section"
    var hashPos = full.indexOf('#');
    if (hashPos >= 0) {
      routePart = full.slice(0, hashPos) || 'overview';
      anchor = full.slice(hashPos + 1);
    } else {
      routePart = full.split('?')[0] || 'overview';
    }
    // strip accidental leading slashes (avoid /…/ regex in this template literal)
    while (routePart.charAt(0) === '/') {
      routePart = routePart.slice(1);
    }
    if (!PAGES[routePart]) {
      // bare heading id on current page
      if (document.getElementById(routePart)) {
        return { id: routeState.id || 'overview', anchor: routePart };
      }
      routePart = 'overview';
    }
    return { id: routePart, anchor: anchor };
  }

  function parseHash() {
    try {
      return parseRouteString(location.hash || '');
    } catch (e) {
      return { id: routeState.id || 'overview', anchor: '' };
    }
  }

  function setHashQuiet(id, anchor) {
    var next = '#/' + id + (anchor ? '#' + anchor : '');
    try {
      if (history && history.replaceState) {
        history.replaceState(null, '', next);
      } else {
        location.hash = next;
      }
    } catch (e) {
      // Webview may block history API — ignore; routeState is source of truth
    }
  }

  /** Navigate to a page (and optional heading). Works in browser and VS Code webview. */
  function navigate(id, anchor, opts) {
    opts = opts || {};
    if (!PAGES[id]) {
      id = 'overview';
    }
    routeState = { id: id, anchor: anchor || '' };
    if (!opts.skipHash) {
      setHashQuiet(id, anchor);
    }
    renderPage(id, anchor);
  }

  function setActiveNav(id) {
    document.querySelectorAll('.nav-link').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-route') === id);
    });
  }

  function renderToc(page) {
    tocLinks.innerHTML = '';
    if (!page.toc || !page.toc.length) {
      tocLinks.innerHTML = '<div class="search-empty" style="padding:0">No sections</div>';
      return;
    }
    page.toc.forEach(function (item) {
      var a = document.createElement('a');
      a.href = '#/' + page.id + '#' + item.id;
      a.setAttribute('data-route', page.id);
      a.setAttribute('data-anchor', item.id);
      a.textContent = item.text;
      a.className = 'depth-' + item.level;
      a.dataset.toc = item.id;
      tocLinks.appendChild(a);
    });
  }

  function renderPager(id) {
    var idx = ORDER.indexOf(id);
    var prev = idx > 0 ? PAGES[ORDER[idx - 1]] : null;
    var next = idx < ORDER.length - 1 ? PAGES[ORDER[idx + 1]] : null;
    var html = '<nav class="pager" aria-label="Page navigation">';
    if (prev) {
      html += '<a class="prev" href="#/' + prev.id + '" data-route="' + prev.id + '"><span class="label">← Previous</span><span class="title">' + escapeHtml(prev.title) + '</span></a>';
    } else {
      html += '<span class="disabled"></span>';
    }
    if (next) {
      html += '<a class="next" href="#/' + next.id + '" data-route="' + next.id + '"><span class="label">Next →</span><span class="title">' + escapeHtml(next.title) + '</span></a>';
    } else {
      html += '<span class="disabled"></span>';
    }
    html += '</nav>';
    return html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function wireCopyButtons(root) {
    root.querySelectorAll('.copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pre = btn.closest('.code-block').querySelector('code');
        var text = pre ? pre.textContent : '';
        function done() {
          btn.textContent = 'Copied';
          btn.classList.add('copied');
          setTimeout(function () {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1500);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {
            fallbackCopy(text); done();
          });
        } else {
          fallbackCopy(text); done();
        }
      });
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function afterPaint(fn) {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(fn);
    } else {
      setTimeout(fn, 0);
    }
  }

  function renderPage(id, anchor) {
    var page = PAGES[id] || PAGES.overview;
    if (!page) {
      if (article) article.innerHTML = '<p>Page not found.</p>';
      return;
    }
    currentId = page.id;
    try {
      document.title = page.title + ' · ${escapeHtml(displayName)} Docs';
    } catch (e) {}
    if (breadcrumbs) {
      breadcrumbs.innerHTML = '<span>Docs</span> / <strong>' + escapeHtml(page.title) + '</strong>';
    }
    setActiveNav(page.id);
    try { renderToc(page); } catch (e) {}

    if (!article) {
      return;
    }
    // Content first — never let post-render hooks wipe a successful paint
    article.innerHTML =
      '<div class="page-meta"><span class="page-badge">' + escapeHtml(page.group) + '</span></div>' +
      (page.html || '') +
      renderPager(page.id);

    try { wireCopyButtons(article); } catch (e) {}
    try { closeSidebar(); } catch (e) {}
    try { setupTocSpy(); } catch (e) {}

    afterPaint(function () {
      try {
        if (anchor) {
          var el = document.getElementById(anchor);
          if (el) {
            el.scrollIntoView();
            return;
          }
        }
        window.scrollTo(0, 0);
      } catch (e) {}
    });
  }

  // TOC spy
  var tocObserver = null;
  function setupTocSpy() {
    if (tocObserver) tocObserver.disconnect();
    var headings = article.querySelectorAll('h2[id], h3[id]');
    if (!headings.length) return;
    tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.querySelectorAll('a').forEach(function (a) {
          a.classList.toggle('active', a.dataset.toc === entry.target.id);
        });
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    headings.forEach(function (h) { tocObserver.observe(h); });
  }

  function onRoute() {
    var r = parseHash();
    routeState = r;
    renderPage(r.id, r.anchor);
  }

  /**
   * Capture all internal navigation. Do not rely on hashchange — VS Code webviews
   * often swallow or ignore hash-only navigations on <a href="#/...">.
   */
  document.addEventListener('click', function (e) {
    // Ignore modified clicks (new tab, etc.)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    var a = e.target.closest && e.target.closest('a');
    if (!a || a.target === '_blank') {
      return;
    }

    var routeAttr = a.getAttribute('data-route');
    var anchorAttr = a.getAttribute('data-anchor') || '';
    if (routeAttr && PAGES[routeAttr]) {
      e.preventDefault();
      e.stopPropagation();
      navigate(routeAttr, anchorAttr);
      return;
    }

    var href = a.getAttribute('href') || '';
    if (!href || href === '#') {
      return;
    }

    // External http(s) — let webview / browser handle (or open)
    if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0 || href.indexOf('mailto:') === 0) {
      return;
    }

    // SPA routes: #/page, #/page#section, /#/page
    if (href.charAt(0) === '#' || href.indexOf('#/') >= 0) {
      var parsed = parseRouteString(href.indexOf('#') >= 0 ? href.slice(href.indexOf('#')) : href);
      if (PAGES[parsed.id] || parsed.anchor) {
        e.preventDefault();
        e.stopPropagation();
        if (parsed.anchor && parsed.id === currentId && document.getElementById(parsed.anchor)) {
          navigate(parsed.id, parsed.anchor);
        } else if (PAGES[parsed.id]) {
          navigate(parsed.id, parsed.anchor);
        } else if (parsed.anchor && document.getElementById(parsed.anchor)) {
          navigate(currentId || 'overview', parsed.anchor);
        }
      }
      return;
    }

    // Relative ./foo.md style (rewritten at build) — already data-route usually
    // In-page heading only
    if (href.charAt(0) === '#' && href.charAt(1) !== '/') {
      var hid = href.slice(1);
      if (document.getElementById(hid)) {
        e.preventDefault();
        navigate(currentId || 'overview', hid);
      }
    }
  }, true);

  // Browser-only fallback when user uses back/forward
  window.addEventListener('hashchange', function () {
    var r = parseHash();
    if (r.id !== routeState.id || r.anchor !== routeState.anchor) {
      routeState = r;
      renderPage(r.id, r.anchor);
    }
  });

  // VS Code webview host may post navigate messages
  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || msg.type !== 'navigate') return;
    if (msg.route && PAGES[msg.route]) {
      navigate(msg.route, msg.anchor || '');
    }
  });

  // Search
  function openSearch() {
    searchModal.classList.add('open');
    searchInput.value = '';
    searchResults.innerHTML = '<div class="search-empty">Type to search across all pages…</div>';
    activeHit = -1;
    setTimeout(function () { searchInput.focus(); }, 10);
  }
  function closeSearch() {
    searchModal.classList.remove('open');
    searchInput.blur();
  }
  document.getElementById('open-search').addEventListener('click', openSearch);
  searchModal.addEventListener('click', function (e) {
    if (e.target === searchModal) closeSearch();
  });

  function searchDocs(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      searchResults.innerHTML = '<div class="search-empty">Type to search across all pages…</div>';
      activeHit = -1;
      return;
    }
    var hits = [];
    ORDER.forEach(function (id) {
      var page = PAGES[id];
      var plain = page.plain || '';
      var lines = plain.split('\\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var idx = line.toLowerCase().indexOf(q);
        if (idx >= 0) {
          hits.push({ id: page.id, title: page.title, line: line, idx: idx });
          if (hits.filter(function (h) { return h.id === page.id; }).length >= 3) break;
        }
      }
      // also match title
      if (page.title.toLowerCase().indexOf(q) >= 0 && !hits.some(function (h) { return h.id === page.id && h.line === page.title; })) {
        hits.unshift({ id: page.id, title: page.title, line: page.title + ' — open page', idx: 0 });
      }
    });
    hits = hits.slice(0, 20);
    if (!hits.length) {
      searchResults.innerHTML = '<div class="search-empty">No results for “' + escapeHtml(q) + '”</div>';
      activeHit = -1;
      return;
    }
    searchResults.innerHTML = hits.map(function (h, i) {
      var line = h.line || '';
      var low = line.toLowerCase();
      var qi = low.indexOf(q);
      var snip;
      if (qi >= 0) {
        snip = escapeHtml(line.slice(0, qi)) +
          '<mark>' + escapeHtml(line.slice(qi, qi + q.length)) + '</mark>' +
          escapeHtml(line.slice(qi + q.length));
      } else {
        snip = escapeHtml(line);
      }
      return '<button type="button" class="search-hit" data-route="' + h.id + '" data-idx="' + i + '">' +
        '<div class="hit-page">' + escapeHtml(h.title) + '</div>' +
        '<div class="hit-snippet">' + snip + '</div></button>';
    }).join('');
    activeHit = 0;
    highlightHit();
  }

  function highlightHit() {
    var nodes = searchResults.querySelectorAll('.search-hit');
    nodes.forEach(function (n, i) {
      n.classList.toggle('active', i === activeHit);
    });
    if (nodes[activeHit]) nodes[activeHit].scrollIntoView({ block: 'nearest' });
  }

  searchInput.addEventListener('input', function () {
    searchDocs(searchInput.value);
  });

  searchResults.addEventListener('click', function (e) {
    var hit = e.target.closest('.search-hit');
    if (!hit) return;
    navigate(hit.getAttribute('data-route'));
    closeSearch();
  });

  document.addEventListener('keydown', function (e) {
    var isMod = e.ctrlKey || e.metaKey;
    if (isMod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchModal.classList.contains('open')) closeSearch();
      else openSearch();
      return;
    }
    if (e.key === 'Escape') {
      if (searchModal.classList.contains('open')) closeSearch();
      else closeSidebar();
      return;
    }
    if (!searchModal.classList.contains('open')) return;
    var nodes = searchResults.querySelectorAll('.search-hit');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!nodes.length) return;
      activeHit = Math.min(nodes.length - 1, activeHit + 1);
      highlightHit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!nodes.length) return;
      activeHit = Math.max(0, activeHit - 1);
      highlightHit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (nodes[activeHit]) {
        navigate(nodes[activeHit].getAttribute('data-route'));
        closeSearch();
      }
    }
  });

  // Update kbd hint for Mac
  if ((navigator.platform || '').indexOf('Mac') >= 0 || (navigator.platform || '').indexOf('iPhone') >= 0 || (navigator.platform || '').indexOf('iPad') >= 0) {
    document.querySelectorAll('.search-trigger kbd').forEach(function (k) {
      k.textContent = '⌘ K';
    });
  }

  // Boot — prefer explicit start route injected by webview host, else hash, else overview
  var bootRoute = (typeof window.__BAANC_DOCS_START__ === 'string' && window.__BAANC_DOCS_START__)
    ? window.__BAANC_DOCS_START__
    : '';
  if (bootRoute && PAGES[bootRoute]) {
    navigate(bootRoute, '', { skipHash: false });
  } else if (location.hash && location.hash !== '#') {
    onRoute();
  } else {
    navigate('overview');
  }
})();
  </script>
</body>
</html>
`;

fs.writeFileSync(OUT_FILE, html, 'utf8');
const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${sizeKb} KB, ${PAGES.length} pages)`);
