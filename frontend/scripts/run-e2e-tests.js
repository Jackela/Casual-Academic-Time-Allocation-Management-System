#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import tcpPortUsed from 'tcp-port-used';

import {
  resolveBackendPort,
  resolveFrontendPort,
  resolveBackendHost,
  resolveFrontendHost,
  resolveBackendUrl,
  resolveFrontendUrl,
  resolveNpmCommand,
  resolveGradleCommand,
  resolveCmdShim,
  sanitizeEnv,
  toPlatformCommand,
  createHealthConfig,
  waitForHttpHealth,
  buildUrl,
  isWindows,
} from './env-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const frontendDir = join(projectRoot, 'frontend');
const playwrightCli = join(frontendDir, 'node_modules', '@playwright', 'test', 'cli.js');

const colors = {
  reset: '\u001b[0m',
  bright: '\u001b[1m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
};

const TEST_FILE_REGEX = /\.(test|spec)\.[jt]sx?$/i;

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!process.env[key] && key.length > 0) {
      process.env[key] = value;
    }
  }
};

[
  join(projectRoot, '.env'),
  join(projectRoot, '.env.e2e'),
  join(frontendDir, '.env'),
  join(frontendDir, '.env.e2e'),
].forEach(loadEnvFile);

const managedChildren = new Set();

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`${colors.bright}[${step}]${colors.reset} ${colors.cyan}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function isTruthy(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
}

function parseArgList(raw) {
  if (!raw || !raw.trim()) {
    return [];
  }
  const matches = raw.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
  return matches.map((token) => token.replace(/^("|')|("|')$/g, ''));
}

function spawnBackground(command, args = [], options = {}) {
  const { command: binary, args: finalArgs } = toPlatformCommand(command, args);
  const child = spawn(binary, finalArgs, {
    cwd: options.cwd || projectRoot,
    env: sanitizeEnv(options.env),
    stdio: options.stdio ?? 'pipe',
    shell: false,
    windowsHide: true,
  });

  managedChildren.add(child);
  child.once('exit', () => managedChildren.delete(child));
  child.once('error', () => managedChildren.delete(child));

  return child;
}

function runCommand(command, args = [], options = {}) {
  const { command: binary, args: finalArgs } = toPlatformCommand(command, args);
  return new Promise((resolve, reject) => {
    const child = spawn(binary, finalArgs, {
      cwd: options.cwd || projectRoot,
      env: sanitizeEnv(options.env),
      stdio: options.stdio ?? 'inherit',
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (options.onStdout) {
          options.onStdout(chunk.toString());
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (options.onStderr) {
          options.onStderr(chunk.toString());
        }
      });
    }

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve({ code, signal, stdout, stderr });
      } else {
        const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
        const error = new Error(`${binary} exited with ${reason}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        error.signal = signal;
        reject(error);
      }
    });
  });
}

async function cleanupChild(child, label) {
  if (!child || !child.pid) {
    return;
  }

  log(`  🛑 Stopping ${label} (PID ${child.pid})`, colors.yellow);
  try {
    if (isWindows()) {
      await runCommand('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
    } else {
      try {
        process.kill(child.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') {
          logWarning(`${label} SIGTERM warning: ${error.message}`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') {
          logWarning(`${label} SIGKILL warning: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logWarning(`${label} cleanup warning: ${error.message}`);
  }
}

async function cleanupAll() {
  await Promise.allSettled(
    Array.from(managedChildren).map((child) => cleanupChild(child, 'process')),
  );
}

function loadBaseParams() {
  const paramsPath = join(__dirname, 'e2e.params.json');
  if (!fs.existsSync(paramsPath)) {
    return {};
  }
  const raw = fs.readFileSync(paramsPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    logWarning(`Failed to parse e2e.params.json: ${error.message}`);
    return {};
  }
}

async function checkDockerAvailability() {
  try {
    await runCommand('docker', ['info'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function hasPlaywrightTests(rootDir) {
  try {
    const entries = await fsPromises.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        if (await hasPlaywrightTests(entryPath)) {
          return true;
        }
      } else if (TEST_FILE_REGEX.test(entry.name)) {
        return true;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logWarning(`Playwright test discovery warning: ${error.message}`);
    }
  }
  return false;
}

async function isServiceHealthy(url) {
  try {
    await waitForHttpHealth({
      url,
      label: url,
      config: { ...createHealthConfig('SERVICE'), retries: 1, interval: 0 },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Issue a POST request to reset backend test data
 * @param {string} url - Reset endpoint URL
 * @param {string} token - Reset token for authentication
 * @returns {Promise<{status: number, ok: boolean, body: string}>}
 */
async function issueResetRequest(url, token) {
  if (typeof fetch === 'function') {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Test-Reset-Token': token,
        'Content-Type': 'application/json',
      },
    });
    const bodyText = await response.text().catch(() => '');
    return {
      status: response.status,
      ok: response.ok,
      body: bodyText,
    };
  }

  // Fallback to http/https module if fetch is not available
  return await new Promise((resolve, reject) => {
    try {
      const target = new URL(url);
      const lib = target.protocol === 'https:' ? https : http;
      const options = {
        method: 'POST',
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers: {
          'X-Test-Reset-Token': token,
          'Content-Type': 'application/json',
          'Content-Length': '0',
        },
      };

      const req = lib.request(options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 0;
          resolve({
            status,
            ok: status >= 200 && status < 300,
            body,
          });
        });
      });

      req.on('error', reject);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Reset backend test data via API endpoint
 * @param {string} backendUrl - Base backend URL
 * @param {Object} options - Reset options
 */
async function resetBackendData(backendUrl, options = {}) {
  const resetPath = options.resetPath || process.env.E2E_RESET_PATH || '/api/test-data/reset';
  const resetToken = options.resetToken || process.env.TEST_DATA_RESET_TOKEN || 'local-e2e-reset';
  const resetDisabled = isTruthy(process.env.E2E_DISABLE_RESET);

  if (resetDisabled) {
    logWarning('Skipping test data reset (E2E_DISABLE_RESET flag detected)');
    return;
  }

  const resetUrl = new URL(resetPath, backendUrl).toString();
  logStep('RESET', `Resetting backend test data via ${resetUrl}`);

  try {
    const response = await issueResetRequest(resetUrl, resetToken);
    if (!response.ok) {
      throw new Error(`status ${response.status}${response.body ? ` - ${response.body}` : ''}`);
    }
    logSuccess('Test data reset completed');
  } catch (error) {
    throw new Error(`Failed to reset backend test data: ${error.message}`);
  }
}

function collectPlaywrightArgs() {
  const envArgs = parseArgList(process.env.PLAYWRIGHT_ARGS);
  const cliArgs = process.argv.slice(2);
  const merged = [...envArgs, ...cliArgs];
  if (merged.length === 0 || merged[0].startsWith('-')) {
    merged.unshift('test');
  }
  return merged;
}

async function ensureBackend({ backendPort, backendHost, backendHealthUrl, backendProfile }) {
  if (await isServiceHealthy(backendHealthUrl)) {
    logSuccess(`Detected healthy backend at ${backendHealthUrl}. Reusing existing instance.`);
    return;
  }

  if (await tcpPortUsed.check(backendPort, backendHost)) {
    throw new Error(`Port ${backendPort} already in use but backend health check failed. Aborting.`);
  }

  logStep('STEP 2', 'Starting Spring Boot backend (Gradle bootRun)...');

  const gradleWrapper = resolveGradleCommand(projectRoot);
  const gradle = resolveCmdShim(gradleWrapper);
  const gradleArgs = [...gradle.args, 'bootRun', '-x', 'test'];
  const backendEnv = {
    SPRING_PROFILES_ACTIVE: backendProfile,
    SERVER_PORT: String(backendPort),
    SPRING_OUTPUT_ANSI_ENABLED: 'never',
    E2E_BACKEND_PORT: String(backendPort),
  };

  const child = spawnBackground(gradle.command, gradleArgs, {
    cwd: projectRoot,
    env: backendEnv,
  });

  child.stdout?.on('data', (chunk) => {
    const line = chunk.toString();
    if (line.includes('Started') || line.toLowerCase().includes('error')) {
      log(`  [backend] ${line.trim()}`, colors.blue);
    }
  });

  child.stderr?.on('data', (chunk) => {
    const line = chunk.toString();
    log(`  [backend:err] ${line.trim()}`, colors.red);
  });

  const healthConfig = createHealthConfig('BACKEND');
  await Promise.race([
    waitForHttpHealth({
      url: backendHealthUrl,
      label: 'backend',
      config: healthConfig,
    }),
    new Promise((_, reject) => {
      child.once('exit', (code) => {
        reject(new Error(`Backend process exited early with code ${code ?? 'unknown'}`));
      });
      child.once('error', (error) => reject(error));
    }),
  ]);

  logSuccess('Backend is healthy and ready.');
}

async function ensureFrontend({ frontendPort, frontendHost, frontendHealthUrl, backendPort, backendUrl }) {
  const frontendAlreadyHealthy = await isServiceHealthy(frontendHealthUrl);
  if (frontendAlreadyHealthy) {
    logSuccess(`Detected healthy frontend at ${frontendHealthUrl}. Reusing existing instance.`);
    return;
  }

  if (await tcpPortUsed.check(frontendPort, frontendHost)) {
    throw new Error(`Port ${frontendPort} already in use but frontend health check failed. Aborting.`);
  }

  logStep('STEP 3', 'Starting Vite frontend dev server...');
  const npmCommand = resolveNpmCommand();
  // Align Vite dev origin with E2E_FRONTEND_URL to match storageState origin exactly
  let resolvedHost = frontendHost;
  let resolvedPort = frontendPort;
  let frontendOrigin = `http://${resolvedHost}:${resolvedPort}`;
  try {
    if (process.env.E2E_FRONTEND_URL) {
      const u = new URL(process.env.E2E_FRONTEND_URL);
      if (u.hostname) resolvedHost = u.hostname;
      if (u.port) resolvedPort = Number(u.port);
      frontendOrigin = `${u.protocol}//${u.host}`;
    }
  } catch {}
  const env = {
    E2E_FRONTEND_PORT: String(frontendPort),
    E2E_BACKEND_PORT: String(backendPort),
    E2E_BACKEND_URL: backendUrl,
    VITE_API_BASE_URL: frontendOrigin,
    VITE_API_PROXY_TARGET: backendUrl,
    VITE_E2E: 'true',
    E2E_FRONTEND_HOST: frontendHost,
    NODE_ENV: 'test',
  };

  const devArgs = ['run', 'dev', '--', '--mode', 'e2e', '--host', resolvedHost, '--port', String(resolvedPort)];
  const child = spawnBackground(npmCommand, devArgs, {
    cwd: frontendDir,
    env,
  });

  child.stdout?.on('data', (chunk) => {
    const line = chunk.toString();
    if (line.includes('ready in') || line.includes('Local:')) {
      log(`  [frontend] ${line.trim()}`, colors.magenta);
    }
  });

  child.stderr?.on('data', (chunk) => {
    const line = chunk.toString();
    log(`  [frontend:err] ${line.trim()}`, colors.red);
  });

  const healthConfig = createHealthConfig('FRONTEND');
  await Promise.race([
    waitForHttpHealth({
      url: frontendHealthUrl,
      label: 'frontend',
      config: healthConfig,
    }),
    new Promise((_, reject) => {
      child.once('exit', (code) => {
        reject(new Error(`Frontend process exited early with code ${code ?? 'unknown'}`));
      });
      child.once('error', (error) => reject(error));
    }),
  ]);

  logSuccess('Frontend is serving requests.');
}

async function runPlaywright(frontendUrl, backendPort, frontendPort) {
  logStep('STEP 4', 'Executing Playwright test suite...');

  const hasTests = await hasPlaywrightTests(join(frontendDir, 'e2e'));
  if (!hasTests) {
    logWarning('No Playwright test files found. Skipping E2E execution.');
    return 0;
  }

  const args = collectPlaywrightArgs();
  const env = {
    E2E_EXTERNAL_WEBSERVER: '1',
    E2E_FRONTEND_URL: frontendUrl,
    E2E_FRONTEND_PORT: String(new URL(frontendUrl).port || frontendPort),
    E2E_BACKEND_PORT: String(backendPort),
    NODE_ENV: 'test',
  };

  log(`  ▶️  node ${playwrightCli} ${args.join(' ')}`, colors.cyan);

  try {
    const result = await runCommand(process.execPath, [playwrightCli, ...args], {
      cwd: frontendDir,
      env,
    });
    return result.code ?? 0;
  } catch (error) {
    if (typeof error.code === 'number') {
      logWarning(`Playwright exited with code ${error.code}`);
      return error.code;
    }
    throw error;
  }
}

async function main() {
  const params = loadBaseParams();
  const backendPort = resolveBackendPort();
  const frontendPort = await resolveFrontendPort();
  const backendHost = resolveBackendHost();
  const frontendHost = resolveFrontendHost();
  const backendUrl = resolveBackendUrl();
  const frontendUrl = resolveFrontendUrl();
  const backendProfile = process.env.E2E_BACKEND_PROFILE || params.backendProfile || 'e2e-local';
  const backendHealthPath = process.env.E2E_BACKEND_HEALTH || params.backendHealthCheckPath || '/actuator/health';
  const frontendHealthPath = process.env.E2E_FRONTEND_HEALTH || '/';
  const backendHealthUrl = buildUrl({
    protocol: new URL(backendUrl).protocol.replace(':', ''),
    host: backendHost,
    port: backendPort,
    path: backendHealthPath,
  });
  const frontendHealthUrl = new URL(frontendHealthPath, frontendUrl).toString();

  process.env.E2E_BACKEND_PORT = String(backendPort);
  process.env.E2E_FRONTEND_PORT = String(frontendPort);

  logStep('STEP 1', 'Pre-flight checks');

  const requireDocker = isTruthy(process.env.E2E_REQUIRE_DOCKER);
  const skipDockerCheck = isTruthy(process.env.E2E_SKIP_DOCKER_CHECK);
  if (!skipDockerCheck) {
    const dockerAvailable = await checkDockerAvailability();
    if (!dockerAvailable) {
      if (requireDocker) {
        throw new Error('Docker is required but not available.');
      }
      logWarning('Docker is not available. Continuing without Docker-dependent checks.');
    } else {
      logSuccess('Docker is available.');
    }
  } else {
    logWarning('Skipping Docker availability check (E2E_SKIP_DOCKER_CHECK).');
  }

  if (!isTruthy(process.env.E2E_SKIP_INSTALL)) {
    try {
      await runCommand(resolveNpmCommand(), ['install'], {
        cwd: frontendDir,
      });
      logSuccess('npm install completed.');
    } catch (error) {
      logWarning(`npm install failed: ${error.message}. Continuing with existing dependencies.`);
    }
  }

  try {
    await ensureBackend({
      backendPort,
      backendHost,
      backendHealthUrl,
      backendProfile,
    });

    // Reset backend test data after backend is ready
    await resetBackendData(backendUrl);
    // Seed minimal lecturer resources for deterministic UI (id=2)
    try {
      const token = process.env.TEST_DATA_RESET_TOKEN || 'local-e2e-reset';
      const seedUrl = new URL('/api/test-data/seed/lecturer-resources', backendUrl).toString();
      await fetch(seedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Test-Reset-Token': token },
        body: JSON.stringify({ lecturerId: 2, seedTutors: true }),
      }).catch(() => undefined);
      logSuccess('Seeded lecturer resources (id=2)');
    } catch (e) {
      logWarning(`Seed step failed or skipped: ${e.message}`);
    }

    await ensureFrontend({
      frontendPort,
      frontendHost,
      frontendHealthUrl,
      backendPort,
      backendUrl,
    });

    const exitCode = await runPlaywright(frontendUrl, backendPort, frontendPort);
    return exitCode;
  } finally {
    await cleanupAll();
  }
}

function registerSignalHandlers() {
  const shutdown = async (signal) => {
    log(`\n🛑 Received ${signal}. Cleaning up...`, colors.yellow);
    await cleanupAll();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        logError(`Cleanup error: ${error.message}`);
        process.exit(1);
      });
    });
  });
}

registerSignalHandlers();

main()
  .then((code) => {
    process.exit(code ?? 0);
  })
  .catch(async (error) => {
    logError(`E2E pipeline failed: ${error.message}`);
    await cleanupAll();
    process.exit(1);
  });
