import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = process.env.CATAMS_REPO_ROOT
  ?? path.resolve(path.dirname(scriptPath), '..', '..');
const handbookPath = path.resolve(repoRoot, 'docs/archive/archive-handbook.zh-CN.md');
const outputPath = path.resolve(repoRoot, 'docs/archive/archive-handbook.zh-CN.pdf');

const markdown = await fs.readFile(handbookPath, 'utf8');
const htmlBody = renderMarkdown(markdown, handbookPath);
const html = buildDocument(htmlBody);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.emulateMedia({ media: 'screen' });
await page.evaluate(async () => {
  const images = Array.from(document.images);
  await Promise.all(images.map((img) => {
    if (img.complete) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
});
await page.pdf({
  path: outputPath,
  format: 'A4',
  printBackground: true,
  margin: {
    top: '16mm',
    bottom: '18mm',
    left: '14mm',
    right: '14mm',
  },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;font-size:8px;padding:0 12mm;color:#5c6a79;display:flex;justify-content:space-between;align-items:center;">
      <span>CATAMS Archive Handbook</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>
  `,
});
await browser.close();

console.log(`Generated ${outputPath}`);

function buildDocument(content) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>CATAMS 毕设归档与交付手册</title>
  <style>
    :root {
      --ink: #16293d;
      --accent: #0f6cbd;
      --accent-soft: #edf5ff;
      --border: #d7e0ea;
      --code-bg: #0f172a;
      --code-ink: #e2e8f0;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      font-family: "Microsoft YaHei", "Segoe UI", "Noto Sans CJK SC", "PingFang SC", sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      background: #fff;
    }

    main {
      width: 100%;
    }

    h1 {
      font-size: 28pt;
      line-height: 1.15;
      margin: 0 0 14px;
      color: #0f2942;
    }

    h2 {
      font-size: 18pt;
      line-height: 1.25;
      margin: 26px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
      color: #14324d;
    }

    h3 {
      font-size: 13.5pt;
      margin: 18px 0 8px;
      color: #173756;
    }

    p, li, blockquote {
      margin: 0 0 10px;
    }

    ul, ol {
      margin: 0 0 14px 22px;
      padding: 0;
    }

    hr {
      border: 0;
      border-top: 1px solid var(--border);
      margin: 22px 0;
    }

    blockquote {
      margin: 16px 0;
      padding: 14px 16px;
      background: var(--accent-soft);
      border-left: 4px solid var(--accent);
      border-radius: 10px;
      color: #234b72;
    }

    code {
      font-family: "Cascadia Code", Consolas, monospace;
      font-size: 0.92em;
      background: #f3f6f9;
      padding: 1px 5px;
      border-radius: 5px;
    }

    pre {
      background: var(--code-bg);
      color: var(--code-ink);
      padding: 14px 16px;
      border-radius: 12px;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 12px 0 18px;
    }

    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      font-size: 10pt;
    }

    img {
      display: block;
      width: 100%;
      margin: 14px 0 18px;
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: 0 10px 24px rgba(20, 50, 77, 0.08);
      object-fit: contain;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }

    .page-break {
      break-before: page;
      page-break-before: always;
    }

    main > h1:first-of-type {
      margin-top: 0;
      padding: 28px 30px 0;
    }

    main > p:first-of-type,
    main > blockquote:first-of-type,
    main > hr:first-of-type,
    main > p:nth-of-type(2),
    main > p:nth-of-type(3) {
      margin-left: 30px;
      margin-right: 30px;
    }

    main > hr:first-of-type {
      margin-top: 26px;
      margin-bottom: 18px;
    }
  </style>
</head>
<body>
  <main>${content}</main>
</body>
</html>`;
}

function renderMarkdown(markdown, markdownPath) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let listType = null;
  let inCode = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${formatInline(paragraph.join(' '), markdownPath)}</p>`);
      paragraph = [];
    }
  };

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const flushCode = () => {
    if (inCode) {
      html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      inCode = false;
      codeLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushParagraph();
      closeList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    if (trimmed === '<!-- pagebreak -->') {
      flushParagraph();
      closeList();
      html.push('<div class="page-break"></div>');
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push('<hr />');
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${formatInline(heading[2], markdownPath)}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${formatInline(trimmed.slice(2), markdownPath)}</blockquote>`);
      continue;
    }

    const image = trimmed.match(/^!\[(.*)\]\((.*)\)$/);
    if (image) {
      flushParagraph();
      closeList();
      const alt = escapeHtml(image[1]);
      const src = resolveLink(image[2], markdownPath);
      html.push(`<img alt="${alt}" src="${src}" />`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (listType && listType !== 'ol') {
        closeList();
      }
      if (!listType) {
        listType = 'ol';
        html.push('<ol>');
      }
      html.push(`<li>${formatInline(ordered[1], markdownPath)}</li>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.*)$/);
    if (unordered) {
      flushParagraph();
      if (listType && listType !== 'ul') {
        closeList();
      }
      if (!listType) {
        listType = 'ul';
        html.push('<ul>');
      }
      html.push(`<li>${formatInline(unordered[1], markdownPath)}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  flushCode();

  return html.join('\n');
}

function formatInline(text, markdownPath) {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, target) => {
    const href = resolveLink(target, markdownPath);
    return `<a href="${href}">${escapeHtml(label)}</a>`;
  });
  return output;
}

function resolveLink(target, markdownPath) {
  if (/^(https?:|file:)/i.test(target)) {
    return target;
  }
  const absolutePath = path.resolve(path.dirname(markdownPath), target);
  return pathToFileURL(absolutePath).href;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
