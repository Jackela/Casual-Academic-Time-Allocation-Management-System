import { secureLogger } from '../utils/secure-logger';
/**
 * Process Management Utilities
 * Handles child process creation with proper cleanup to prevent hanging processes
 */

import { registerCleanup } from './cleanup';

interface ProcessOptions {
  stdio?: 'inherit' | 'pipe' | 'ignore';
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
}

interface ManagedProcess {
  pid?: number;
  kill: (signal?: NodeJS.Signals) => boolean;
  wait: () => Promise<number>;
}

/**
 * Cross-platform process tree killer
 */
export async function killProcessTree(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
  if (!pid) return;

  try {
    if (process.platform === 'win32') {
      // Windows - use taskkill to kill process tree
      const { spawn } = await import('child_process');
      const killer = spawn('taskkill', ['/pid', pid.toString(), '/t', '/f'], {
        stdio: 'ignore'
      });
      
      await new Promise<void>((resolve, reject) => {
        killer.on('close', (code) => {
          if (code === 0 || code === 128) { // 128 = process not found
            resolve();
          } else {
            reject(new Error(`taskkill failed with code ${code}`));
          }
        });
        killer.on('error', reject);
      });
    } else {
      // Unix - use tree-kill or manual process group kill
      try {
        const treeKill = await import('tree-kill');
        await new Promise<void>((resolve, reject) => {
          treeKill.default(pid, signal, (error) => {
            if (error && !error.message.includes('No such process')) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } catch (importError) {
        // Fallback: kill process group manually
        try {
          process.kill(-pid, signal); // Negative PID kills process group
        } catch (killError) {
          // Process might already be dead, ignore ESRCH
          if ((killError as any).code !== 'ESRCH') {
            throw killError;
          }
        }
      }
    }
  } catch (error) {
    secureLogger.warn(`Failed to kill process tree ${pid}:`, error);
  }
}

/**
 * Start a managed child process with automatic cleanup
 */
export function startManagedProcess(
  command: string, 
  args: string[] = [], 
  options: ProcessOptions = {}
): ManagedProcess {
  const { spawn } = require('child_process');

  let spawnCommand = command;
  let spawnArgs = args;

  if (process.platform === 'win32') {
    if (command === 'echo') {
      spawnCommand = 'cmd';
      spawnArgs = ['/c', 'echo', ...args];
    }
  }

  const proc = spawn(spawnCommand, spawnArgs, {
    stdio: options.stdio || 'inherit',
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    detached: false, // Keep as child process for easier cleanup
  });

  proc.on('error', () => {
    // Ignore spawn issues in tests (e.g., missing shell commands on Windows)
  });

  // Register cleanup function immediately
  registerCleanup(async () => {
    if (proc.pid) {
      await killProcessTree(proc.pid, 'SIGTERM');
      // Give process time to cleanup gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force kill if still running
      if (!proc.killed) {
        await killProcessTree(proc.pid, 'SIGKILL');
      }
    }
    
    // Ensure promises resolve
    proc.removeAllListeners();
    if (!proc.killed) {
      proc.kill('SIGKILL');
    }
  });

  return {
    get pid() { return proc.pid; },
    
    kill(signal: NodeJS.Signals = 'SIGTERM'): boolean {
      if (proc.pid) {
        killProcessTree(proc.pid, signal);
        return true;
      }
      return false;
    },
    
    async wait(): Promise<number> {
      return new Promise((resolve, reject) => {
        if (proc.exitCode !== null) {
          resolve(proc.exitCode);
          return;
        }
        
        const timeout = options.timeout ? setTimeout(() => {
          reject(new Error(`Process timeout after ${options.timeout}ms`));
        }, options.timeout) : null;
        
        proc.on('close', (code: number) => {
          if (timeout) clearTimeout(timeout);
          resolve(code || 0);
        });
        
        proc.on('error', (error: Error) => {
          if (timeout) clearTimeout(timeout);
          reject(error);
        });
      });
    }
  };
}

/**
 * Kill all processes matching a pattern (for Claude Code session cleanup)
 */
export async function killProcessesByPattern(pattern: string): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // Windows - use wmic to find processes
      const { spawn } = await import('child_process');
      const finder = spawn('wmic', [
        'process', 'where', 
        `CommandLine like '%${pattern}%'`, 
        'get', 'ProcessId', '/format:csv'
      ], { stdio: 'pipe' });
      
      let output = '';
      finder.stdout.on('data', (data) => output += data.toString());
      
      await new Promise<void>((resolve, reject) => {
        finder.on('close', async (code) => {
          if (code === 0) {
            const lines = output.split('\n');
            const pids = lines
              .map(line => line.split(',')[1]) // ProcessId is second column
              .filter(pid => pid && /^\d+$/.test(pid.trim()))
              .map(pid => parseInt(pid.trim(), 10));
            
            // Kill each process
            for (const pid of pids) {
              await killProcessTree(pid, 'SIGTERM');
            }
            resolve();
          } else {
            reject(new Error(`wmic failed with code ${code}`));
          }
        });
        finder.on('error', reject);
      });
    } else {
      // Unix - use pkill
      const { spawn } = await import('child_process');
      const killer = spawn('pkill', ['-f', pattern], { stdio: 'ignore' });
      
      await new Promise<void>((resolve) => {
        killer.on('close', () => resolve()); // pkill returns 1 if no processes found
        killer.on('error', () => resolve()); // Ignore errors, might be no matching processes
      });
    }
  } catch (error) {
    secureLogger.warn(`Failed to kill processes by pattern "${pattern}":`, error);
  }
}

/**
 * Clean up ports (cross-platform port cleanup)
 */
export async function cleanupPorts(...ports: number[]): Promise<void> {
  if (ports.length === 0) return;
  
  try {
    if (process.platform === 'win32') {
      // Windows - find and kill processes using specified ports
      for (const port of ports) {
        const { spawn } = await import('child_process');
        const netstat = spawn('netstat', ['-ano'], { stdio: 'pipe' });
        
        let output = '';
        netstat.stdout.on('data', (data) => output += data.toString());
        
        await new Promise<void>((resolve, _reject) => {
          netstat.on('close', async (code) => {
            if (code === 0) {
              const lines = output.split('\n');
              const pids = lines
                .filter(line => line.includes(`:${port} `))
                .map(line => {
                  const parts = line.trim().split(/\s+/);
                  return parts[parts.length - 1]; // PID is last column
                })
                .filter(pid => /^\d+$/.test(pid))
                .map(pid => parseInt(pid, 10));
              
              // Kill processes using the port
              for (const pid of pids) {
                await killProcessTree(pid, 'SIGTERM');
              }
              resolve();
            } else {
              resolve(); // Ignore netstat errors
            }
          });
          netstat.on('error', () => resolve());
        });
      }
    } else {
      // Unix - use lsof and kill
      const { spawn } = await import('child_process');
      const portArgs = ports.flatMap(port => ['-i', `:${port}`]);
      const lsof = spawn('lsof', ['-t', ...portArgs], { stdio: 'pipe' });
      
      let output = '';
      lsof.stdout.on('data', (data) => output += data.toString());
      
      await new Promise<void>((resolve) => {
        lsof.on('close', async (code) => {
          if (code === 0 && output.trim()) {
            const pids = output.trim().split('\n')
              .filter(line => /^\d+$/.test(line))
              .map(line => parseInt(line, 10));
            
            // Kill processes
            for (const pid of pids) {
              await killProcessTree(pid, 'SIGTERM');
            }
          }
          resolve();
        });
        lsof.on('error', () => resolve());
      });
    }
  } catch (error) {
    secureLogger.warn(`Failed to cleanup ports ${ports.join(', ')}:`, error);
  }
}

/**
 * Wait for port to be available
 */
export async function waitForPort(port: number, timeout = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const net = await import('net');
      await new Promise<void>((resolve, reject) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.close(() => resolve());
        });
        server.on('error', reject);
      });
      
      return true; // Port is available
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return false; // Port still occupied after timeout
}

/**
 * Pre-flight cleanup for Claude Code sessions
 */
export async function claudeCodePreflight(projectPath?: string): Promise<void> {
  const path = projectPath || process.cwd();
  
  // Kill any Node processes in the project directory
  await killProcessesByPattern(path);
  
  // Common development ports cleanup
  await cleanupPorts(3000, 3001, 4000, 5000, 8000, 8080, 9229);
  
  // Wait a moment for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
}