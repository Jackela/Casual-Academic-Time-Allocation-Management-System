#!/usr/bin/env node

const path = require('path');
const { startBackendE2E } = require('./start-backend-e2e');
const { runCommand } = require('./lib/test-runner');

async function main() {
  let backendController;

  try {
    console.log('\n=== Starting backend for E2E checks ===');
    backendController = await startBackendE2E({ timeoutMs: 180000 });
    console.log(`✅ Backend ready at ${backendController.healthUrl}`);

    console.log('\n=== Running Playwright E2E suite ===');
    await runCommand('npm', ['run', 'test:e2e:full', '--prefix', 'frontend'], {
      cwd: path.join(__dirname, '..', '..')
    });
    console.log('\n✅ Playwright E2E suite completed successfully.');
  } catch (error) {
    console.error('\n❌ E2E checks failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (backendController?.stop) {
      console.log('\n=== Stopping backend ===');
      try {
        await backendController.stop();
        console.log('✅ Backend stopped cleanly.');
      } catch (stopError) {
        console.error('⚠️ Failed to stop backend cleanly:', stopError.message || stopError);
        process.exitCode = process.exitCode || 1;
      }
    }
  }
}

main();
