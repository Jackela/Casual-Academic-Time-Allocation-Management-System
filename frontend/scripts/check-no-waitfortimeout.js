#!/usr/bin/env node
// Fails if any waitForTimeout( is used in real specs (excluding shared utils where micro-windows may exist)
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'e2e', 'real');
const forbid = 'waitForTimeout(';
let violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (entry.isFile() && /\.spec\.ts$/.test(entry.name)) {
      const rel = path.relative(process.cwd(), p);
      const text = fs.readFileSync(p, 'utf-8');
      const idx = text.indexOf(forbid);
      if (idx !== -1) violations.push(rel);
    }
  }
}

walk(root);

if (violations.length) {
  console.error('waitForTimeout found in specs (forbidden):');
  for (const v of violations) console.error(' -', v);
  process.exit(1);
}
console.log('[OK] No waitForTimeout found in real specs.');
