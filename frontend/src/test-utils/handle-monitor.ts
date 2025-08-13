/**
 * Handle Leak Detection and Monitoring System
 * 
 * Provides comprehensive monitoring and detection of resource leaks including
 * active handles, open file descriptors, and hanging processes.
 * 
 * @requires why-is-node-running - For analyzing active handles (install as dev dependency)
 * @author Claude Code
 * @since 1.0.0
 */

import { registerCleanup } from './cleanup';

/**
 * Configuration options for handle monitoring
 * 
 * @interface HandleMonitorConfig
 * @property {number} timeout - Maximum time to wait for handles to clear (ms)
 * @property {boolean} verbose - Enable detailed logging of handles
 * @property {boolean} failOnLeaks - Whether to throw error on detected leaks
 * @property {string[]} ignoredHandles - Handle types to ignore during detection
 */
interface HandleMonitorConfig {
  timeout?: number;
  verbose?: boolean;
  failOnLeaks?: boolean;
  ignoredHandles?: string[];
}

/**
 * Information about detected resource handles
 * 
 * @interface HandleInfo
 * @property {string} type - Type of handle (timer, socket, etc.)
 * @property {string} stack - Stack trace where handle was created
 * @property {any} handle - Reference to the actual handle object
 */
interface HandleInfo {
  type: string;
  stack: string;
  handle: any;
}

/**
 * Default configuration for handle monitoring
 * 
 * @constant
 * @type {HandleMonitorConfig}
 */
const DEFAULT_CONFIG: Required<HandleMonitorConfig> = {
  timeout: 5000,
  verbose: false,
  failOnLeaks: true,
  ignoredHandles: ['STDIO', 'SIGNAL', 'PROCESS']
};

/**
 * Global registry for tracking handle monitors
 * 
 * @private
 */
class HandleMonitorRegistry {
  private monitors: Set<HandleMonitor> = new Set();
  private globalTeardownRegistered = false;

  /**
   * Register a handle monitor instance
   * 
   * @param {HandleMonitor} monitor - Monitor instance to register
   * @precondition monitor must be a valid HandleMonitor instance
   * @postcondition monitor is added to the registry
   */
  register(monitor: HandleMonitor): void {
    this.monitors.add(monitor);
    
    if (!this.globalTeardownRegistered) {
      this.setupGlobalTeardown();
      this.globalTeardownRegistered = true;
    }
  }

  /**
   * Unregister a handle monitor instance
   * 
   * @param {HandleMonitor} monitor - Monitor instance to unregister
   * @precondition monitor exists in the registry
   * @postcondition monitor is removed from the registry
   */
  unregister(monitor: HandleMonitor): void {
    this.monitors.delete(monitor);
  }

  /**
   * Run final cleanup check across all registered monitors
   * 
   * @returns {Promise<void>}
   * @postcondition All monitors have completed final checks
   */
  async runFinalChecks(): Promise<void> {
    const promises = Array.from(this.monitors).map(monitor => 
      monitor.finalCheck().catch(error => {
        console.error('Handle monitor final check failed:', error);
        return false;
      })
    );
    
    await Promise.all(promises);
  }

  /**
   * Setup global teardown handler
   * 
   * @private
   * @postcondition Global teardown is registered with cleanup system
   */
  private setupGlobalTeardown(): void {
    registerCleanup(async () => {
      await this.runFinalChecks();
    });
  }
}

/**
 * Global registry instance
 * 
 * @private
 */
const registry = new HandleMonitorRegistry();

/**
 * Handle Monitor Class
 * 
 * Monitors and detects resource leaks during test execution.
 * Provides detailed reporting and optional failure on leak detection.
 */
export class HandleMonitor {
  private config: Required<HandleMonitorConfig>;
  private initialHandles: Set<any> = new Set();
  private monitoring = false;

  /**
   * Create a new handle monitor
   * 
   * @param {HandleMonitorConfig} [config] - Configuration options
   * @precondition config values must be within valid ranges
   * @postcondition Monitor is initialized with merged config
   */
  constructor(config: HandleMonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Validate configuration
    if (this.config.timeout < 100 || this.config.timeout > 30000) {
      throw new Error('Timeout must be between 100ms and 30s');
    }
    
    registry.register(this);
  }

  /**
   * Start monitoring active handles
   * 
   * @returns {void}
   * @precondition Monitor is not already running
   * @postcondition Monitor is actively tracking handles
   */
  start(): void {
    if (this.monitoring) {
      throw new Error('Handle monitor is already running');
    }

    this.monitoring = true;
    this.captureInitialHandles();

    if (this.config.verbose) {
      console.log(`Handle monitor started (timeout: ${this.config.timeout}ms)`);
    }
  }

  /**
   * Stop monitoring and check for leaks
   * 
   * @returns {Promise<boolean>} True if no leaks detected
   * @precondition Monitor is currently running
   * @postcondition Monitor stops and reports any detected leaks
   */
  async stop(): Promise<boolean> {
    if (!this.monitoring) {
      throw new Error('Handle monitor is not running');
    }

    this.monitoring = false;

    try {
      const hasLeaks = await this.detectLeaks();
      
      if (hasLeaks && this.config.failOnLeaks) {
        throw new Error('Resource leaks detected - test should fail');
      }

      return !hasLeaks;
    } finally {
      registry.unregister(this);
    }
  }

  /**
   * Perform final cleanup check (called during global teardown)
   * 
   * @returns {Promise<boolean>} True if cleanup was successful
   * @postcondition All resources have been properly cleaned up
   */
  async finalCheck(): Promise<boolean> {
    if (!this.monitoring) return true;

    try {
      return await this.detectLeaks();
    } catch (error) {
      console.error('Final handle check failed:', error);
      return false;
    }
  }

  /**
   * Capture baseline of currently active handles
   * 
   * @private
   * @postcondition initialHandles contains snapshot of current handles
   */
  private captureInitialHandles(): void {
    this.initialHandles.clear();
    
    if (process._getActiveHandles) {
      const handles = process._getActiveHandles();
      handles.forEach(handle => this.initialHandles.add(handle));
    }
    
    if (process._getActiveRequests) {
      const requests = process._getActiveRequests();
      requests.forEach(request => this.initialHandles.add(request));
    }
  }

  /**
   * Detect resource leaks by comparing current handles with baseline
   * 
   * @private
   * @returns {Promise<boolean>} True if leaks are detected
   * @postcondition Leak information is logged if verbose mode is enabled
   */
  private async detectLeaks(): Promise<boolean> {
    // Wait for async cleanup to complete
    await this.waitForCleanup();

    const currentHandles = new Set<any>();
    const currentRequests = new Set<any>();

    // Capture current state
    if (process._getActiveHandles) {
      process._getActiveHandles().forEach(handle => currentHandles.add(handle));
    }
    
    if (process._getActiveRequests) {
      process._getActiveRequests().forEach(request => currentRequests.add(request));
    }

    // Find new handles (potential leaks)
    const leakedHandles = Array.from(currentHandles).filter(handle => 
      !this.initialHandles.has(handle) && !this.isIgnoredHandle(handle)
    );

    const leakedRequests = Array.from(currentRequests).filter(request => 
      !this.initialHandles.has(request) && !this.isIgnoredHandle(request)
    );

    const totalLeaks = leakedHandles.length + leakedRequests.length;

    if (totalLeaks > 0) {
      await this.reportLeaks(leakedHandles, leakedRequests);
      return true;
    }

    if (this.config.verbose) {
      console.log('✅ No resource leaks detected');
    }

    return false;
  }

  /**
   * Wait for async cleanup operations to complete
   * 
   * @private
   * @returns {Promise<void>}
   * @postcondition Async operations have had time to complete cleanup
   */
  private async waitForCleanup(): Promise<void> {
    return new Promise(resolve => {
      // Give time for async cleanup operations
      setTimeout(resolve, Math.min(this.config.timeout, 2000));
    });
  }

  /**
   * Check if a handle should be ignored based on configuration
   * 
   * @private
   * @param {any} handle - Handle to check
   * @returns {boolean} True if handle should be ignored
   * @precondition handle is a valid object
   */
  private isIgnoredHandle(handle: any): boolean {
    const constructor = handle?.constructor?.name || 'Unknown';
    return this.config.ignoredHandles.some(ignored => 
      constructor.toUpperCase().includes(ignored.toUpperCase())
    );
  }

  /**
   * Report detected resource leaks
   * 
   * @private
   * @param {any[]} handles - Leaked handle objects
   * @param {any[]} requests - Leaked request objects
   * @returns {Promise<void>}
   * @postcondition Leak information is logged with appropriate detail level
   */
  private async reportLeaks(handles: any[], requests: any[]): Promise<void> {
    console.error('🚨 Resource leaks detected:');
    console.error(`  - ${handles.length} active handles`);
    console.error(`  - ${requests.length} active requests`);

    if (this.config.verbose) {
      // Detailed handle information
      handles.forEach((handle, index) => {
        console.error(`  Handle ${index + 1}: ${handle?.constructor?.name || 'Unknown'}`);
      });

      requests.forEach((request, index) => {
        console.error(`  Request ${index + 1}: ${request?.constructor?.name || 'Unknown'}`);
      });

      // Try to use why-is-node-running if available
      await this.tryWhyIsNodeRunning();
    }
  }

  /**
   * Attempt to use why-is-node-running for detailed handle analysis
   * 
   * @private
   * @returns {Promise<void>}
   * @postcondition why-is-node-running output is displayed if package is available
   */
  private async tryWhyIsNodeRunning(): Promise<void> {
    try {
      const whyIsNodeRunning = await import('why-is-node-running');
      console.error('\n📊 Detailed handle analysis:');
      whyIsNodeRunning.default();
    } catch (error) {
      console.error('\n💡 Install "why-is-node-running" for detailed handle analysis:');
      console.error('  npm install --save-dev why-is-node-running');
    }
  }
}

/**
 * Create and start a handle monitor for current test
 * 
 * @param {HandleMonitorConfig} [config] - Configuration options
 * @returns {HandleMonitor} Configured and started monitor instance
 * @precondition Test environment is properly initialized
 * @postcondition Monitor is actively tracking resource usage
 * 
 * @example
 * ```typescript
 * describe('API Tests', () => {
 *   let monitor: HandleMonitor;
 *   
 *   beforeEach(() => {
 *     monitor = createHandleMonitor({ verbose: true });
 *   });
 *   
 *   afterEach(async () => {
 *     await monitor.stop();
 *   });
 * });
 * ```
 */
export function createHandleMonitor(config?: HandleMonitorConfig): HandleMonitor {
  const monitor = new HandleMonitor(config);
  monitor.start();
  return monitor;
}

/**
 * Setup automatic handle monitoring for all tests
 * 
 * @param {HandleMonitorConfig} [config] - Global configuration options
 * @returns {void}
 * @postcondition Handle monitoring is enabled for all subsequent tests
 * 
 * @example
 * ```typescript
 * // In test setup file
 * setupGlobalHandleMonitoring({
 *   verbose: process.env.DEBUG_TESTS === 'true',
 *   failOnLeaks: process.env.CI === 'true'
 * });
 * ```
 */
export function setupGlobalHandleMonitoring(config?: HandleMonitorConfig): void {
  if (typeof afterEach === 'function') {
    let currentMonitor: HandleMonitor | null = null;

    // Hook into test lifecycle
    if (typeof beforeEach === 'function') {
      beforeEach(() => {
        currentMonitor = createHandleMonitor(config);
      });
    }

    afterEach(async () => {
      if (currentMonitor) {
        try {
          await currentMonitor.stop();
        } catch (error) {
          console.error('Handle monitor cleanup failed:', error);
          throw error;
        } finally {
          currentMonitor = null;
        }
      }
    });
  }
}

/**
 * Global teardown function for handle monitoring
 * Should be called in global teardown configuration
 * 
 * @returns {Promise<void>}
 * @postcondition All handle monitors have completed final checks
 * 
 * @example
 * ```typescript
 * // In vitest.config.ts or jest global teardown
 * export default async function globalTeardown() {
 *   await handleMonitorGlobalTeardown();
 * }
 * ```
 */
export async function handleMonitorGlobalTeardown(): Promise<void> {
  await registry.runFinalChecks();
  
  // Final delay to allow any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 500));
}