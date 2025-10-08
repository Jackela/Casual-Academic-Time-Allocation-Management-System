#!/usr/bin/env node

/**
 * Bridge script for legacy CI workflows
 *
 * The CI environment still invokes `node scripts/test-backend-unit.js`.
 * Delegate to the consolidated runner under tools/scripts to maintain
 * compatibility without duplicating logic.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('exit', (code) => resolve(code ?? 0));
    child.on('error', reject);
  });

const ensureExecutable = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const executableMask = 0o111;
    if ((stats.mode & executableMask) === 0) {
      fs.chmodSync(filePath, stats.mode | executableMask);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const normalizeLineEndings = (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath, 'utf8');
    if (buffer.includes('\r')) {
      const normalized = buffer.replace(/\r\n/g, '\n');
      fs.writeFileSync(filePath, normalized, { encoding: 'utf8' });
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const runGradleFallback = () => {
  if (process.env.ACT === 'true') {
    console.log('Detected act runtime; skipping Gradle execution for local workflow validation.');
    return Promise.resolve(0);
  }
  const gradleWrapperPath = process.platform === 'win32'
    ? path.join(projectRoot, 'gradlew.bat')
    : path.join(projectRoot, 'gradlew');
  if (process.platform !== 'win32') {
    normalizeLineEndings(gradleWrapperPath);
    ensureExecutable(gradleWrapperPath);
  }
  if (!fs.existsSync(gradleWrapperPath)) {
    throw new Error(`Gradle wrapper not found at ${gradleWrapperPath}`);
  }
  const gradleArgs = [
    'test',
    '--tests', 'com.usyd.catams.unit.*',
    '--tests', '*UnitTest',
    '-Dorg.gradle.configuration-cache=false',
  ];
  const command = process.platform === 'win32' ? gradleWrapperPath : 'bash';
  const args = process.platform === 'win32'
    ? gradleArgs
    : [gradleWrapperPath, ...gradleArgs];
  return runCommand(command, args, { cwd: projectRoot, shell: process.platform === 'win32' });
};

(async () => {
  const useAdvancedRunner = process.env.USE_ADVANCED_BACKEND_RUNNER === 'true';
  const advancedRunner = path.resolve(projectRoot, 'tools/scripts/test-backend.js');

  if (useAdvancedRunner && fs.existsSync(advancedRunner)) {
    try {
      const code = await runCommand('node', [advancedRunner, 'unit'], { cwd: projectRoot });
      if (code === 0) {
        process.exit(0);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Advanced backend runner failed; falling back to Gradle tests.', error);
    }
  }

  const fallbackCode = await runGradleFallback();
  process.exit(fallbackCode);
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Backend unit tests failed to execute:', error);
  process.exit(1);
});
