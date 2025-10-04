import { spawn } from 'cross-spawn';
import treeKill from 'tree-kill';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import http from 'node:http';
import https from 'node:https';
import tcpPortUsed from 'tcp-port-used';

import {
  resolveBackendPort,
  resolveFrontendPort,
  resolveBackendHost,
  resolveFrontendHost,
  resolveBackendUrl,
  resolveFrontendUrl,
  sanitizeEnv,
  isWindows,
  resolveNpmCommand,
  resolveGradleCommand,
  resolveCmdShim,
  createHealthConfig,
  waitForHttpHealth,
} from './env-utils.js';

const kill = promisify(treeKill);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const projectRootParent = join(projectRoot, '..');

const BACKEND_PORT = resolveBackendPort();
const FRONTEND_PORT = resolveFrontendPort();
const BACKEND_HOST = resolveBackendHost();
const FRONTEND_HOST = resolveFrontendHost();
const BACKEND_URL = resolveBackendUrl();
const FRONTEND_URL = resolveFrontendUrl();
const BACKEND_PROFILE = process.env.E2E_BACKEND_PROFILE || 'e2e-local';
const BACKEND_HEALTH_PATH = process.env.E2E_BACKEND_HEALTH || '/actuator/health';
const FRONTEND_HEALTH_PATH = process.env.E2E_FRONTEND_HEALTH || '/';
const BACKEND_HEALTH_URL = new URL(BACKEND_HEALTH_PATH, BACKEND_URL).toString();
const FRONTEND_HEALTH_URL = new URL(FRONTEND_HEALTH_PATH, FRONTEND_URL).toString();
const RESET_ENDPOINT_PATH = process.env.E2E_RESET_PATH || '/api/test-data/reset';
const RESET_TOKEN = process.env.TEST_DATA_RESET_TOKEN || 'local-e2e-reset';
const RESET_DISABLED = ['0', 'false', 'no'].includes((process.env.E2E_DISABLE_RESET || '').toLowerCase());

const backendHealthConfig = createHealthConfig('BACKEND');
const frontendHealthConfig = createHealthConfig('FRONTEND');

const PLAYWRIGHT_ENTRY = join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');

let backendProcess;
let frontendProcess;
let shuttingDown = false;

function log(prefix, message, color = '\u001b[0m') {
  const reset = '\u001b[0m';
  console.log(`${color}[${prefix}]${reset} ${message}`);
}

function buildGradleCommand() {
  const wrapper = resolveGradleCommand(projectRootParent);
  const baseArgs = ['bootRun', '-x', 'test'];

  if (isWindows()) {
    const shim = resolveCmdShim(wrapper);
    return { command: shim.command, args: [...shim.args, ...baseArgs] };
  }

  return { command: wrapper, args: baseArgs };
}

function spawnProcess(command, args = [], options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || projectRoot,
    stdio: options.stdio || 'inherit',
    env: sanitizeEnv(options.env),
    shell: false,
    windowsHide: true,
  });
  return child;
}

async function terminateProcess(child) {
  if (!child || !child.pid) {
    return;
  }

  try {
    if (isWindows()) {
      await new Promise((resolve, reject) => {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
          shell: false,
          env: sanitizeEnv(),
        });
        killer.on('close', resolve);
        killer.on('error', reject);
      });
    } else {
      try {
        process.kill(child.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') {
          log('runner', `process.kill warning: ${error.message}`, '\u001b[33m');
        }
      }
      await kill(child.pid, 'SIGTERM');
    }
  } catch (error) {
    log('runner', `Cleanup warning: ${error.message}`, '\u001b[33m');
  }
}

async function portInUse(port, host) {
  try {
    return await tcpPortUsed.check(port, host);
  } catch {
    return false;
  }
}

async function isServiceHealthy(url, config) {
  try {
    await waitForHttpHealth({
      url,
      label: url,
      config: { ...config, retries: 1, interval: 0 },
    });
    return true;
  } catch {
    return false;
  }
}

async function issueResetRequest(url) {
  if (typeof fetch === 'function') {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Test-Reset-Token': RESET_TOKEN,
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
          'X-Test-Reset-Token': RESET_TOKEN,
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

async function resetBackendData() {
  if (RESET_DISABLED) {
    log('backend', 'Skipping test data reset (E2E_DISABLE_RESET flag detected)', '\u001b[33m');
    return;
  }

  const resetUrl = new URL(RESET_ENDPOINT_PATH, BACKEND_URL).toString();
  log('backend', `Resetting backend test data via ${resetUrl}`, '\u001b[36m');

  try {
    const response = await issueResetRequest(resetUrl);
    if (!response.ok) {
      throw new Error(`status ${response.status}${response.body ? ` - ${response.body}` : ''}`);
    }
    log('backend', 'Test data reset completed', '\u001b[32m');
  } catch (error) {
    throw new Error(`Failed to reset backend test data: ${error.message}`);
  }
}
function parseArgList(raw) {
  if (!raw || !raw.trim()) {
    return [];
  }
  const matches = raw.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
  return matches.map((token) => token.replace(/^("|')|("|')$/g, ''));
}

function resolvePlaywrightArgs() {
  const envArgs = parseArgList(process.env.PLAYWRIGHT_ARGS || '');
  const cliArgs = process.argv.slice(2);
  const merged = [...envArgs, ...cliArgs];
  if (merged.length === 0 || merged[0].startsWith('-')) {
    merged.unshift('test');
  }
  return merged;
}

function spawnBackend() {
  const { command, args } = buildGradleCommand();
  log('backend', `Starting backend (${command} ${args.join(' ')})`, '\u001b[36m');
  return spawnProcess(command, args, {
    cwd: projectRootParent,
    env: {
      SPRING_PROFILES_ACTIVE: BACKEND_PROFILE,
      SERVER_PORT: String(BACKEND_PORT),
      SPRING_OUTPUT_ANSI_ENABLED: 'never',
      E2E_BACKEND_PORT: String(BACKEND_PORT),
    },
  });
}

function spawnFrontend() {
  const npmCommand = resolveNpmCommand();
  log('frontend', 'Starting Vite dev server in e2e mode', '\u001b[36m');
  return spawnProcess(npmCommand, ['run', 'dev', '--', '--mode', 'e2e', '--strictPort', '--port', String(FRONTEND_PORT)], {
    cwd: projectRoot,
    env: {
      E2E_FRONTEND_PORT: String(FRONTEND_PORT),
      E2E_BACKEND_PORT: String(BACKEND_PORT),
      E2E_BACKEND_URL: BACKEND_URL,
      E2E_FRONTEND_URL: FRONTEND_URL,
      VITE_API_BASE_URL: BACKEND_URL,
      NODE_ENV: 'test',
    },
  });
}

async function runPlaywright() {
  log('playwright', 'Launching Playwright test suite', '\u001b[34m');
  const args = resolvePlaywrightArgs();
  const child = spawnProcess(process.execPath, [PLAYWRIGHT_ENTRY, ...args], {
    env: sanitizeEnv({
      E2E_EXTERNAL_WEBSERVER: '1',
      E2E_FRONTEND_PORT: String(FRONTEND_PORT),
      E2E_FRONTEND_URL: FRONTEND_URL,
      E2E_BACKEND_PORT: String(BACKEND_PORT),
      E2E_BACKEND_URL: BACKEND_URL,
    }),
  });
  return await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

async function shutdown(reason = 'exit') {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  log('runner', `Received ${reason}, cleaning up`, '\u001b[33m');
  await Promise.all([terminateProcess(frontendProcess), terminateProcess(backendProcess)]);
}

async function main() {
  process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(130)));
  process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(143)));

  const backendHealthy = await isServiceHealthy(BACKEND_HEALTH_URL, backendHealthConfig);
  const backendPortBusy = await portInUse(BACKEND_PORT, BACKEND_HOST);
  const skipBackend = ['1', 'true', 'yes'].includes((process.env.E2E_SKIP_BACKEND || '').toLowerCase());
  let backendReadyForReset = false;

  if (backendHealthy) {
    log('backend', `Reusing healthy backend at ${BACKEND_HEALTH_URL}`, '\u001b[33m');
    backendReadyForReset = true;
  } else if (backendPortBusy && !skipBackend) {
    throw new Error(`Backend port ${BACKEND_PORT} is in use but service is not healthy.`);
  } else if (!skipBackend) {
    backendProcess = spawnBackend();
    await waitForHttpHealth({
      url: BACKEND_HEALTH_URL,
      label: 'backend',
      config: backendHealthConfig,
    });
    log('backend', 'Service is healthy', '\u001b[32m');
    backendReadyForReset = true;
  } else {
    log('backend', 'Skipping backend startup (E2E_SKIP_BACKEND enabled)', '\u001b[33m');
  }

  if (backendReadyForReset) {
    await resetBackendData();
  } else {
    log('backend', 'Skipping test data reset because backend is unavailable', '\u001b[33m');
  }


  const frontendHealthy = await isServiceHealthy(FRONTEND_HEALTH_URL, frontendHealthConfig);
  const frontendPortBusy = await portInUse(FRONTEND_PORT, FRONTEND_HOST);

  if (frontendHealthy) {
    log('frontend', `Reusing healthy frontend at ${FRONTEND_HEALTH_URL}`, '\u001b[33m');
  } else if (frontendPortBusy) {
    throw new Error(`Frontend port ${FRONTEND_PORT} is in use but service is not healthy.`);
  } else {
    frontendProcess = spawnFrontend();
    await waitForHttpHealth({
      url: FRONTEND_HEALTH_URL,
      label: 'frontend',
      config: frontendHealthConfig,
    });
    log('frontend', 'Service is healthy', '\u001b[32m');
  }

  const exitCode = await runPlaywright();
  await shutdown('exit');
  process.exit(exitCode);
}

main().catch(async (error) => {
  log('runner', `Unhandled error: ${error.message}`, '\u001b[31m');
  await shutdown('error');
  process.exit(1);
});



