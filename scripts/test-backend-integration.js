#!/usr/bin/env node

const { runGradleTests } = require('./lib/test-runner');
const params = require('./test.params.json');

async function main() {
  console.log('\n=== Running Backend Integration Tests ===');
  try {
    await runGradleTests(
      params.backend.patterns.integration,
      { 'spring.profiles.active': params.backend.profiles.integration }
    );
    console.log('✅ Backend integration tests passed.');
    console.log('Report: build/reports/tests/test/index.html');
  } catch (err) {
    console.error('❌ Backend integration tests failed.');
    console.error(String(err?.message || err));
    console.error('Hint: Ensure Docker is running for TestContainers.');
    console.error('Inspect report: build/reports/tests/test/index.html');
    process.exit(1);
  }
}

main();


