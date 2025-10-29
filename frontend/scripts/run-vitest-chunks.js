#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { execa } from 'execa';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const projectRoot = path.resolve(scriptDir, '..');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

const includeGlobs = [
  'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
  'src/**/*.spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
];

const defaultChunkSize = Number.parseInt(process.env.VITEST_CHUNK_SIZE ?? '', 10) || 24;
const rawArgs = process.argv.slice(2);

const { chunkSize, passThroughArgs } = parseArgs(rawArgs, defaultChunkSize);

if (chunkSize <= 0) {
  console.error('[vitest-chunk] Chunk size must be greater than zero.');
  process.exit(1);
}

const vitestBin = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vitest.cmd' : 'vitest'
);

const excludedMatchers = [
  /\/e2e\//,
  /\/playwright\//,
  /\/test-results\//,
  /\.spec\.tsx$/ // Playwright component tests
];

const uniqueFiles = await collectTestFiles(includeGlobs, excludedMatchers);

if (uniqueFiles.length === 0) {
  console.warn('[vitest-chunk] No test files matched the configured include patterns.');
  process.exit(0);
}

const chunks = createChunks(uniqueFiles, chunkSize);

console.log(
  `[vitest-chunk] Running ${uniqueFiles.length} test files in ${chunks.length} chunks (size≈${chunkSize}).`
);

const baseArgs = ['run', '--run', '--config', 'vitest.config.ts', '--passWithNoTests'];
const forwarded = passThroughArgs.length ? ['--', ...passThroughArgs] : [];

for (let index = 0; index < chunks.length; index += 1) {
  const chunk = chunks[index];
  const label = `[vitest-chunk] (${index + 1}/${chunks.length})`;

  console.log(`${label} Executing ${chunk.length} file(s).`);

  try {
    await execa(
      vitestBin,
      [...baseArgs, ...chunk, ...forwarded],
      {
        cwd: projectRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          VITEST_CHUNK_INDEX: String(index),
          VITEST_CHUNK_COUNT: String(chunks.length)
        }
      }
    );
  } catch (error) {
    console.error(`${label} Failed with exit code ${error.exitCode ?? 'unknown'}.`);
    process.exit(error.exitCode ?? 1);
  }
}

console.log('[vitest-chunk] All chunks completed successfully.');

function parseArgs(args, fallbackChunkSize) {
  const result = {
    chunkSize: fallbackChunkSize,
    passThroughArgs: []
  };

  let passthrough = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (passthrough) {
      result.passThroughArgs.push(arg);
      continue;
    }

    if (arg === '--') {
      passthrough = true;
      continue;
    }

    if (arg === '--chunk-size') {
      const value = args[i + 1];
      if (!value) {
        console.error('[vitest-chunk] Missing value for --chunk-size.');
        process.exit(1);
      }

      result.chunkSize = parsePositiveInteger(value, '--chunk-size');
      i += 1;
      continue;
    }

    if (arg.startsWith('--chunk-size=')) {
      const [, value] = arg.split('=');
      result.chunkSize = parsePositiveInteger(value, '--chunk-size');
      continue;
    }

    // Unknown argument belongs to vitest
    result.passThroughArgs.push(arg);
  }

  return result;
}

function parsePositiveInteger(value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error(`[vitest-chunk] ${flagName} must be a positive integer. Received: ${value}`);
    process.exit(1);
  }
  return parsed;
}

async function collectTestFiles(patterns, excludeMatchers) {
  const files = new Set();

  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: projectRoot, nodir: true, absolute: false });
    for (const match of matches) {
      const normalized = normalizePath(match);
      if (excludeMatchers.some((matcher) => matcher.test(normalized))) {
        continue;
      }
      files.add(normalized);
    }
  }

  return Array.from(files).sort((a, b) => a.localeCompare(b));
}

function createChunks(files, size) {
  const chunks = [];
  for (let i = 0; i < files.length; i += size) {
    chunks.push(files.slice(i, i + size));
  }
  return chunks;
}

function normalizePath(relPath) {
  return relPath.split(path.sep).join('/');
}
