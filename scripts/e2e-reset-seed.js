#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';

function showHelp() {
  console.log(`
Usage: e2e-reset-seed [--url URL] [--token TOKEN]

Options:
  --url    Backend base URL (default: http://127.0.0.1:8084)
  --token  Reset token header value (default: local-e2e-reset)
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') return { help: true };
    if (a === '--url') out.url = args[++i];
    else if (a === '--token') out.token = args[++i];
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  if (opts.help) return showHelp();
  const base = opts.url || process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8084';
  const token = opts.token || process.env.TEST_DATA_RESET_TOKEN || 'local-e2e-reset';
  const resetUrl = new URL('/api/test-data/reset', base);

  await new Promise((resolve, reject) => {
    const lib = resetUrl.protocol === 'https:' ? https : http;
    const req = lib.request(
      resetUrl,
      { method: 'POST', headers: { 'X-Test-Reset-Token': token } },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Reset failed with status ${res.statusCode}`));
      },
    );
    req.on('error', reject);
    req.end();
  });
  console.log('Reset OK');
}

main().catch((e) => {
  console.error(e.message || String(e));
  process.exit(1);
});

