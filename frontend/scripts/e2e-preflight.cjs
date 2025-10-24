#!/usr/bin/env node
// E2E preflight: verify required env vars and basic reachability of BASE_URL/E2E_FRONTEND_URL.
const http = require('node:http');
const https = require('node:https');

function fail(msg) {
  console.error(`✗ Preflight failed: ${msg}`);
  process.exit(1);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) fail(`Missing required environment variable: ${name}`);
  return String(v).trim();
}

const baseUrl = process.env.BASE_URL || process.env.E2E_FRONTEND_URL;
if (!baseUrl) fail('Set BASE_URL or E2E_FRONTEND_URL to the deployed frontend');

const requiredCreds = [
  'E2E_LECTURER_EMAIL',
  'E2E_LECTURER_PASSWORD',
  'E2E_TUTOR_EMAIL',
  'E2E_TUTOR_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
];
for (const key of requiredCreds) requireEnv(key);

function checkReachable(url) {
  return new Promise((resolve, reject) => {
    let handled = false;
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, (res) => {
      handled = true;
      res.resume();
      resolve(true);
    });
    req.on('error', (err) => {
      if (!handled) reject(err);
    });
    req.setTimeout(5000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

(async () => {
  try {
    await checkReachable(baseUrl);
  } catch (e) {
    fail(`Cannot reach BASE_URL (${baseUrl}): ${e.message}`);
  }
  console.log('✓ Preflight OK: environment and BASE_URL reachable');
})();

