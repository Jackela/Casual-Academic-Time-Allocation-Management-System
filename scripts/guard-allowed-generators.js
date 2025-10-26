#!/usr/bin/env node
/**
 * Fails when generator-like scripts appear outside allowed namespaces.
 */
import { spawnSync } from 'node:child_process';

const ALLOWED_DIRS = ['scripts/', 'tools/'];
const PATTERN = /(generate|openapi|contract|codegen|e2e|coverage|clean)[^/]*\.(js|cjs|mjs|sh|ps1|cmd)$/i;

const gitLs = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
if (gitLs.status !== 0) {
  console.error('guard-allowed-generators: git ls-files failed');
  process.exit(1);
}

const EXEMPT = new Set([
  'frontend/scripts/run-e2e-tests.js',
  'frontend/scripts/e2e-preflight.cjs',
]);

const offenders = gitLs.stdout
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((p) => PATTERN.test(p))
  .filter((p) => !ALLOWED_DIRS.some((d) => p.startsWith(d)))
  .filter((p) => !EXEMPT.has(p));

if (offenders.length) {
  console.error('Disallowed generator/runner scripts found outside scripts/ or tools/:');
  offenders.forEach((p) => console.error(' -', p));
  process.exit(2);
}

console.log('guard-allowed-generators: OK');
