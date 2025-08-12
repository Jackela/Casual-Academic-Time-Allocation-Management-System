#!/usr/bin/env node

/**
 * Simple Docker availability verification script for CATAMS E2E tests
 * 
 * This script checks if Docker is properly installed and running.
 * Used by E2E test scripts to ensure TestContainers can work properly.
 * 
 * Exit codes:
 * 0 - Docker is available and working
 * 1 - Docker is not available or not working
 * 
 * Usage:
 *   node scripts/verify-docker-simple.js
 *   node scripts/verify-docker-simple.js --verbose
 */

const { execSync } = require('child_process');

const isVerbose = process.argv.includes('--verbose');

function log(message, level = 'INFO') {
  if (isVerbose || level === 'ERROR') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }
}

function checkDockerInstallation() {
  log('Checking Docker installation...');
  
  try {
    const version = execSync('docker --version', { 
      stdio: 'pipe', 
      encoding: 'utf8',
      timeout: 5000 
    }).trim();
    
    log(`Docker version detected: ${version}`);
    return true;
  } catch (error) {
    log('Docker command not found or failed to execute', 'ERROR');
    log('Please install Docker Desktop from: https://www.docker.com/products/docker-desktop', 'ERROR');
    return false;
  }
}

function checkDockerDaemon() {
  log('Checking Docker daemon status...');
  
  try {
    const info = execSync('docker info --format "{{.ServerVersion}}"', { 
      stdio: 'pipe', 
      encoding: 'utf8',
      timeout: 10000 
    }).trim();
    
    log(`Docker daemon is running (Server version: ${info})`);
    return true;
  } catch (error) {
    log('Docker daemon is not running or not accessible', 'ERROR');
    log('Please start Docker Desktop and ensure it is fully initialized', 'ERROR');
    return false;
  }
}

function provideTroubleshootingInfo() {
  console.error('\n🔧 Troubleshooting Guide for Docker Setup:');
  console.error('\n📋 Windows:');
  console.error('   1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop');
  console.error('   2. Install and restart your computer');
  console.error('   3. Start Docker Desktop');
  console.error('   4. Wait for "Docker Desktop is running" in system tray');
  console.error('   5. Open PowerShell and run: docker run hello-world');
  
  console.error('\n📋 macOS:');
  console.error('   1. Download Docker Desktop for Mac');
  console.error('   2. Install and start Docker Desktop');
  console.error('   3. Wait for whale icon in menu bar');
  console.error('   4. Open Terminal and run: docker run hello-world');
  
  console.error('\n📋 Linux:');
  console.error('   1. Install Docker Engine: sudo apt-get install docker.io');
  console.error('   2. Start Docker service: sudo systemctl start docker');
  console.error('   3. Add user to docker group: sudo usermod -aG docker $USER');
  console.error('   4. Logout and login again');
  console.error('   5. Test: docker run hello-world');
  
  console.error('\n🚨 Common Issues:');
  console.error('   • "Docker daemon not running" → Start Docker Desktop');
  console.error('   • "Permission denied" → Add user to docker group (Linux/macOS)');
  console.error('   • "Timeout" → Check firewall/antivirus settings');
  console.error('   • "Network error" → Check internet connection and proxy settings');
  
  console.error('\n💡 Alternative Testing:');
  console.error('   If Docker cannot be installed, run these instead:');
  console.error('   • npm run test (frontend unit tests)');
  console.error('   • ./gradlew test (backend unit tests)');
  console.error('   • ./gradlew integration-test (backend integration tests)');
}

async function main() {
  console.log('🐳 CATAMS Docker Verification Script');
  console.log('=====================================\n');
  
  const checks = [
    { name: 'Docker Installation', fn: checkDockerInstallation },
    { name: 'Docker Daemon', fn: checkDockerDaemon }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const result = check.fn();
      if (!result) {
        console.error(`❌ ${check.name}: FAILED`);
        allPassed = false;
        break;
      } else {
        console.log(`✅ ${check.name}: PASSED`);
      }
    } catch (error) {
      console.error(`❌ ${check.name}: ERROR - ${error.message}`);
      allPassed = false;
      break;
    }
  }
  
  console.log('\n=====================================');
  
  if (allPassed) {
    console.log('🎉 Docker is properly configured for CATAMS E2E tests!');
    console.log('You can now run: npm run test:e2e');
    process.exit(0);
  } else {
    console.error('🚨 Docker setup is incomplete or not working properly.');
    provideTroubleshootingInfo();
    process.exit(1);
  }
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Docker verification interrupted');
  process.exit(130);
});

if (require.main === module) {
  main().catch((error) => {
    console.error(`\n💥 Verification script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { 
  checkDockerInstallation,
  checkDockerDaemon
};