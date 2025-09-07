#!/usr/bin/env node

/**
 * Production Build Validation Script
 * 
 * Ensures that production builds do not contain:
 * - Sensitive data patterns
 * - Debug logging statements
 * - E2E test utilities
 * - Development-only code paths
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const DIST_DIR = path.join(__dirname, '../dist');
const SENSITIVE_PATTERNS = [
  // Test credentials and tokens
  /test[-_]?token/gi,
  /demo[-_]?password/gi,
  /dev[-_]?secret/gi,
  /fake[-_]?jwt/gi,
  
  // Debug statements that shouldn't be in production
  /console\.debug/gi,
  /console\.trace/gi,
  /debugger;/gi,
  
  // E2E and test utilities
  /__E2E_ENV__/gi,
  /__TEST_UTILITIES__/gi,
  /playwright/gi,
  /\[E2E\]/gi,
  
  // Development-only patterns
  /__DEV_CREDENTIALS__.*true/gi,
  /enableDetailedLogging.*true/gi,
  
  // Specific sensitive values that should never appear
  /eyJ[\w\-\.]+/g, // JWT token pattern
  /sk_test_/gi,    // Test API keys
  /pk_test_/gi,    // Test public keys
];

const EXCLUDED_FILES = [
  'vendor-*.js', // Third-party libraries might contain these patterns legitimately
  'sourcemap-*.js', // Source maps might contain debug info
];

/**
 * Check if file should be excluded from validation
 */
function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath);
  return EXCLUDED_FILES.some(pattern => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(fileName);
  });
}

/**
 * Scan file for sensitive patterns
 */
function scanFile(filePath) {
  if (shouldExcludeFile(filePath)) {
    return { violations: [], skipped: true };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  SENSITIVE_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        violations.push({
          pattern: pattern.toString(),
          match: match,
          file: path.relative(DIST_DIR, filePath)
        });
      });
    }
  });

  return { violations, skipped: false };
}

/**
 * Main validation function
 */
function validateProductionBuild() {
  console.log('🔍 Validating production build for security...');
  
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Distribution directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  // Find all JavaScript files in dist
  const jsFiles = glob.sync('**/*.js', { cwd: DIST_DIR, absolute: true });
  
  if (jsFiles.length === 0) {
    console.error('❌ No JavaScript files found in dist directory.');
    process.exit(1);
  }

  console.log(`📁 Scanning ${jsFiles.length} JavaScript files...`);

  let totalViolations = 0;
  let scannedFiles = 0;
  let skippedFiles = 0;

  jsFiles.forEach(filePath => {
    const result = scanFile(filePath);
    
    if (result.skipped) {
      skippedFiles++;
      console.log(`⏭️  Skipped: ${path.relative(DIST_DIR, filePath)}`);
      return;
    }

    scannedFiles++;

    if (result.violations.length > 0) {
      console.log(`\n❌ VIOLATIONS FOUND in ${path.relative(DIST_DIR, filePath)}:`);
      result.violations.forEach(violation => {
        console.log(`   Pattern: ${violation.pattern}`);
        console.log(`   Match: "${violation.match}"`);
      });
      totalViolations += result.violations.length;
    }
  });

  // Results summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files scanned: ${scannedFiles}`);
  console.log(`Files skipped: ${skippedFiles}`);
  console.log(`Total violations: ${totalViolations}`);

  if (totalViolations === 0) {
    console.log('\n✅ SUCCESS: Production build is secure!');
    console.log('   No sensitive data or debug code detected.');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE: Security violations detected!');
    console.log('   Please remove sensitive data and debug code from production build.');
    console.log('   Consider using conditional compilation flags or environment checks.');
    process.exit(1);
  }
}

// Additional checks for build configuration
function validateBuildConfig() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const viteConfig = fs.readFileSync(path.join(__dirname, '../vite.config.ts'), 'utf8');
  
  console.log('\n🔧 Validating build configuration...');
  
  // Check if conditional compilation flags are properly set
  if (!viteConfig.includes('__PRODUCTION_BUILD__')) {
    console.warn('⚠️  WARNING: __PRODUCTION_BUILD__ flag not found in vite.config.ts');
  }
  
  if (!viteConfig.includes('__STRIP_SENSITIVE_DATA__')) {
    console.warn('⚠️  WARNING: __STRIP_SENSITIVE_DATA__ flag not found in vite.config.ts');
  }
  
  // Check if minification is enabled
  if (!viteConfig.includes('minify: true')) {
    console.warn('⚠️  WARNING: Minification should be enabled for production builds');
  }
  
  console.log('✅ Build configuration validated');
}

// Run validation
if (require.main === module) {
  try {
    validateBuildConfig();
    validateProductionBuild();
  } catch (error) {
    console.error('💥 Validation failed with error:', error.message);
    process.exit(1);
  }
}

module.exports = { validateProductionBuild, scanFile, SENSITIVE_PATTERNS };