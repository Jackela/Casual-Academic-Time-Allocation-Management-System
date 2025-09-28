#!/usr/bin/env node

/**
 * AI-Ready E2E Test Runner with Orchestrator
 * 
 * Uses the development orchestrator for backend management
 * and lets Playwright handle the frontend via webServer configuration.
 */

import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runE2ETests() {
  console.log('🤖 [E2E] AI-Ready E2E Test Runner with Orchestrator');
  console.log('🤖 [E2E] ================================================');
  
  const orchestratorPath = path.join(__dirname, 'dev-orchestrator.js');
  
  try {
    // Step 1: Ensure backend is ready (non-blocking)
    console.log('📋 [STEP 1] Starting backend orchestrator...');
    
    await execa('node', [orchestratorPath, 'test'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    console.log('✅ [E2E] Backend is ready, starting Playwright tests...');
    
    // Step 2: Run Playwright tests (Playwright handles frontend via webServer)
    console.log('📋 [STEP 2] Running Playwright E2E tests...');
    
    const playwrightResult = await execa('npx', ['playwright', 'test', '--reporter=line'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true, // Fix for Windows Git Bash path issues
      env: {
        ...process.env,
        // Backend info for tests
        E2E_BACKEND_PORT: '8084',
        E2E_BACKEND_URL: 'http://localhost:8084',
        E2E_FRONTEND_URL: 'http://localhost:5174',
        // Let Playwright manage the frontend server
        E2E_EXTERNAL_WEBSERVER: 'false'
      }
    });
    
    console.log('✅ [E2E] Tests completed successfully!');
    return playwrightResult.exitCode;
    
  } catch (error) {
    console.error('❌ [E2E] Test execution failed:', error.message);
    
    // Try to cleanup backend
    try {
      console.log('🧹 [E2E] Cleaning up backend...');
      await execa('node', [orchestratorPath, 'cleanup'], {
        stdio: 'inherit',
        cwd: __dirname,
        timeout: 10000
      });
    } catch (cleanupError) {
      console.warn('⚠️  [E2E] Cleanup warning:', cleanupError.message);
    }
    
    return error.exitCode || 1;
  }
}

// Handle signals for cleanup
process.on('SIGINT', async () => {
  console.log('\n🛑 [E2E] Interrupted, cleaning up...');
  const orchestratorPath = path.join(__dirname, 'dev-orchestrator.js');
  try {
    await execa('node', [orchestratorPath, 'cleanup'], {
      stdio: 'inherit',
      cwd: __dirname,
      timeout: 5000
    });
  } catch (e) {}
  process.exit(130);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [E2E] Terminated, cleaning up...');
  const orchestratorPath = path.join(__dirname, 'dev-orchestrator.js');
  try {
    await execa('node', [orchestratorPath, 'cleanup'], {
      stdio: 'inherit', 
      cwd: __dirname,
      timeout: 5000
    });
  } catch (e) {}
  process.exit(143);
});

// Run tests
runE2ETests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('❌ [E2E] Fatal error:', error.message);
    process.exit(1);
  });