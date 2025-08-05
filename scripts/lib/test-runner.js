/*
  Shared test runner utilities (CommonJS) to enforce DRY across all test scripts.
*/

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');

function getGradleCommand() {
  return process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
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
  const args = ['test'];
  // Map test patterns
  (testPatterns || []).forEach((p) => {
    args.push('--tests');
    args.push(p);
  });
  // Map -D system properties
  Object.entries(javaProps || {}).forEach(([key, value]) => {
    args.push(`-D${key}=${value}`);
  });
  // Extra args (if any)
  args.push(...(extraArgs || []));
  return runCommand(gradleCmd, args, { cwd: projectRoot });
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


