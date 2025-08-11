#!/usr/bin/env node

/*
  Cross-platform port cleanup script

  - Single Source of Truth: reads backendPort and frontendUrl from frontend/scripts/e2e.params.json
  - Kills processes listening on those ports using taskkill/kill (via scripts/lib/port-utils.js)
  - Optional CLI override: --ports=8084,5174

  Usage:
    node scripts/cleanup-ports.js
    node scripts/cleanup-ports.js --ports=3000,8080
*/

const { readFileSync } = require('fs');
const { join } = require('path');
const url = require('url');
const portsUtil = require('./lib/port-utils');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    if (a.startsWith('--ports=')) {
      out.ports = a.replace('--ports=', '')
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
  }
  return out;
}

function readE2EParams() {
  try {
    const p = join(__dirname, '..', 'frontend', 'scripts', 'e2e.params.json');
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

async function cleanupPort(port) {
  const pids = await portsUtil.findPidsByPort(port);
  if (!pids.length) {
    console.log(`[cleanup] No process is listening on port ${port}`);
    return;
  }
  console.log(`[cleanup] Port ${port} is used by PIDs: ${pids.join(', ')}`);
  for (const pid of pids) {
    try {
      const cmd = await portsUtil.getCmdline(pid);
      console.log(`  - Killing PID ${pid}${cmd ? ` [${cmd.substring(0, 160)}${cmd.length > 160 ? '…' : ''}]` : ''}`);
      await portsUtil.killPid(pid, true);
    } catch (e) {
      console.warn(`  ! Failed to kill PID ${pid}: ${String(e)}`);
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
    await cleanupPort(port);
  }
  await stopGradleDaemons();
  console.log('[cleanup] Done.');
})();


