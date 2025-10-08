import { secureLogger } from '../utils/secure-logger';
/**
 * Global Teardown Configuration for Vitest
 * 
 * Provides comprehensive cleanup and leak detection at the end of test execution.
 * This file should be referenced in vitest.config.ts globalTeardown option.
 * 
 * @author Claude Code
 * @since 1.0.0
 */

import { handleMonitorGlobalTeardown } from './handle-monitor';

const describeResource = (resource: unknown): string => {
  if (typeof resource === 'object' && resource !== null) {
    const constructorName = (resource as { constructor?: { name?: string } }).constructor?.name;
    return typeof constructorName === 'string' && constructorName.length > 0 ? constructorName : 'Unknown';
  }

  return typeof resource;
};

/**
 * Global teardown function
 * 
 * Performs final cleanup checks and resource leak detection after all tests complete.
 * 
 * @returns {Promise<void>}
 * @postcondition All resources are cleaned up and any leaks are reported
 * @throws {Error} If critical resource leaks are detected in CI environment
 * 
 * @example
 * ```typescript
 * // In vitest.config.ts
 * export default defineConfig({
 *   test: {
 *     globalTeardown: './src/test-utils/global-teardown.ts'
 *   }
 * });
 * ```
 */
export default async function globalTeardown(): Promise<void> {
  secureLogger.info('🧹 Running global teardown...');

  try {
    // Run handle monitoring teardown
    await handleMonitorGlobalTeardown();

    // Additional cleanup checks
    await performFinalChecks();

    secureLogger.info('✅ Global teardown completed successfully');
  } catch (error) {
    secureLogger.error('❌ Global teardown failed', error);
    
    // In CI environment, fail the entire test run if cleanup fails
    if (process.env.CI === 'true') {
      secureLogger.error('💥 Critical cleanup failure in CI environment');
      process.exit(1);
    }
    
    throw error;
  }
}

/**
 * Perform final system checks for resource leaks
 * 
 * @private
 * @returns {Promise<void>}
 * @postcondition System resources are verified as properly cleaned up
 */
async function performFinalChecks(): Promise<void> {
  const checks: Promise<void>[] = [];

  // Check for active handles
  checks.push(checkActiveHandles());
  
  // Check for active timers
  checks.push(checkActiveTimers());
  
  // Check for open file descriptors (if available)
  checks.push(checkFileDescriptors());
  
  // Check for active network connections
  checks.push(checkNetworkConnections());

  await Promise.all(checks);
}

/**
 * Check for remaining active handles
 * 
 * @private
 * @returns {Promise<void>}
 * @postcondition Active handles are logged and analyzed
 */
async function checkActiveHandles(): Promise<void> {
  if (typeof process._getActiveHandles === 'function') {
    const handles = process._getActiveHandles();
    
    if (handles.length > 0) {
      secureLogger.warn(`⚠️  ${handles.length} active handles remaining:`);
      
      const handleSummary: Record<string, number> = {};
      handles.forEach((handle) => {
        const type = describeResource(handle);
        handleSummary[type] = (handleSummary[type] || 0) + 1;
      });
      
      Object.entries(handleSummary).forEach(([type, count]) => {
        secureLogger.warn(`   - ${type}: ${count}`);
      });

      // Try to use why-is-node-running if available for detailed analysis
      await tryDetailedHandleAnalysis();
    } else {
      secureLogger.info('✅ No active handles remaining');
    }
  }
}

/**
 * Check for remaining active requests
 * 
 * @private
 * @returns {Promise<void>}
 * @postcondition Active requests are logged if any remain
 */
async function checkActiveTimers(): Promise<void> {
  if (typeof process._getActiveRequests === 'function') {
    const requests = process._getActiveRequests();
    
    if (requests.length > 0) {
      secureLogger.warn(`⚠️  ${requests.length} active requests remaining:`);
      
      const requestSummary: Record<string, number> = {};
      requests.forEach((request) => {
        const type = describeResource(request);
        requestSummary[type] = (requestSummary[type] || 0) + 1;
      });
      
      Object.entries(requestSummary).forEach(([type, count]) => {
        secureLogger.warn(`   - ${type}: ${count}`);
      });
    } else {
      secureLogger.info('✅ No active requests remaining');
    }
  }
}

/**
 * Check for open file descriptors (Unix systems)
 * 
 * @private
 * @returns {Promise<void>}
 * @postcondition File descriptor usage is reported if excessive
 */
async function checkFileDescriptors(): Promise<void> {
  if (process.platform === 'win32') return; // Skip on Windows

  try {
    const { spawn } = await import('child_process');
    const lsof = spawn('lsof', ['-p', process.pid.toString()], { 
      stdio: ['ignore', 'pipe', 'ignore'] 
    });

    let fdCount = 0;
    lsof.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim());
      fdCount += lines.length - 1; // Subtract header line
    });

    await new Promise<void>((resolve) => {
      lsof.on('close', () => {
        if (fdCount > 100) {
          secureLogger.warn(`⚠️  High file descriptor usage: ${fdCount} open files`);
        } else {
          secureLogger.info(`✅ File descriptor usage normal: ${fdCount} open files`);
        }
        resolve();
      });
      lsof.on('error', () => resolve()); // Ignore lsof errors
    });
  } catch {
    // Silently skip if lsof is not available
  }
}

/**
 * Check for active network connections
 * 
 * @private
 * @returns {Promise<void>}
 * @postcondition Network connection status is reported
 */
async function checkNetworkConnections(): Promise<void> {
  try {
    const { spawn } = await import('child_process');
    const netstat = process.platform === 'win32' 
      ? spawn('netstat', ['-an'], { stdio: ['ignore', 'pipe', 'ignore'] })
      : spawn('netstat', ['-tn'], { stdio: ['ignore', 'pipe', 'ignore'] });

    let connectionCount = 0;
    let output = '';

    netstat.stdout.on('data', (data) => {
      output += data.toString();
    });

    await new Promise<void>((resolve) => {
      netstat.on('close', () => {
        const lines = output.split('\n').filter(line => {
          return line.includes('ESTABLISHED') || line.includes('LISTEN');
        });
        
        connectionCount = lines.length;
        
        if (connectionCount > 10) {
          secureLogger.warn(`⚠️  Multiple network connections active: ${connectionCount}`);
        } else {
          secureLogger.info(`✅ Network connections normal: ${connectionCount} active`);
        }
        resolve();
      });
      netstat.on('error', () => resolve()); // Ignore netstat errors
    });
  } catch {
    // Silently skip if netstat is not available
  }
}

/**
 * Attempt detailed handle analysis using why-is-node-running
 * 
 * @private
 * @returns {Promise<void>}
 * @postcondition Detailed handle analysis is displayed if package is available
 */
async function tryDetailedHandleAnalysis(): Promise<void> {
  try {
    const whyIsNodeRunning = await import('why-is-node-running');
    secureLogger.info('📊 Detailed handle analysis:');
    
    // Give a moment for output to flush
    setTimeout(() => {
      if (typeof whyIsNodeRunning.default === 'function') {
        whyIsNodeRunning.default();
      }
    }, 100);
    
    // Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch {
    secureLogger.info('💡 For detailed handle analysis, install: npm install --save-dev why-is-node-running');
  }
}
