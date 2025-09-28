#!/usr/bin/env node

/**
 * AI Smart Test Runner - Cross-Platform Node.js Implementation
 * 
 * FIXED: Now uses direct binary execution bypassing npm run layer
 * 
 * Robust test orchestration with intelligent backend management:
 * - Direct binary invocation from node_modules/.bin/ (bypasses npm run issues)
 * - Cross-platform process management using execa/cross-spawn
 * - Reliable cleanup with tree-kill and signal handling
 * - Port detection and health checking
 * - Test pyramid strategy for optimal feedback loops
 * - DevOps-ready with proper error codes and logging
 */

import { execa } from 'execa';
import crossSpawn from 'cross-spawn';
import treeKill from 'tree-kill';
import detectPort from 'detect-port';
import tcpPortUsed from 'tcp-port-used';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const treeKillAsync = promisify(treeKill);

/**
 * Test categories with backend dependencies and direct execution metadata
 * FIXED: Now using direct binary execution instead of npm run commands
 */
const TEST_CATEGORIES = {
  unit: {
    name: 'Unit Tests',
    binary: 'vitest',
    args: ['run', '--reporter=verbose', 'src/utils/'],
    needsBackend: false,
    timeout: 60000,
    description: 'Fast unit tests with mocking'
  },
  
  component: {
    name: 'Component Tests', 
    binary: 'vitest',
    args: ['run', '--reporter=verbose', 'src/components/'],
    needsBackend: false,
    timeout: 120000,
    description: 'Component tests with MSW API mocking'
  },
  
  api: {
    name: 'API Contract Tests',
    binary: 'playwright',
    args: ['test', '--project=api-tests', '--reporter=line'],
    needsBackend: true,
    timeout: 180000,
    description: 'API integration tests requiring real backend'
  },
  
  contract: {
    name: 'Contract Tests',
    binary: 'playwright',
    args: ['test', '--project=api-tests', '--grep=contract|schema', '--reporter=line'],
    needsBackend: true,
    timeout: 120000,
    description: 'Frontend-backend contract validation'
  },
  
  e2e: {
    name: 'E2E Tests',
    binary: 'node',
    args: ['scripts/run-e2e-ai.js'],
    needsBackend: true,
    timeout: 600000,
    description: 'Full system end-to-end testing'
  }
};

/**
 * Cross-platform process manager with robust cleanup
 */
class ProcessManager {
  constructor() {
    this.managedProcesses = new Set();
    this.setupSignalHandlers();
  }

  setupSignalHandlers() {
    ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}, cleaning up processes...`);
        await this.cleanupAll();
        process.exit(signal === 'SIGINT' ? 130 : 143);
      });
    });

    process.on('beforeExit', async () => {
      await this.cleanupAll();
    });
  }

  async spawn(command, args = [], options = {}) {
    const defaultOptions = {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '0' },
      cwd: options.cwd || path.join(__dirname, '..'),
      ...options
    };

    try {
      const child = execa(command, args, defaultOptions);
      
      if (child.pid) {
        this.managedProcesses.add(child.pid);
        
        child.on('exit', () => {
          this.managedProcesses.delete(child.pid);
        });
      }

      return child;
    } catch (error) {
      throw new Error(`Failed to spawn ${command}: ${error.message}`);
    }
  }

  async killProcess(pid, signal = 'SIGTERM') {
    if (!pid) return;
    
    try {
      await treeKillAsync(pid, signal);
      this.managedProcesses.delete(pid);
    } catch (error) {
      console.warn(`⚠️  Failed to kill process ${pid}:`, error.message);
    }
  }

  async cleanupAll() {
    const cleanupPromises = Array.from(this.managedProcesses).map(pid => 
      this.killProcess(pid, 'SIGTERM')
    );
    
    await Promise.allSettled(cleanupPromises);
    this.managedProcesses.clear();
  }
}

/**
 * Port management and backend health checking
 */
class PortManager {
  constructor() {
    this.backendPort = Number(process.env.BACKEND_PORT || 8084);
    this.frontendPort = 5174;
  }

  async isPortAvailable(port) {
    try {
      const detectedPort = await detectPort(port);
      return detectedPort === port;
    } catch (error) {
      return false;
    }
  }

  async isPortInUse(port) {
    try {
      return await tcpPortUsed.check(port, 'localhost');
    } catch (error) {
      return false;
    }
  }

  async checkBackendHealth(timeoutMs = 5000) {
    const isRunning = await this.isPortInUse(this.backendPort);
    
    if (!isRunning) {
      return { healthy: false, reason: 'Backend port not in use' };
    }

    // Additional health check could be added here (HTTP request to /health)
    return { healthy: true, reason: 'Backend responding' };
  }
}

/**
 * Cross-platform test runner with environment management
 * FIXED: Now uses direct binary execution bypassing npm run
 */
class TestRunner {
  constructor(processManager) {
    this.processManager = processManager;
    this.rootDir = path.join(__dirname, '..');
    this.binDir = path.join(this.rootDir, 'node_modules', '.bin');
  }

  /**
   * Resolve binary path from node_modules/.bin/ or use system binary
   * FIXED: Now resolves to the actual executable entry points bypassing shell wrappers
   * @param {string} binaryName - Name of the binary (e.g., 'vitest', 'node')
   * @returns {string} - Absolute path to the binary
   */
  resolveBinaryPath(binaryName) {
    // For 'node', use the system node binary
    if (binaryName === 'node') {
      return process.execPath;
    }
    
    // For vitest, use the direct .mjs entry point to bypass shell wrapper issues
    if (binaryName === 'vitest') {
      return path.join(this.rootDir, 'node_modules', 'vitest', 'vitest.mjs');
    }
    
    // For npx, use the system npx binary (cross-platform compatible)
    if (binaryName === 'npx') {
      return process.platform === 'win32' ? 'npx.cmd' : 'npx';
    }
    
    // For playwright, use the direct cli.js entry point to bypass shell wrapper issues
    if (binaryName === 'playwright') {
      return path.join(this.rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
    }
    
    // For other binaries, try node_modules/.bin/ first (fallback)
    const binPath = path.join(this.binDir, binaryName);
    const binPathCmd = path.join(this.binDir, `${binaryName}.cmd`); // Windows fallback
    
    // On Windows, prefer .cmd version if it exists
    if (process.platform === 'win32') {
      return binPathCmd;
    }
    
    return binPath;
  }

  async runTest(category, options = {}) {
    const test = TEST_CATEGORIES[category];
    if (!test) {
      throw new Error(`Unknown test category: ${category}`);
    }

    console.log(`📋 Running ${test.name}...`);
    console.log(`   Description: ${test.description}`);
    console.log(`   Binary: ${test.binary} ${test.args.join(' ')}`);
    console.log(`   Timeout: ${test.timeout}ms`);

    const startTime = Date.now();
    
    try {
      // FIXED: Direct binary execution bypassing npm run
      const binaryPath = this.resolveBinaryPath(test.binary);
      
      // Set up environment with NODE_ENV=test for vitest tests
      const testEnv = {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '0' // Disable colors for cleaner output
      };
      
      let command, args;
      
      // Special handling for vitest and playwright since we use direct entry points
      if (test.binary === 'vitest' || test.binary === 'playwright') {
        command = process.execPath; // Use node
        args = [binaryPath, ...test.args]; // Run node with entry point + test args
        console.log(`🔧 Executing: node ${binaryPath} ${test.args.join(' ')}`);
      } else {
        command = binaryPath;
        args = test.args;
        console.log(`🔧 Executing: ${binaryPath} ${test.args.join(' ')}`);
      }
      
      const result = await this.processManager.spawn(
        command,
        args,
        {
          timeout: test.timeout,
          cwd: this.rootDir,
          env: testEnv,
          ...options
        }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ ${test.name} passed (${duration}ms)`);
      return { success: true, duration };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${test.name} failed (${duration}ms)`);
      
      if (error.timedOut) {
        console.error(`   Reason: Timeout after ${test.timeout}ms`);
      } else if (error.exitCode) {
        console.error(`   Exit code: ${error.exitCode}`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
      
      return { success: false, duration, error: error.message };
    }
  }
}

/**
 * Backend orchestration for integration tests
 */
class BackendManager {
  constructor(processManager, portManager) {
    this.processManager = processManager;
    this.portManager = portManager;
    this.backendProcess = null;
    this.orchestratorPath = path.join(__dirname, 'dev-orchestrator.js');
  }

  async start() {
    console.log('📋 Starting backend...');
    
    try {
      // Start backend via orchestrator
      this.backendProcess = await this.processManager.spawn(
        'node',
        [this.orchestratorPath, 'test']
      );

      // Wait for backend to be ready
      console.log('⏳ Waiting for backend health check...');
      
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        const health = await this.portManager.checkBackendHealth();
        
        if (health.healthy) {
          console.log('✅ Backend ready and healthy');
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      throw new Error('Backend failed to start within timeout');
      
    } catch (error) {
      console.error('❌ Backend startup failed:', error.message);
      await this.stop();
      return false;
    }
  }

  async stop() {
    if (!this.backendProcess) return;
    
    console.log('🧹 Stopping backend...');
    
    try {
      // Use orchestrator cleanup
      await this.processManager.spawn(
        'node',
        [this.orchestratorPath, 'cleanup'],
        { timeout: 10000 }
      );
      
      // Kill the backend process tree
      if (this.backendProcess.pid) {
        await this.processManager.killProcess(this.backendProcess.pid);
      }
      
    } catch (error) {
      console.warn('⚠️  Backend cleanup warning:', error.message);
    } finally {
      this.backendProcess = null;
    }
  }
}

/**
 * Main test orchestrator with strategy patterns
 */
class TestOrchestrator {
  constructor() {
    this.processManager = new ProcessManager();
    this.portManager = new PortManager();
    this.testRunner = new TestRunner(this.processManager);
    this.backendManager = new BackendManager(this.processManager, this.portManager);
  }

  async runFastTests() {
    console.log('🚀 [AI-TEST] Running Fast Tests (No Backend)');
    console.log('='.repeat(50));
    
    const fastTests = ['unit', 'component'];
    
    for (const test of fastTests) {
      const result = await this.testRunner.runTest(test);
      if (!result.success) {
        return false;
      }
    }
    
    console.log('✅ All fast tests passed!');
    return true;
  }

  async runBackendTests(categories) {
    console.log('🔧 [AI-TEST] Running Backend Tests');
    console.log('='.repeat(50));
    
    try {
      // Start backend
      const backendStarted = await this.backendManager.start();
      if (!backendStarted) {
        return false;
      }
      
      // Run backend-dependent tests
      for (const category of categories) {
        const result = await this.testRunner.runTest(category);
        if (!result.success) {
          return false;
        }
      }
      
      return true;
      
    } finally {
      // Always cleanup backend
      await this.backendManager.stop();
    }
  }

  async runTestPyramid() {
    console.log('🏗️  [AI-TEST] Running Test Pyramid Strategy');
    console.log('='.repeat(50));
    
    // Step 1: Fast feedback loop
    console.log('\n📋 STEP 1: Fast Feedback Loop');
    const fastPassed = await this.runFastTests();
    
    if (!fastPassed) {
      console.error('❌ Fast tests failed - stopping test pyramid');
      return 1;
    }
    
    // Step 2: Integration tests
    console.log('\n📋 STEP 2: Integration Tests');  
    const integrationPassed = await this.runBackendTests(['api', 'contract']);
    
    if (!integrationPassed) {
      console.error('❌ Integration tests failed - skipping E2E');
      return 2;
    }
    
    // Step 3: E2E tests
    console.log('\n📋 STEP 3: E2E Tests');
    const e2ePassed = await this.runBackendTests(['e2e']);
    
    if (!e2ePassed) {
      console.error('❌ E2E tests failed');
      return 3;
    }
    
    console.log('\n🎉 Complete test pyramid passed!');
    return 0;
  }

  async runSingleTest(category) {
    const test = TEST_CATEGORIES[category];
    if (!test) {
      throw new Error(`Unknown test category: ${category}`);
    }

    console.log(`🤖 AI Smart Test Runner - ${category} mode`);
    console.log(`📋 Running ${test.name} only...`);

    if (test.needsBackend) {
      return await this.runBackendTests([category]) ? 0 : 1;
    } else {
      const result = await this.testRunner.runTest(category);
      return result.success ? 0 : 1;
    }
  }

  async cleanup() {
    await this.backendManager.stop();
    await this.processManager.cleanupAll();
  }
}

/**
 * Main execution function
 */
async function main() {
  const testType = process.argv[2] || 'pyramid';
  const orchestrator = new TestOrchestrator();
  
  console.log(`🤖 AI Smart Test Runner - ${testType} mode`);
  
  try {
    let exitCode = 0;
    
    switch (testType.toLowerCase()) {
      case 'fast':
        const fastResult = await orchestrator.runFastTests();
        exitCode = fastResult ? 0 : 1;
        break;
        
      case 'unit':
      case 'component':
      case 'api':
      case 'contract':
      case 'e2e':
        exitCode = await orchestrator.runSingleTest(testType);
        break;
        
      case 'pyramid':
      case 'all':
      default:
        exitCode = await orchestrator.runTestPyramid();
        break;
    }
    
    await orchestrator.cleanup();
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    
    await orchestrator.cleanup();
    process.exit(1);
  }
}

// Execute main function
main().catch(async (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});



