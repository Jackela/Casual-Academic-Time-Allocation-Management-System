#!/usr/bin/env node

/*
  Cross-platform port cleanup script

  - Single Source of Truth: reads backendPort and frontendUrl from frontend/scripts/e2e.params.json
  - Kills processes listening on those ports using taskkill/kill (via tools/scripts/lib/port-utils.js)
  - Optional CLI override: --ports=8084,5174

  Usage:
    node tools/scripts/cleanup-ports.js
    node tools/scripts/cleanup-ports.js --ports=3000,8080
*/

const { readFileSync } = require('fs');
const path = require('path');
const url = require('url');
const portsUtil = require('./lib/port-utils');
const SafeProcessManager = require('./lib/safe-process-manager');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    if (a.startsWith('--ports=')) {
      out.ports = a.replace('--ports=', '')
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    } else if (a.startsWith('--session=')) {
      out.sessionId = a.replace('--session=', '').trim();
    } else if (a.startsWith('--ledger=')) {
      const resolved = a.replace('--ledger=', '').trim();
      if (resolved) {
        out.ledgerPath = path.resolve(process.cwd(), resolved);
      }
    }
  }
  return out;
}

function readE2EParams() {
  try {
    const p = path.join(__dirname, '..', 'frontend', 'scripts', 'e2e.params.json');
    const raw = readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function extractPortFromUrl(maybeUrl, fallback) {
  try {
    const u = new url.URL(maybeUrl);
    if (u.port) return Number(u.port);
    // If no explicit port, infer from protocol
    if (u.protocol === 'http:') return 80;
    if (u.protocol === 'https:') return 443;
  } catch {}
  return fallback;
}

async function cleanupPort(port, safeManager) {
  const pids = await portsUtil.findPidsByPort(port);
  if (!pids.length) {
    console.log(`[cleanup] No process is listening on port ${port}`);
    return;
  }
  console.log(`[cleanup] Port ${port} is used by PIDs: ${pids.join(', ')}`);

  if (!safeManager || !safeManager.isActive()) {
    console.warn(`[cleanup] Safe process manager inactive. Skipping termination for port ${port}.`);
    return;
  }

  const trackedPids = safeManager.filterTrackedPids(pids);
  const skipped = pids.filter((pid) => !trackedPids.includes(pid));

  if (skipped.length) {
    console.warn(`[cleanup] Skipping untracked PIDs on port ${port}: ${skipped.join(', ')}`);
  }

  if (!trackedPids.length) {
    console.warn(`[cleanup] No tracked processes associated with port ${port}. Nothing to terminate.`);
    return;
  }

  for (const pid of trackedPids) {
    try {
      const cmd = await portsUtil.getCmdline(pid);
      console.log(`  - Terminating tracked PID ${pid}${cmd ? ` [${cmd.substring(0, 160)}${cmd.length > 160 ? '…' : ''}]` : ''}`);
    } catch (e) {
      console.log(`  - Terminating tracked PID ${pid}`);
    }
  }

  const result = await safeManager.terminatePids(trackedPids, { force: true });
  console.log(`[cleanup] Terminated ${result.terminated}/${result.attempted} tracked processes for port ${port}.`);
  if (result.errors.length) {
    for (const error of result.errors) {
      console.warn(`  ! Failed to terminate tracked PID ${error.pid}: ${error.error}`);
    }
  }
  // small delay then verify
  await new Promise((r) => setTimeout(r, 500));
  const still = await portsUtil.isPortListening(port);
  if (still) {
    console.warn(`[cleanup] WARNING: Port ${port} still appears to be in use.`);
  } else {
    console.log(`[cleanup] Port ${port} is now free.`);
  }
}

async function stopGradleDaemons() {
  try {
    const { spawnSync } = require('child_process');
    if (process.platform === 'win32') {
      spawnSync('cmd.exe', ['/d', '/s', '/c', '.\\gradlew.bat --stop'], { stdio: 'inherit' });
    } else {
      spawnSync('./gradlew', ['--stop'], { stdio: 'inherit' });
    }
  } catch {}
}

(async () => {
  const args = parseArgs();
  let ports = args.ports;
  const safeManager = new SafeProcessManager({
    sessionId: args.sessionId,
    ledgerPath: args.ledgerPath,
    log: (message, level = 'INFO') => console.log(`[safe-cleanup][${level}] ${message}`)
  });

  if (!safeManager.isActive()) {
    console.warn('[cleanup] Safe process manager inactive. Provide --session (and optional --ledger) to enable tracked cleanup.');
  }

  if (!ports || !ports.length) {
    const e2e = readE2EParams();
    if (e2e) {
      const backendPort = Number(e2e.backendPort) || 8084;
      const frontendPort = extractPortFromUrl(e2e.frontendUrl, 5174);
      ports = Array.from(new Set([backendPort, frontendPort].filter((n) => Number.isInteger(n) && n > 0)));
    } else {
      ports = [8084, 5174];
    }
  }

  console.log(`[cleanup] Target ports: ${ports.join(', ')}`);
  for (const port of ports) {
    await cleanupPort(port, safeManager);
  }
  await stopGradleDaemons();
  console.log('[cleanup] Done.');
})();


