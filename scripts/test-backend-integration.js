#!/usr/bin/env node

const { runGradleTests } = require('./lib/test-runner');
const params = require('./test.params.json');
const { execSync } = require('child_process');

async function main() {
  console.log('\n=== Running Backend Integration Tests ===');
  let exitCode = 0;
  try {
    await runGradleTests(
      params.backend.patterns.integration,
      { 'spring.profiles.active': params.backend.profiles.integration }
    );
    console.log('✅ Backend integration tests passed.');
    console.log('Report (HTML): build/reports/tests/test/index.html');
    console.log('Report (JUnit XML): build/test-results/test');
  } catch (err) {
    exitCode = 1;
    console.error('❌ Backend integration tests failed.');
    console.error(String(err?.message || err));
    console.error('Hint: Ensure Docker is running for TestContainers.');
    console.error('Hint: Or run with explicit fallback: node scripts/test-backend-integration.js (with env) → CATAMS_IT_DB=h2 or -Dcatams.it.db=h2');
    console.error('Inspect report (HTML): build/reports/tests/test/index.html');
    console.error('Inspect report (JUnit XML): build/test-results/test');
  } finally {
    try { execSync('node scripts/lib/junit-to-json.js --in build/test-results/test --out results/it-summary.json', { stdio: 'inherit' }); } catch {}
    try { execSync('node scripts/cleanup-ports.js', { stdio: 'inherit' }); } catch {}
    try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
    process.exit(exitCode);
  }
}

main();


