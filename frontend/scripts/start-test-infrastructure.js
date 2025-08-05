#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

let backendProcess = null;
let frontendProcess = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

async function startBackend() {
  log('🚀 Starting Spring Boot backend with E2E profile...', colors.cyan);
  
  try {
    // Start backend process in background
    backendProcess = spawn('mvn', ['spring-boot:run', '-Dspring-boot.run.arguments=--spring.profiles.active=e2e'], {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
      detached: false
    });

    // Log backend startup progress
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Started CatamsApplication') || 
          output.includes('Tomcat started on port') ||
          output.includes('E2E test data initialized')) {
        log(`  📡 Backend: ${output.trim()}`, colors.blue);
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ERROR')) {
        log(`  🔥 Backend Error: ${output.trim()}`, colors.red);
      }
    });

    // Wait for backend health check
    log('⏳ Performing backend health checks...', colors.yellow);
    
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Check if port is available
        await waitOn({
          resources: ['tcp:localhost:8084'],
          timeout: 1000,
          interval: 500
        });
        
        // Check health endpoint
        const healthResponse = await fetch('http://localhost:8084/actuator/health', {
          method: 'GET',
          timeout: 3000
        });
        
        if (healthResponse.ok) {
          logSuccess('Backend is ready and healthy');
          return backendProcess;
        }
      } catch (healthError) {
        // Continue waiting
      }
      
      if (attempts % 10 === 0) {
        log(`  ⏱️  Health check attempt ${attempts}/${maxAttempts}...`, colors.yellow);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Backend failed to become healthy within timeout period');
    
  } catch (error) {
    logError(`Failed to start backend: ${error.message}`);
    throw error;
  }
}

async function startFrontend() {
  log('🚀 Starting Vite development server...', colors.cyan);
  
  try {
    // Start frontend process
    frontendProcess = spawn('npm', ['run', 'dev', '--', '--mode', 'e2e'], {
      cwd: join(projectRoot, 'frontend'),
      stdio: 'pipe',
      shell: true
    });

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready in')) {
        log(`  🚀 Frontend: ${output.trim()}`, colors.magenta);
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ERROR') || output.includes('Error')) {
        log(`  🔥 Frontend Error: ${output.trim()}`, colors.red);
      }
    });

    // Wait for frontend to be ready
    log('⏳ Waiting for frontend to be ready...', colors.yellow);
    await waitOn({
      resources: ['http://localhost:5174'],
      timeout: 30000, // 30 seconds
      interval: 1000
    });

    logSuccess('Frontend is ready and serving');
    return frontendProcess;
  } catch (error) {
    logError(`Failed to start frontend: ${error.message}`);
    throw error;
  }
}

async function cleanup() {
  log('🛑 Shutting down test infrastructure...', colors.yellow);
  
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill('SIGTERM');
    log('  🛑 Frontend server stopped');
  }
  
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
    log('  🛑 Backend server stopped');
  }
}

async function main() {
  log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                 CATAMS Test Infrastructure                   ║
║                    Startup Script                           ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Start backend with E2E profile
    await startBackend();
    
    // Start frontend
    await startFrontend();
    
    logSuccess('🎉 Test infrastructure is fully ready!');
    log('💡 You can now run modular tests with: npm run test:e2e:moduleName', colors.cyan);
    log('🛑 Press Ctrl+C to stop the infrastructure', colors.yellow);
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logError('Failed to start test infrastructure');
    if (error.output) {
      console.log(error.output);
    }
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  log('\n🛑 Received SIGINT, cleaning up...', colors.yellow);
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('\n🛑 Received SIGTERM, cleaning up...', colors.yellow);
  await cleanup();
  process.exit(0);
});

// Start the infrastructure
main().catch((error) => {
  logError(`Unhandled error: ${error.message}`);
  process.exit(1);
});