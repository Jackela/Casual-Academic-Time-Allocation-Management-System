#!/usr/bin/env node
import { spawn } from 'node:child_process';

function showHelp() {
  console.log(`
Usage: clean-all

Removes backend and frontend generated artifacts. Safe: does not touch sources.
`);
}

const cliArgs = process.argv.slice(2);
if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
  showHelp();
  process.exit(0);
}

const isWin = process.platform === 'win32';
let cmd, gradleArgs;
if (isWin) {
  cmd = 'cmd.exe';
  gradleArgs = ['/d', '/s', '/c', 'gradlew.bat', 'cleanAll'];
} else {
  cmd = './gradlew';
  gradleArgs = ['cleanAll'];
}
const child = spawn(cmd, gradleArgs, { stdio: 'inherit', shell: false });
child.on('exit', async (code) => {
  // Best-effort post-clean to remove any residual build artifacts created during the task itself
  try {
    const { rm } = await import('node:fs/promises');
    const paths = [
      'build',
      'test-results',
      'build/generated-contracts',
      'build/generated/openapi',
      'frontend/dist',
      'frontend/coverage',
      'frontend/playwright-report',
      'frontend/playwright-screenshots',
      'frontend/test-results',
      'frontend/trace-inspect',
      'frontend/.vite',
      'frontend/src/contracts/generated',
    ];
    for (const p of paths) {
      try { await rm(p, { recursive: true, force: true }); } catch {}
    }
  } catch {}
  process.exit(code ?? 0);
});
