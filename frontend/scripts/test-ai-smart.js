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
import treeKill from 'tree-kill';
import fs from 'fs/promises';
import { resolveBackendPort, resolveFrontendPort, resolveBackendHost, resolveFrontendHost, resolveBackendUrl, resolveFrontendUrl, sanitizeEnv, isWindows, createHealthConfig, waitForHttpHealth } from './env-utils.js';
import detectPort from 'detect-port';
import tcpPortUsed from 'tcp-port-used';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const treeKillAsync = promisify(treeKill);
const TEST_FILE_REGEX = /(\\.test|\\.spec)\./i;

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
    description: 'Fast unit tests with mocking',
    expectedDuration: 60000,
    paths: ['src/utils']
  },

  component: {
    name: 'Component Tests',
    binary: 'vitest',
    args: ['run', '--reporter=verbose', 'src/components/'],
    needsBackend: false,
    description: 'Component tests with MSW API mocking',
    expectedDuration: 120000,
    paths: ['src/components']
  },

  api: {
    name: 'API Contract Tests',
    binary: 'playwright',
    args: ['test', '--project=api-tests', '--reporter=line'],
    needsBackend: true,
    description: 'API integration tests requiring real backend',
    expectedDuration: 180000,
    paths: ['e2e/api']
  },

  contract: {
    name: 'Contract Tests',
    binary: 'playwright',
    args: ['test', '--project=api-tests', '--grep=contract|schema', '--reporter=line'],
    needsBackend: true,
    description: 'Frontend-backend contract validation',
    expectedDuration: 120000,
    paths: ['e2e/api']
  },

  e2e: {
    name: 'E2E Tests',
    binary: 'node',
    args: ['scripts/run-e2e-ai.js'],
    needsBackend: true,
    description: 'Full system end-to-end testing',
    expectedDuration: 600000,
    paths: ['e2e']
  }
};

const KNOWN_RUN_MODES = new Set([
  ...Object.keys(TEST_CATEGORIES),
  'fast',
  'pyramid',
  'all'
].map((mode) => mode.toLowerCase()));

function parseCliArgs(rawArgs) {
  const args = Array.isArray(rawArgs) ? [...rawArgs] : [];
  let mode = 'pyramid';

  if (args.length) {
    const candidateMode = args[0];
    if (candidateMode && KNOWN_RUN_MODES.has(candidateMode.toLowerCase())) {
      mode = candidateMode;
      args.shift();
    }
  }

  const extraArgs = args.filter((arg) => arg !== '--');
  return { mode, extraArgs };
}

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
        console.log(`🛑 Received ${signal}, cleaning up processes...`);
        await this.cleanupAll();
        process.exit(signal === 'SIGINT' ? 130 : 143);
      });
    });

    process.on('beforeExit', async () => {
      await this.cleanupAll();
    });
  }

  async spawn(command, args = [], options = {}) {
    const { env: envOverrides, cwd, ...rest } = options;
    const env = sanitizeEnv({ FORCE_COLOR: '0', ...(envOverrides || {}) });
    const defaultOptions = {
      stdio: 'inherit',
      env,
      cwd: cwd || path.join(__dirname, '..'),
      shell: false,
      windowsHide: isWindows(),
      ...rest
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
    if (!pid) {
      return;
    }

    try {
      if (isWindows()) {
        try {
          await execa('taskkill', ['/pid', String(pid), '/T', '/F'], {
            windowsHide: true,
            shell: false,
            stdio: 'ignore'
          });
        } catch (taskkillError) {
          console.warn(`⚠️  taskkill warning for PID ${pid}:`, taskkillError.message);
        }
      } else {
        try {
          process.kill(pid, signal);
        } catch (killError) {
          if (killError.code !== 'ESRCH') {
            console.warn(`⚠️  process.kill warning for PID ${pid}:`, killError.message);
          }
        }
        await treeKillAsync(pid, signal).catch((treeError) => {
          if (treeError.code !== 'ESRCH') {
            console.warn(`⚠️  tree-kill warning for PID ${pid}:`, treeError.message);
          }
        });
      }
    } catch (error) {
      console.warn(`⚠️  Failed to kill process ${pid}:`, error.message);
    } finally {
      this.managedProcesses.delete(pid);
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
    this.backendPort = resolveBackendPort();
    this.frontendPort = resolveFrontendPort();
    this.backendHost = resolveBackendHost();
    this.frontendHost = resolveFrontendHost();
    this.backendHealthPath = process.env.E2E_BACKEND_HEALTH || process.env.BACKEND_HEALTH_PATH || '/actuator/health';
    this.frontendHealthPath = process.env.E2E_FRONTEND_HEALTH || process.env.FRONTEND_HEALTH_PATH || '/';
    this.backendHealthConfig = createHealthConfig('BACKEND');
    this.frontendHealthConfig = createHealthConfig('FRONTEND');
    this.backendUrl = resolveBackendUrl();
    this.frontendUrl = resolveFrontendUrl();
    this.backendHealthUrl = new URL(this.backendHealthPath, this.backendUrl).toString();
    this.frontendHealthUrl = new URL(this.frontendHealthPath, this.frontendUrl).toString();
  }

  async isPortAvailable(port) {
    try {
      const detectedPort = await detectPort(port);
      return detectedPort === port;
    } catch (error) {
      return false;
    }
  }

  async isPortInUse(port, host = '127.0.0.1') {
    try {
      return await tcpPortUsed.check(port, host);
    } catch (error) {
      return false;
    }
  }

  async waitForBackendHealth() {
    await waitForHttpHealth({
      url: this.backendHealthUrl,
      label: 'backend',
      config: this.backendHealthConfig,
    });
    return true;
  }

  async waitForFrontendHealth() {
    await waitForHttpHealth({
      url: this.frontendHealthUrl,
      label: 'frontend',
      config: this.frontendHealthConfig,
    });
    return true;
  }

  async checkBackendHealth() {
    try {
      await waitForHttpHealth({
        url: this.backendHealthUrl,
        label: 'backend',
        config: { ...this.backendHealthConfig, retries: 1, interval: this.backendHealthConfig.interval },
      });
      return { healthy: true, reason: 'Backend responding' };
    } catch (error) {
      return { healthy: false, reason: error.message };
    }
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

    const extraArgs = options.extraArgs ?? [];
    const spawnOverrides = { ...options };
    delete spawnOverrides.extraArgs;

    const hasFiles = await this.hasTestFiles(test);
    if (!hasFiles) {
      console.log(`⚠️  Skipping ${test.name} (no matching test files found).`);
      return { success: true, skipped: true, duration: 0 };
    }

    console.log(`📋 Running ${test.name}...`);
    console.log(`   Description: ${test.description}`);
    console.log(`   Binary: ${test.binary} ${test.args.join(' ')}`);
    if (extraArgs.length) {
      console.log(`   Additional args: ${extraArgs.join(' ')}`);
    }
    if (typeof test.expectedDuration === 'number') {
      console.log(`   Expected duration: ${test.expectedDuration}ms`);
    }

    const startTime = Date.now();

    try {
      const binaryPath = this.resolveBinaryPath(test.binary);
      let effectiveArgs = [...test.args];

      const spawnEnv = sanitizeEnv({
        NODE_ENV: 'test',
        FORCE_COLOR: '0',
        ...(spawnOverrides.env || {}),
      });
      delete spawnOverrides.env;

      const isAiE2EScript =
        test.binary === 'node' && test.args.some((arg) => arg.includes('run-e2e-ai.js'));

      if (isAiE2EScript) {
        const existingArgs = (spawnEnv.PLAYWRIGHT_ARGS || '').split(' ').filter(Boolean);
        const baseArgs = existingArgs.length ? existingArgs : ['playwright', 'test'];
        spawnEnv.PLAYWRIGHT_ARGS = extraArgs.length
          ? [...baseArgs, ...extraArgs].join(' ')
          : baseArgs.join(' ');
      } else if (extraArgs.length) {
        effectiveArgs = [...effectiveArgs, ...extraArgs];
      }

      let command;
      let args;

      if (test.binary === 'vitest' || test.binary === 'playwright') {
        command = process.execPath;
        args = [binaryPath, ...effectiveArgs];
        console.log(`🔧 Executing: node ${binaryPath} ${effectiveArgs.join(' ')}`);
      } else {
        command = binaryPath;
        args = effectiveArgs;
        console.log(`🔧 Executing: ${binaryPath} ${effectiveArgs.join(' ')}`);
      }

      const spawnOptions = {
        cwd: this.rootDir,
        env: spawnEnv,
        ...spawnOverrides,
      };

      await this.processManager.spawn(command, args, spawnOptions);

      const duration = Date.now() - startTime;
      console.log(`✅ ${test.name} passed (${duration}ms)`);
      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${test.name} failed (${duration}ms)`);

      if (typeof error?.exitCode !== 'undefined') {
        console.error(`   Exit code: ${error.exitCode}`);
      }
      if (error?.shortMessage) {
        console.error(`   Message: ${error.shortMessage}`);
      } else if (error?.message) {
        console.error(`   Message: ${error.message}`);
      }

      return { success: false, duration, error: error?.message || 'unknown error' };
    }
  }

  async hasTestFiles(test) {
    if (!Array.isArray(test.paths) || test.paths.length === 0) {
      return true;
    }

    for (const relativePath of test.paths) {
      const absolutePath = path.join(this.rootDir, relativePath);
      if (await this.directoryHasTests(absolutePath, 6)) {
        return true;
      }
    }

    return false;
  }

  async directoryHasTests(targetPath, depthRemaining) {
    if (depthRemaining < 0) {
      return false;
    }

    try {
      const stats = await fs.stat(targetPath);
      if (stats.isFile()) {
        return TEST_FILE_REGEX.test(path.basename(targetPath));
      }

      if (!stats.isDirectory()) {
        return false;
      }
    } catch (error) {
      return false;
    }

    try {
      const dirEntries = await fs.readdir(targetPath, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (entry.name.startsWith('.')) {
          continue;
        }
        const entryPath = path.join(targetPath, entry.name);
        if (entry.isFile() && TEST_FILE_REGEX.test(entry.name)) {
          return true;
        }
        if (entry.isDirectory()) {
          const found = await this.directoryHasTests(entryPath, depthRemaining - 1);
          if (found) {
            return true;
          }
        }
      }
    } catch (error) {
      return false;
    }

    return false;
  }

}

/**
 * Backend orchestration for integration tests
 */
class BackendManager {
  constructor(processManager, portManager) {
    this.processManager = processManager;
    this.portManager = portManager;
    this.orchestratorPath = path.join(__dirname, 'dev-orchestrator.js');
    this.backendOwned = false;
  }

  shouldSkipStartup() {
    const flag = process.env.E2E_SKIP_BACKEND || '';
    return ['1', 'true', 'yes'].includes(flag.toLowerCase());
  }

  async start() {
    console.log('📋 Starting backend...');

    if (this.shouldSkipStartup()) {
      console.log('⚙️  Skipping backend startup (E2E_SKIP_BACKEND enabled)');
      this.backendOwned = false;
      return true;
    }

    const existingHealth = await this.portManager.checkBackendHealth();
    if (existingHealth.healthy) {
      console.log(`♻️  Reusing backend on ${this.portManager.backendHost}:${this.portManager.backendPort}`);
      this.backendOwned = false;
      return true;
    }

    try {
      await this.processManager.spawn(
        'node',
        [this.orchestratorPath, 'test'],
        {
          env: sanitizeEnv({ BACKEND_PORT: String(this.portManager.backendPort) })
        }
      );

      await this.portManager.waitForBackendHealth();
      console.log('✅ Backend ready and healthy');
      this.backendOwned = true;
      return true;
    } catch (error) {
      console.error('❌ Backend startup failed:', error.message);
      this.backendOwned = false;
      return false;
    }
  }

  async stop() {
    if (!this.backendOwned) {
      return;
    }

    console.log('🧹 Stopping backend...');

    try {
      await this.processManager.spawn(
        'node',
        [this.orchestratorPath, 'cleanup'],
        {
          env: sanitizeEnv({ BACKEND_PORT: String(this.portManager.backendPort) })
        }
      );
    } catch (error) {
      console.warn('⚠️  Backend cleanup warning:', error.message);
    } finally {
      this.backendOwned = false;
    }
  }
}

/**
 * Main test orchestrator with strategy patterns
 */
class TestOrchestrator {
  constructor(extraArgs = []) {
    this.processManager = new ProcessManager();
    this.portManager = new PortManager();
    this.testRunner = new TestRunner(this.processManager);
    this.backendManager = new BackendManager(this.processManager, this.portManager);
    this.extraArgs = extraArgs;
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

  async runBackendTests(categories, extraArgs = []) {
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
        const result = await this.testRunner.runTest(category, { extraArgs });
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
    console.log('📋 STEP 1: Fast Feedback Loop');
    const fastPassed = await this.runFastTests();
    
    if (!fastPassed) {
      console.error('❌ Fast tests failed - stopping test pyramid');
      return 1;
    }
    
    // Step 2: Integration tests
    console.log('📋 STEP 2: Integration Tests');  
    const integrationPassed = await this.runBackendTests(['api', 'contract']);
    
    if (!integrationPassed) {
      console.error('❌ Integration tests failed - skipping E2E');
      return 2;
    }
    
    // Step 3: E2E tests
    console.log('📋 STEP 3: E2E Tests');
    const e2ePassed = await this.runBackendTests(['e2e'], this.extraArgs);
    
    if (!e2ePassed) {
      console.error('❌ E2E tests failed');
      return 3;
    }
    
    console.log('🎉 Complete test pyramid passed!');
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
      return await this.runBackendTests([category], this.extraArgs) ? 0 : 1;
    } else {
      const result = await this.testRunner.runTest(category, { extraArgs: this.extraArgs });
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
  const { mode: testType, extraArgs } = parseCliArgs(process.argv.slice(2));
  const orchestrator = new TestOrchestrator(extraArgs);
  
  console.log(`🤖 AI Smart Test Runner - ${testType} mode`);
  if (extraArgs.length) {
    console.log(`⏩ Pass-through args: ${extraArgs.join(' ')}`);
  }
  
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


















