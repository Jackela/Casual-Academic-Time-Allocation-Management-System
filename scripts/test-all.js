#!/usr/bin/env node

const path = require('path');
const { runCommand } = require('./lib/test-runner');

function runNode(script) {
  return runCommand('node', [script], { cwd: path.join(__dirname, '..') });
}

function cleanExit(code) {
  try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
  process.exit(code);
}

async function main() {
  console.log('\n=== CATAMS Layered Test Orchestrator ===');
  process.on('SIGINT', () => cleanExit(130));
  process.on('SIGTERM', () => cleanExit(143));
  let exitCode = 0;
  try {
    await runNode('scripts/preflight.js');
    await runNode('scripts/test-backend-unit.js');
    await runNode('scripts/test-backend-integration.js');
    await runNode('scripts/test-frontend-unit.js');
    await runNode('scripts/test-frontend-contract.js');
    // E2E staged: ui -> mobile -> all
    await runCommand('node', ['scripts/run-e2e.js', '--project=ui'], { cwd: path.join(__dirname, '..') });
    await runCommand('node', ['scripts/run-e2e.js', '--project=mobile'], { cwd: path.join(__dirname, '..') });
    await runCommand('node', ['scripts/run-e2e.js', '--project=all'], { cwd: path.join(__dirname, '..') });
    console.log('\n✅ All test layers passed.');
  } catch (err) {
    console.error('\n❌ Test pipeline halted due to failure in a lower layer.');
    console.error(String(err?.message || err));
    exitCode = 1;
  } finally {
    cleanExit(exitCode);
  }
}

main();


