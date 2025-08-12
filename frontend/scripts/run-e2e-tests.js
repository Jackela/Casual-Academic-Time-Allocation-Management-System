#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import waitOn from 'wait-on';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

let backendProcess = null;
let frontendProcess = null;
let allSpawnedProcesses = new Set(); // Track all spawned processes for cleanup

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

function logStep(step, message) {
  log(`${colors.bright}[${step}]${colors.reset} ${colors.cyan}${message}${colors.reset}`);
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

function spawnProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    // Track all spawned processes for cleanup
    allSpawnedProcesses.add(child);
    child.on('close', () => allSpawnedProcesses.delete(child));

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
      if (options.showOutput) {
        console.log(data.toString().trim());
      }
    });

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
      if (options.showOutput) {
        console.error(data.toString().trim());
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, output, errorOutput });
      } else {
        reject({ code, output, errorOutput });
      }
    });

    child.on('error', (error) => {
      reject({ error, output, errorOutput });
    });

    return child;
  });
}

function loadParams() {
  const paramsPath = join(__dirname, 'e2e.params.json');
  const raw = fs.readFileSync(paramsPath, 'utf8');
  return JSON.parse(raw);
}

const params = loadParams();

function getGradleCommand() {
  // For cross-platform compatibility, we need to handle Windows specifically
  if (process.platform === 'win32') {
    // In Windows, we use the shell to run gradlew.bat through cmd
    return 'cmd';
  } else {
    return './gradlew';
  }
}

function getGradleArgs(bootRunArgs) {
  if (process.platform === 'win32') {
    // Windows: use cmd /c to run gradlew.bat
    return ['/c', 'gradlew.bat', 'bootRun', '-x', 'test', `--args=${bootRunArgs}`];
  } else {
    // Unix-like systems: direct gradlew execution
    return ['bootRun', '-x', 'test', `--args=${bootRunArgs}`];
  }
}

async function startBackend() {
  logStep('STEP 3', 'Starting Spring Boot backend with E2E profile...');
  
  try {
    // Start backend process in background (non-blocking)
    const gradleCmd = getGradleCommand();
    const backendArgs = `--spring.profiles.active=${params.backendProfile} --server.port=${params.backendPort}`;
    const gradleArgs = getGradleArgs(backendArgs);
    backendProcess = spawn(gradleCmd, gradleArgs, {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
      detached: false
    });
    
    // Track backend process for cleanup
    allSpawnedProcesses.add(backendProcess);
    backendProcess.on('close', () => allSpawnedProcesses.delete(backendProcess));

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

    const exitPromise = new Promise((_, reject) => {
      backendProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Backend process exited with code ${code}`));
        }
      });
      backendProcess.on('error', (error) => {
        reject(new Error(`Backend process error: ${error.message}`));
      });
    });

    // Implement active health checking instead of log parsing
    logStep('STEP 4', 'Performing active health checks...');
    log('  📋 This may take 1-2 minutes on first run (Docker image download + TestContainers startup)', colors.blue);
    
    const readyPromise = new Promise(async (resolve, reject) => {
      const maxAttempts = 120; // 120 seconds max (2 minutes for Docker image download + startup)
      for (let attempts = 1; attempts <= maxAttempts; attempts++) {
        try {
          await waitOn({ resources: [`tcp:localhost:${params.backendPort}`], timeout: 1000, interval: 500 });
          const healthResponse = await fetch(`http://localhost:${params.backendPort}${params.backendHealthCheckPath}`, { method: 'GET', timeout: 3000 });
          if (healthResponse.ok) {
            log('  ✅ Backend health check passed', colors.green);
            try {
              const h2Response = await fetch(`http://localhost:${params.backendPort}/h2-console`, { method: 'GET', timeout: 3000 });
              if (h2Response.status === 200) log('  ✅ E2E profile confirmed (H2 Console accessible)', colors.green);
              else log('  ⚠️  H2 Console not accessible - may not be E2E profile', colors.yellow);
            } catch {}
            try {
              const authResponse = await fetch(`http://localhost:${params.backendPort}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test', password: 'test' }), timeout: 3000 });
              if (authResponse.status === 401 || authResponse.status === 400) log('  ✅ Auth endpoint accessible', colors.green);
            } catch {}
            logSuccess('Backend is fully ready for E2E testing');
            return resolve(backendProcess);
          }
        } catch {}
        if (attempts % 15 === 0 || attempts === 30 || attempts === 60) {
          log(`  ⏱️  Health check attempt ${attempts}/${maxAttempts} (${Math.round(attempts/maxAttempts*100)}%)...`, colors.yellow);
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      reject(new Error('Backend failed to become healthy within timeout period'));
    });

    return await Promise.race([readyPromise, exitPromise]);
    
  } catch (error) {
    logError(`Failed to start backend: ${error.message}`);
    throw error;
  }
}

async function checkDockerAvailability() {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function checkBackendAlreadyRunning() {
  try {
    const url = `http://localhost:${params.backendPort}${params.backendHealthCheckPath}`;
    const res = await fetch(url, { method: 'GET', timeout: 2000 });
    return res.ok;
  } catch {
    return false;
  }
}

async function startFrontend() {
  logStep('STEP 5', 'Starting Vite development server...');
  
  try {
    // Skip if already running (avoid port conflicts)
    try {
      const ping = await fetch(params.frontendUrl, { method: 'GET', redirect: 'manual', cache: 'no-store' });
      if (ping.ok || ping.status === 200 || ping.status === 301 || ping.status === 302) {
        logSuccess('Detected healthy frontend. Skipping frontend start.');
        return;
      }
    } catch {}

    // Use spawn without waiting for completion (frontend needs to stay running)
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: join(projectRoot, 'frontend'),
      stdio: 'pipe',
      shell: true
    });
    
    // Track frontend process for cleanup
    allSpawnedProcesses.add(frontendProcess);
    frontendProcess.on('close', () => allSpawnedProcesses.delete(frontendProcess));

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
    logStep('STEP 6', 'Waiting for frontend to be ready...');
    await waitOn({
      resources: [params.frontendUrl],
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

async function runPlaywrightTests() {
  logStep('STEP 7', 'Running Playwright E2E tests...');
  
  try {
    const resultsPath = join(projectRoot, 'frontend', params.jsonReportPath);
    try { fs.mkdirSync(join(projectRoot, 'frontend', 'playwright-report'), { recursive: true }); } catch {}
    // Clear previous report to avoid legacy/preamble contamination
    try { if (fs.existsSync(resultsPath)) fs.unlinkSync(resultsPath); } catch {}

    // Enforce JSON-only reporter for machine readability
    // Instruct Playwright to reuse externally managed web server
    process.env.E2E_EXTERNAL_WEBSERVER = 'true';
    // Limit projects to desktop runs by default (api-tests + ui-tests). Mobile can be enabled explicitly via CLI if needed.
    const pwArgs = ['playwright', 'test', '--reporter=json'];
    const hasProjectArg = process.argv.some(a => a.startsWith('--project='));
    if (!hasProjectArg) {
      pwArgs.push('--project=api-tests', '--project=ui-tests');
    } else {
      // Pass through provided project argument(s)
      for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('--project=')) pwArgs.push(arg);
      }
    }

    const result = await spawnProcess('npx', pwArgs, {
      cwd: join(projectRoot, 'frontend'),
      showOutput: false
    });

    logSuccess('E2E tests execution completed');
    return result;
  } catch (error) {
    logWarning(`E2E tests finished with exit code ${error.code} - analyzing results...`);
    // Don't throw error here - we'll analyze the JSON results
    return error;
  }
}

// Analysis removed by design; external agent will read the JSON report.

function killProcessTreeWindows(pid) {
  try {
    // Kill process tree on Windows using taskkill
    execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
  } catch (error) {
    // Fallback to individual process kill
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } catch {}
  }
}

function killProcessTreeUnix(pid) {
  try {
    // Kill process group on Unix-like systems
    process.kill(-pid, 'SIGTERM');
    setTimeout(() => {
      try { process.kill(-pid, 'SIGKILL'); } catch {}
    }, 2000);
  } catch (error) {
    // Fallback to individual process kill
    try { process.kill(pid, 'SIGTERM'); } catch {}
    setTimeout(() => {
      try { process.kill(pid, 'SIGKILL'); } catch {}
    }, 2000);
  }
}

async function cleanup() {
  logStep('CLEANUP', 'Shutting down services...');
  
  const killGracefully = (proc, name) => new Promise((resolve) => {
    if (!proc || proc.killed || !proc.pid) return resolve();
    
    log(`  🛑 Stopping ${name} (PID: ${proc.pid})`);
    
    // Platform-specific process tree killing
    if (process.platform === 'win32') {
      killProcessTreeWindows(proc.pid);
    } else {
      killProcessTreeUnix(proc.pid);
    }
    
    // Wait for process to exit
    const timeout = setTimeout(() => {
      log(`  ⚠️  ${name} force killed after timeout`);
      resolve();
    }, 3000);
    
    proc.on('close', () => {
      clearTimeout(timeout);
      log(`  ✅ ${name} stopped gracefully`);
      resolve();
    });
  });

  // Kill all tracked spawned processes
  const cleanupPromises = [];
  for (const child of allSpawnedProcesses) {
    if (!child.killed && child.pid) {
      cleanupPromises.push(killGracefully(child, `Process ${child.pid}`));
    }
  }

  // Add main processes
  if (frontendProcess) cleanupPromises.push(killGracefully(frontendProcess, 'Frontend server'));
  if (backendProcess) cleanupPromises.push(killGracefully(backendProcess, 'Backend server'));

  await Promise.all(cleanupPromises);
  
  // Final comprehensive port cleanup using dedicated script
  try {
    log('  🔧 Running comprehensive port cleanup...');
    const cleanupScript = join(projectRoot, 'scripts', 'cleanup-ports.js');
    execSync(`node "${cleanupScript}"`, { 
      stdio: 'inherit',
      cwd: projectRoot 
    });
  } catch (error) {
    log(`  ⚠️  Port cleanup script failed: ${error.message}`);
  }
  
  log('  🧹 Cleanup completed');
}

async function main() {
  log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                    CATAMS E2E Test Suite                     ║
║            REFACTORED NON-BLOCKING ORCHESTRATION             ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  let playwrightExit = 1;

  try {
    // Check Docker availability first
    logStep('STEP 0', 'Checking Docker availability...');
    const dockerAvailable = await checkDockerAvailability();
    if (!dockerAvailable) {
      logError('Docker is not available or not running!');
      logError('📋 To run E2E tests locally, please:');
      logError('   1. Install Docker Desktop');
      logError('   2. Start Docker Desktop');
      logError('   3. Verify with: docker --version');
      logError('💡 Alternative: Run unit/integration tests instead');
      process.exit(1);
    }
    logSuccess('Docker is available and running');

    // Install dependencies if needed
    logStep('STEP 1', 'Installing dependencies...');
    try {
      await spawnProcess('npm', ['install'], {
        cwd: join(projectRoot, 'frontend')
      });
      logSuccess('Dependencies installed');
    } catch (error) {
      logWarning('Failed to install dependencies, continuing anyway...');
    }

    // Export E2E credentials from SSOT params (avoid hardcoding)
    const users = params.testUsers || {};
    process.env.E2E_TUTOR_EMAIL = users.tutor?.email || 'tutor@example.com';
    process.env.E2E_TUTOR_PASSWORD = users.tutor?.password || 'Tutor123!';
    process.env.E2E_LECTURER_EMAIL = users.lecturer?.email || 'lecturer@example.com';
    process.env.E2E_LECTURER_PASSWORD = users.lecturer?.password || 'Lecturer123!';
    process.env.E2E_ADMIN_EMAIL = users.admin?.email || 'admin@example.com';
    process.env.E2E_ADMIN_PASSWORD = users.admin?.password || 'Admin123!';

    // Start backend with E2E profile (with health checking) iff not already running
    logStep('STEP 2', 'Checking backend status...');
    const alreadyUp = await checkBackendAlreadyRunning();
    if (alreadyUp) {
      logSuccess('Detected healthy backend. Skipping backend start.');
    } else {
      await startBackend();
    }
    
    // Start frontend
    await startFrontend();
    
    const result = await runPlaywrightTests();
    playwrightExit = typeof result.code === 'number' ? result.code : 1;
    
  } catch (error) {
    logError('E2E testing pipeline failed during setup/execution');
    if (error.output) {
      log('Error output:', colors.red);
      console.log(error.output);
    }
    if (error.errorOutput) {
      log('Error details:', colors.red);
      console.log(error.errorOutput);
    }
    
    process.exit(1);
  } finally {
    await cleanup();
    process.exit(playwrightExit);
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

// Start the E2E testing pipeline
main().catch((error) => {
  logError(`Unhandled error: ${error.message}`);
  process.exit(1);
});