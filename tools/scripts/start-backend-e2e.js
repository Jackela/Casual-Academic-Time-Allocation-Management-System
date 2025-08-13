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

function readParams() {
  const paramsPath = join(__dirname, '..', 'frontend', 'scripts', 'e2e.params.json');
  const raw = fs.readFileSync(paramsPath, 'utf-8');
  return JSON.parse(raw);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function killPortWindows(port) {
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

async function waitForHealth(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {}
    await sleep(1000);
  }
  return false;
}

async function startBackendE2E({ timeoutMs = 180000, stream = true } = {}) {
  const params = readParams();
  const port = params.backendPort || 8084;
  const healthPath = params.backendHealthCheckPath || '/actuator/health';
  const healthUrl = `http://127.0.0.1:${port}${healthPath}`;

  killPortWindows(port);

  const useDocker = await dockerAvailable();
  const activeProfile = useDocker ? 'e2e' : 'e2e-local';
  console.log(`ℹ️  Backend profile selected: ${activeProfile} (${useDocker ? 'Testcontainers' : 'Embedded Postgres'})`);

  const args = ['bootRun', '-x', 'test'];
  const envJwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('base64');
  const proc = spawn(process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew', args, {
    cwd: join(__dirname, '..'),
    stdio: stream ? 'inherit' : 'pipe',
    shell: true,
    env: {
      ...process.env,
      JWT_SECRET: envJwtSecret,
      SPRING_PROFILES_ACTIVE: activeProfile,
      SERVER_PORT: String(port),
      SPRING_DEVTOOLS_ADD_PROPERTIES: 'false',
      SPRING_DEVTOOLS_RESTART_ENABLED: 'false',
    },
  });
  if (!stream) {
    proc.stdout.on('data', (d) => process.stdout.write(d));
    proc.stderr.on('data', (d) => process.stderr.write(d));
  }

  const envTimeout = parseInt(process.env.E2E_BACKEND_TIMEOUT_MS || '', 10);
  const effectiveTimeout = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : timeoutMs;
  const ready = await waitForHealth(healthUrl, effectiveTimeout);
  if (!ready) {
    try { proc.kill('SIGTERM'); } catch {}
    await waitForExit(proc, 5000);
    try { proc.kill('SIGKILL'); } catch {}
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
      killPortWindows(port);
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
      const { port, healthUrl } = await startBackendE2E({ timeoutMs });
      console.log(`Backend ready on port ${port} (${healthUrl})`);
      process.exit(0);
    } catch (e) {
      console.error(e.message || e);
      process.exit(1);
    }
  })();
}

module.exports = { startBackendE2E };


