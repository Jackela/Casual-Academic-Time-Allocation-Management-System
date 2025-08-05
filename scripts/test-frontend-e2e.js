#!/usr/bin/env node

const path = require('path');
const { runCommand } = require('./lib/test-runner');
const params = require('./test.params.json');

async function main() {
  console.log('\n=== Running Frontend E2E Tests (Playwright) ===');
  try {
    const cwd = path.join(__dirname, '..', params.frontend.dir);
    await runCommand('node', ['scripts/run-e2e-tests.js'], { cwd });
    console.log('✅ Frontend E2E tests finished.');
  } catch (err) {
    console.error('❌ Frontend E2E tests failed.');
    console.error(String(err?.message || err));
    process.exit(1);
  }
}

main();


