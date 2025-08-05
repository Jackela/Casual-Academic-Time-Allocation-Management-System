#!/usr/bin/env node

const { runNpmScript } = require('./lib/test-runner');
const params = require('./test.params.json');

async function main() {
  console.log('\n=== Running Frontend Contract/API Tests (Vitest) ===');
  try {
    await runNpmScript(params.frontend.dir, params.frontend.scripts.contract);
    console.log('✅ Frontend contract tests passed.');
  } catch (err) {
    console.error('❌ Frontend contract tests failed.');
    console.error(String(err?.message || err));
    process.exit(1);
  }
}

main();


