/**
 * Integration tests for ProcessOrchestrator
 *
 * Tests complete integration with all components:
 * - End-to-end operation execution
 * - Real process management scenarios
 * - Cross-platform compatibility
 * - Emergency recovery scenarios
 *
 * @author CATAMS Team
 */

const ProcessOrchestrator = require('../../src/core/ProcessOrchestrator')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

describe('ProcessOrchestrator Integration Tests', () => {
  let orchestrator
  let testLogDir

  beforeAll(() => {
    // Create temporary log directory for testing
    testLogDir = path.join(__dirname, 'temp-logs')
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true })
    }
  })

  beforeEach(() => {
    // Create orchestrator with test configuration
    const testConfig = {
      orchestrator: {
        sessionTimeout: 10000,
        emergencyRecoveryTimeout: 3000,
        memoryThreshold: 512 * 1024 * 1024, // 512MB for testing
        maxNewProcesses: 5
      },
      lifecycle: {
        defaultTimeout: 5000,
        gracefulTimeout: 2000,
        forceKillDelay: 1000
      },
      registry: {
        cleanupInterval: 1000,
        processCheckInterval: 500
      }
    }

    orchestrator = new ProcessOrchestrator({}, testConfig)
  })

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.emergencyShutdown()
    }
  })

  afterAll(() => {
    // Cleanup test log directory
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true })
    }
  })

  describe('Real Process Management', () => {
    test('should start and stop a real Node.js process', async () => {
      // Create a simple test script
      const testScript = path.join(testLogDir, 'test-process.js')
      const scriptContent = `
        console.log('Test process started');
        setTimeout(() => {
          console.log('Test process running');
        }, 1000);
        setTimeout(() => {
          console.log('Test process ending');
          process.exit(0);
        }, 3000);
      `
      fs.writeFileSync(testScript, scriptContent)

      // Define operation to start the process
      const startOperation = {
        type: 'start_node_process',
        execute: async () => {
          return await orchestrator.lifecycleManager.startProcess({
            command: 'node',
            args: [testScript],
            cwd: testLogDir
          })
        }
      }

      // Execute the operation
      const result = await orchestrator.executeOperation(startOperation)

      expect(result.success).toBe(true)
      expect(result.pid).toBeDefined()
      expect(typeof result.pid).toBe('number')

      // Wait for process to complete naturally
      await new Promise(resolve => setTimeout(resolve, 4000))

      // Verify metrics
      const metrics = orchestrator.getMetrics()
      expect(metrics.successfulOperations).toBe(1)
      expect(metrics.failedOperations).toBe(0)

      // Cleanup
      fs.unlinkSync(testScript)
    }, 10000)

    test('should handle process failure and recovery', async () => {
      // Define operation that will fail
      const failingOperation = {
        type: 'failing_process',
        execute: async () => {
          throw new Error('Simulated process failure')
        }
      }

      // Execute the failing operation with recovery enabled
      await expect(orchestrator.executeOperation(failingOperation, { autoRecovery: true }))
        .rejects.toThrow('Simulated process failure')

      // Verify recovery was attempted
      const metrics = orchestrator.getMetrics()
      expect(metrics.failedOperations).toBe(1)

      // Check that emergency recovery was invoked
      const emergencyMetrics = orchestrator.emergencyRecovery.getMetrics()
      expect(emergencyMetrics.totalRecoveries).toBeGreaterThan(0)
    })

    test('should detect and cleanup orphaned processes', async () => {
      // Start a long-running process
      const longRunningScript = path.join(testLogDir, 'long-running.js')
      const scriptContent = `
        setInterval(() => {
          console.log('Still running...');
        }, 100);
      `
      fs.writeFileSync(longRunningScript, scriptContent)

      const startOperation = {
        type: 'start_long_running',
        execute: async () => {
          const result = await orchestrator.lifecycleManager.startProcess({
            command: 'node',
            args: [longRunningScript],
            cwd: testLogDir
          })

          // Register the process with short max runtime for testing
          orchestrator.registry.registerProcess(orchestrator.sessionId, {
            pid: result.pid,
            name: 'long-running-test',
            metadata: { maxRunTime: 1000 } // 1 second
          })

          return result
        }
      }

      const result = await orchestrator.executeOperation(startOperation)
      expect(result.success).toBe(true)

      // Wait for process to become "orphaned" (exceed max runtime)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check for orphaned processes
      const orphaned = await orchestrator.registry.findOrphanedProcesses(orchestrator.sessionId)
      expect(orphaned.length).toBeGreaterThan(0)

      // Verify cleanup happens
      await orchestrator._postExecutionValidation('test-op')

      // Cleanup
      fs.unlinkSync(longRunningScript)
    }, 8000)
  })

  describe('Cross-Platform Compatibility', () => {
    test('should work on current platform', async () => {
      const platform = process.platform

      // Get running processes
      const processes = await orchestrator.registry.getRunningProcesses()
      expect(Array.isArray(processes)).toBe(true)
      expect(processes.length).toBeGreaterThan(0)

      // Each process should have required fields
      processes.forEach(proc => {
        expect(proc).toHaveProperty('pid')
        expect(proc).toHaveProperty('name')
        expect(typeof proc.pid).toBe('number')
        expect(typeof proc.name).toBe('string')
      })
    })

    test('should get open ports on current platform', async () => {
      const ports = await orchestrator.registry.getOpenPorts()
      expect(Array.isArray(ports)).toBe(true)

      // Each port should have required fields
      ports.forEach(port => {
        expect(port).toHaveProperty('port')
        expect(port).toHaveProperty('pid')
        expect(typeof port.port).toBe('number')
        expect(typeof port.pid).toBe('number')
      })
    })
  })

  describe('Emergency Recovery Scenarios', () => {
    test('should perform emergency shutdown within time limit', async () => {
      const startTime = Date.now()

      // Create some mock active processes
      const mockProcesses = [
        { pid: 12345, name: 'mock-process-1' },
        { pid: 67890, name: 'mock-process-2' }
      ]

      // Mock the registry to return these processes
      orchestrator.registry.getAllTrackedProcesses = jest.fn()
        .mockResolvedValue(mockProcesses)
      orchestrator.lifecycleManager.terminateProcess = jest.fn()
        .mockResolvedValue({ success: true })

      await orchestrator.emergencyShutdown()

      const shutdownTime = Date.now() - startTime

      // Should complete within emergency recovery timeout
      expect(shutdownTime).toBeLessThan(orchestrator.config.orchestrator.emergencyRecoveryTimeout)
      expect(orchestrator.isEmergencyMode).toBe(true)
    })

    test('should recover from memory pressure scenario', async () => {
      // Simulate high memory usage
      const originalMemoryUsage = process.memoryUsage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024 // 600MB (above our 512MB test threshold)
      })

      const testOperation = {
        type: 'memory_intensive',
        execute: async () => {
          return { success: true }
        }
      }

      // Should fail due to memory threshold
      await expect(orchestrator.executeOperation(testOperation))
        .rejects.toThrow('Memory usage exceeds threshold')

      // Restore original function
      process.memoryUsage = originalMemoryUsage
    })
  })

  describe('Audit Trail Verification', () => {
    test('should maintain complete audit trail', async () => {
      const testOperation = {
        type: 'audit_test',
        execute: async () => {
          return { success: true, data: 'test-data' }
        }
      }

      await orchestrator.executeOperation(testOperation)

      // Get audit trail
      const auditTrail = orchestrator.auditLogger.getAuditTrail({
        sessionId: orchestrator.sessionId
      })

      expect(auditTrail.length).toBeGreaterThan(0)

      // Should have operation start and completion entries
      const operationEntries = auditTrail.filter(entry =>
        entry.message.includes('Operation') &&
        entry.metadata.sessionId === orchestrator.sessionId
      )

      expect(operationEntries.length).toBeGreaterThanOrEqual(2) // Start and completion
    })

    test('should export audit trail successfully', async () => {
      const exportPath = path.join(testLogDir, 'audit-export.json')

      // Perform some operations to generate audit data
      const testOperation = {
        type: 'export_test',
        execute: async () => ({ success: true })
      }

      await orchestrator.executeOperation(testOperation)

      // Export audit trail
      orchestrator.auditLogger.exportAuditTrail(exportPath, {
        sessionId: orchestrator.sessionId
      })

      // Verify export file exists and is valid JSON
      expect(fs.existsSync(exportPath)).toBe(true)

      const exportedData = JSON.parse(fs.readFileSync(exportPath, 'utf8'))
      expect(exportedData).toHaveProperty('exportedAt')
      expect(exportedData).toHaveProperty('entries')
      expect(Array.isArray(exportedData.entries)).toBe(true)

      // Cleanup
      fs.unlinkSync(exportPath)
    })
  })

  describe('Configuration Integration', () => {
    test('should load and validate configuration from file', () => {
      const configPath = path.join(testLogDir, 'test-config.json')
      const testConfig = {
        orchestrator: {
          sessionTimeout: 15000,
          emergencyRecoveryTimeout: 2000,
          auditLogLevel: 'debug'
        },
        lifecycle: {
          defaultTimeout: 8000,
          gracefulTimeout: 3000
        },
        registry: {
          cleanupInterval: 2000
        }
      }

      fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2))

      const configManager = orchestrator.configManager
      const loadedConfig = configManager.loadConfig(configPath)

      expect(loadedConfig.orchestrator.sessionTimeout).toBe(15000)
      expect(loadedConfig.orchestrator.emergencyRecoveryTimeout).toBe(2000)

      // Cleanup
      fs.unlinkSync(configPath)
    })

    test('should validate configuration updates at runtime', () => {
      const configManager = orchestrator.configManager

      // Valid update should succeed
      expect(() => {
        configManager.updateConfig('orchestrator.sessionTimeout', 20000)
      }).not.toThrow()

      // Invalid update should fail
      expect(() => {
        configManager.updateConfig('orchestrator.sessionTimeout', 'invalid')
      }).toThrow('Configuration validation failed')
    })
  })

  describe('Performance and Metrics', () => {
    test('should track performance metrics accurately', async () => {
      const operations = []

      // Create multiple test operations
      for (let i = 0; i < 3; i++) {
        operations.push({
          type: `performance_test_${i}`,
          execute: async () => {
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, 100))
            return { success: true, iteration: i }
          }
        })
      }

      // Execute all operations
      for (const operation of operations) {
        await orchestrator.executeOperation(operation)
      }

      const metrics = orchestrator.getMetrics()
      expect(metrics.successfulOperations).toBe(3)
      expect(metrics.failedOperations).toBe(0)
      expect(metrics.averageRecoveryTime).toBe(0) // No recoveries needed

      // Session info should be complete
      const sessionInfo = orchestrator.getSessionInfo()
      expect(sessionInfo.sessionId).toBe(orchestrator.sessionId)
      expect(sessionInfo.baseline).toBeDefined()
      expect(sessionInfo.metrics).toBeDefined()
    })

    test('should handle concurrent operations safely', async () => {
      const concurrentOperations = []

      // Create multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        const operation = {
          type: `concurrent_test_${i}`,
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200))
            return { success: true, id: i }
          }
        }

        concurrentOperations.push(orchestrator.executeOperation(operation))
      }

      // Wait for all to complete
      const results = await Promise.allSettled(concurrentOperations)

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe('fulfilled')
        expect(result.value.success).toBe(true)
      })

      const metrics = orchestrator.getMetrics()
      expect(metrics.successfulOperations).toBe(5)
    }, 10000)
  })

  describe('Resource Management', () => {
    test('should cleanup resources properly', async () => {
      // Create orchestrator
      const sessionId = orchestrator.sessionId

      // Perform some operations
      const testOperation = {
        type: 'cleanup_test',
        execute: async () => ({ success: true })
      }

      await orchestrator.executeOperation(testOperation)

      // Get initial resource usage
      const initialStats = orchestrator.registry.getStatistics()
      expect(initialStats.totalTrackedProcesses).toBeGreaterThanOrEqual(0)

      // Perform emergency shutdown
      await orchestrator.emergencyShutdown()

      // Verify cleanup
      expect(orchestrator.isEmergencyMode).toBe(true)

      // Registry should be cleaned up
      const finalStats = orchestrator.registry.getStatistics()
      expect(finalStats.totalTrackedProcesses).toBe(0)
    })
  })

  describe('Error Recovery Integration', () => {
    test('should integrate emergency recovery with lifecycle manager', async () => {
      // Create a failing operation that will trigger recovery
      const failingOperation = {
        type: 'emergency_recovery_test',
        execute: async () => {
          // Simulate a process that needs emergency cleanup
          throw new Error('Critical system failure requiring emergency recovery')
        }
      }

      // Mock some processes that need cleanup
      orchestrator.registry.getRunningProcesses = jest.fn().mockResolvedValue([
        { pid: 11111, name: 'problematic-process-1' },
        { pid: 22222, name: 'problematic-process-2' }
      ])

      await expect(orchestrator.executeOperation(failingOperation, { autoRecovery: true }))
        .rejects.toThrow('Critical system failure')

      // Verify emergency recovery was triggered
      const emergencyMetrics = orchestrator.emergencyRecovery.getMetrics()
      expect(emergencyMetrics.totalRecoveries).toBeGreaterThan(0)
    })
  })
})
