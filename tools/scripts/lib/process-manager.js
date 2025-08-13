/*
  Process Management Utilities - Handles proper process lifecycle
*/

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

class ProcessManager {
  constructor() {
    this.childProcesses = new Set();
    this.cleanupExecuted = false;
    this.setupExitHandlers();
  }

  setupExitHandlers() {
    const cleanup = () => this.forceCleanup();
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      cleanup();
      process.exit(1);
    });
  }

  runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || projectRoot,
        shell: true,
        stdio: options.stdio || 'inherit',
        detached: false
      });

      this.childProcesses.add(child);
      const childPid = child.pid;
      
      // Timeout protection
      const timeout = setTimeout(() => {
        this.killProcess(childPid);
        reject(new Error(`Command timeout: ${command} ${args.join(' ')}`));
      }, options.timeout || 300000);

      child.on('close', (code) => {
        clearTimeout(timeout);
        this.childProcesses.delete(child);
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`${command} failed with exit ${code}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        this.childProcesses.delete(child);
        reject(error);
      });
    });
  }

  killProcess(pid) {
    try {
      if (process.platform === 'win32') {
        require('child_process').execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(-pid, 'SIGKILL');
      }
    } catch (e) {
      // Ignore kill errors
    }
  }

  async forceCleanup() {
    if (this.cleanupExecuted) return;
    this.cleanupExecuted = true;
    
    // Kill all tracked child processes
    for (const child of this.childProcesses) {
      if (child.pid) {
        this.killProcess(child.pid);
      }
    }
    
    // Kill common hanging processes
    try {
      if (process.platform === 'win32') {
        require('child_process').execSync('taskkill /F /IM java.exe /T 2>nul', { stdio: 'ignore' });
      } else {
        require('child_process').execSync('pkill -f gradle 2>/dev/null', { stdio: 'ignore' });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  getGradleCommand() {
    return process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
  }

  async runGradleTests(testPatterns, javaProps = {}, extraArgs = []) {
    const gradleCmd = this.getGradleCommand();
    const baseArgs = [
      'test', 
      '--no-daemon',
      '--no-build-cache',
      '--stacktrace',
      '-Dorg.gradle.daemon=false'
    ];
    
    (testPatterns || []).forEach((p) => {
      baseArgs.push('--tests', p);
    });
    
    Object.entries(javaProps || {}).forEach(([key, value]) => {
      baseArgs.push(`-D${key}=${value}`);
    });
    
    baseArgs.push(...(extraArgs || []));

    if (process.platform === 'win32') {
      const args = ['/c', gradleCmd, ...baseArgs];
      return this.runCommand('cmd', args, { cwd: projectRoot });
    }
    
    return this.runCommand(gradleCmd, baseArgs, { cwd: projectRoot });
  }

  async executeWithCleanup(operation, cleanupTasks = []) {
    let exitCode = 0;
    
    try {
      await operation();
      console.log('✅ Operation completed successfully');
    } catch (err) {
      exitCode = 1;
      console.error('❌ Operation failed:', err.message);
    } finally {
      // Execute cleanup tasks
      for (const task of cleanupTasks) {
        try {
          await task();
        } catch (e) {
          console.log('⚠️ Cleanup task failed (non-critical):', e.message);
        }
      }
      
      await this.forceCleanup();
      
      // Force exit after short delay
      setTimeout(() => {
        console.log('🔄 Force exit to prevent hanging');
        process.exit(exitCode);
      }, 1000);
    }
  }
}

module.exports = ProcessManager;