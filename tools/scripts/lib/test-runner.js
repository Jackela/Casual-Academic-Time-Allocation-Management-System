/*
  Fixed test runner utilities - Ensures proper process cleanup and exit
*/

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

function getGradleCommand() {
  return process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || projectRoot,
      shell: true,
      stdio: options.stdio || 'inherit',
      // Windows-specific: detach child process to prevent hanging
      detached: false,
      // Kill child processes when parent exits
      killSignal: 'SIGTERM'
    });

    // Store child process reference for cleanup
    const childPid = child.pid;
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.log(`⚠️ Process timeout, killing PID ${childPid}`);
      try {
        if (process.platform === 'win32') {
          require('child_process').execSync(`taskkill /F /T /PID ${childPid}`, { stdio: 'ignore' });
        } else {
          process.kill(-childPid, 'SIGKILL');
        }
      } catch (e) {
        // Ignore kill errors
      }
      reject(new Error(`Command timeout after 300 seconds: ${command} ${args.join(' ')}`));
    }, 300000); // 5 minute timeout

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit ${code}`));
      }
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Cleanup on process exit
    const cleanup = () => {
      clearTimeout(timeout);
      try {
        if (process.platform === 'win32') {
          require('child_process').execSync(`taskkill /F /T /PID ${childPid}`, { stdio: 'ignore' });
        } else {
          process.kill(-childPid, 'SIGTERM');
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });
}

function runGradleTests(testPatterns, javaProps = {}, extraArgs = []) {
  const gradleCmd = getGradleCommand();
  const baseArgs = [
    'test', 
    '--no-daemon',  // Critical: prevent daemon hanging
    '--stacktrace', 
    '--info', 
    '-Dorg.gradle.logging.level=info',
    // Force exit after tests
    '-Dorg.gradle.daemon=false',
    // Prevent build cache issues
    '--no-build-cache'
  ];
  
  (testPatterns || []).forEach((p) => {
    baseArgs.push('--tests');
    baseArgs.push(p);
  });
  
  Object.entries(javaProps || {}).forEach(([key, value]) => {
    baseArgs.push(`-D${key}=${value}`);
  });
  
  baseArgs.push(...(extraArgs || []));

  if (process.platform === 'win32') {
    // Windows: Use explicit exit strategy
    const args = ['/d', '/s', '/c', 'call', gradleCmd, ...baseArgs, '&&', 'exit', '/b', '%ERRORLEVEL%'];
    return runCommand('cmd.exe', args, { cwd: projectRoot });
  }
  
  return runCommand(gradleCmd, baseArgs, { cwd: projectRoot });
}

function runNpmScript(frontendDirRelative, scriptName, scriptArgs = []) {
  const cwd = path.join(projectRoot, frontendDirRelative || 'frontend');
  const args = ['run', scriptName, ...scriptArgs];
  return runCommand('npm', args, { cwd });
}

// Force cleanup function
function forceCleanup() {
  try {
    if (process.platform === 'win32') {
      // Kill all gradle and java processes
      require('child_process').execSync('taskkill /F /IM java.exe /T', { stdio: 'ignore' });
      require('child_process').execSync('taskkill /F /IM gradle.exe /T', { stdio: 'ignore' });
      require('child_process').execSync('taskkill /F /IM gradlew.bat /T', { stdio: 'ignore' });
    } else {
      require('child_process').execSync('pkill -f gradle', { stdio: 'ignore' });
      require('child_process').execSync('pkill -f java', { stdio: 'ignore' });
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

module.exports = {
  projectRoot,
  runCommand,
  runGradleTests,
  runNpmScript,
  getGradleCommand,
  forceCleanup
};