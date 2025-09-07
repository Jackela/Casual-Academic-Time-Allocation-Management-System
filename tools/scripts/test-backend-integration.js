#!/usr/bin/env node

/**
 * Backend Integration Test Runner (Wrapper)
 * Calls the unified test-backend.js script
 */

const { spawn } = require('child_process');
const path = require('path');

// Simply delegate to the unified script (resolve relative path)
const backendRunner = path.join(__dirname, 'test-backend.js');
const child = spawn('node', [backendRunner, 'integration'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start test runner:', err);
  process.exit(1);
});


