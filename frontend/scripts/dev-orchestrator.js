#!/usr/bin/env node

/**
 * AI-Ready Development Orchestrator
 * 
 * HARDENED: Now uses direct binary execution bypassing shell wrapper issues
 * 
 * Non-blocking backend management following vibe-coding best practices:
 * - Direct binary invocation from project root (bypasses shell wrapper issues)
 * - Port detection + conditional startup
 * - Health check with Spring Boot Actuator
 * - Process tree cleanup with tree-kill
 * - No daemon processes to prevent hanging
 * - Cross-platform robustness with proper path resolution
 * 
 * Usage: 
 *   node dev-orchestrator.js dev     # Start backend for development
 *   node dev-orchestrator.js test    # Start backend for E2E tests
 *   node dev-orchestrator.js cleanup # Kill all managed processes
 */

import { execa } from 'execa';
import tcpPortUsed from 'tcp-port-used';
import treeKill from 'tree-kill';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveBackendPort, resolveBackendHost, resolveBackendUrl, createHealthConfig, waitForHttpHealth } from './env-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BACKEND_PORT = resolveBackendPort();
const BACKEND_HOST = resolveBackendHost();
const BACKEND_URL = resolveBackendUrl();
const BACKEND_HEALTH_PATH = process.env.BACKEND_HEALTH_PATH || '/actuator/health';
const BACKEND_HEALTH_URL = new URL(BACKEND_HEALTH_PATH, BACKEND_URL).toString();
const BACKEND_PROFILE = process.env.BACKEND_PROFILE || process.env.E2E_BACKEND_PROFILE || 'e2e-local';
const BACKEND_CWD = path.resolve(__dirname, '..', '..');
const BACKEND_READY_TIMEOUT_MS = Number(process.env.BACKEND_READY_TIMEOUT_MS || 120_000); // 2 minutes
const BACKEND_HEALTH_CONFIG = createHealthConfig('BACKEND');
const HEALTH_INTERVAL_MS = BACKEND_HEALTH_CONFIG.interval;

// State tracking
let backendProcess = null;
let startedByOrchestrator = false;
const stateFile = path.join(__dirname, '.orchestrator-state.json');

/**
 * Cross-platform binary resolver following test-ai-smart.js pattern
 * HARDENED: Resolves binaries and commands with proper platform handling
 */
class BinaryResolver {
  constructor() {
    this.projectRoot = BACKEND_CWD;
  }

  /**
   * Resolve binary path for cross-platform execution
   * @param {string} binaryName - Name of the binary/command
   * @returns {Object} - Command and args for execution
   */
  resolveBinary(binaryName) {
    switch (binaryName) {
      case 'gradle':
        return this.resolveGradleBinary();
      default:
        throw new Error(`Unsupported binary: ${binaryName}`);
    }
  }

  /**
   * Resolve Gradle wrapper with cross-platform support
   * HARDENED: Direct path resolution bypassing shell wrapper issues
   */
  resolveGradleBinary() {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // For Windows, use cmd to execute the batch file
      const gradlewPath = path.join(this.projectRoot, 'gradlew.bat');
      return {
        command: 'cmd',
        args: ['/c', gradlewPath, 'bootRun', '-x', 'test', `--args=--spring.profiles.active=${BACKEND_PROFILE}`],
        description: 'Windows Gradle wrapper via cmd'
      };
    } else {
      // For Unix-like systems, execute the shell script directly
      const gradlewPath = path.join(this.projectRoot, 'gradlew');
      return {
        command: gradlewPath,
        args: ['bootRun', '-x', 'test', `--args=--spring.profiles.active=${BACKEND_PROFILE}`],
        description: 'Unix Gradle wrapper direct execution'
      };
    }
  }

  /**
   * Create enhanced environment for process execution
   * @returns {Object} - Environment variables with Gradle optimizations
   */
  createExecutionEnvironment() {
    return {
      ...process.env,
      SPRING_OUTPUT_ANSI_ENABLED: 'never',
      SPRING_PROFILES_ACTIVE: BACKEND_PROFILE,
      SERVER_PORT: String(BACKEND_PORT),
      E2E_BACKEND_PORT: String(BACKEND_PORT),
      E2E_BACKEND_URL: BACKEND_URL,
      // Disable Gradle daemon via environment variables
      GRADLE_OPTS: '-Dorg.gradle.daemon=false',
      ORG_GRADLE_DAEMON: 'false',
      // Additional stability improvements
      GRADLE_USER_HOME: path.join(this.projectRoot, '.gradle'),
      JAVA_OPTS: '-Xmx2g -XX:+UseG1GC'
    };
  }
}

// Initialize binary resolver
const binaryResolver = new BinaryResolver();

/**
 * Enhanced validation and error handling
 * HARDENED: Comprehensive pre-flight checks following DevOps best practices
 */
class EnvironmentValidator {
  /**
   * Validate environment requirements before starting backend
   */
  static async validateEnvironment() {
    const errors = [];
    
    // Check if project root exists
    if (!fs.existsSync(BACKEND_CWD)) {
      errors.push(`Backend directory not found: ${BACKEND_CWD}`);
    }
    
    // Check if Gradle wrapper exists
    const gradlewPath = process.platform === 'win32' 
      ? path.join(BACKEND_CWD, 'gradlew.bat')
      : path.join(BACKEND_CWD, 'gradlew');
    
    if (!fs.existsSync(gradlewPath)) {
      errors.push(`Gradle wrapper not found: ${gradlewPath}`);
    }
    
    // Check if build.gradle exists
    const buildGradlePath = path.join(BACKEND_CWD, 'build.gradle');
    const buildGradleKtsPath = path.join(BACKEND_CWD, 'build.gradle.kts');
    
    if (!fs.existsSync(buildGradlePath) && !fs.existsSync(buildGradleKtsPath)) {
      errors.push(`No Gradle build file found in: ${BACKEND_CWD}`);
    }
    
    // Check Java availability (basic check)
    try {
      const javaCheck = await execa('java', ['-version'], { stdio: 'ignore' });
      log('validator', 'Java runtime detected');
    } catch (e) {
      errors.push('Java runtime not found or not accessible');
    }
    
    return errors;
  }
  
  /**
   * Validate port availability
   */
  static async validatePort(port) {
    try {
      const inUse = await tcpPortUsed.check(port, BACKEND_HOST);
      return { available: !inUse, inUse };
    } catch (error) {
      return { available: false, inUse: false, error: error.message };
    }
  }
}

function log(tag, msg) {
  console.log(`[${tag}] ${msg}`);
}

function logError(tag, msg) {
  console.error(`[${tag}] ❌ ${msg}`);
}

function success(tag, msg) {
  console.log(`[${tag}] ✅ ${msg}`);
}

// Save process state for cleanup
function saveState(pid) {
  const state = { pid, startedAt: Date.now(), port: BACKEND_PORT };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (e) {
    // Ignore invalid state file
  }
  return null;
}

function clearState() {
  try {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Fast health check using configurable retries
async function checkBackendHealth(timeoutMs = BACKEND_HEALTH_CONFIG.requestTimeout) {
  try {
    await waitForHttpHealth({
      url: BACKEND_HEALTH_URL,
      label: 'backend',
      config: { ...BACKEND_HEALTH_CONFIG, retries: 1, requestTimeout: timeoutMs },
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Wait for backend to become healthy
async function waitForBackendHealth(maxTimeMs) {
  const startTime = Date.now();
  let attempts = 0;

  log('orchestrator', `Waiting for backend health check (max ${maxTimeMs / 1000}s)...`);

  while (Date.now() - startTime < maxTimeMs) {
    attempts += 1;

    if (await checkBackendHealth()) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      success('orchestrator', `Backend healthy after ${elapsed}s (${attempts} attempts)`);
      return true;
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (attempts % Math.max(1, Math.floor(15_000 / HEALTH_INTERVAL_MS)) === 0) {
      const progress = Math.floor((elapsed / (maxTimeMs / 1000)) * 100);
      log('orchestrator', `Health check attempt ${attempts} (${elapsed}s, ${progress}%)`);
    }

    await new Promise((resolve) => setTimeout(resolve, HEALTH_INTERVAL_MS));
  }

  logError('orchestrator', 'Backend health check timeout');
  return false;
}

// Start backend with hardened cross-platform execution
async function startBackend() {
  log('orchestrator', 'Starting Spring Boot backend...');
  
  try {
    // HARDENED: Use binary resolver for robust cross-platform execution
    const gradleBinary = binaryResolver.resolveBinary('gradle');
    const executionEnv = binaryResolver.createExecutionEnvironment();
    
    log('orchestrator', `Execution strategy: ${gradleBinary.description}`);
    log('orchestrator', `Command: ${gradleBinary.command} ${gradleBinary.args.join(' ')}`);
    
    // Start process in background (detached)
    backendProcess = execa(gradleBinary.command, gradleBinary.args, {
      cwd: BACKEND_CWD,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      env: executionEnv
    });
    
    startedByOrchestrator = true;
    
    // Save PID for cleanup
    if (backendProcess.pid) {
      saveState(backendProcess.pid);
    }
    
    // Monitor output (filtered to avoid log flood)
    backendProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      // Only log important startup messages
      if (/Started.*Application|Tomcat started|Netty started|Started .* in .* seconds/i.test(output)) {
        log('backend', output.trim());
        // If we see the application started, trigger an immediate health check
        if (/Started.*Application.*in.*seconds/i.test(output)) {
          log('orchestrator', 'Backend startup detected, checking health...');
        }
      }
    });
    
    backendProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      // Only log actual errors, not warnings
      if (/ERROR|Exception/i.test(output) && !/warning/i.test(output)) {
        logError('backend', output.trim());
      }
    });
    
    // Handle process exit
    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        logError('orchestrator', `Backend process exited with code ${code}`);
      }
      clearState();
    });
    
    success('orchestrator', `Backend process started (PID: ${backendProcess.pid})`);
    return backendProcess;
    
  } catch (error) {
    logError('orchestrator', `Failed to start backend: ${error.message}`);
    throw error;
  }
}

// Ensure backend is running (conditional startup with validation)
async function ensureBackend() {
  log('orchestrator', 'Running pre-flight environment validation...');
  
  // HARDENED: Comprehensive environment validation
  const validationErrors = await EnvironmentValidator.validateEnvironment();
  if (validationErrors.length > 0) {
    logError('orchestrator', 'Environment validation failed:');
    validationErrors.forEach(error => logError('validator', error));
    return false;
  }
  
  success('orchestrator', 'Environment validation passed');
  
  // Enhanced port checking
  const portStatus = await EnvironmentValidator.validatePort(BACKEND_PORT);
  
  if (portStatus.inUse) {
    log('orchestrator', `Port ${BACKEND_PORT} in use, checking health...`);
    const healthy = await checkBackendHealth(10000);
    
    if (healthy) {
      success('orchestrator', 'Using existing healthy backend');
      return true;
    } else {
      logError('orchestrator', 'Port occupied but backend unhealthy');
      return false;
    }
  } else if (!portStatus.available) {
    logError('orchestrator', `Port validation failed: ${portStatus.error}`);
    return false;
  }
  
  // Port is free, start new backend
  success('orchestrator', `Port ${BACKEND_PORT} available, starting new backend`);
  await startBackend();
  
  // Wait for health check
  const healthy = await waitForBackendHealth(BACKEND_READY_TIMEOUT_MS);
  
  if (!healthy) {
    logError('orchestrator', 'Backend health check timeout');
    await cleanup();
    return false;
  }
  
  return true;
}

// Cleanup managed processes
async function cleanup() {
  log('orchestrator', 'Cleaning up processes...');
  
  // Clean up our own started process
  if (backendProcess && startedByOrchestrator) {
    try {
      const pid = backendProcess.pid;
      log('orchestrator', `Terminating backend process (PID: ${pid})`);
      
      // HARDENED: Enhanced cross-platform process tree cleanup
      await new Promise((resolve) => {
        // Try graceful termination first
        treeKill(pid, 'SIGTERM', (err) => {
          if (err && !err.message?.includes('No such process')) {
            // In Git Bash on Windows, fallback to process.kill
            if (process.platform === 'win32' && err.message?.includes('Invalid argument')) {
              log('orchestrator', 'Using fallback process termination for Git Bash compatibility');
              try {
                process.kill(pid, 'SIGTERM');
              } catch (fallbackErr) {
                log('orchestrator', `Fallback termination warning: ${fallbackErr.message}`);
              }
            } else {
              log('orchestrator', `Tree-kill warning: ${err.message}`);
            }
          }
          resolve();
        });
      });
      
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill if still running
      try {
        process.kill(pid, 0); // Check if still running
        log('orchestrator', 'Force killing stubborn process...');
        treeKill(pid, 'SIGKILL');
      } catch (e) {
        // Process already dead, good
      }
      
    } catch (e) {
      log('orchestrator', `Cleanup error (non-fatal): ${e.message}`);
    }
  }
  
  // Clean up any processes from previous runs
  const state = loadState();
  if (state && state.pid) {
    try {
      log('orchestrator', `Cleaning up previous process (PID: ${state.pid})`);
      
      // HARDENED: Enhanced cleanup for previous processes
      treeKill(state.pid, 'SIGTERM', (err) => {
        if (err && process.platform === 'win32' && err.message?.includes('Invalid argument')) {
          try {
            process.kill(state.pid, 'SIGTERM');
          } catch (fallbackErr) {
            // Process likely already dead, which is fine
          }
        }
      });
    } catch (e) {
      // Ignore cleanup errors for old processes
    }
  }
  
  clearState();
  success('orchestrator', 'Cleanup completed');
}

// Signal handlers
function registerCleanupHandlers() {
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, async () => {
      log('orchestrator', `Received ${signal}, cleaning up...`);
      await cleanup();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    });
  });
  
  process.on('exit', () => {
    // Sync cleanup on exit
    const state = loadState();
    if (state?.pid) {
      try {
        treeKill(state.pid, 'SIGKILL');
      } catch (e) {}
    }
    clearState();
  });
}

// Main orchestrator logic
async function main() {
  const command = process.argv[2] || 'dev';
  
  registerCleanupHandlers();
  
  switch (command) {
    case 'dev':
    case 'test':
      log('orchestrator', `AI Development Orchestrator - ${command} mode`);
      log('orchestrator', '='.repeat(50));
      
      const success = await ensureBackend();
      if (success) {
        log('orchestrator', `Backend ready for ${command} mode`);
        log('orchestrator', `Health endpoint: ${BACKEND_HEALTH_URL}`);
        
        // For dev mode, keep running until interrupted
        if (command === 'dev') {
          log('orchestrator', 'Press Ctrl+C to stop...');
          await new Promise(() => {}); // Wait indefinitely
        }
        // For test mode, return control immediately
      } else {
        process.exit(1);
      }
      break;
      
    case 'cleanup':
      await cleanup();
      break;
      
    default:
      console.log('Usage: node dev-orchestrator.js [dev|test|cleanup]');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', async (err) => {
  logError('orchestrator', `Uncaught exception: ${err.message}`);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  logError('orchestrator', `Unhandled rejection: ${reason}`);
  await cleanup();
  process.exit(1);
});

// Execute
main().catch(async (err) => {
  logError('orchestrator', err.message);
  await cleanup();
  process.exit(1);
});