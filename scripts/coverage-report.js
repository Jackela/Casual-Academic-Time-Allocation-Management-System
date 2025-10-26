#!/usr/bin/env node
/* Prints paths to coverage and opens index if requested */
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

function showHelp() {
  console.log(`
Usage: coverage-report [--open]

Reports:
  Backend:  build/reports/jacoco/test/html/index.html
  Frontend: frontend/coverage/index.html
  E2E:      frontend/playwright-report/index.html
`);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const targets = [
  'build/reports/jacoco/test/html/index.html',
  'frontend/coverage/index.html',
  'frontend/playwright-report/index.html',
];

let printed = false;
for (const t of targets) {
  const ok = existsSync(t);
  console.log(`${ok ? '✔' : '✖'} ${t}`);
  printed = true;
}

if (args.includes('--open')) {
  for (const t of targets) {
    if (existsSync(t)) {
      const opener = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const oargs = process.platform === 'win32' ? ['/c', 'start', '', t] : [t];
      spawn(opener, oargs, { stdio: 'ignore', detached: true });
    }
  }
}

if (!printed) process.exit(1);

