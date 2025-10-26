#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

function showHelp() {
  console.log(`
Usage: generate-contracts [--verify]

Runs Gradle tasks to generate JSON schema contracts and sync TypeScript outputs.
Options:
  --verify   Run verification only (no generation)
`);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const isWin = process.platform === 'win32';
let task = 'generateContracts';
const verifyMode = args.includes('--verify');
// If verify requested but generated TS contracts are absent, run generation first for a stable baseline
if (verifyMode && !existsSync('frontend/src/contracts/generated')) {
  task = 'generateContracts';
}
let cmd, gradleArgs;
if (isWin) {
  cmd = 'cmd.exe';
  gradleArgs = ['/d', '/s', '/c', 'gradlew.bat', task];
} else {
  cmd = './gradlew';
  gradleArgs = [task];
}
const child = spawn(cmd, gradleArgs, { stdio: 'inherit', shell: false });
child.on('exit', (code) => {
  if ((code ?? 0) !== 0) process.exit(code ?? 1);
  if (verifyMode) {
    const vArgs = isWin ? ['/d', '/s', '/c', 'gradlew.bat', 'verifyContracts'] : ['verifyContracts'];
    const vCmd = isWin ? 'cmd.exe' : './gradlew';
    const v = spawn(vCmd, vArgs, { stdio: 'inherit', shell: false });
    v.on('exit', (vCode) => process.exit(vCode ?? 0));
  } else {
    process.exit(0);
  }
});
