#!/usr/bin/env node
/**
 * Layered E2E runner (cross-platform, Node-only)
 *
 * Usage examples:
 *   node scripts/run-e2e.js --project=ui           # run only ui-tests project
 *   node scripts/run-e2e.js --project=mobile       # run only mobile-tests project
 *   node scripts/run-e2e.js --project=all          # run all playwright projects
 *   node scripts/run-e2e.js --project=ui --keep    # keep backend running after tests
 *   node scripts/run-e2e.js --project=ui --nostart # assume backend already up
 */

const path = require('path');
const { runCommand } = require('./lib/test-runner');
const { startBackendE2E } = require('./start-backend-e2e');

function parseArgs(argv) {
  const args = { project: 'all', keep: false, nostart: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--project=')) args.project = a.split('=')[1];
    else if (a === '--keep') args.keep = true;
    else if (a === '--nostart') args.nostart = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const root = path.join(__dirname, '..');
  const frontendDir = path.join(root, 'frontend');
  let backend;
  try {
    if (!args.nostart) {
      backend = await startBackendE2E({ timeoutMs: 120000 });
      console.log(`✅ Backend ready at ${backend.healthUrl}`);
    } else {
      console.log('ℹ️  Skipping backend start (nostart)');
    }

    // Use reporters defined in frontend/playwright.config.ts (writes JSON to playwright-report/results.json)
    const base = ['playwright', 'test', '--workers=1', '--retries=0'];
    let runArgs = base;
    if (args.project === 'ui') runArgs = [...base, '--project=ui-tests', '--grep-invert=@mobile'];
    else if (args.project === 'mobile') runArgs = [...base, '--project=mobile-tests'];
    // else 'all' runs default (all projects)

    await runCommand('npx', runArgs, { cwd: frontendDir });
  } catch (e) {
    console.error('❌ E2E run failed:', e.message || e);
    process.exit(1);
  } finally {
    if (!args.keep) {
      try { await backend?.stop?.(); } catch {}
    } else {
      console.log('ℹ️  Keeping backend process alive as requested (--keep)');
    }
  }
}

main();


