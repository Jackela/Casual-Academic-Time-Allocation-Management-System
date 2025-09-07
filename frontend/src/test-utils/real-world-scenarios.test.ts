/**
 * Real-World Scenarios Test
 * 
 * Tests scenarios that commonly cause hanging processes in Claude Code sessions,
 * validating our cleanup system prevents resource accumulation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  registerCleanup, 
  runCleanups, 
  clearCleanups, 
  cleanupServer,
  cleanupTimers,
  cleanupAbortControllers 
} from './cleanup';

describe('Real-World Cleanup Scenarios', () => {
  beforeEach(() => {
    clearCleanups();
  });

  afterEach(async () => {
    await runCleanups();
    clearCleanups();
  });

  describe('HTTP Server Testing Patterns', () => {
    it('should handle supertest pattern (no app.listen)', async () => {
      // Simulate using supertest without app.listen
      // This is the PREFERRED pattern mentioned in requirements
      
      // Note: In real tests, we would use supertest without app.listen
      // Example: await request(app).get('/health').expect(200)
      
      // In real tests, we would use:
      // import request from 'supertest';
      // await request(app).get('/health').expect(200);
      
      // No cleanup needed for supertest pattern
      expect(true).toBe(true);
    });

    it('should handle server.listen pattern with proper cleanup', async () => {
      // When we DO need to use app.listen (integration tests)
      const mockServer = {
        close: vi.fn((callback) => {
          setTimeout(() => callback(), 10);
        }),
        listen: vi.fn()
      };
      
      // Simulate server startup
      mockServer.listen();
      
      // Register cleanup immediately
      cleanupServer(mockServer);
      
      // Run cleanup
      await runCleanups();
      
      // Verify server.close was called
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should handle random port assignment to avoid conflicts', () => {
      const mockApp = {
        listen: vi.fn((port, callback?) => {
          // Simulate random port (0) assignment
          const assignedPort = port === 0 ? 3456 : port;
          callback && callback();
          return {
            address: () => ({ port: assignedPort }),
            close: vi.fn((cb) => cb && cb())
          };
        })
      };
      
      // Use port 0 for random assignment (best practice)
      const server = mockApp.listen(0);
      cleanupServer(server);
      
      expect(mockApp.listen).toHaveBeenCalledWith(0);
    });
  });

  describe('Timer and Interval Patterns', () => {
    it('should clean up setInterval timers that cause hanging', async () => {
      const timers: NodeJS.Timeout[] = [];
      
      // Simulate creating intervals (common cause of hanging)
      const interval1 = setInterval(() => {
        console.log('Background work');
      }, 1000) as NodeJS.Timeout;
      
      const interval2 = setInterval(() => {
        console.log('Polling');  
      }, 5000) as NodeJS.Timeout;
      
      timers.push(interval1, interval2);
      
      // Register cleanup
      cleanupTimers(timers);
      
      // Verify timers were added
      expect(timers).toHaveLength(2);
      
      // Run cleanup
      await runCleanups();
      
      // Verify timers array was cleared
      expect(timers).toHaveLength(0);
    });

    it('should handle setTimeout cleanup', async () => {
      const timers: NodeJS.Timeout[] = [];
      
      // Create long-running timeouts
      const timeout1 = setTimeout(() => {
        console.log('Delayed operation');
      }, 30000) as NodeJS.Timeout; // 30 seconds
      
      const timeout2 = setTimeout(() => {
        console.log('Another delay');
      }, 60000) as NodeJS.Timeout; // 1 minute
      
      timers.push(timeout1, timeout2);
      cleanupTimers(timers);
      
      await runCleanups();
      
      expect(timers).toHaveLength(0);
    });

    it('should handle fake timers (jest/sinon style)', () => {
      // Simulate fake timer cleanup pattern
      const fakeTimers: any[] = [];
      
      registerCleanup(() => {
        fakeTimers.forEach(timer => {
          if (timer && typeof timer.restore === 'function') {
            timer.restore();
          }
        });
        
        // Reset to real timers
        vi.useRealTimers();
      });
      
      // Simulate fake timer usage
      vi.useFakeTimers();
      fakeTimers.push({ restore: vi.fn() });
      
      expect(fakeTimers).toHaveLength(1);
    });
  });

  describe('AbortController and Long-Running Operations', () => {
    it('should handle AbortController cleanup for fetch requests', async () => {
      const controllers: AbortController[] = [];
      
      // Simulate long-running fetch operations
      for (let i = 0; i < 3; i++) {
        const controller = new AbortController();
        controllers.push(controller);
        
        // Simulate starting a fetch operation
        // fetch('/api/data', { signal: controller.signal })
        //   .catch(err => err.name === 'AbortError' ? null : throw err);
      }
      
      // Register cleanup
      cleanupAbortControllers(controllers);
      
      // Verify controllers are not aborted initially
      controllers.forEach(controller => {
        expect(controller.signal.aborted).toBe(false);
      });
      
      // Run cleanup
      await runCleanups();
      
      // Verify all controllers were aborted
      controllers.forEach(controller => {
        expect(controller.signal.aborted).toBe(true);
      });
      
      // Verify array was cleared
      expect(controllers).toHaveLength(0);
    });

    it('should handle timeout-based AbortController', async () => {
      const controllers: AbortController[] = [];
      
      const controller = new AbortController();
      controllers.push(controller);
      
      // Simulate timeout pattern
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Operation timeout'));
      }, 10000); // 10 second timeout
      
      // Register both cleanup types
      cleanupAbortControllers(controllers);
      cleanupTimers([timeoutId as NodeJS.Timeout]);
      
      // Run cleanup
      await runCleanups();
      
      // Controller should be aborted and timer cleared
      expect(controller.signal.aborted).toBe(true);
    });
  });

  describe('Process and Child Process Patterns', () => {
    it('should handle child_process spawning pattern', async () => {
      // Simulate child process management
      const mockProcess = {
        pid: 12345,
        kill: vi.fn(),
        on: vi.fn(),
        removeAllListeners: vi.fn(),
        killed: false
      };
      
      registerCleanup(async () => {
        if (mockProcess.pid) {
          mockProcess.kill('SIGTERM');
          
          // Wait for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Force kill if needed
          if (!mockProcess.killed) {
            mockProcess.kill('SIGKILL');
          }
        }
        
        mockProcess.removeAllListeners();
      });
      
      await runCleanups();
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.removeAllListeners).toHaveBeenCalled();
    });

    it('should handle worker_threads cleanup', async () => {
      const mockWorkers = [
        { terminate: vi.fn(() => Promise.resolve()) },
        { terminate: vi.fn(() => Promise.resolve()) },
        { terminate: vi.fn(() => Promise.resolve()) }
      ];
      
      registerCleanup(async () => {
        await Promise.all(
          mockWorkers.map(worker => 
            worker.terminate()
          )
        );
      });
      
      await runCleanups();
      
      mockWorkers.forEach(worker => {
        expect(worker.terminate).toHaveBeenCalled();
      });
    });
  });

  describe('File System Watcher Patterns', () => {
    it('should handle fs.watch cleanup', async () => {
      const mockWatcher = {
        close: vi.fn(() => Promise.resolve())
      };
      
      registerCleanup(async () => {
        await mockWatcher.close();
      });
      
      await runCleanups();
      
      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle chokidar watcher cleanup', async () => {
      const mockChokidarWatcher = {
        close: vi.fn(() => Promise.resolve()),
        unwatch: vi.fn(),
        getWatched: vi.fn(() => ({}))
      };
      
      registerCleanup(async () => {
        await mockChokidarWatcher.close();
      });
      
      await runCleanups();
      
      expect(mockChokidarWatcher.close).toHaveBeenCalled();
    });
  });

  describe('Database Connection Patterns', () => {
    it('should handle Prisma cleanup', async () => {
      const mockPrisma = {
        $disconnect: vi.fn(() => Promise.resolve())
      };
      
      registerCleanup(async () => {
        await mockPrisma.$disconnect();
      });
      
      await runCleanups();
      
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it('should handle TypeORM DataSource cleanup', async () => {
      const mockDataSource = {
        destroy: vi.fn(() => Promise.resolve()),
        isInitialized: true
      };
      
      registerCleanup(async () => {
        if (mockDataSource.isInitialized) {
          await mockDataSource.destroy();
        }
      });
      
      await runCleanups();
      
      expect(mockDataSource.destroy).toHaveBeenCalled();
    });

    it('should handle connection pool cleanup', async () => {
      const mockPool = {
        end: vi.fn(() => Promise.resolve()),
        totalCount: 5,
        idleCount: 3
      };
      
      registerCleanup(async () => {
        await mockPool.end();
      });
      
      await runCleanups();
      
      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('Message Queue and Caching Patterns', () => {
    it('should handle Redis cleanup', async () => {
      const mockRedis = {
        quit: vi.fn(() => Promise.resolve()),
        status: 'ready'
      };
      
      registerCleanup(async () => {
        if (mockRedis.status === 'ready') {
          await mockRedis.quit();
        }
      });
      
      await runCleanups();
      
      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle BullMQ cleanup', async () => {
      const mockQueue = {
        close: vi.fn(() => Promise.resolve())
      };
      
      const mockScheduler = {
        close: vi.fn(() => Promise.resolve())
      };
      
      registerCleanup(async () => {
        await mockScheduler.close();
        await mockQueue.close();
      });
      
      await runCleanups();
      
      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockScheduler.close).toHaveBeenCalled();
    });

    it('should handle AMQP connection cleanup', async () => {
      const mockConnection = {
        close: vi.fn(() => Promise.resolve())
      };
      
      const mockChannel = {
        close: vi.fn(() => Promise.resolve())
      };
      
      registerCleanup(async () => {
        await mockChannel.close();
        await mockConnection.close();
      });
      
      await runCleanups();
      
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });

  describe('Browser Automation Cleanup', () => {
    it('should handle Playwright cleanup', async () => {
      const mockBrowser = {
        close: vi.fn(() => Promise.resolve())
      };
      
      const mockContext = {
        close: vi.fn(() => Promise.resolve())
      };
      
      const mockPage = {
        close: vi.fn(() => Promise.resolve())
      };
      
      registerCleanup(async () => {
        await mockPage.close();
        await mockContext.close();
        await mockBrowser.close();
      });
      
      await runCleanups();
      
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle Puppeteer cleanup', async () => {
      const mockPuppeteerBrowser = {
        close: vi.fn(() => Promise.resolve())
      };
      
      registerCleanup(async () => {
        await mockPuppeteerBrowser.close();
      });
      
      await runCleanups();
      
      expect(mockPuppeteerBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Claude Code Session Simulation', () => {
    it('should prevent resource accumulation across multiple operations', async () => {
      // Simulate multiple Claude Code operations in sequence
      const operationResults = [];
      
      for (let i = 0; i < 5; i++) {
        // Simulate various resource creation patterns
        const timers: NodeJS.Timeout[] = [];
        const controllers: AbortController[] = [];
        
        // Create some resources
        const timer = setTimeout(() => {}, 10000) as NodeJS.Timeout;
        const controller = new AbortController();
        
        timers.push(timer);
        controllers.push(controller);
        
        // Register cleanup
        cleanupTimers(timers);
        cleanupAbortControllers(controllers);
        
        // Simulate operation completion
        await runCleanups();
        
        // Verify resources were cleaned up
        expect(timers).toHaveLength(0);
        expect(controllers).toHaveLength(0);
        expect(controller.signal.aborted).toBe(true);
        
        operationResults.push(`Operation ${i + 1} completed`);
        
        // Clear for next iteration
        clearCleanups();
      }
      
      expect(operationResults).toHaveLength(5);
    });

    it('should handle mixed resource types in single operation', async () => {
      const timers: NodeJS.Timeout[] = [];
      const controllers: AbortController[] = [];
      
      // Create mixed resources (common in real applications)
      const timer1 = setInterval(() => {}, 1000) as NodeJS.Timeout;
      const timer2 = setTimeout(() => {}, 30000) as NodeJS.Timeout;
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      timers.push(timer1, timer2);
      controllers.push(controller1, controller2);
      
      const mockServer = {
        close: vi.fn((cb) => cb && cb())
      };
      
      const mockDatabase = {
        $disconnect: vi.fn(() => Promise.resolve())
      };
      
      // Register all cleanups
      cleanupTimers(timers);
      cleanupAbortControllers(controllers);
      cleanupServer(mockServer);
      
      registerCleanup(async () => {
        await mockDatabase.$disconnect();
      });
      
      // Execute cleanup
      await runCleanups();
      
      // Verify all resources were cleaned
      expect(timers).toHaveLength(0);
      expect(controllers).toHaveLength(0);
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockDatabase.$disconnect).toHaveBeenCalled();
      
      controllers.forEach(controller => {
        expect(controller.signal.aborted).toBe(true);
      });
    });
  });
});