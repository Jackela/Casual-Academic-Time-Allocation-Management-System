#!/usr/bin/env node

const path = require('path');
const { startBackendE2E } = require('./start-backend-e2e');
const { runCommand } = require('./lib/test-runner');

async function main() {
  let backendController;

  try {
    console.log('\n=== Starting backend for workflow capture ===');
    backendController = await startBackendE2E({ timeoutMs: 180000 });
    console.log(`✅ Backend ready at ${backendController.healthUrl}`);

    const frontendDir = path.join(__dirname, '..', '..', 'frontend');
    const specPath = 'e2e/real/workflows/visual-workflow-audit.spec.ts';

    console.log('\n=== Capturing workflow screenshots ===');
    await runCommand('npx', ['playwright', 'test', '--project=real', '--workers=1', specPath], {
      cwd: frontendDir
    });
    console.log('\n✅ Workflow screenshots captured successfully.');
  } catch (error) {
    console.error('\n❌ Failed to capture workflow screenshots:', error.message || error);
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
