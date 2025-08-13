/*
  Shared test runner utilities (CommonJS) to enforce DRY across all test scripts.
*/

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

function getGradleCommand() {
  // PowerShell does not resolve commands from current directory without explicit .\ prefix
  return process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || projectRoot,
      shell: true,
      stdio: options.stdio || 'inherit'
    });
    child.on('close', (code) => (code === 0 ? resolve(code) : reject(new Error(`${command} ${args.join(' ')} failed with exit ${code}`))));
    child.on('error', reject);
  });
}

function runGradleTests(testPatterns, javaProps = {}, extraArgs = []) {
  const gradleCmd = getGradleCommand();
  const baseArgs = ['test', '--no-daemon', '--stacktrace', '--info', `-Dorg.gradle.logging.level=info`];
  (testPatterns || []).forEach((p) => {
    baseArgs.push('--tests');
    baseArgs.push(p);
  });
  Object.entries(javaProps || {}).forEach(([key, value]) => {
    baseArgs.push(`-D${key}=${value}`);
  });
  baseArgs.push(...(extraArgs || []));

  if (process.platform === 'win32') {
    // Use `call` to safely invoke a .bat from within cmd without leaving a lingering batch job
    // and to avoid the "Terminate batch job (Y/N)?" prompt in nested invocations.
    const args = ['/d', '/s', '/c', 'call', gradleCmd, ...baseArgs];
    return runCommand('cmd.exe', args, { cwd: projectRoot });
  }
  return runCommand(gradleCmd, baseArgs, { cwd: projectRoot });
}

function runNpmScript(frontendDirRelative, scriptName, scriptArgs = []) {
  const cwd = path.join(projectRoot, frontendDirRelative || 'frontend');
  const args = ['run', scriptName, ...scriptArgs];
  return runCommand('npm', args, { cwd });
}

module.exports = {
  projectRoot,
  runCommand,
  runGradleTests,
  runNpmScript,
  getGradleCommand
};


