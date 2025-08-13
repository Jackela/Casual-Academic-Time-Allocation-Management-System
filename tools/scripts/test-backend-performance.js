#!/usr/bin/env node

const { runGradleTests } = require('./lib/test-runner');
const params = require('./test.params.json');

async function main() {
  console.log('\n=== Running Backend Performance Tests ===');
  try {
    await runGradleTests(
      params.backend.patterns.performance,
      { 'spring.profiles.active': params.backend.profiles.performance }
    );
    console.log('✅ Backend performance tests passed.');
    console.log('Report: build/reports/tests/test/index.html');
  } catch (err) {
    console.error('❌ Backend performance tests failed.');
    console.error(String(err?.message || err));
    console.error('Ensure Docker resources are sufficient for load testing.');
    console.error('Inspect report: build/reports/tests/test/index.html');
    process.exit(1);
  }
}

main();


