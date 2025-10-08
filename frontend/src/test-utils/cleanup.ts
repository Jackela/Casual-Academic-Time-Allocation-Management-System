/**
 * Unified Cleanup System
 * Manages resource cleanup during test lifecycle to ensure no hanging handles
 */

export type Cleanup = () => Promise<void> | void;

type Promisable<T> = T | Promise<T>;
type CloseCallback = (error?: Error | null) => void;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasMethod = <T extends string>(
  value: unknown,
  method: T,
): value is Record<T, (...args: unknown[]) => unknown> =>
  isObject(value) && typeof value[method] === 'function';

const isCallbackCloseable = (
  value: unknown,
): value is { close: (callback: CloseCallback) => void } =>
  hasMethod(value, 'close') && value.close.length >= 1;

const isPromiseCloseable = (
  value: unknown,
): value is { close: () => Promisable<unknown> } =>
  hasMethod(value, 'close') && value.close.length < 1;

const executeClose = async (resource: unknown): Promise<void> => {
  if (isCallbackCloseable(resource)) {
    await new Promise<void>((resolve, reject) => {
      resource.close((error) => {
        if (error instanceof Error) {
          reject(error);
        } else if (error != null) {
          reject(new Error(String(error)));
        } else {
          resolve();
        }
      });
    });
    return;
  }

  if (isPromiseCloseable(resource)) {
    await Promise.resolve(resource.close()).then(() => undefined);
  }
};

const terminateIfPossible = async (value: unknown): Promise<void> => {
  if (hasMethod(value, 'terminate')) {
    await Promise.resolve(value.terminate()).then(() => undefined);
  }
};

class CleanupRegistry {
  private cleaners: Cleanup[] = [];
  private isRunning = false;

  /**
   * Register cleanup function
   */
  register(fn: Cleanup): void {
    this.cleaners.push(fn);
  }

  /**
   * Execute all cleanup functions
   */
  async runAll(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const errors: Error[] = [];

    // Execute in reverse order (LIFO - Last In, First Out)
    const cleanersToRun = this.cleaners.splice(0);
    
    for (let i = cleanersToRun.length - 1; i >= 0; i--) {
      const cleaner = cleanersToRun[i];
      try {
        await cleaner();
      } catch (error) {
        console.error('Cleanup failed:', error);
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.isRunning = false;

    if (errors.length > 0) {
      throw new Error(`Cleanup errors: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Clear all cleanup functions (for test reset)
   */
  clear(): void {
    this.cleaners.length = 0;
  }

  /**
   * Get current count of registered cleanup functions
   */
  get count(): number {
    return this.cleaners.length;
  }
}

// Global cleanup registry
const cleanupRegistry = new CleanupRegistry();

/**
 * Register cleanup function
 */
export const registerCleanup = (fn: Cleanup): void => {
  cleanupRegistry.register(fn);
};

/**
 * Execute all cleanup functions
 */
export const runCleanups = async (): Promise<void> => {
  await cleanupRegistry.runAll();
};

/**
 * Clear all cleanup functions
 */
export const clearCleanups = (): void => {
  cleanupRegistry.clear();
};

/**
 * Get current count of registered cleanup functions
 */
export const getCleanupCount = (): number => {
  return cleanupRegistry.count;
};

/**
 * HTTP Server cleanup helper
 */
export const cleanupServer = (server: unknown): void => {
  registerCleanup(() => {
    if (!server) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      if (isCallbackCloseable(server)) {
        server.close((error) => {
          if (error instanceof Error) {
            reject(error);
          } else if (error != null) {
            reject(new Error(String(error)));
          } else {
            resolve();
          }
        });
        return;
      }

      if (isPromiseCloseable(server)) {
        Promise.resolve(server.close())
          .then(() => resolve())
          .catch(reject);
        return;
      }

      resolve();
    });
  });
};

/**
 * Database connection cleanup helper
 */
export const cleanupDatabase = (db: unknown): void => {
  registerCleanup(async () => {
    if (!db) {
      return;
    }
    // Prisma
    if (hasMethod(db, '$disconnect')) {
      await Promise.resolve(db.$disconnect()).then(() => undefined);
      return;
    }
    // TypeORM DataSource
    if (hasMethod(db, 'destroy')) {
      await Promise.resolve(db.destroy()).then(() => undefined);
      return;
    }
    // Generic pool
    if (hasMethod(db, 'end')) {
      await Promise.resolve(db.end()).then(() => undefined);
    }
  });
};

/**
 * Redis/cache cleanup helper
 */
export const cleanupCache = (cache: unknown): void => {
  registerCleanup(async () => {
    if (!cache) {
      return;
    }
    if (hasMethod(cache, 'quit')) {
      await Promise.resolve(cache.quit()).then(() => undefined);
      return;
    }
    if (hasMethod(cache, 'disconnect')) {
      await Promise.resolve(cache.disconnect()).then(() => undefined);
    }
  });
};

/**
 * Queue cleanup helper
 */
export const cleanupQueue = (queue: unknown, scheduler?: unknown): void => {
  registerCleanup(async () => {
    if (!queue && !scheduler) {
      return;
    }
    await executeClose(scheduler);
    await executeClose(queue);
  });
};

/**
 * Browser automation cleanup helper
 */
export const cleanupBrowser = (browser: unknown, context?: unknown): void => {
  registerCleanup(async () => {
    if (!browser && !context) {
      return;
    }
    await executeClose(context);
    await executeClose(browser);
  });
};

/**
 * Worker threads cleanup helper
 */
export const cleanupWorkers = (workers: unknown[]): void => {
  registerCleanup(async () => {
    await Promise.all(
      workers.map(worker => terminateIfPossible(worker))
    );
  });
};

/**
 * Timers cleanup helper
 */
export const cleanupTimers = (timers: NodeJS.Timeout[]): void => {
  registerCleanup(() => {
    timers.forEach(timer => clearInterval(timer));
    timers.length = 0;
  });
};

/**
 * AbortController cleanup helper
 */
export const cleanupAbortControllers = (controllers: AbortController[]): void => {
  registerCleanup(() => {
    controllers.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    controllers.length = 0;
  });
};

/**
 * File watchers cleanup helper (fs.watch, chokidar)
 */
export const cleanupWatchers = (watchers: unknown[]): void => {
  registerCleanup(async () => {
    await Promise.all(
      watchers.map(watcher => executeClose(watcher))
    );
  });
};
