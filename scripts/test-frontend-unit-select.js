#!/usr/bin/env node

/**
 * Frontend Unit Tests (Selective Runner)
 *
 * Runs a subset of frontend unit tests using npm scripts and Vitest filters.
 *
 * Usage examples:
 *   node scripts/test-frontend-unit-select.js --pattern="auth.*.spec"
 *   node scripts/test-frontend-unit-select.js --pattern="utils/**"
 */

const { runNpmScript } = require('./lib/test-runner');

function parseArgs(argv) {
  const args = { pattern: '' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--pattern=')) {
      args.pattern = a.split('=')[1] || '';
    }
  }
  return args;
}

async function main() {
  console.log('\n=== Running Frontend Unit Tests (Selective) ===');
  const cleanExit = (code) => {
    try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
    process.exit(code);
  };
  process.on('SIGINT', () => cleanExit(130));
  process.on('SIGTERM', () => cleanExit(143));
  const args = parseArgs(process.argv);
  const scriptArgs = [];
  if (args.pattern) scriptArgs.push('--', args.pattern);

  let exitCode = 0;
  try {
    await runNpmScript('frontend', 'test:unit', scriptArgs);
    console.log('✅ Selected frontend unit tests passed.');
  } catch (err) {
    exitCode = 1;
    console.error('❌ Selected frontend unit tests failed.');
    console.error(String(err?.message || err));
  } finally {
    cleanExit(exitCode);
  }
}

main();


