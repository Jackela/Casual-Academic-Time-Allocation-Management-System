/**
 * Unified Cleanup System
 * Manages resource cleanup during test lifecycle to ensure no hanging handles
 */

export type Cleanup = () => Promise<void> | void;

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
export const cleanupServer = (server: any): void => {
  registerCleanup(() => {
    return new Promise<void>((resolve) => {
      if (server && typeof server.close === 'function') {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });
};

/**
 * Database connection cleanup helper
 */
export const cleanupDatabase = (db: any): void => {
  registerCleanup(async () => {
    if (db) {
      // Prisma
      if (typeof db.$disconnect === 'function') {
        await db.$disconnect();
      }
      // TypeORM DataSource
      else if (typeof db.destroy === 'function') {
        await db.destroy();
      }
      // Generic pool
      else if (typeof db.end === 'function') {
        await db.end();
      }
    }
  });
};

/**
 * Redis/cache cleanup helper
 */
export const cleanupCache = (cache: any): void => {
  registerCleanup(async () => {
    if (cache && typeof cache.quit === 'function') {
      await cache.quit();
    } else if (cache && typeof cache.disconnect === 'function') {
      await cache.disconnect();
    }
  });
};

/**
 * Queue cleanup helper
 */
export const cleanupQueue = (queue: any, scheduler?: any): void => {
  registerCleanup(async () => {
    if (scheduler && typeof scheduler.close === 'function') {
      await scheduler.close();
    }
    if (queue && typeof queue.close === 'function') {
      await queue.close();
    }
  });
};

/**
 * Browser automation cleanup helper
 */
export const cleanupBrowser = (browser: any, context?: any): void => {
  registerCleanup(async () => {
    if (context && typeof context.close === 'function') {
      await context.close();
    }
    if (browser && typeof browser.close === 'function') {
      await browser.close();
    }
  });
};

/**
 * Worker threads cleanup helper
 */
export const cleanupWorkers = (workers: any[]): void => {
  registerCleanup(async () => {
    await Promise.all(
      workers.map(worker => 
        worker && typeof worker.terminate === 'function' 
          ? worker.terminate() 
          : Promise.resolve()
      )
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
export const cleanupWatchers = (watchers: any[]): void => {
  registerCleanup(async () => {
    await Promise.all(
      watchers.map(watcher => {
        if (watcher && typeof watcher.close === 'function') {
          return watcher.close();
        }
        return Promise.resolve();
      })
    );
  });
};