/*
  Pre-commit guardrails for E2E tests
  - Blocks committing focused tests (.only)
  - Blocks usage of page.waitForTimeout in real E2E
*/
const { execSync } = require('node:child_process')
const { readFileSync } = require('node:fs')
const path = require('node:path')

function getStagedFiles() {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' })
  return out.split(/\r?\n/).filter(Boolean)
}

function isRealE2EFile(file) {
  return /(^|\/)frontend\/(e2e\/real)\/.+\.tsx?$/.test(file)
}

function main() {
  const files = getStagedFiles().filter(isRealE2EFile)
  if (files.length === 0) return

  const offenses = []
  const warnings = []
  for (const f of files) {
    const content = readFileSync(f, 'utf8')
    if (/\b(it|test|describe)\.only\b/.test(content)) {
      offenses.push({ file: f, rule: 'no-focused-tests', message: 'Remove .only from tests/suites' })
    }
    if (/page\.waitForTimeout\s*\(/.test(content)) {
      offenses.push({ file: f, rule: 'no-waitForTimeout', message: 'Avoid page.waitForTimeout; use locator waits or expect.poll' })
    }
    if (/\bpage\.route\s*\(/.test(content)) {
      offenses.push({ file: f, rule: 'no-network-mocking', message: 'Real E2E must not mock network (page.route is disallowed)' })
    }
    if (/\/specs\/.+\.spec\.[jt]sx?$/.test(f) && !/@p\d/.test(content)) {
      warnings.push({ file: f, rule: 'missing-priority-tag', message: 'Consider tagging spec with @p0/@p1 for CI selection' })
    }
  }

  if (offenses.length) {
    console.error('\nE2E guardrails failed:')
    for (const o of offenses) {
      console.error(` - ${o.file}: ${o.message} (${o.rule})`)
    }
    console.error('\nCommit aborted.')
    process.exit(1)
  }

  if (warnings.length) {
    console.warn('\nE2E guardrails warnings:')
    for (const w of warnings) {
      console.warn(` - ${w.file}: ${w.message} (${w.rule})`)
    }
  }
}

main()
