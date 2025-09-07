#!/usr/bin/env node
// Start backend in demo profile (no Docker required), with health check

const { spawn } = require('child_process');
const { join } = require('path');

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function waitForHealth(url, timeoutMs){
  const start = Date.now();
  while(Date.now() - start < timeoutMs){
    try{ const res = await fetch(url); if(res.ok) return true; }catch{}
    await sleep(800);
  }
  return false;
}

(async () => {
  const root = join(__dirname, '..', '..');
  const port = process.env.DEMO_PORT ? Number(process.env.DEMO_PORT) : 8084;
  const healthUrl = `http://127.0.0.1:${port}/actuator/health`;
  const env = { ...process.env, SPRING_PROFILES_ACTIVE: 'demo', SERVER_PORT: String(port) };

  const ps = spawn(process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew', ['bootRun', '-x', 'test'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env
  });

  const ok = await waitForHealth(healthUrl, 120000);
  if(!ok){
    try{ ps.kill('SIGTERM'); }catch{}
    console.error(`Backend not healthy at ${healthUrl}`);
    process.exit(1);
  }
  console.log(`Backend ready on port ${port} (${healthUrl})`);
})();


