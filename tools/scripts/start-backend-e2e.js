#!/usr/bin/env node
/**
 * Start Spring Boot backend in e2e or e2e-local profile and wait for health.
 * - Chooses profile based on Docker availability: e2e (Testcontainers) if Docker OK, else e2e-local (Embedded Postgres)
 * - Reads port and health path from frontend/scripts/e2e.params.json
 * - Kills any existing process holding the target port before start
 * - Provides a clean stop() method to terminate the server
 */

const { spawn, execSync } = require('child_process');
const { join } = require('path');
const fs = require('fs');
const crypto = require('crypto');

const LOG_PREFIX = '[backend]';
const info = (msg) => console.log(`${LOG_PREFIX} ${msg}`);
const warn = (msg) => console.warn(`${LOG_PREFIX} ${msg}`);
const error = (msg) => console.error(`${LOG_PREFIX} ${msg}`);

function readParams() {
  const paramsPath = join(__dirname, '..', '..', 'frontend', 'scripts', 'e2e.params.json');
  const raw = fs.readFileSync(paramsPath, 'utf-8');
  return JSON.parse(raw);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function killPortWindows(port) {
  info(`killing processes on port ${port}`);
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const lines = out.trim().split(/\r?\n/).filter(Boolean);
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /F`); } catch {}
    }
  } catch {}

  let attempts = 0;
  while (attempts < 10) {
    try {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      if (!out || !out.trim()) break;
    } catch {
      break;
    }
    attempts++;
    await sleep(200);
  }
}

function tailLogsOnFailure(lines = 40) {
  try {
    const logPath = join(__dirname, '..', '..', 'logs', 'backend-e2e-run.out');
    if (!fs.existsSync(logPath)) {
      warn('no backend log file found');
      return;
    }
    const content = fs.readFileSync(logPath, 'utf-8').trim().split(/\r?\n/);
    const tail = content.slice(-lines);
    error('--- backend-e2e-run.out (tail) ---');
    tail.forEach(line => console.error(line));
  } catch (e) {
    warn(`failed to read backend log: ${e.message}`);
  }
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const onClose = (code, signal) => {
      if (settled) return; settled = true; resolve({ code, signal });
    };
    child.once('close', onClose);
    setTimeout(() => {
      if (settled) return; settled = true; resolve(null);
    }, Math.max(1000, timeoutMs || 10000));
  });
}

async function dockerAvailable(timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      execSync('docker info --format \"{{.ServerVersion}}\"', { stdio: ['ignore', 'pipe', 'ignore'] });
      return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

const DEFAULT_HEALTH_DELAY_MS = 1000;
const FAST_FAIL_MIN_ATTEMPTS = parseInt(process.env.E2E_FAST_FAIL_MIN_ATTEMPTS || '10', 10);
const FAST_FAIL_GRACE_MS = parseInt(process.env.E2E_FAST_FAIL_GRACE_MS || '20000', 10);

async function checkHealth(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function startBackendE2E({ timeoutMs = 180000, stream = true } = {}) {
  const params = readParams();
  const port = params.backendPort || 8084;
  const healthPath = params.backendHealthCheckPath || '/actuator/health';
  const healthUrl = `http://127.0.0.1:${port}${healthPath}`;
  const fastFail = process.env.E2E_FAST_FAIL === '1' || process.env.E2E_FAST_FAIL === 'true';
  const startTime = Date.now();

  await killPortWindows(port);

  const useDocker = await dockerAvailable();
  if (!useDocker) {
    throw new Error('Docker is not available. E2E profile requires Testcontainers.');
  }
  const activeProfile = 'e2e';
  info(`starting Spring Boot (profile=${activeProfile})`);

  const args = ['bootRun', '-x', 'test'];
  const envJwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('base64');
  const extraJvmFlags = '-Dspring.devtools.restart.enabled=false -Dspring.devtools.add-properties=false';
  const env = {
    ...process.env,
    JWT_SECRET: envJwtSecret,
    SPRING_PROFILES_ACTIVE: activeProfile,
    SERVER_PORT: String(port),
    SPRING_DEVTOOLS_ADD_PROPERTIES: 'false',
    SPRING_DEVTOOLS_RESTART_ENABLED: 'false',
    DISABLE_DEVTOOLS: '1',
    SPRING_APPLICATION_JSON: JSON.stringify({
      'spring': {
        'devtools': {
          'restart': {
            'enabled': false
          },
          'add-properties': false
        }
      }
    })
  };
env.JAVA_TOOL_OPTIONS = env.JAVA_TOOL_OPTIONS
  ? `${env.JAVA_TOOL_OPTIONS} ${extraJvmFlags}`
  : extraJvmFlags;

  const proc = spawn(process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew', args, {
    cwd: join(__dirname, '..', '..'),
    stdio: stream ? 'inherit' : 'pipe',
    shell: true,
    env,
  });
  proc.once('exit', (code, signal) => {
    if (Date.now() - startTime < 1000) {
      error(`gradle process exited immediately (code=${code}, signal=${signal})`);
    }
  });

  const envTimeout = parseInt(process.env.E2E_BACKEND_TIMEOUT_MS || '', 10);
  const effectiveTimeout = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : timeoutMs;
  let attempts = 0;
  let ready = false;
  const startHealth = Date.now();
  const delayMs = fastFail ? DEFAULT_HEALTH_DELAY_MS : 2000;
  while (Date.now() - startHealth < effectiveTimeout) {
    attempts += 1;
    const ok = await checkHealth(healthUrl);
    if (ok) {
      ready = true;
      break;
    }
    const elapsed = Date.now() - startHealth;
    info(`health attempt ${attempts} failed (elapsed ${elapsed}ms)`);
    const fastFailExceeded = fastFail && attempts >= FAST_FAIL_MIN_ATTEMPTS && elapsed >= FAST_FAIL_GRACE_MS;
    if (fastFailExceeded) {
      break;
    }
    await sleep(delayMs);
  }
  if (!ready) {
    try { proc.kill('SIGTERM'); } catch {}
    await waitForExit(proc, 5000);
    try { proc.kill('SIGKILL'); } catch {}
    tailLogsOnFailure();
    throw new Error(`Backend not ready within ${effectiveTimeout}ms at ${healthUrl}`);
  }

  const crashedSoon = await waitForExit(proc, 3000);
  if (crashedSoon) {
    throw new Error('Backend terminated shortly after becoming healthy. Check startup runners/initializers.');
  }

  const stop = () => {
    return (async () => {
      try { proc.kill('SIGTERM'); } catch {}
      const closed = await waitForExit(proc, 10000);
      if (!closed) {
        try { proc.kill('SIGKILL'); } catch {}
        await waitForExit(proc, 3000);
      }
      await killPortWindows(port);
      return true;
    })();
  };

  return { proc, stop, port, healthUrl };
}

if (require.main === module) {
  (async () => {
    const timeoutArg = process.argv.find(a => a.startsWith('--timeout='));
    const timeoutMs = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 180000;
    try {
      const start = Date.now();
      const { port, healthUrl } = await startBackendE2E({ timeoutMs });
      const elapsed = Date.now() - start;
      info(`health OK in ${elapsed}ms`);
      info(`ready http://127.0.0.1:${port} (profile=e2e)`);
      process.exit(0);
    } catch (e) {
      error(e.message || e);
      error('see logs/backend-e2e-run.out for details');
      process.exit(1);
    }
  })();
}

module.exports = { startBackendE2E };













