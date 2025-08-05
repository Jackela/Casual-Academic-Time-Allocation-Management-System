#!/usr/bin/env node

const path = require('path');
const { runGradleTests } = require('./lib/test-runner');
const params = require('./test.params.json');

async function main() {
  console.log('\n=== Running Backend Unit Tests ===');
  try {
    await runGradleTests(params.backend.patterns.unit, { 'spring.profiles.active': params.backend.profiles.unit });
    console.log('✅ Backend unit tests passed.');
    console.log('Report: build/reports/tests/test/index.html');
  } catch (err) {
    console.error('❌ Backend unit tests failed.');
    console.error(String(err?.message || err));
    console.error('Inspect report: build/reports/tests/test/index.html');
    process.exit(1);
  }
}

main();


