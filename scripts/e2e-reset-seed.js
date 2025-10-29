#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';

function showHelp() {
  console.log(`
Usage: e2e-reset-seed [--url URL] [--token TOKEN] [--lecturer-id ID] [--no-seed]

Options:
  --url    Backend base URL (default: http://127.0.0.1:8084)
  --token  Reset token header value (default: local-e2e-reset)
  --lecturer-id  Lecturer ID for seeding courses (repeat or comma-separate for multiple; default: 2)
  --no-seed      Skip seeding lecturer resources after reset
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
    else if (a === '--lecturer-id') {
      const raw = args[++i] ?? '';
      const values = raw.split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value));
      if (values.length > 0) {
        if (!Array.isArray(out.lecturerIds)) out.lecturerIds = [];
        out.lecturerIds.push(...values);
      }
    }
    else if (a === '--no-seed') out.noSeed = true;
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  if (opts.help) return showHelp();
  const base = opts.url || process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8084';
  const token = opts.token || process.env.TEST_DATA_RESET_TOKEN || 'local-e2e-reset';
  const envLecturerIds = process.env.E2E_LECTURER_IDS
    ? process.env.E2E_LECTURER_IDS.split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value))
    : [];
  const envLecturerId = process.env.E2E_LECTURER_ID;
  const parsedDefaultId = Number(envLecturerId);
  const defaultLecturerId = Number.isFinite(parsedDefaultId) && parsedDefaultId > 0 ? parsedDefaultId : 2;
  const fallbackLecturerIds = envLecturerId ? [defaultLecturerId] : [2, 3];
  const lecturerIds = (Array.isArray(opts.lecturerIds) && opts.lecturerIds.length > 0
    ? opts.lecturerIds
    : envLecturerIds.length > 0
      ? envLecturerIds
      : fallbackLecturerIds
  ).filter((id) => Number.isFinite(id) && id > 0);
  const resetUrl = new URL('/api/test-data/reset', base);
  const seedUrl = new URL('/api/test-data/seed/lecturer-resources', base);

  const execRequest = (url, init) => new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, init, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error(`${url.pathname} failed with status ${res.statusCode}: ${body || 'No body'}`));
      });
    });
    req.on('error', reject);
    if (init?.body) {
      req.write(init.body);
    }
    req.end();
  });

  await execRequest(resetUrl, { method: 'POST', headers: { 'X-Test-Reset-Token': token } });
  console.log('Reset OK');

  if (!opts.noSeed) {
    if (lecturerIds.length === 0) {
      throw new Error('No lecturer IDs provided for seeding. Use --lecturer-id or set E2E_LECTURER_IDS.');
    }
    for (const lecturerId of lecturerIds) {
      const seedBody = JSON.stringify({ lecturerId, seedTutors: true });
      await execRequest(seedUrl, {
        method: 'POST',
        headers: {
          'X-Test-Reset-Token': token,
          'Content-Type': 'application/json',
        },
        body: seedBody,
      });
      console.log(`Seed OK (lecturerId=${lecturerId})`);
    }
  }
}

main().catch((e) => {
  console.error(e.message || String(e));
  process.exit(1);
});

