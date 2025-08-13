#!/usr/bin/env node

const path = require('path');
const { runCommand } = require('./lib/test-runner');

function cleanExit(code) {
  try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
  process.exit(code);
}

async function main() {
  console.log('\n=== Running Frontend E2E Tests (Playwright) ===');
  process.on('SIGINT', () => cleanExit(130));
  process.on('SIGTERM', () => cleanExit(143));
  try {
    const cwd = path.join(__dirname, '..');
    // Run only the desktop UI project by default (maps to Playwright project ui-tests)
    await runCommand('node', ['tools/scripts/run-e2e.js', '--project=ui'], { cwd });
    console.log('✅ Frontend E2E tests (ui) finished.');
    cleanExit(0);
  } catch (err) {
    console.error('❌ Frontend E2E tests failed.');
    console.error(String(err?.message || err));
    cleanExit(1);
  }
}

main();


