#!/usr/bin/env node

/**
 * Unified Cleanup Script
 * Handles process cleanup, port cleanup, and resource cleanup
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class CleanupManager {
  constructor(options = {}) {
    this.gentle = options.gentle || false;
    this.verbose = options.verbose || false;
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
      // Force kill Java processes
      if (process.platform === 'win32') {
        await this.execSafe('taskkill /F /IM java.exe /T 2>nul');
      } else {
        await this.execSafe('pkill -f gradle');
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
      if (process.platform === 'win32') {
        // Don't kill current process
        const currentPid = process.pid;
        const result = await this.execSafe(`wmic process where "name='node.exe' and ProcessId!=${currentPid}" get ProcessId /format:value`);
        // Implementation would parse and kill specific PIDs
      } else {
        await this.execSafe(`pkill -f node | grep -v ${process.pid}`);
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
  console.log('node tools/scripts/cleanup.js [mode]');
  console.log('\nModes:');
  console.log('  gentle    - Basic cleanup (Gradle + ports)');
  console.log('  normal    - Standard cleanup (default)');
  console.log('  full      - Complete cleanup + validation');
  console.log('  emergency - Aggressive cleanup (kills processes)');
  console.log('\nExamples:');
  console.log('  node tools/scripts/cleanup.js');
  console.log('  node tools/scripts/cleanup.js emergency');
}

async function main() {
  const [,, mode] = process.argv;
  
  if (mode === '--help' || mode === '-h') {
    printUsage();
    return;
  }

  const cleanup = new CleanupManager({ verbose: true });
  
  try {
    await cleanup.run(mode || 'normal');
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
  }
  
  // Force exit to prevent hanging
  setTimeout(() => process.exit(0), 1000);
}

main();