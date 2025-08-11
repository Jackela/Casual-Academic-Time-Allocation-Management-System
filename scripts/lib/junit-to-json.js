#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readAllXmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.xml'));
  return files.map((f) => ({ name: f, content: fs.readFileSync(path.join(dir, f), 'utf-8') }));
}

function parseSuiteAttrs(xml) {
  // <testsuite name="..." tests=".." failures=".." errors=".." skipped=".." time="..">
  const m = xml.match(/<testsuite\b[^>]*>/i);
  if (!m) return {};
  const tag = m[0];
  const get = (k) => {
    const r = new RegExp(`${k}="([^"]*)"`);
    const mm = tag.match(r);
    return mm ? mm[1] : undefined;
  };
  return {
    name: get('name') || '',
    tests: Number(get('tests') || 0),
    failures: Number(get('failures') || 0),
    errors: Number(get('errors') || 0),
    skipped: Number(get('skipped') || 0),
    time: Number(get('time') || 0),
  };
}

function parseTestCases(xml) {
  const cases = [];
  const re = /<testcase\b[^>]*>([\s\S]*?)<\/testcase>|<testcase\b([^\/]*)\/>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const full = m[0];
    const openTag = full.match(/<testcase\b[^>]*>/i)?.[0] || full;
    const get = (k) => {
      const r = new RegExp(`${k}="([^"]*)"`);
      const mm = openTag.match(r);
      return mm ? mm[1] : undefined;
    };
    const name = get('name') || '';
    const classname = get('classname') || '';
    const time = Number(get('time') || 0);
    let status = 'passed';
    let failure = null;
    const failMatch = full.match(/<failure\b[^>]*>([\s\S]*?)<\/failure>/i) || full.match(/<error\b[^>]*>([\s\S]*?)<\/error>/i);
    if (failMatch) {
      status = 'failed';
      const msgAttr = (failMatch[0].match(/message="([^"]*)"/) || [])[1];
      const typeAttr = (failMatch[0].match(/type="([^"]*)"/) || [])[1];
      const text = failMatch[1]?.trim();
      failure = { message: msgAttr || '', type: typeAttr || '', text: text || '' };
    }
    const skippedMatch = full.match(/<skipped\b[^>]*\/>/i);
    if (skippedMatch) status = 'skipped';
    cases.push({ name, classname, time, status, failure });
  }
  return cases;
}

function buildSummary(xmlFiles) {
  const suites = [];
  for (const xf of xmlFiles) {
    const suite = parseSuiteAttrs(xf.content);
    suite.file = xf.name;
    suite.cases = parseTestCases(xf.content);
    suites.push(suite);
  }
  const total = suites.reduce((acc, s) => {
    acc.tests += s.tests;
    acc.failures += s.failures;
    acc.errors += s.errors;
    acc.skipped += s.skipped;
    acc.time += s.time;
    return acc;
  }, { tests: 0, failures: 0, errors: 0, skipped: 0, time: 0 });
  return { generatedAt: new Date().toISOString(), total, suites };
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  const outArgIdx = process.argv.indexOf('--out');
  const outFile = outArgIdx !== -1 ? process.argv[outArgIdx + 1] : path.join('results', 'tests-summary.json');
  const inputDirArgIdx = process.argv.indexOf('--in');
  const inputDir = inputDirArgIdx !== -1 ? process.argv[inputDirArgIdx + 1] : path.join('build', 'test-results', 'test');

  const xmlFiles = readAllXmlFiles(inputDir);
  const summary = buildSummary(xmlFiles);
  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`JSON summary written to ${outFile}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(String(e)); process.exit(1); }
}

module.exports = { readAllXmlFiles, buildSummary };


