#!/usr/bin/env node
/**
 * Canonical E2E runner.
 * Delegates to the maintained implementation under frontend/scripts,
 * while providing a single top-level entry point and --help.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendRunner = join(__dirname, '..', 'frontend', 'scripts', 'run-e2e-tests.js');

function showHelp() {
  const help = `
Usage: e2e-runner [playwright args]

Examples:
  e2e-runner                          # run default suite
  e2e-runner --project=real           # run real backend project
  E2E_BACKEND_MODE=docker e2e-runner  # run via docker-compose

Environment:
  PLAYWRIGHT_ARGS           Additional args, space-separated (optional)
  E2E_BACKEND_MODE          'docker' to use docker-compose
  E2E_REQUIRE_DOCKER        '1' to fail if docker absent
  E2E_SKIP_INSTALL          '1' to skip npm install in frontend
  E2E_BACKEND_URL           Backend URL override
  E2E_FRONTEND_URL          Frontend URL override
`;
  process.stdout.write(help);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

let args = process.argv.slice(2);
// Map convenience alias: --project=smoke -> real + @smoke tag
const projIdx = args.findIndex((a) => a.startsWith('--project='));
if (projIdx !== -1 && args[projIdx].split('=')[1] === 'smoke') {
  args[projIdx] = '--project=real';
  // Prefer @smoke; fallback to @p0 if no smoke tags exist
  args = [...args, '--grep', '@smoke|@p0'];
}
const child = spawn(process.execPath, [frontendRunner, ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
