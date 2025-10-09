/**
 * Process Cleanup Utility for E2E Tests
 * 
 * This module provides robust cleanup capabilities to ensure that test processes
 * are properly terminated after test execution, preventing port conflicts and
 * resource leaks.
 */

import { exec, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Track running processes
const trackedProcesses: Set<ChildProcess> = new Set();
const processCleanupHandlers: Array<() => Promise<void>> = [];

/**
 * Kill processes using a specific port
 */
export async function killProcessOnPort(port: number): Promise<void> {
  console.log(`🔍 Checking for processes on port ${port}...`);
  
  try {
    if (process.platform === 'win32') {
      // Windows: prefer PowerShell (more reliable than parsing netstat)
      try {
        const psCmd = `Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object -ExpandProperty OwningProcess`;
        const { stdout } = await execAsync(`powershell -NoProfile -Command "${psCmd}"`);
        const pids = stdout.split(/\r?\n/).map(s => s.trim()).filter(s => /^\d+$/.test(s));
        for (const pid of pids) {
          console.log(`💀 Killing process ${pid} on port ${port}`);
          try {
            await execAsync(`taskkill /F /T /PID ${pid}`);
            console.log(`✅ Successfully killed process ${pid}`);
          } catch (error) {
            console.warn(`⚠️ Failed to kill process ${pid}:`, error);
          }
        }
        if (pids.length === 0) {
          console.log(`ℹ️ No listening processes found on port ${port}`);
        }
      } catch {
        // Fallback to netstat parsing
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.split('\n').filter(line => line.trim());
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid)) {
            console.log(`💀 Killing process ${pid} on port ${port}`);
            try {
              await execAsync(`taskkill /F /T /PID ${pid}`);
              console.log(`✅ Successfully killed process ${pid}`);
            } catch (error) {
              console.warn(`⚠️ Failed to kill process ${pid}:`, error);
            }
          }
        }
      }
    } else {
      // Unix-like systems (Linux, macOS)
      let pids: string[] = [];
      try {
        // Prefer ss where available
        const { stdout } = await execAsync(`ss -lptn | awk '/:${port} / {print $NF}' | sed -E 's/.*pid=([0-9]+).*/\\1/'`);
        pids = stdout.split(/\s+/).map(s => s.trim()).filter(Boolean);
      } catch {
   // Ignore cleanup errors to keep teardown resilient
 }
      if (pids.length === 0) {
        try {
          const { stdout } = await execAsync(`lsof -ti:${port}`);
          pids = stdout.split(/\s+/).map(s => s.trim()).filter(Boolean);
        } catch {
   // Ignore cleanup errors to keep teardown resilient
 }
      }
      if (pids.length === 0) {
        try {
          const { stdout } = await execAsync(`fuser ${port}/tcp 2>/dev/null`);
          pids = stdout.split(/\s+/).map(s => s.trim()).filter(Boolean);
        } catch {
   // Ignore cleanup errors to keep teardown resilient
 }
      }

      for (const pid of pids) {
        console.log(`💀 Killing process ${pid} on port ${port}`);
        try {
          // Try graceful first
          await execAsync(`kill -TERM ${pid}`);
          // Then force if still alive shortly after
          setTimeout(async () => {
            try { await execAsync(`kill -0 ${pid}`); await execAsync(`kill -KILL ${pid}`); } catch {
   // Ignore cleanup errors to keep teardown resilient
 }
          }, 1000);
          console.log(`✅ Sent termination signal to process ${pid}`);
        } catch (error) {
          console.warn(`⚠️ Failed to signal process ${pid}:`, error);
        }
      }
    }
  } catch (error) {
    console.log(`ℹ️ No processes found on port ${port} or error occurred:`, error);
  }
}

/**
 * Kill all Node.js processes related to Vite/frontend
 */
export async function killViteProcesses(): Promise<void> {
  console.log('🔍 Searching for Vite processes...');
  
  try {
    if (process.platform === 'win32') {
      // Windows - prefer PowerShell CIM query over deprecated WMIC
      const ps = `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'vite|dev' } | Select-Object -ExpandProperty ProcessId`;
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${ps}"`);
      const pids = stdout.split(/\r?\n/).map(s => s.trim()).filter(s => /^\d+$/.test(s));
      for (const pid of pids) {
        console.log(`💀 Killing Vite process ${pid}`);
        try {
          await execAsync(`taskkill /F /T /PID ${pid}`);
          console.log(`✅ Successfully killed Vite process ${pid}`);
        } catch (error) {
          console.warn(`⚠️ Failed to kill Vite process ${pid}:`, error);
        }
      }
    } else {
      // Unix-like systems
      let pids: string[] = [];
      try {
        const { stdout } = await execAsync(`pgrep -f "vite|vite-node|node.*vite"`);
        pids = stdout.split(/\s+/).map(s => s.trim()).filter(Boolean);
      } catch {
   // Ignore cleanup errors to keep teardown resilient
 }
      if (pids.length === 0) {
        const { stdout } = await execAsync(`ps aux | grep -Ei "vite|vite-node" | grep -v grep`);
        pids = stdout.split(/\n/).map(line => line.trim().split(/\s+/)[1]).filter(pid => /^\d+$/.test(pid));
      }
      for (const pid of pids) {
        console.log(`💀 Killing Vite process ${pid}`);
        try {
          await execAsync(`kill -TERM ${pid}`);
          setTimeout(async () => {
            try { await execAsync(`kill -0 ${pid}`); await execAsync(`kill -KILL ${pid}`); } catch {
   // Ignore cleanup errors to keep teardown resilient
 }
          }, 1000);
          console.log(`✅ Sent termination signal to process ${pid}`);
        } catch (error) {
          console.warn(`⚠️ Failed to kill Vite process ${pid}:`, error);
        }
      }
    }
  } catch (error) {
    console.log('ℹ️ No Vite processes found or error occurred:', error);
  }
}

/**
 * Register a process for tracking and cleanup
 */
export function trackProcess(childProc: ChildProcess): void {
  trackedProcesses.add(childProc);

  // Clean up when process exits naturally
  childProc.on('exit', () => {
    trackedProcesses.delete(childProc);
  });
}

/**
 * Kill all tracked processes
 */
export async function killTrackedProcesses(): Promise<void> {
  console.log(`🧹 Cleaning up ${trackedProcesses.size} tracked processes...`);

  const isWindows = process.platform === 'win32';

  const promises = Array.from(trackedProcesses).map(async (childProc) => {
    if (!childProc.killed) {
      try {
        if (childProc.pid) {
          if (isWindows) {
            await execAsync(`taskkill /F /T /PID ${childProc.pid}`);
          } else {
            childProc.kill('SIGTERM');

            // Force kill if it doesn't exit within 3 seconds
            setTimeout(() => {
              if (!childProc.killed) {
                childProc.kill('SIGKILL');
              }
            }, 3000);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error killing tracked process:', error);
      }
    }
  });

  await Promise.all(promises);
  trackedProcesses.clear();
}

/**
 * Register a cleanup handler
 */
export function registerCleanupHandler(handler: () => Promise<void>): void {
  processCleanupHandlers.push(handler);
}

/**
 * Execute all cleanup handlers
 */
export async function executeCleanupHandlers(): Promise<void> {
  console.log(`🧹 Executing ${processCleanupHandlers.length} cleanup handlers...`);
  
  for (const handler of processCleanupHandlers) {
    try {
      await handler();
    } catch (error) {
      console.warn('⚠️ Cleanup handler failed:', error);
    }
  }
  
  processCleanupHandlers.length = 0;
}

/**
 * Comprehensive cleanup of all test-related processes
 */
export async function cleanupTestEnvironment(): Promise<void> {
  console.log('🧹 Starting comprehensive test environment cleanup...');
  
  try {
    // 1. Kill processes on common development ports
    const commonPorts = [5174, 5173, 3000, 3001, 8080, 8084];
    await Promise.all(commonPorts.map(port => killProcessOnPort(port)));
    
    // 2. Kill Vite-specific processes
    await killViteProcesses();
    
    // 3. Kill tracked processes
    await killTrackedProcesses();
    
    // 4. Execute custom cleanup handlers
    await executeCleanupHandlers();
    
    console.log('✅ Test environment cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error during test environment cleanup:', error);
    throw error;
  }
}

/**
 * Setup process cleanup on exit signals
 */
export function setupGlobalCleanup(): void {
  const cleanup = async () => {
    console.log('\n🛑 Received exit signal, cleaning up...');
    await cleanupTestEnvironment();
    process.exit(0);
  };
  
  // Handle various exit signals
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('beforeExit', cleanup);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error);
    await cleanupTestEnvironment();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    await cleanupTestEnvironment();
    process.exit(1);
  });
}

/**
 * Wait for port to be free
 */
export async function waitForPortFree(port: number, maxWaitMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        if (!stdout.trim()) {
          console.log(`✅ Port ${port} is now free`);
          return true;
        }
      } else {
        await execAsync(`lsof -ti:${port}`);
        // If lsof succeeds, port is still in use
      }
    } catch {
      // If lsof fails, port is free
      console.log(`✅ Port ${port} is now free`);
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.warn(`⚠️ Port ${port} is still in use after ${maxWaitMs}ms`);
  return false;
}

// Auto-setup cleanup on import
setupGlobalCleanup();