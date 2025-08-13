#!/usr/bin/env node

const { spawn } = require('child_process');
const { randomBytes } = require('crypto');

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: true, stdio: 'inherit', ...opts });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
    child.on('error', reject);
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseArgs(argv) {
  const args = { timeoutMs: 180000, keep: false, host: process.env.API_HOST || 'localhost', port: parseInt(process.env.API_PORT || '8080', 10) };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--timeout=')) args.timeoutMs = parseInt(a.split('=')[1], 10) || 120000;
    else if (a === '--keep') args.keep = true;
    else if (a.startsWith('--host=')) args.host = a.split('=')[1];
    else if (a.startsWith('--port=')) args.port = parseInt(a.split('=')[1], 10) || args.port;
  }
  return args;
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

async function main() {
  const args = parseArgs(process.argv);
  const jwtSecret = process.env.JWT_SECRET || randomBytes(64).toString('base64');

  console.log('\n=== Building backend jar ===');
  await run(process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew', ['bootJar', '--console=plain']);

  console.log('\n=== Building docker images (compose) ===');
  try {
    await run('docker', ['compose', 'build', '--no-cache'], { env: { ...process.env, JWT_SECRET: jwtSecret, API_PORT: String(args.port) } });
  } catch (e) {
    console.warn('Build failed, pruning builder cache and retrying once...');
    try { await run('docker', ['builder', 'prune', '-f']); } catch {}
    await run('docker', ['compose', 'build', '--no-cache'], { env: { ...process.env, JWT_SECRET: jwtSecret, API_PORT: String(args.port) } });
  }

  console.log('\n=== Starting docker compose (db + api) ===');
  await run('docker', ['compose', 'up', '-d', '--force-recreate'], { env: { ...process.env, JWT_SECRET: jwtSecret, API_PORT: String(args.port) } });

  const healthPath = process.env.API_HEALTH_PATH || '/actuator/health';
  const baseUrl = process.env.API_BASE_URL || `http://${args.host}:${args.port}`;
  const healthUrl = `${baseUrl}${healthPath}`;
  console.log(`\n=== Health check: ${healthUrl} (timeout ${Math.round(args.timeoutMs/1000)}s) ===`);
  const healthy = await waitForHealth(healthUrl, args.timeoutMs);
  if (!healthy) {
    console.error('❌ Health check timeout');
    try { await run('docker', ['compose', 'ps']); } catch {}
    try { await run('docker', ['compose', 'logs', '--no-color', '--tail', '200', 'api']); } catch {}
    // 长期实践：不做 clean，不做 DROP，失败由追加迁移修复。仅停止容器保留卷以便排障。
    try { await run('docker', ['compose', 'stop']); } catch {}
    process.exit(1);
  }
  console.log('✅ Health OK');

  // Optional probe: auth endpoint should be reachable (status 200/400/401 are acceptable)
  try {
    const authPath = process.env.API_AUTH_PATH || '/api/auth/login';
    const authRes = await fetch(`${baseUrl}${authPath}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x', password: 'y' })
    });
    console.log(`Auth endpoint status: ${authRes.status}`);
  } catch (e) {
    console.warn('Auth probe failed:', e?.message || e);
  }

  if (!args.keep) {
    console.log('\n=== Cleaning up containers ===');
    try { await run('docker', ['compose', 'down', '-v'], { env: { ...process.env, JWT_SECRET: jwtSecret } }); } catch {}
  } else {
    console.log('ℹ️  Keeping containers running (--keep)');
  }
  console.log('✅ Docker verification complete\n\n');
}

main().catch((e) => { console.error('❌ Verification failed:', e?.message || e); process.exit(1); });
// Ensure Cursor detects task completion reliably
process.on('beforeExit', () => {
  try { console.log('\n\n'); } catch {}
});

