import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const generator = path.resolve(repoRoot, 'frontend/scripts/generate-archive-handbook.mjs');

const result = spawnSync(process.execPath, [generator], {
  cwd: repoRoot,
  env: {
    ...process.env,
    CATAMS_REPO_ROOT: repoRoot,
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
