#!/usr/bin/env node

/**
 * Backend Integration Tests (Selective Runner)
 *
 * Runs a subset of backend integration tests by patterns to speed up feedback during fixes.
 *
 * Usage examples:
 *   node scripts/test-backend-integration-select.js --tests="*AuthenticationIntegrationTest"
 *   node scripts/test-backend-integration-select.js --tests=com.usyd.catams.integration.*Dashboard* --profile=integration-test
 *   node scripts/test-backend-integration-select.js --tests="*Timesheet*IntegrationTest" --engine=h2
 *
 * Flags:
 *   --tests=PATTERN[,PATTERN...]   One or more Gradle test patterns (repeatable or comma-separated)
 *   --profile=NAME                 Spring profile (default: integration-test)
 *   --engine=h2|pg                 Optional DB engine hint (h2 forces H2 fallback via -Dcatams.it.db=h2)
 *   --jsonOut=PATH                 Where to write JSON summary (default: results/it-summary.json)
 */

const { runGradleTests } = require('./lib/test-runner');
const { execSync } = require('child_process');

function parseArgs(argv) {
  const args = { tests: [], profile: 'integration-test', engine: null, jsonOut: 'results/it-summary.json' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--tests=')) {
      const val = a.split('=')[1] || '';
      args.tests.push(...val.split(',').map(s => s.trim()).filter(Boolean));
    } else if (a === '--tests') {
      // Support space-separated next token
      // Ignored here; robust parsing kept simple for brevity
    } else if (a.startsWith('--profile=')) {
      args.profile = a.split('=')[1] || 'integration-test';
    } else if (a.startsWith('--engine=')) {
      const engine = (a.split('=')[1] || '').toLowerCase();
      args.engine = engine === 'h2' ? 'h2' : (engine === 'pg' ? 'pg' : null);
    } else if (a.startsWith('--jsonOut=')) {
      args.jsonOut = a.split('=')[1] || 'results/it-summary.json';
    }
  }
  return args;
}

async function main() {
  console.log('\n=== Running Backend Integration Tests (Selective) ===');
  // Ensure clean termination on Ctrl+C or termination signals and always print sentinel
  const cleanExit = (code) => {
    try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
    process.exit(code);
  };
  process.on('SIGINT', () => cleanExit(130));
  process.on('SIGTERM', () => cleanExit(143));
  const args = parseArgs(process.argv);
  if (args.tests.length === 0) {
    console.warn('No --tests provided. Example: --tests="*AuthenticationIntegrationTest"');
  }

  let exitCode = 0;
  try {
    const javaProps = { 'spring.profiles.active': args.profile };
    if (args.engine === 'h2') {
      javaProps['catams.it.db'] = 'h2';
    }
    await runGradleTests(args.tests, javaProps);
    console.log('✅ Selected backend integration tests passed.');
  } catch (err) {
    exitCode = 1;
    console.error('❌ Selected backend integration tests failed.');
    console.error(String(err?.message || err));
    console.error('Hints:');
    console.error('- Ensure Docker is running for TestContainers, or use --engine=h2');
    console.error('- Inspect report: build/reports/tests/test/index.html');
  } finally {
    try { execSync(`node scripts/lib/junit-to-json.js --in build/test-results/test --out ${args.jsonOut}`, { stdio: 'inherit' }); } catch {}
    try { execSync('node scripts/cleanup-ports.js', { stdio: 'inherit' }); } catch {}
    cleanExit(exitCode);
  }
}

main();


