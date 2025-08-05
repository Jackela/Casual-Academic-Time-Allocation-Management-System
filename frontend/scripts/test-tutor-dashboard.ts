#!/usr/bin/env node

/**
 * Test Runner for Tutor Dashboard with Robust Cleanup Protocol
 * 
 * This script runs the comprehensive E2E tests for the TutorDashboard component
 * and ensures proper cleanup of all processes afterwards.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import { 
  cleanupTestEnvironment, 
  killProcessOnPort, 
  waitForPortFree,
  trackProcess,
  registerCleanupHandler
} from '../e2e/utils/process-cleanup';

// Configuration
const FRONTEND_PORT = 5174;
const BACKEND_PORT = 8084;
const TEST_TIMEOUT = 300000; // 5 minutes
const STARTUP_TIMEOUT = 60000; // 1 minute

interface TestResult {
  success: boolean;
  exitCode: number;
  output: string;
  error?: string;
  duration: number;
}

/**
 * Wait for a service to be ready
 */
async function waitForService(url: string, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Service ready at ${url}`);
        return true;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error(`❌ Service at ${url} not ready after ${timeoutMs}ms`);
  return false;
}

/**
 * Start the frontend development server
 */
async function startFrontendServer(): Promise<ChildProcess> {
  console.log('🚀 Starting frontend development server...');
  
  // Ensure port is free first
  await killProcessOnPort(FRONTEND_PORT);
  await waitForPortFree(FRONTEND_PORT, 5000);
  
  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PORT: FRONTEND_PORT.toString() }
  });
  
  trackProcess(frontendProcess);
  
  // Capture output for debugging
  let outputBuffer = '';
  frontendProcess.stdout?.on('data', (data) => {
    const text = data.toString();
    outputBuffer += text;
    if (text.includes('Local:') || text.includes('ready')) {
      console.log('📡 Frontend server output:', text.trim());
    }
  });
  
  frontendProcess.stderr?.on('data', (data) => {
    const text = data.toString();
    outputBuffer += text;
    console.warn('⚠️ Frontend server warning:', text.trim());
  });
  
  // Wait for server to be ready
  const isReady = await waitForService(`http://localhost:${FRONTEND_PORT}`, STARTUP_TIMEOUT);
  if (!isReady) {
    throw new Error('Frontend server failed to start');
  }
  
  return frontendProcess;
}

/**
 * Run the E2E tests
 */
async function runE2ETests(): Promise<TestResult> {
  console.log('🧪 Running Tutor Dashboard E2E tests...');
  
  const startTime = Date.now();
  
  return new Promise<TestResult>((resolve) => {
    const testProcess = spawn('npx', [
      'playwright', 'test',
      'e2e/modules/tutor-workflow.spec.ts',
      '--reporter=list,html',
      '--timeout=45000'
    ], {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    trackProcess(testProcess);
    
    let outputBuffer = '';
    let errorBuffer = '';
    
    testProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      outputBuffer += text;
      console.log(text);
    });
    
    testProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorBuffer += text;
      console.error(text);
    });
    
    testProcess.on('close', (exitCode) => {
      const duration = Date.now() - startTime;
      const success = exitCode === 0;
      
      resolve({
        success,
        exitCode: exitCode || 0,
        output: outputBuffer,
        error: errorBuffer || undefined,
        duration
      });
    });
    
    // Set timeout for test execution
    setTimeout(() => {
      if (!testProcess.killed) {
        console.warn('⏰ Test timeout reached, killing test process...');
        testProcess.kill('SIGTERM');
        
        setTimeout(() => {
          if (!testProcess.killed) {
            testProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, TEST_TIMEOUT);
  });
}

/**
 * Generate test report
 */
async function generateTestReport(result: TestResult): Promise<void> {
  const reportDir = path.resolve(__dirname, '..', 'test-results');
  await fs.mkdir(reportDir, { recursive: true });
  
  const report = {
    timestamp: new Date().toISOString(),
    testSuite: 'Tutor Dashboard E2E Tests',
    result: {
      success: result.success,
      exitCode: result.exitCode,
      duration: result.duration,
      durationFormatted: `${(result.duration / 1000).toFixed(2)}s`
    },
    output: result.output,
    error: result.error,
    environment: {
      frontendPort: FRONTEND_PORT,
      backendPort: BACKEND_PORT,
      nodeVersion: process.version,
      platform: process.platform
    }
  };
  
  const reportPath = path.join(reportDir, `tutor-dashboard-test-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 Test report saved: ${reportPath}`);
}

/**
 * Main test execution function
 */
async function main(): Promise<void> {
  let frontendProcess: ChildProcess | null = null;
  let testResult: TestResult | null = null;
  
  try {
    console.log('🎯 Starting Tutor Dashboard E2E Test Suite');
    console.log('==========================================');
    
    // Step 1: Initial cleanup
    console.log('\n📋 Step 1: Initial Environment Cleanup');
    await cleanupTestEnvironment();
    
    // Step 2: Start frontend server
    console.log('\n📋 Step 2: Starting Frontend Server');
    frontendProcess = await startFrontendServer();
    
    // Step 3: Verify backend is available
    console.log('\n📋 Step 3: Checking Backend Availability');
    const backendReady = await waitForService(`http://localhost:${BACKEND_PORT}/actuator/health`, 10000);
    if (!backendReady) {
      console.warn('⚠️ Backend not ready - tests may fail');
      console.warn('💡 Make sure to run: mvn spring-boot:run -Dspring-boot.run.arguments=--spring.profiles.active=e2e');
    }
    
    // Step 4: Run E2E tests
    console.log('\n📋 Step 4: Executing E2E Tests');
    testResult = await runE2ETests();
    
    // Step 5: Generate report
    console.log('\n📋 Step 5: Generating Test Report');
    await generateTestReport(testResult);
    
    // Results summary
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    console.log(`✨ Status: ${testResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`⏱️ Duration: ${(testResult.duration / 1000).toFixed(2)}s`);
    console.log(`🔢 Exit Code: ${testResult.exitCode}`);
    
    if (!testResult.success) {
      console.log('\n❌ Test failures detected');
      if (testResult.error) {
        console.log('Error details:', testResult.error);
      }
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error during test execution:', error);
    testResult = {
      success: false,
      exitCode: 1,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      duration: 0
    };
  } finally {
    // Step 6: Comprehensive cleanup
    console.log('\n📋 Step 6: Final Cleanup Protocol');
    console.log('================================');
    
    try {
      await cleanupTestEnvironment();
      console.log('✅ Cleanup completed successfully');
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError);
    }
    
    // Exit with appropriate code
    const exitCode = testResult?.success ? 0 : 1;
    console.log(`\n🏁 Test execution completed with exit code: ${exitCode}`);
    process.exit(exitCode);
  }
}

// Setup cleanup handlers for unexpected exits
registerCleanupHandler(async () => {
  console.log('🧹 Executing registered cleanup handlers...');
  await killProcessOnPort(FRONTEND_PORT);
});

// Handle script interruption
process.on('SIGINT', async () => {
  console.log('\n🛑 Test execution interrupted by user');
  await cleanupTestEnvironment();
  process.exit(130); // Standard exit code for SIGINT
});

// Run the test suite
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error in main:', error);
    process.exit(1);
  });
}