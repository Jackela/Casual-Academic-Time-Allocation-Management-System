#!/usr/bin/env node
import { spawn } from 'node:child_process';

function showHelp() {
  console.log(`
Usage: generate-openapi [--bundle-only]

Bundles docs/openapi.yaml and generates client stubs if configured.
`);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const isWin = process.platform === 'win32';
const tasks = args.includes('--bundle-only') ? ['bundleOpenApiSpec'] : ['bundleOpenApiSpec', 'openApiGenerate'];
let cmd, gradleArgs;
if (isWin) {
  cmd = 'cmd.exe';
  gradleArgs = ['/d', '/s', '/c', 'gradlew.bat', ...tasks];
} else {
  cmd = './gradlew';
  gradleArgs = tasks;
}
const child = spawn(cmd, gradleArgs, { stdio: 'inherit', shell: false });
child.on('exit', (code) => process.exit(code ?? 0));
