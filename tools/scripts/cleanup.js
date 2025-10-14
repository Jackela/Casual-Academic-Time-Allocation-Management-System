#!/usr/bin/env node

/**
 * Unified Cleanup Script
 * Handles process cleanup, port cleanup, and resource cleanup
 */

const path = require('path')
const { exec } = require('child_process')
const util = require('util')
const SafeProcessManager = require('./lib/safe-process-manager')
const execPromise = util.promisify(exec)

class CleanupManager {
  constructor(options = {}) {
    this.gentle = Boolean(options.gentle)
    this.verbose = Boolean(options.verbose)
    this.sessionId = options.sessionId || null
    this.safeProcessManager = new SafeProcessManager({
      sessionId: this.sessionId,
      ledgerPath: options.ledgerPath,
      log: (message, level = 'INFO') => this.log(message, level)
    })
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async execSafe(command, timeout = 30000) {
    try {
      const { stdout, stderr } = await execPromise(command, { timeout });
      if (this.verbose && stdout) {
        console.log(stdout);
      }
      return true;
    } catch (error) {
      if (this.verbose) {
        this.log(`Command failed: ${command} - ${error.message}`, 'WARN');
      }
      return false;
    }
  }

  async stopGradleDaemons() {
    this.log('Stopping Gradle daemons...');
    const success = await this.execSafe('./gradlew --stop');
    if (!success && !this.gentle) {
      if (this.safeProcessManager.isActive()) {
        const result = await this.safeProcessManager.terminateByPattern(['gradle', 'java'], { force: true });
        this.log(`Safe cleanup targeted ${result.attempted} Gradle/JVM processes, terminated ${result.terminated}.`);
        if (result.errors.length) {
          this.log(
            `Encountered ${result.errors.length} errors while terminating Gradle/JVM processes.`,
            'WARN'
          );
        }
      } else {
        this.log(
          'Safe process manager unavailable; skipping aggressive Gradle termination to avoid affecting unrelated processes.',
          'WARN'
        );
      }
    }
  }

  async cleanupPorts() {
    this.log('Cleaning up ports...');
    await this.execSafe('node tools/scripts/cleanup-ports.js');
  }

  async cleanupNodeProcesses() {
    if (!this.gentle) {
      this.log('Cleaning up Node.js processes...');
      if (this.safeProcessManager.isActive()) {
        const result = await this.safeProcessManager.terminateByPattern(['node', 'npm'], { force: true });
        this.log(`Safe cleanup targeted ${result.attempted} Node-related processes, terminated ${result.terminated}.`);
        if (result.errors.length) {
          this.log(
            `Encountered ${result.errors.length} errors attempting to terminate Node-related processes.`,
            'WARN'
          );
        }
      } else {
        this.log('Safe process manager unavailable; skipping Node.js process cleanup.', 'WARN');
      }
    }
  }

  async cleanupTempFiles() {
    this.log('Cleaning up temporary files...');
    const tempDirs = [
      'build/tmp',
      '.gradle/tmp',
      'node_modules/.cache',
      'frontend/node_modules/.cache'
    ];
    
    for (const dir of tempDirs) {
      if (process.platform === 'win32') {
        await this.execSafe(`if exist "${dir}" rmdir /s /q "${dir}"`);
      } else {
        await this.execSafe(`rm -rf "${dir}"`);
      }
    }
  }

  async validateCleanup() {
    this.log('Validating cleanup...');
    
    // Check for remaining processes
    if (process.platform === 'win32') {
      const javaProcs = await this.execSafe('tasklist /FI "IMAGENAME eq java.exe" /FO CSV | findstr /V "INFO:"');
      const nodeProcs = await this.execSafe('tasklist /FI "IMAGENAME eq node.exe" /FO CSV | findstr /V "INFO:"');
      // Could parse and report remaining processes
    } else {
      await this.execSafe('ps aux | grep -E "(java|gradle)" | grep -v grep');
    }
  }

  async run(mode = 'normal') {
    this.log(`🧹 Starting cleanup (mode: ${mode})`);
    
    switch (mode) {
      case 'gentle':
        this.gentle = true;
        await this.stopGradleDaemons();
        await this.cleanupPorts();
        break;
        
      case 'full':
        await this.stopGradleDaemons();
        await this.cleanupNodeProcesses();
        await this.cleanupPorts();
        await this.cleanupTempFiles();
        await this.validateCleanup();
        break;
        
      case 'emergency':
        this.gentle = false;
        this.log('🚨 Emergency cleanup mode');
        await this.cleanupNodeProcesses();
        await this.stopGradleDaemons();
        await this.cleanupPorts();
        await this.cleanupTempFiles();
        break;
        
      default: // normal
        await this.stopGradleDaemons();
        await this.cleanupPorts();
        await this.cleanupTempFiles();
    }
    
    this.log('✅ Cleanup completed');
  }
}

function printUsage() {
  console.log('\n🧹 Cleanup Script Usage:');
  console.log('node tools/scripts/cleanup.js [mode] [--session=<sessionId>] [--ledger=<path>]');
  console.log('\nModes:');
  console.log('  gentle    - Basic cleanup (Gradle + ports)');
  console.log('  normal    - Standard cleanup (default)');
  console.log('  full      - Complete cleanup + validation');
  console.log('  emergency - Aggressive cleanup (kills processes)');
  console.log('\nExamples:');
  console.log('  node tools/scripts/cleanup.js');
  console.log('  node tools/scripts/cleanup.js emergency --session=session_123');
  console.log('  node tools/scripts/cleanup.js --mode=full --session=session_123 --ledger=./tmp/process-ledger.json');
}

function parseArgs(argv) {
  const options = {
    mode: 'normal',
    sessionId: null,
    ledgerPath: null,
    help: false
  };

  const positional = [];

  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const [flag, value] = arg.split('=', 2);
      switch (flag) {
        case '--mode':
          if (value) {
            options.mode = value;
          }
          break;
        case '--session':
          if (value) {
            options.sessionId = value;
          }
          break;
        case '--ledger':
          if (value) {
            options.ledgerPath = path.resolve(process.cwd(), value);
          }
          break;
        default:
          break;
      }
      continue;
    }

    positional.push(arg);
  }

  if (positional.length > 0) {
    options.mode = positional[0];
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printUsage();
    return;
  }

  const cleanup = new CleanupManager({
    verbose: true,
    sessionId: options.sessionId,
    ledgerPath: options.ledgerPath
  });
  
  try {
    await cleanup.run(options.mode || 'normal');
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
  }
  
  // Force exit to prevent hanging
  setTimeout(() => process.exit(0), 1000);
}

main();
