#!/usr/bin/env node
/**
 * Cleanup Redundant Scripts - Based on Best Practices
 * 
 * This script removes outdated, over-engineered, and duplicate scripts
 * to maintain a clean codebase following SSOT principles.
 */
const fs = require('fs');
const path = require('path');

const filesToDelete = [
  // Over-engineered "revolutionary" frontend test script (1272 lines)
  'tools/scripts/test-frontend.js',
  
  // Outdated E2E runner (replaced by better version)
  'tools/scripts/run-e2e.js',
  
  // Experimental/temporary files
  'tools/experiments/ai/ai_browser_test.py',
  'tools/experiments/ai/ai-browser-test.js',
  
  // Temporary scripts
  'tools/scripts/tmp.js',
  'tools/scripts/tmp-cmd.ps1',
  
  // Legacy scripts
  'tools/scripts/test-legacy-workflow.sh',
  'tools/scripts/resolve-conflicts-keep-head.js',
  
  // Choose simpler version
  'tools/scripts/verify-docker.js'
];

const filesToRename = [
  {
    from: 'tools/scripts/lib/test-runner-fixed.js',
    to: 'tools/scripts/lib/test-runner.js'
  }
];

console.log('🧹 Starting redundant script cleanup...\n');

let deletedCount = 0;
let skippedCount = 0;
let renamedCount = 0;

// Delete files
console.log('📂 Deleting redundant files:\n');
filesToDelete.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`  ✅ Deleted: ${file}`);
      deletedCount++;
    } else {
      console.log(`  ⚠️  Not found (already cleaned): ${file}`);
      skippedCount++;
    }
  } catch (err) {
    console.error(`  ❌ Failed to delete: ${file}`, err.message);
  }
});

console.log('\n📝 Renaming files:\n');

// Rename files
filesToRename.forEach(({ from, to }) => {
  const fromPath = path.join(__dirname, '..', from);
  const toPath = path.join(__dirname, '..', to);
  try {
    if (fs.existsSync(fromPath)) {
      // Delete target if exists
      if (fs.existsSync(toPath)) {
        fs.unlinkSync(toPath);
      }
      fs.renameSync(fromPath, toPath);
      console.log(`  ✅ Renamed: ${from} → ${to}`);
      renamedCount++;
    } else {
      console.log(`  ⚠️  Source not found: ${from}`);
    }
  } catch (err) {
    console.error(`  ❌ Failed to rename: ${from}`, err.message);
  }
});

console.log('\n✅ Cleanup completed!');
console.log('\n📊 Summary:');
console.log(`   Deleted: ${deletedCount} files`);
console.log(`   Skipped: ${skippedCount} files (not found)`);
console.log(`   Renamed: ${renamedCount} files`);
console.log('\n⚠️  Manual task: Merge frontend/scripts/run-e2e-ai.js functionality before deletion');
console.log('    See: docs/SCRIPT_CLEANUP.md for details\n');



