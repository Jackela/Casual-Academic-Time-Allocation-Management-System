#!/usr/bin/env node

const { runNpmScript } = require('./lib/test-runner');
const params = require('./test.params.json');

function cleanExit(code) {
  try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
  process.exit(code);
}

async function main() {
  console.log('\n=== Running Frontend Contract/API Tests (Vitest) ===');
  process.on('SIGINT', () => cleanExit(130));
  process.on('SIGTERM', () => cleanExit(143));
  try {
    await runNpmScript(params.frontend.dir, params.frontend.scripts.contract);
    console.log('✅ Frontend contract tests passed.');
    cleanExit(0);
  } catch (err) {
    console.error('❌ Frontend contract tests failed.');
    console.error(String(err?.message || err));
    cleanExit(1);
  }
}

main();


