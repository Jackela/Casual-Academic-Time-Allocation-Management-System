#!/usr/bin/env node

/**
 * Backend Unit Tests (Selective Runner)
 *
 * Runs a subset of backend unit tests by patterns for fast feedback.
 *
 * Usage examples:
 *   node scripts/test-backend-unit-select.js --tests="*TimesheetServiceUnitTest*"
 *   node scripts/test-backend-unit-select.js --tests=com.usyd.catams.unit.*
 *
 * Flags:
 *   --tests=PATTERN[,PATTERN...]   One or more Gradle test patterns
 *   --jsonOut=PATH                 Where to write JSON summary (default: results/ut-summary.json)
 */

const { runGradleTests } = require('./lib/test-runner');
const { execSync } = require('child_process');

function parseArgs(argv) {
  const args = { tests: [], jsonOut: 'results/ut-summary.json' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--tests=')) {
      const val = a.split('=')[1] || '';
      args.tests.push(...val.split(',').map(s => s.trim()).filter(Boolean));
    } else if (a.startsWith('--jsonOut=')) {
      args.jsonOut = a.split('=')[1] || 'results/ut-summary.json';
    }
  }
  return args;
}

async function main() {
  console.log('\n=== Running Backend Unit Tests (Selective) ===');
  const cleanExit = (code) => {
    try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
    process.exit(code);
  };
  process.on('SIGINT', () => cleanExit(130));
  process.on('SIGTERM', () => cleanExit(143));
  const args = parseArgs(process.argv);
  if (args.tests.length === 0) {
    console.warn('No --tests provided. Example: --tests="*UnitTest"');
  }

  let exitCode = 0;
  try {
    await runGradleTests(args.tests, { 'spring.profiles.active': 'test' });
    console.log('✅ Selected backend unit tests passed.');
  } catch (err) {
    exitCode = 1;
    console.error('❌ Selected backend unit tests failed.');
    console.error(String(err?.message || err));
    console.error('Inspect report: build/reports/tests/test/index.html');
  } finally {
    try { execSync(`node scripts/lib/junit-to-json.js --in build/test-results/test --out ${args.jsonOut}`, { stdio: 'inherit' }); } catch {}
    cleanExit(exitCode);
  }
}

main();


