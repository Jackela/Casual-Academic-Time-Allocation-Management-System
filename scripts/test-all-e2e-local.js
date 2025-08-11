#!/usr/bin/env node
/**
 * Local end-to-end orchestrator (backend + frontend E2E) with timeouts.
 * Steps:
 * 1) Backend unit + integration
 * 2) Frontend unit + contract
 * 3) Start backend (e2e) with timeout
 * 4) Run Playwright E2E (ui-tests + mobile-tests)
 * 5) Cleanup backend
 */

const { spawn } = require('child_process');
const { join } = require('path');
const { startBackendE2E } = require('./start-backend-e2e');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: true, stdio: 'inherit', ...opts });
    let timedOut = false;
    let timer = null;
    if (opts.timeoutMs && Number.isFinite(opts.timeoutMs)) {
      timer = setTimeout(() => {
        timedOut = true;
        try { child.kill('SIGTERM'); } catch {}
        setTimeout(() => { try { child.kill('SIGKILL'); } catch {}; }, 3000);
        reject(new Error(`Timeout after ${opts.timeoutMs}ms: ${cmd} ${args.join(' ')}`));
      }, opts.timeoutMs);
    }
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) return; // already rejected
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
    child.on('error', (e) => {
      if (timer) clearTimeout(timer);
      reject(e);
    });
  });
}

(async () => {
  const root = join(__dirname, '..');
  const frontendDir = join(root, 'frontend');
  let backend;
  let exitCode = 0;
  try {
    // 1) Backend unit + integration
    await run('node', [join(root, 'scripts', 'test-backend-unit.js')], { cwd: root, timeoutMs: 15 * 60 * 1000 });
    await run('node', [join(root, 'scripts', 'test-backend-integration.js')], { cwd: root, timeoutMs: 20 * 60 * 1000 });

    // 2) Frontend unit + contract
    await run('npm', ['run', 'test:unit', '--silent'], { cwd: frontendDir, timeoutMs: 5 * 60 * 1000 });
    await run('npm', ['run', 'test:contract', '--silent'], { cwd: frontendDir, timeoutMs: 5 * 60 * 1000 });

    // 3) Start backend (e2e) and wait health (with timeout)
    backend = await startBackendE2E({ timeoutMs: 120000 });
    console.log(`✅ Backend ready at ${backend.healthUrl}`);

    // 4) Run Playwright E2E (ui-tests + mobile-tests) with JSON reporter
    process.env.E2E_SKIP_BACKEND = '';
    process.env.VITE_E2E_AUTH_BYPASS_ROLE = process.env.VITE_E2E_AUTH_BYPASS_ROLE || 'TUTOR';
    await run('npx', ['playwright', 'test', '--reporter=json'], { cwd: frontendDir, timeoutMs: 20 * 60 * 1000 });

    console.log('✅ E2E completed');
  } catch (e) {
    console.error('❌ Orchestration failed:', e.message || e);
    exitCode = 1;
  } finally {
    try { await backend?.stop?.(); } catch {}
    try { process.stdout.write('\n\n[TASK_DONE]\n\n'); } catch {}
    process.exit(exitCode);
  }
})();


