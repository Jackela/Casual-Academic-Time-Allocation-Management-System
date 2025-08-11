#!/usr/bin/env node

const { runGradleTests } = require('./lib/test-runner');
const params = require('./test.params.json');
const { execSync } = require('child_process');

async function main() {
  console.log('\n=== Running Backend Unit Tests ===');
  let exitCode = 0;
  try {
    await runGradleTests(
      params.backend.patterns.unit,
      { 'spring.profiles.active': params.backend.profiles.unit }
    );
    console.log('✅ Backend unit tests passed.');
    console.log('Report (HTML): build/reports/tests/test/index.html');
    console.log('Report (JUnit XML): build/test-results/test');
  } catch (err) {
    exitCode = 1;
    console.error('❌ Backend unit tests failed.');
    console.error(String(err?.message || err));
    console.error('Inspect report: build/reports/tests/test/index.html');
  } finally {
    try { execSync('node scripts/lib/junit-to-json.js --in build/test-results/test --out results/ut-summary.json', { stdio: 'inherit' }); } catch {}
    try { execSync('node scripts/cleanup-ports.js', { stdio: 'inherit' }); } catch {}
    try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
    process.exit(exitCode);
  }
}

main();


