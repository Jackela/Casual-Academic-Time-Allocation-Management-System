#!/usr/bin/env node

/**
 * Emergency cleanup script for CATAMS development environment
 * 
 * This script performs aggressive cleanup when the system is stuck with hanging processes.
 * It's designed to handle the worst-case scenarios where normal cleanup fails.
 * 
 * Features:
 * - Kills all Node.js and Java processes
 * - Cleans up all CATAMS-related ports (8084, 5174, 3000, 8080)
 * - Stops Gradle daemons
 * - Cross-platform compatible
 * 
 * Usage:
 *   node scripts/emergency-cleanup.js
 *   node scripts/emergency-cleanup.js --gentle  # Try graceful shutdown first
 */

const { execSync, spawn } = require('child_process');
const { join } = require('path');

const isWindows = process.platform === 'win32';
const projectRoot = join(__dirname, '..');

// Define all possible CATAMS ports
const CATAMS_PORTS = [8084, 5174, 3000, 8080, 8090, 9000];

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function execSilent(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'pipe', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    return null;
  }
}

function killAllNodeProcesses(gentle = false) {
  log('Terminating all Node.js processes...');
  
  if (isWindows) {
    if (gentle) {
      execSilent('taskkill /IM node.exe');
      // Wait a bit for graceful shutdown
      setTimeout(() => {}, 2000);
    }
    // Force kill if gentle failed or not requested
    execSilent('taskkill /F /IM node.exe');
    execSilent('taskkill /F /IM npm.exe');
  } else {
    if (gentle) {
      execSilent('pkill -TERM node');
      execSilent('pkill -TERM npm');
      // Wait for graceful shutdown
      setTimeout(() => {}, 2000);
    }
    // Force kill
    execSilent('pkill -KILL node');
    execSilent('pkill -KILL npm');
  }
  
  log('Node.js processes terminated');
}

function killAllJavaProcesses(gentle = false) {
  log('Terminating all Java processes (including Gradle)...');
  
  if (isWindows) {
    if (gentle) {
      execSilent('taskkill /IM java.exe');
      setTimeout(() => {}, 3000);
    }
    execSilent('taskkill /F /IM java.exe');
    execSilent('taskkill /F /IM javaw.exe');
  } else {
    if (gentle) {
      execSilent('pkill -TERM java');
      setTimeout(() => {}, 3000);
    }
    execSilent('pkill -KILL java');
  }
  
  log('Java processes terminated');
}

function killProcessesByPort(port) {
  log(`Cleaning up port ${port}...`);
  
  if (isWindows) {
    const netstatOutput = execSilent(`netstat -ano | findstr :${port}`);
    if (netstatOutput) {
      const lines = netstatOutput.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          execSilent(`taskkill /F /T /PID ${pid}`);
          log(`  Killed PID ${pid} using port ${port}`);
        }
      }
    }
  } else {
    // Unix-like systems
    const lsofOutput = execSilent(`lsof -ti:${port}`);
    if (lsofOutput) {
      const pids = lsofOutput.trim().split('\n');
      for (const pid of pids) {
        if (pid && /^\d+$/.test(pid)) {
          execSilent(`kill -9 ${pid}`);
          log(`  Killed PID ${pid} using port ${port}`);
        }
      }
    }
  }
}

function stopGradleDaemons() {
  log('Stopping Gradle daemons...');
  try {
    if (isWindows) {
      execSync('.\\gradlew.bat --stop', { 
        cwd: projectRoot, 
        stdio: 'pipe',
        timeout: 10000 
      });
    } else {
      execSync('./gradlew --stop', { 
        cwd: projectRoot, 
        stdio: 'pipe',
        timeout: 10000 
      });
    }
    log('Gradle daemons stopped');
  } catch (error) {
    log('Gradle daemon stop failed or timed out', 'WARN');
  }
}

function cleanupTempFiles() {
  log('Cleaning up temporary files...');
  
  // Clean npm cache and temp directories
  execSilent('npm cache clean --force');
  
  if (isWindows) {
    execSilent('rmdir /S /Q node_modules\\.cache', { cwd: join(projectRoot, 'frontend') });
    execSilent('rmdir /S /Q .gradle\\daemon', { cwd: projectRoot });
  } else {
    execSilent('rm -rf node_modules/.cache', { cwd: join(projectRoot, 'frontend') });
    execSilent('rm -rf .gradle/daemon', { cwd: projectRoot });
  }
  
  log('Temporary files cleaned');
}

function validateCleanup() {
  log('Validating cleanup...');
  
  let issuesFound = 0;
  
  // Check for remaining Node processes
  const nodeCheck = isWindows 
    ? execSilent('tasklist /FI "IMAGENAME eq node.exe"')
    : execSilent('pgrep node');
  
  if (nodeCheck && nodeCheck.includes('node')) {
    log('WARNING: Some Node.js processes may still be running', 'WARN');
    issuesFound++;
  }
  
  // Check for remaining Java processes
  const javaCheck = isWindows
    ? execSilent('tasklist /FI "IMAGENAME eq java.exe"')
    : execSilent('pgrep java');
    
  if (javaCheck && javaCheck.includes('java')) {
    log('WARNING: Some Java processes may still be running', 'WARN');
    issuesFound++;
  }
  
  // Check ports
  for (const port of CATAMS_PORTS) {
    const portCheck = isWindows
      ? execSilent(`netstat -ano | findstr :${port}`)
      : execSilent(`lsof -i:${port}`);
      
    if (portCheck && portCheck.trim()) {
      log(`WARNING: Port ${port} may still be in use`, 'WARN');
      issuesFound++;
    }
  }
  
  if (issuesFound === 0) {
    log('✅ Cleanup validation passed - all clear!');
  } else {
    log(`⚠️  Found ${issuesFound} potential issues. You may need to restart your machine.`, 'WARN');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const gentle = args.includes('--gentle');
  
  log('🚨 CATAMS Emergency Cleanup Started');
  log(`Platform: ${process.platform}`);
  log(`Gentle mode: ${gentle ? 'enabled' : 'disabled'}`);
  
  try {
    // Step 1: Stop Gradle daemons first (most likely to respond)
    stopGradleDaemons();
    
    // Step 2: Clean up ports
    for (const port of CATAMS_PORTS) {
      killProcessesByPort(port);
    }
    
    // Step 3: Kill processes
    killAllNodeProcesses(gentle);
    killAllJavaProcesses(gentle);
    
    // Step 4: Clean temp files
    cleanupTempFiles();
    
    // Step 5: Validate
    setTimeout(() => {
      validateCleanup();
      log('🧹 Emergency cleanup completed');
    }, 2000);
    
  } catch (error) {
    log(`Emergency cleanup failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  log('Emergency cleanup interrupted');
  process.exit(130);
});

if (require.main === module) {
  main();
}

module.exports = { main };