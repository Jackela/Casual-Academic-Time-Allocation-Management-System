/**
 * Unit tests for ProcessOrchestrator
 *
 * Tests enterprise patterns implementation:
 * - Dependency injection
 * - Session management
 * - Emergency recovery
 * - Audit logging
 * - Process tracking
 *
 * @author CATAMS Team
 */

const ProcessOrchestrator = require('../../src/core/ProcessOrchestrator')
const ProcessRegistry = require('../../src/managers/ProcessRegistry')
const LifecycleManager = require('../../src/managers/LifecycleManager')
const ConfigManager = require('../../src/managers/ConfigManager')
const AuditLogger = require('../../src/core/AuditLogger')
const EmergencyRecovery = require('../../src/core/EmergencyRecovery')

// Mock dependencies
jest.mock('../../src/managers/ProcessRegistry')
jest.mock('../../src/managers/LifecycleManager')
jest.mock('../../src/managers/ConfigManager')
jest.mock('../../src/core/AuditLogger')
jest.mock('../../src/core/EmergencyRecovery')

describe('ProcessOrchestrator', () => {
  let orchestrator
  let mockRegistry
  let mockLifecycleManager
  let mockConfigManager
  let mockAuditLogger
  let mockEmergencyRecovery

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create mock instances
    mockRegistry = new ProcessRegistry()
    mockLifecycleManager = new LifecycleManager()
    mockConfigManager = new ConfigManager()
    mockAuditLogger = new AuditLogger()
    mockEmergencyRecovery = new EmergencyRecovery()

    // Setup mock methods
    mockConfigManager.loadConfig.mockReturnValue({
      orchestrator: {
        sessionTimeout: 30000,
        emergencyRecoveryTimeout: 5000,
        memoryThreshold: 1024 * 1024 * 1024,
        maxNewProcesses: 10
      }
    })

    mockRegistry.getRunningProcesses.mockResolvedValue([])
    mockRegistry.getOpenPorts.mockResolvedValue([])
    mockRegistry.getAllTrackedProcesses.mockResolvedValue([])
    mockRegistry.getProcessCount.mockResolvedValue(0)
    mockRegistry.findOrphanedProcesses.mockResolvedValue([])
    mockRegistry.cleanup.mockResolvedValue()
    mockLifecycleManager.cleanup.mockResolvedValue()
    mockAuditLogger.info.mockImplementation(() => {})
    mockAuditLogger.error.mockImplementation(() => {})
    mockAuditLogger.warn.mockImplementation(() => {})

    // Create orchestrator with mocked dependencies
    orchestrator = new ProcessOrchestrator({
      registry: mockRegistry,
      lifecycleManager: mockLifecycleManager,
      configManager: mockConfigManager,
      auditLogger: mockAuditLogger,
      emergencyRecovery: mockEmergencyRecovery
    })
  })

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.emergencyShutdown()
    }
  })

  describe('Initialization', () => {
    test('should initialize with dependency injection', () => {
      expect(orchestrator.registry).toBe(mockRegistry)
      expect(orchestrator.lifecycleManager).toBe(mockLifecycleManager)
      expect(orchestrator.configManager).toBe(mockConfigManager)
      expect(orchestrator.auditLogger).toBe(mockAuditLogger)
      expect(orchestrator.emergencyRecovery).toBe(mockEmergencyRecovery)
    })

    test('should generate unique session ID', () => {
      expect(orchestrator.sessionId).toBeDefined()
      expect(typeof orchestrator.sessionId).toBe('string')
      expect(orchestrator.sessionId).toMatch(/^session_\d+_[a-z0-9]{9}$/)
    })

    test('should capture system baseline during initialization', async () => {
      // Since initialization is skipped in test mode, manually call it
      await orchestrator._initialize()
      
      expect(mockRegistry.getRunningProcesses).toHaveBeenCalled()
      expect(mockRegistry.getOpenPorts).toHaveBeenCalled()
      expect(orchestrator.baseline).toBeDefined()
      expect(orchestrator.baseline.size).toBeGreaterThan(0)
    })

    test('should initialize with default metrics', () => {
      const metrics = orchestrator.getMetrics()
      expect(metrics.processCount).toBe(0)
      expect(metrics.successfulOperations).toBe(0)
      expect(metrics.failedOperations).toBe(0)
      expect(metrics.emergencyRecoveries).toBe(0)
    })
  })

  describe('Operation Execution', () => {
    test('should execute valid operation successfully', async () => {
      const mockOperation = {
        type: 'test_operation',
        name: 'Test Operation',
        execute: jest.fn().mockResolvedValue({ success: true })
      }

      mockLifecycleManager.executeOperation.mockResolvedValue({
        success: true,
        summary: 'Operation completed'
      })

      const result = await orchestrator.executeOperation(mockOperation)

      expect(result.success).toBe(true)
      expect(mockLifecycleManager.executeOperation).toHaveBeenCalledWith(
        mockOperation,
        expect.objectContaining({
          sessionId: orchestrator.sessionId
        })
      )
      expect(orchestrator.metrics.successfulOperations).toBe(1)
    })

    test('should validate operation before execution', async () => {
      const invalidOperation = {
        // Missing required fields
      }

      await expect(orchestrator.executeOperation(invalidOperation))
        .rejects.toThrow('Operation must have a type')
    })

    test('should handle operation execution failure', async () => {
      const mockOperation = {
        type: 'failing_operation',
        execute: jest.fn()
      }

      const mockError = new Error('Operation failed')
      mockLifecycleManager.executeOperation.mockRejectedValue(mockError)

      await expect(orchestrator.executeOperation(mockOperation))
        .rejects.toThrow('Operation failed')

      expect(orchestrator.metrics.failedOperations).toBe(1)
      expect(mockAuditLogger.error).toHaveBeenCalledWith(
        'Operation execution failed',
        expect.objectContaining({
          error: 'Operation failed'
        })
      )
    })

    test('should attempt recovery on operation failure with autoRecovery enabled', async () => {
      const mockOperation = {
        type: 'failing_operation',
        execute: jest.fn()
      }

      const mockError = new Error('Operation failed')
      mockLifecycleManager.executeOperation.mockRejectedValue(mockError)
      mockEmergencyRecovery.attemptRecovery.mockResolvedValue({
        success: true,
        recoveryTime: 1000
      })

      await expect(orchestrator.executeOperation(mockOperation, { autoRecovery: true }))
        .rejects.toThrow('Operation failed')

      expect(mockEmergencyRecovery.attemptRecovery).toHaveBeenCalled()
    })
  })

  describe('Process Leak Detection', () => {
    test('should detect process leaks during health check', async () => {
      const baselineProcesses = [
        { pid: 1234, name: 'existing-process' }
      ]
      const currentProcesses = [
        { pid: 1234, name: 'existing-process' },
        { pid: 5678, name: 'java', cpu: 50, memory: 1000000 },
        { pid: 9012, name: 'gradle', cpu: 30, memory: 500000 }
      ]

      orchestrator.baseline.set('processes', baselineProcesses)
      mockRegistry.getRunningProcesses.mockResolvedValue(currentProcesses)

      // Trigger health check manually
      await orchestrator._performHealthCheck()

      expect(mockAuditLogger.warn).toHaveBeenCalledWith(
        'Suspicious processes detected in health check',
        expect.objectContaining({
          suspiciousProcesses: expect.arrayContaining([
            expect.objectContaining({ name: 'java' }),
            expect.objectContaining({ name: 'gradle' })
          ])
        })
      )
    })

    test('should detect orphaned processes after operation', async () => {
      const orphanedProcesses = [
        { pid: 1111, name: 'orphaned-java' },
        { pid: 2222, name: 'orphaned-gradle' }
      ]

      mockRegistry.findOrphanedProcesses.mockResolvedValue(orphanedProcesses)
      mockLifecycleManager.terminateProcess.mockResolvedValue({ success: true })

      await orchestrator._postExecutionValidation('test-operation-id')

      expect(mockRegistry.findOrphanedProcesses).toHaveBeenCalledWith(orchestrator.sessionId)
      expect(mockAuditLogger.warn).toHaveBeenCalledWith(
        'Orphaned processes detected after operation',
        expect.objectContaining({
          orphanedProcesses: expect.arrayContaining([
            expect.objectContaining({ pid: 1111 }),
            expect.objectContaining({ pid: 2222 })
          ])
        })
      )
    })
  })

  describe('Emergency Shutdown', () => {
    test('should perform emergency shutdown within 5 seconds', async () => {
      const startTime = Date.now()

      mockRegistry.getAllTrackedProcesses.mockResolvedValue([
        { pid: 1234, name: 'test-process' }
      ])
      mockLifecycleManager.terminateProcess.mockResolvedValue({ success: true })
      mockRegistry.cleanup.mockResolvedValue()
      mockLifecycleManager.cleanup.mockResolvedValue()

      await orchestrator.emergencyShutdown()

      const shutdownTime = Date.now() - startTime
      expect(shutdownTime).toBeLessThan(5000)
      expect(mockRegistry.getAllTrackedProcesses).toHaveBeenCalledWith(orchestrator.sessionId)
      expect(mockLifecycleManager.terminateProcess).toHaveBeenCalledWith(1234)
    })

    test('should cleanup all resources during emergency shutdown', async () => {
      mockRegistry.getAllTrackedProcesses.mockResolvedValue([])
      mockRegistry.cleanup.mockResolvedValue()
      mockLifecycleManager.cleanup.mockResolvedValue()

      await orchestrator.emergencyShutdown()

      expect(orchestrator.isEmergencyMode).toBe(true)
      expect(mockRegistry.cleanup).toHaveBeenCalled()
      expect(mockLifecycleManager.cleanup).toHaveBeenCalled()
    })

    test('should handle cleanup failures gracefully', async () => {
      const testProcess = { pid: 1234, name: 'stubborn-process' }

      mockRegistry.getAllTrackedProcesses.mockResolvedValue([testProcess])
      mockLifecycleManager.terminateProcess.mockRejectedValue(new Error('Process termination failed'))
      mockRegistry.cleanup.mockResolvedValue()
      mockLifecycleManager.cleanup.mockResolvedValue()

      await expect(orchestrator.emergencyShutdown()).resolves.not.toThrow()

      expect(mockAuditLogger.warn).toHaveBeenCalledWith(
        'Failed to terminate process during cleanup',
        expect.objectContaining({
          pid: 1234,
          error: 'Process termination failed'
        })
      )
    })
  })

  describe('Memory Management', () => {
    test('should validate memory usage during pre-execution', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 2 * 1024 * 1024 * 1024 // 2GB
      })

      await expect(orchestrator._preExecutionValidation())
        .rejects.toThrow('Memory usage exceeds threshold')

      // Restore original function
      process.memoryUsage = originalMemoryUsage
    })

    test('should pass memory validation when under threshold', async () => {
      const originalMemoryUsage = process.memoryUsage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 500 * 1024 * 1024 // 500MB
      })

      mockRegistry.getRunningProcesses.mockResolvedValue([])

      await expect(orchestrator._preExecutionValidation()).resolves.not.toThrow()

      process.memoryUsage = originalMemoryUsage
    })
  })

  describe('Session Management', () => {
    test('should provide session information', () => {
      const sessionInfo = orchestrator.getSessionInfo()

      expect(sessionInfo).toEqual({
        sessionId: orchestrator.sessionId,
        baseline: expect.any(Object),
        metrics: expect.any(Object),
        config: expect.any(Object)
      })
    })

    test('should track session metrics correctly', () => {
      const metrics = orchestrator.getMetrics()

      expect(metrics).toEqual({
        processCount: 0,
        successfulOperations: 0,
        failedOperations: 0,
        emergencyRecoveries: 0,
        averageRecoveryTime: 0,
        sessionId: orchestrator.sessionId,
        uptime: expect.any(Number),
        isEmergencyMode: false
      })
    })
  })

  describe('Configuration Management', () => {
    test('should load configuration during initialization', () => {
      expect(mockConfigManager.loadConfig).toHaveBeenCalled()
      expect(orchestrator.config).toBeDefined()
    })

    test('should use configuration values for thresholds', () => {
      expect(orchestrator.config.orchestrator.emergencyRecoveryTimeout).toBe(5000)
      expect(orchestrator.config.orchestrator.memoryThreshold).toBe(1024 * 1024 * 1024)
    })
  })

  describe('Event Handling', () => {
    test('should emit events on operation completion', async () => {
      const mockOperation = {
        type: 'test_operation',
        execute: jest.fn()
      }

      mockLifecycleManager.executeOperation.mockResolvedValue({
        success: true,
        summary: 'Operation completed'
      })

      const eventPromise = new Promise((resolve) => {
        orchestrator.once('operationCompleted', resolve)
      })

      await orchestrator.executeOperation(mockOperation)
      const event = await eventPromise

      expect(event).toEqual({
        operationId: expect.any(String),
        result: expect.objectContaining({ success: true }),
        duration: expect.any(Number)
      })
    })

    test('should emit events on operation failure', async () => {
      const mockOperation = {
        type: 'failing_operation',
        execute: jest.fn()
      }

      const mockError = new Error('Operation failed')
      mockLifecycleManager.executeOperation.mockRejectedValue(mockError)

      const eventPromise = new Promise((resolve) => {
        orchestrator.once('operationFailed', resolve)
      })

      try {
        await orchestrator.executeOperation(mockOperation, { autoRecovery: false })
      } catch (error) {
        // Expected to fail
      }

      const event = await eventPromise

      expect(event).toEqual({
        operationId: expect.any(String),
        error: mockError,
        duration: expect.any(Number)
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle initialization errors', () => {
      mockConfigManager.loadConfig.mockImplementation(() => {
        throw new Error('Configuration load failed')
      })

      expect(() => {
        new ProcessOrchestrator({
          configManager: mockConfigManager
        })
      }).toThrow('Configuration load failed')
    })

    test('should handle baseline capture failures', async () => {
      mockRegistry.getRunningProcesses.mockRejectedValue(new Error('Process enumeration failed'))

      const testOrchestrator = new ProcessOrchestrator({
        registry: mockRegistry,
        configManager: mockConfigManager,
        auditLogger: mockAuditLogger
      })

      await expect(testOrchestrator._initialize()).rejects.toThrow('Process enumeration failed')
    })
  })

  describe('Resource Cleanup', () => {
    test('should remove all event listeners during cleanup', async () => {
      const listenerCount = orchestrator.listenerCount('operationCompleted')
      orchestrator.on('operationCompleted', () => {})

      expect(orchestrator.listenerCount('operationCompleted')).toBe(listenerCount + 1)

      await orchestrator._releaseResources()

      expect(orchestrator.listenerCount('operationCompleted')).toBe(0)
    })

    test('should call cleanup on all managed components', async () => {
      mockRegistry.cleanup = jest.fn().mockResolvedValue()
      mockLifecycleManager.cleanup = jest.fn().mockResolvedValue()

      await orchestrator._releaseResources()

      expect(mockRegistry.cleanup).toHaveBeenCalled()
      expect(mockLifecycleManager.cleanup).toHaveBeenCalled()
    })
  })
})
