#!/usr/bin/env node

/**
 * Convenience shim so docs and automation can call `node scripts/cleanup-ports.js`
 * while delegating to the canonical implementation under tools/scripts.
 */

const path = require('path');
const { pathToFileURL } = require('url');

const projectRoot = path.resolve(__dirname, '..');
const target = path.resolve(projectRoot, 'tools', 'scripts', 'cleanup-ports.js');

import(pathToFileURL(target)).catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[cleanup-ports] Failed to execute helper script.', error);
  process.exitCode = 1;
});
