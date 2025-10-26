#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const manifest = {
  generatedAt: new Date().toISOString(),
  backend: {
    junitXmlDirs: [
      'build/test-results/test',
      'build/test-results/integrationTest'
    ],
    jacoco: {
      xml: 'build/reports/jacoco/test/jacocoTestReport.xml',
      html: 'build/reports/jacoco/test/html/index.html'
    }
  },
  frontend: {
    vitest: {
      junit: 'frontend/test-results/junit.xml',
      coverage: {
        json: 'frontend/coverage/coverage-final.json',
        summary: 'frontend/coverage/coverage-summary.json',
        lcov: 'frontend/coverage/lcov.info',
        html: 'frontend/coverage/index.html'
      }
    },
    playwright: {
      json: 'frontend/playwright-report/results.json',
      junit: 'frontend/playwright-report/junit.xml',
      htmlDir: 'frontend/playwright-report'
    }
  }
};

function markPresence(path) {
  return existsSync(path) ? path : null;
}

function resolvePresence() {
  // Replace strings with null if absent
  manifest.backend.junitXmlDirs = manifest.backend.junitXmlDirs.filter((p) => existsSync(p));
  manifest.backend.jacoco.xml = markPresence(manifest.backend.jacoco.xml);
  manifest.backend.jacoco.html = markPresence(manifest.backend.jacoco.html);
  const cov = manifest.frontend.vitest.coverage;
  manifest.frontend.vitest.junit = markPresence(manifest.frontend.vitest.junit);
  cov.json = markPresence(cov.json);
  cov.summary = markPresence(cov.summary);
  cov.lcov = markPresence(cov.lcov);
  cov.html = markPresence(cov.html);
  const pw = manifest.frontend.playwright;
  pw.json = markPresence(pw.json);
  pw.junit = markPresence(pw.junit);
  pw.htmlDir = markPresence(pw.htmlDir);
}

async function main() {
  resolvePresence();
  const outDir = 'artifacts/ai';
  const outFile = join(outDir, 'manifest.json');
  await writeFile(outFile, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', flag: 'w' }).catch(async (e) => {
    // best-effort create directories
    const { mkdir } = await import('node:fs/promises');
    await mkdir(outDir, { recursive: true });
    await writeFile(outFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  });
  console.log('AI report manifest written:', outFile);
}

main().catch((e) => {
  console.error('export-reports failed:', e.message || e);
  process.exit(1);
});
