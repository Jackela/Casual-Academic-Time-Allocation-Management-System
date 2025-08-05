#!/usr/bin/env node

// Cross-platform preflight checks (Node): Java, Docker, port conflicts

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const projectRoot = __dirname;
const e2eParamsPath = path.join(projectRoot, '..', 'frontend', 'scripts', 'e2e.params.json');
const { isPortListening, findPidsByPort, getCmdline, killPid } = require('./lib/port-utils');

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      resolve({ code: -1, out, err: err || 'timeout' });
    }, opts.timeoutMs || 8000);
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, err }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out, err: String(e) }); });
  });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port, timeout: 1500 }, () => {
      socket.end();
      resolve({ port, listening: true });
    });
    socket.on('error', () => resolve({ port, listening: false }));
    socket.on('timeout', () => { socket.destroy(); resolve({ port, listening: false }); });
  });
}

async function main() {
  let hasError = false;
  console.log('\n=== Preflight (Node) ===');

  // Java
  const java = await run('java', ['-version']);
  if (java.code !== 0) {
    console.error('❌ Java not available (required: 17).');
    hasError = true;
  } else {
    console.log('✅ Java detected');
  }

  // Gradle wrapper
  const gradlew = path.join(projectRoot, '..', 'gradlew.bat');
  const gradlewUnix = path.join(projectRoot, '..', 'gradlew');
  if (fs.existsSync(gradlew) || fs.existsSync(gradlewUnix)) {
    console.log('✅ Gradle wrapper present');
  } else {
    console.error('❌ Gradle wrapper missing');
    hasError = true;
  }

  // Docker (for integration/performance tests)
  const docker = await run('docker', ['info'], { timeoutMs: 6000 });
  if (docker.code !== 0) {
    console.warn('⚠️  Docker not available or not running. Integration/Performance tests will fail.');
  } else {
    console.log('✅ Docker daemon reachable');
  }

  // Ports
  try {
    const params = JSON.parse(fs.readFileSync(e2eParamsPath, 'utf8'));
    const frontendUrl = new URL(params.frontendUrl);
    const frontendPort = Number(frontendUrl.port) || 5173;
    const backendPort = Number(params.backendPort) || 8080;

    const [bListen, fListen] = await Promise.all([
      isPortListening(backendPort),
      isPortListening(frontendPort)
    ]);

    if (bListen) {
      console.warn(`⚠️  Backend port ${backendPort} is in use.`);
      const pids = await findPidsByPort(backendPort);
      if (pids.length) {
        const owners = await Promise.all(pids.map(getCmdline));
        console.warn(`   PIDs: ${pids.join(', ')}\n   Commands: ${owners.join(' | ')}`);
      }
    } else {
      console.log(`✅ Backend port ${backendPort} available`);
    }

    if (fListen) {
      console.warn(`⚠️  Frontend port ${frontendPort} is in use.`);
      const pids = await findPidsByPort(frontendPort);
      if (pids.length) {
        const owners = await Promise.all(pids.map(getCmdline));
        console.warn(`   PIDs: ${pids.join(', ')}\n   Commands: ${owners.join(' | ')}`);
      }
    } else {
      console.log(`✅ Frontend port ${frontendPort} available`);
    }
  } catch (e) {
    console.warn('⚠️  Could not parse E2E params for port checks.');
  }

  if (hasError) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });


