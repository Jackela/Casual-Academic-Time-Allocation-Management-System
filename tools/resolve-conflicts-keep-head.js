#!/usr/bin/env node
/*
  Resolve git merge conflicts by keeping the local (HEAD) side.
  - Skips typical build/output folders
  - Operates on text files only by extension allowlist
*/

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', 'target', 'dist', 'build', '.idea', '.vscode', '.gradle', 'out', 'tools'
]);

const TEXT_EXT_ALLOWLIST = new Set([
  '.java', '.kt', '.groovy', '.gradle', '.xml', '.properties', '.yml', '.yaml', '.md', '.txt', '.json', '.csv',
  '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.css', '.scss', '.sass', '.html', '.htm', '.svg', '.sh', '.ps1',
  '.env', '.gitignore', '.gitattributes'
]);

const conflictRegex = /<<<<<<< [^\r\n]+\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [^\r\n]+(\r?\n)?/g;

/**
 * Determine whether a file should be treated as text by extension
 */
function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext && TEXT_EXT_ALLOWLIST.has(ext)) return true;
  // Some files have no extension but are text (e.g., LICENSE, Dockerfile)
  const base = path.basename(filePath);
  if (!ext && /^[A-Za-z0-9_.-]+$/.test(base)) return true;
  return false;
}

function resolveConflictsInContent(content) {
  if (!content.includes('<<<<<<<')) return null;
  let changed = false;
  const replaced = content.replace(conflictRegex, (match, left /*, right */) => {
    changed = true;
    return left;
  });
  let output = changed ? replaced : null;
  if (output === null) return null;
  // Line-based cleanup for stray markers
  const cleaned = output
    .split(/\r?\n/)
    .filter(line => {
      const trimmed = line.trim();
      if (trimmed === '<<<<<<< HEAD') return false;
      if (trimmed === '=======') return false;
      if (trimmed.startsWith('>>>>>>> ')) return false;
      return true;
    })
    .join('\n');
  return cleaned;
}

function walkAndFix(dir, stats) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndFix(abs, stats);
    } else if (entry.isFile()) {
      if (!isTextFile(abs)) continue;
      try {
        const raw = fs.readFileSync(abs, 'utf8');
        const fixed = resolveConflictsInContent(raw);
        if (fixed !== null) {
          fs.writeFileSync(abs, fixed, 'utf8');
          stats.fixedFiles.push(abs);
        }
      } catch (_) {
        // Skip unreadable files silently
      }
    }
  }
}

function main() {
  const stats = { fixedFiles: [] };
  walkAndFix(repoRoot, stats);
  console.log(`Resolved conflicts (kept HEAD) in ${stats.fixedFiles.length} files.`);
  if (stats.fixedFiles.length > 0) {
    for (const f of stats.fixedFiles) {
      console.log(`FIXED: ${path.relative(repoRoot, f)}`);
    }
  }
}

main();


