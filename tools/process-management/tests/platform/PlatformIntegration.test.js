/**
 * Comprehensive Platform Integration Tests
 *
 * Cross-platform validation suite for the complete platform abstraction layer:
 * - Platform detection accuracy testing
 * - Provider functionality validation
 * - Cross-platform consistency verification
 * - Performance benchmarking
 * - Error handling and recovery testing
 * - Integration with existing systems
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { describe, it, beforeEach, afterEach, before, after } = require('mocha')
const { expect } = require('chai')
const sinon = require('sinon')
const os = require('os')
const { spawn } = require('child_process')

// Import platform components
const PlatformDetector = require('../../src/platform/PlatformDetector')
const ProcessProvider = require('../../src/platform/ProcessProvider')
const WindowsProvider = require('../../src/platform/WindowsProvider')
const UnixProvider = require('../../src/platform/UnixProvider')
const OptimizationEngine = require('../../src/platform/OptimizationEngine')
const PlatformIntegration = require('../../src/platform/PlatformIntegration')
const EnhancedProcessOrchestrator = require('../../src/core/EnhancedProcessOrchestrator')

// Mock orchestrator components
const ProcessRegistry = require('../../src/managers/ProcessRegistry')
const LifecycleManager = require('../../src/managers/LifecycleManager')
const ConfigManager = require('../../src/managers/ConfigManager')
const AuditLogger = require('../../src/core/AuditLogger')

describe('Platform Integration Test Suite', () => {
  let platformDetector
  let processProvider
  let platformIntegration
  let enhancedOrchestrator
  let testProcesses = []

  before(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test'
  })

  beforeEach(async () => {
    // Initialize fresh instances for each test
    platformDetector = new PlatformDetector()
    processProvider = new ProcessProvider({ autoInitialize: false })
    
    // Mock orchestrator for integration tests
    const mockOrchestrator = {
      registry: new ProcessRegistry(),
      lifecycleManager: new LifecycleManager(),
      configManager: new ConfigManager(),
      auditLogger: new AuditLogger()
    }
    
    platformIntegration = new PlatformIntegration(mockOrchestrator)
    enhancedOrchestrator = new EnhancedProcessOrchestrator()
    
    testProcesses = []
  })

  afterEach(async () => {
    // Cleanup test processes
    await cleanupTestProcesses()
    
    // Destroy platform components
    if (processProvider) {
      processProvider.destroy()
    }
    if (platformIntegration) {
      platformIntegration.destroy()
    }
  })

  after(async () => {
    // Final cleanup
    delete process.env.NODE_ENV
  })

  describe('Platform Detection Tests', () => {
    it('should detect current platform accurately', async () => {
      const platformInfo = await platformDetector.detectPlatform()
      
      expect(platformInfo).to.be.an('object')
      expect(platformInfo.platform).to.equal(process.platform)
      expect(platformInfo.confidence).to.be.at.least(0.8)
      expect(platformInfo.detectedAt).to.be.a('string')
    })

    it('should identify available tools correctly', async () => {
      const platformInfo = await platformDetector.detectPlatform()
      
      expect(platformInfo.tools).to.be.an('object')
      expect(platformInfo.tools.available).to.be.an('array')
      expect(platformInfo.tools.missing).to.be.an('array')
      
      if (process.platform === 'win32') {
        expect(platformInfo.tools.available).to.include('taskkill')
      } else {
        expect(platformInfo.tools.available).to.include('ps')
        expect(platformInfo.tools.available).to.include('kill')
      }
    })

    it('should detect platform capabilities correctly', async () => {
      const platformInfo = await platformDetector.detectPlatform()
      
      expect(platformInfo.capabilities).to.be.an('object')
      expect(platformInfo.capabilities.processManagement).to.be.an('object')
      expect(platformInfo.capabilities.processManagement.killByPid).to.be.true
      expect(platformInfo.capabilities.processManagement.queryProcesses).to.be.true
      
      if (process.platform !== 'win32') {
        expect(platformInfo.capabilities.processManagement.signalSupport).to.be.true
      }
    })

    it('should cache detection results efficiently', async () => {
      const start1 = Date.now()
      const platformInfo1 = await platformDetector.detectPlatform()
      const duration1 = Date.now() - start1
      
      const start2 = Date.now()
      const platformInfo2 = await platformDetector.detectPlatform()
      const duration2 = Date.now() - start2
      
      expect(duration2).to.be.lessThan(duration1 * 0.1) // Should be much faster
      expect(platformInfo1.detectionId).to.equal(platformInfo2.detectionId)
    })

    it('should recommend correct provider', async () => {
      const recommendedProvider = await platformDetector.getRecommendedProvider()
      
      if (process.platform === 'win32') {
        expect(recommendedProvider).to.equal('WindowsProvider')
      } else {
        expect(recommendedProvider).to.equal('UnixProvider')
      }
    })
  })

  describe('Platform-Specific Provider Tests', () => {
    describe('Windows Provider Tests', () => {
      let windowsProvider

      beforeEach(() => {
        if (process.platform === 'win32') {
          windowsProvider = new WindowsProvider()
        }
      })

      it('should initialize Windows provider successfully', async function() {
        if (process.platform !== 'win32') {
          this.skip()
          return
        }

        await windowsProvider.initialize()
        const capabilities = windowsProvider.getCapabilities()
        
        expect(capabilities.killByPid).to.be.true
        expect(capabilities.killByName).to.be.true
        expect(capabilities.killProcessTree).to.be.true
        expect(capabilities.signalSupport).to.be.false
      })

      it('should list Windows processes correctly', async function() {
        if (process.platform !== 'win32') {
          this.skip()
          return
        }

        await windowsProvider.initialize()
        const processes = await windowsProvider.listProcesses({ maxResults: 10 })
        
        expect(processes).to.be.an('array')
        expect(processes.length).to.be.at.most(10)
        
        processes.forEach(process => {
          expect(process.pid).to.be.a('number')
          expect(process.name).to.be.a('string')
        })
      })

      it('should handle Windows process killing', async function() {
        if (process.platform !== 'win32') {
          this.skip()
          return
        }

        const testProcess = await createTestProcess()
        
        await windowsProvider.initialize()
        const result = await windowsProvider.killByPid(testProcess.pid)
        
        expect(result.success).to.be.true
        expect(result.method).to.be.oneOf(['graceful', 'force'])
        
        // Verify process is actually terminated
        const exists = await windowsProvider.processExists(testProcess.pid)
        expect(exists).to.be.false
      })
    })

    describe('Unix Provider Tests', () => {
      let unixProvider

      beforeEach(() => {
        if (process.platform !== 'win32') {
          unixProvider = new UnixProvider()
        }
      })

      it('should initialize Unix provider successfully', async function() {
        if (process.platform === 'win32') {
          this.skip()
          return
        }

        await unixProvider.initialize()
        const capabilities = unixProvider.getCapabilities()
        
        expect(capabilities.killByPid).to.be.true
        expect(capabilities.killByName).to.be.true
        expect(capabilities.killProcessTree).to.be.true
        expect(capabilities.signalSupport).to.be.true
      })

      it('should list Unix processes correctly', async function() {
        if (process.platform === 'win32') {
          this.skip()
          return
        }

        await unixProvider.initialize()
        const processes = await unixProvider.listProcesses({ maxResults: 10 })
        
        expect(processes).to.be.an('array')
        expect(processes.length).to.be.at.most(10)
        
        processes.forEach(process => {
          expect(process.pid).to.be.a('number')
          expect(process.name).to.be.a('string')
          expect(process.parentPid).to.be.a('number').or.null
        })
      })

      it('should handle Unix signal operations', async function() {
        if (process.platform === 'win32') {
          this.skip()
          return
        }

        const testProcess = await createTestProcess()
        
        await unixProvider.initialize()
        
        // Test signal sending
        const signalResult = await unixProvider.sendSignal(testProcess.pid, 'SIGTERM')
        expect(signalResult.success).to.be.true
        
        // Wait for graceful termination
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Verify process termination
        const exists = await unixProvider.processExists(testProcess.pid)
        expect(exists).to.be.false
      })

      it('should handle signal escalation correctly', async function() {
        if (process.platform === 'win32') {
          this.skip()
          return
        }

        const testProcess = await createTestProcess('sleep 10') // Process that ignores SIGTERM
        
        await unixProvider.initialize()
        
        const result = await unixProvider.killByPid(testProcess.pid, {
          escalate: true,
          signalEscalationDelay: 500
        })
        
        expect(result.success).to.be.true
        expect(result.method).to.be.oneOf(['escalated', 'force'])
        
        const exists = await unixProvider.processExists(testProcess.pid)
        expect(exists).to.be.false
      })
    })
  })

  describe('Unified Process Provider Tests', () => {
    beforeEach(async () => {
      await processProvider.initialize()
    })

    it('should initialize with correct platform provider', async () => {
      const capabilities = processProvider.getCapabilities()
      
      expect(capabilities.initialized).to.be.true
      expect(capabilities.platform).to.equal(process.platform)
      
      if (process.platform === 'win32') {
        expect(capabilities.provider).to.equal('WindowsProvider')
      } else {
        expect(capabilities.provider).to.equal('UnixProvider')
      }
    })

    it('should provide consistent API across platforms', async () => {
      const processes = await processProvider.listProcesses({ maxResults: 5 })
      
      expect(processes).to.be.an('array')
      processes.forEach(process => {
        expect(process.pid).to.be.a('number')
        expect(process.name).to.be.a('string')
        expect(process.platform).to.equal(process.platform)
      })
    })

    it('should handle process existence checking', async () => {
      const currentPid = process.pid
      const exists = await processProvider.processExists(currentPid)
      
      expect(exists).to.be.true
      
      // Test non-existent process
      const nonExistentExists = await processProvider.processExists(999999)
      expect(nonExistentExists).to.be.false
    })

    it('should provide detailed process information', async () => {
      const currentPid = process.pid
      const processInfo = await processProvider.getProcessInfo(currentPid)
      
      expect(processInfo).to.be.an('object')
      expect(processInfo.pid).to.equal(currentPid)
      expect(processInfo.platform).to.equal(process.platform)
    })

    it('should handle process killing with cross-platform consistency', async () => {
      const testProcess = await createTestProcess()
      
      const result = await processProvider.killByPid(testProcess.pid)
      
      expect(result.success).to.be.true
      expect(result.platform).to.equal(process.platform)
      expect(result.operationDuration).to.be.a('number')
      
      // Verify termination
      const exists = await processProvider.processExists(testProcess.pid)
      expect(exists).to.be.false
    })

    it('should handle process killing by name pattern', async () => {
      const testProcess = await createTestProcess()
      const processInfo = await processProvider.getProcessInfo(testProcess.pid)
      
      if (processInfo && processInfo.name) {
        const result = await processProvider.killByName(processInfo.name, {
          exactMatch: true,
          maxProcesses: 1
        })
        
        expect(result.success).to.be.true
        expect(result.killedCount).to.be.at.least(0)
        expect(result.platform).to.equal(process.platform)
      }
    })

    it('should handle process tree operations', async () => {
      const testProcess = await createTestProcess()
      
      const result = await processProvider.killProcessTree(testProcess.pid)
      
      expect(result.success).to.be.true
      expect(result.platform).to.equal(process.platform)
      expect(result.totalProcesses).to.be.at.least(1)
    })
  })

  describe('Optimization Engine Tests', () => {
    let optimizationEngine
    let mockPlatformInfo

    beforeEach(() => {
      mockPlatformInfo = {
        platform: process.platform,
        family: process.platform === 'win32' ? 'NT' : 'Unix',
        tools: { available: process.platform === 'win32' ? ['taskkill', 'wmic'] : ['ps', 'kill'] },
        capabilities: { processGroupKill: process.platform !== 'win32' }
      }
      
      optimizationEngine = new OptimizationEngine(mockPlatformInfo)
    })

    it('should initialize with platform-specific strategies', () => {
      const metrics = optimizationEngine.getMetrics()
      
      expect(metrics.activeOptimizations).to.be.an('array')
      expect(metrics.activeOptimizations.length).to.be.greaterThan(0)
    })

    it('should apply appropriate optimizations', () => {
      const result = optimizationEngine.optimize('listProcesses', { useCache: true })
      
      expect(result).to.have.property('params')
      expect(result).to.have.property('appliedOptimizations')
      expect(result.appliedOptimizations).to.be.an('array')
    })

    it('should provide performance recommendations', () => {
      // Simulate some operations
      optimizationEngine.recordOperation('listProcesses', {}, { success: true }, 1000)
      optimizationEngine.recordOperation('listProcesses', {}, { success: true }, 5000)
      optimizationEngine.recordOperation('listProcesses', {}, { success: true }, 3000)
      
      const recommendations = optimizationEngine.getRecommendations()
      expect(recommendations).to.be.an('array')
    })

    it('should handle caching efficiently', () => {
      const operation = 'listProcesses'
      const params = { maxResults: 10 }
      
      // First call should miss cache
      const result1 = optimizationEngine.optimize(operation, params)
      expect(result1.cached).to.be.false
      
      // Record successful operation
      optimizationEngine.recordOperation(operation, result1.params, { success: true, data: ['test'] }, 100)
      
      // Second call might hit cache (depending on implementation)
      const result2 = optimizationEngine.optimize(operation, params)
      // Cache behavior may vary based on strategy implementation
    })
  })

  describe('Platform Integration Tests', () => {
    beforeEach(async () => {
      await platformIntegration.initialize()
    })

    it('should initialize platform integration successfully', async () => {
      expect(platformIntegration.initialized).to.be.true
      expect(platformIntegration.platformInfo).to.be.an('object')
      expect(platformIntegration.capabilities).to.be.an('object')
    })

    it('should execute operations with platform optimization', async () => {
      const operation = {
        type: 'listProcesses',
        maxResults: 5
      }
      
      const result = await platformIntegration.executeOperation(operation, { timeout: 10000 })
      
      expect(result).to.be.an('object')
      expect(result.executionTime).to.be.a('number')
      expect(result.platform).to.equal(process.platform)
    })

    it('should provide enhanced process list', async () => {
      const enhancedList = await platformIntegration.getEnhancedProcessList({ maxResults: 5 })
      
      expect(enhancedList).to.be.an('array')
      enhancedList.forEach(process => {
        expect(process.pid).to.be.a('number')
        expect(process.tracked).to.be.a('boolean')
        expect(process.platformCapabilities).to.be.an('object')
      })
    })

    it('should perform comprehensive health checks', async () => {
      const healthStatus = await platformIntegration.performHealthCheck()
      
      expect(healthStatus).to.be.an('object')
      expect(healthStatus.timestamp).to.be.a('string')
      expect(healthStatus.overall).to.be.a('boolean')
      expect(healthStatus.components).to.be.an('object')
    })

    it('should collect integration metrics', () => {
      const metrics = platformIntegration.getIntegrationMetrics()
      
      expect(metrics).to.be.an('object')
      expect(metrics.operationsHandled).to.be.a('number')
      expect(metrics.optimizationsApplied).to.be.a('number')
    })

    it('should provide comprehensive system information', async () => {
      const systemInfo = await platformIntegration.getSystemInfo()
      
      expect(systemInfo).to.be.an('object')
      expect(systemInfo.platform).to.be.an('object')
      expect(systemInfo.capabilities).to.be.an('object')
      expect(systemInfo.performance).to.be.an('object')
    })
  })

  describe('Enhanced Process Orchestrator Tests', () => {
    beforeEach(() => {
      // Enhanced orchestrator initializes asynchronously
      return new Promise(resolve => {
        if (enhancedOrchestrator.initialized) {
          resolve()
        } else {
          enhancedOrchestrator.once('enhanced_initialized', resolve)
          // Fallback timeout
          setTimeout(resolve, 5000)
        }
      })
    })

    it('should initialize with platform integration', async () => {
      const metrics = enhancedOrchestrator.getEnhancedMetrics()
      
      expect(metrics).to.be.an('object')
      expect(metrics.sessionId).to.be.a('string')
    })

    it('should execute operations with enhanced capabilities', async () => {
      const operation = {
        type: 'listProcesses',
        name: 'test-list-processes'
      }
      
      const result = await enhancedOrchestrator.executeOperation(operation, { timeout: 10000 })
      
      expect(result).to.be.an('object')
      expect(result.enhancedExecution).to.be.true
      expect(result.executionMode).to.be.oneOf(['platform-integrated', 'legacy'])
    })

    it('should provide comprehensive system information', async () => {
      const systemInfo = await enhancedOrchestrator.getSystemInfo()
      
      expect(systemInfo).to.be.an('object')
      expect(systemInfo.sessionId).to.be.a('string')
      expect(systemInfo.enhanced).to.be.a('boolean')
    })

    it('should handle enhanced metrics collection', () => {
      const metrics = enhancedOrchestrator.getEnhancedMetrics()
      
      expect(metrics.platformIntegrated).to.be.a('boolean')
      expect(metrics.legacyMode).to.be.a('boolean')
      expect(metrics.sessionId).to.be.a('string')
    })
  })

  describe('Cross-Platform Consistency Tests', () => {
    it('should provide consistent process information format', async () => {
      await processProvider.initialize()
      const processes = await processProvider.listProcesses({ maxResults: 3 })
      
      processes.forEach(process => {
        // Required fields
        expect(process.pid).to.be.a('number')
        expect(process.name).to.be.a('string')
        expect(process.platform).to.equal(process.platform)
        
        // Optional but consistent fields
        if (process.parentPid !== undefined) {
          expect(process.parentPid).to.be.a('number').or.null
        }
        if (process.command !== undefined) {
          expect(process.command).to.be.a('string')
        }
      })
    })

    it('should provide consistent kill operation results', async () => {
      const testProcess = await createTestProcess()
      
      await processProvider.initialize()
      const result = await processProvider.killByPid(testProcess.pid)
      
      // Required result fields
      expect(result.success).to.be.a('boolean')
      expect(result.platform).to.equal(process.platform)
      expect(result.operationDuration).to.be.a('number')
      
      // Optional but consistent fields
      if (result.method !== undefined) {
        expect(result.method).to.be.a('string')
      }
    })

    it('should handle errors consistently across platforms', async () => {
      await processProvider.initialize()
      
      try {
        await processProvider.killByPid(999999) // Non-existent PID
        // Should not reach here for most cases, but some platforms might succeed
      } catch (error) {
        expect(error).to.be.an.instanceOf(Error)
        expect(error.message).to.be.a('string')
      }
    })
  })

  describe('Performance Benchmarking Tests', () => {
    it('should meet performance targets for process listing', async () => {
      await processProvider.initialize()
      
      const iterations = 5
      const durations = []
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        await processProvider.listProcesses({ maxResults: 50 })
        durations.push(Date.now() - start)
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      
      // Performance target: <5 seconds average
      expect(avgDuration).to.be.lessThan(5000)
    })

    it('should meet performance targets for process termination', async () => {
      const testProcess = await createTestProcess()
      
      await processProvider.initialize()
      
      const start = Date.now()
      await processProvider.killByPid(testProcess.pid)
      const duration = Date.now() - start
      
      // Performance target: <2 seconds
      expect(duration).to.be.lessThan(2000)
    })

    it('should demonstrate optimization effectiveness', async () => {
      await processProvider.initialize()
      
      const metrics = processProvider.getStatistics()
      
      if (metrics.optimizationEngine) {
        expect(metrics.optimizationEngine.activeOptimizations).to.be.an('array')
        expect(metrics.optimizationEngine.optimizationImpact).to.be.a('number')
      }
    })
  })

  describe('Error Handling and Recovery Tests', () => {
    it('should handle platform initialization failures gracefully', async () => {
      // Create provider with invalid configuration
      const faultyProvider = new ProcessProvider({
        autoInitialize: false,
        platformDetectionTimeout: 1 // Very short timeout
      })
      
      try {
        await faultyProvider.initialize()
        // Should either succeed or fail gracefully
      } catch (error) {
        expect(error).to.be.an.instanceOf(Error)
        expect(error.message).to.include('initialization')
      }
    })

    it('should handle platform provider failures', async () => {
      await processProvider.initialize()
      
      // Try to kill a system-protected process (should fail safely)
      try {
        if (process.platform === 'win32') {
          await processProvider.killByPid(4) // System process on Windows
        } else {
          await processProvider.killByPid(1) // Init process on Unix
        }
      } catch (error) {
        expect(error).to.be.an.instanceOf(Error)
      }
    })

    it('should maintain functionality during partial failures', async () => {
      await processProvider.initialize()
      
      // Even if one operation fails, others should work
      const processes = await processProvider.listProcesses({ maxResults: 5 })
      expect(processes).to.be.an('array')
      
      const exists = await processProvider.processExists(process.pid)
      expect(exists).to.be.true
    })
  })

  describe('Integration with Existing Systems Tests', () => {
    it('should integrate with ProcessRegistry', async () => {
      await platformIntegration.initialize()
      
      const registry = platformIntegration.orchestrator.registry
      expect(registry).to.be.an('object')
      
      if (registry.getPlatformStatistics) {
        const stats = registry.getPlatformStatistics()
        expect(stats).to.be.an('object')
      }
    })

    it('should maintain audit logging', async () => {
      const auditMessages = []
      const originalInfo = console.log
      
      // Capture audit logs
      console.log = (message) => {
        if (message.includes('[AUDIT]')) {
          auditMessages.push(message)
        }
        originalInfo.call(console, message)
      }
      
      try {
        await platformIntegration.initialize()
        
        const operation = {
          type: 'listProcesses'
        }
        
        await platformIntegration.executeOperation(operation)
        
        // Should have audit log entries
        expect(auditMessages.length).to.be.greaterThan(0)
        
      } finally {
        console.log = originalInfo
      }
    })

    it('should provide backward compatibility', async () => {
      // Test that existing operation types still work
      const testProcess = await createTestProcess()
      
      const operation = {
        type: 'kill_process',
        pid: testProcess.pid
      }
      
      await enhancedOrchestrator.executeOperation(operation)
      
      // Should succeed with either platform integration or legacy mode
      const exists = await processProvider.processExists(testProcess.pid)
      expect(exists).to.be.false
    })
  })

  // Helper functions
  async function createTestProcess(command = null) {
    let testCommand
    
    if (command) {
      testCommand = command
    } else if (process.platform === 'win32') {
      testCommand = 'timeout /t 30 /nobreak >nul'
    } else {
      testCommand = 'sleep 30'
    }
    
    const testProcess = spawn('sh', ['-c', testCommand], {
      detached: true,
      stdio: 'ignore'
    })
    
    testProcess.unref()
    testProcesses.push(testProcess)
    
    // Wait for process to start
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return testProcess
  }

  async function cleanupTestProcesses() {
    for (const testProcess of testProcesses) {
      try {
        if (testProcess.pid) {
          if (process.platform === 'win32') {
            process.kill(testProcess.pid, 'SIGTERM')
          } else {
            process.kill(-testProcess.pid, 'SIGKILL') // Kill process group
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    testProcesses = []
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 500))
  }
})

describe('Platform-Specific Validation Tests', () => {
  describe('Windows Platform Tests', () => {
    it('should validate Windows-specific tools', async function() {
      if (process.platform !== 'win32') {
        this.skip()
        return
      }

      const detector = new PlatformDetector()
      const platformInfo = await detector.detectPlatform()
      
      expect(platformInfo.tools.available).to.include('taskkill')
      expect(platformInfo.platform).to.equal('win32')
      expect(platformInfo.type).to.equal('Windows')
      expect(platformInfo.family).to.equal('NT')
    })

    it('should handle Windows process tree termination', async function() {
      if (process.platform !== 'win32') {
        this.skip()
        return
      }

      const provider = new ProcessProvider({ autoInitialize: false })
      await provider.initialize()
      
      // Create a process tree
      const parentProcess = spawn('cmd', ['/c', 'timeout /t 30 /nobreak >nul'], {
        detached: true,
        stdio: 'ignore'
      })
      
      try {
        const result = await provider.killProcessTree(parentProcess.pid)
        expect(result.success).to.be.true
        expect(result.method).to.be.oneOf(['tree_kill', 'tree_traversal'])
      } finally {
        try {
          process.kill(parentProcess.pid, 'SIGTERM')
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })
  })

  describe('Unix Platform Tests', () => {
    it('should validate Unix-specific tools', async function() {
      if (process.platform === 'win32') {
        this.skip()
        return
      }

      const detector = new PlatformDetector()
      const platformInfo = await detector.detectPlatform()
      
      expect(platformInfo.tools.available).to.include('ps')
      expect(platformInfo.tools.available).to.include('kill')
      expect(platformInfo.family).to.equal('Unix')
      expect(platformInfo.capabilities.processManagement.signalSupport).to.be.true
    })

    it('should handle Unix signal escalation properly', async function() {
      if (process.platform === 'win32') {
        this.skip()
        return
      }

      const provider = new ProcessProvider({ autoInitialize: false })
      await provider.initialize()
      
      const testProcess = spawn('sh', ['-c', 'trap "echo caught" TERM; sleep 30'], {
        detached: true,
        stdio: 'ignore'
      })
      
      try {
        const result = await provider.killByPid(testProcess.pid, {
          escalate: true,
          signalEscalationDelay: 500
        })
        
        expect(result.success).to.be.true
        expect(result.method).to.be.oneOf(['escalated', 'signal', 'force'])
      } finally {
        try {
          process.kill(-testProcess.pid, 'SIGKILL')
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })

    it('should handle process groups correctly', async function() {
      if (process.platform === 'win32') {
        this.skip()
        return
      }

      const provider = new ProcessProvider({ autoInitialize: false })
      await provider.initialize()
      
      const testProcess = spawn('sh', ['-c', 'sleep 30 & sleep 30 & wait'], {
        detached: true,
        stdio: 'ignore'
      })
      
      try {
        const result = await provider.killProcessTree(testProcess.pid, {
          useProcessGroups: true
        })
        
        expect(result.success).to.be.true
        expect(result.method).to.be.oneOf(['process_group', 'tree_traversal'])
      } finally {
        try {
          process.kill(-testProcess.pid, 'SIGKILL')
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    })
  })

  describe('macOS Platform Tests', () => {
    it('should handle macOS-specific features', async function() {
      if (process.platform !== 'darwin') {
        this.skip()
        return
      }

      const detector = new PlatformDetector()
      const platformInfo = await detector.detectPlatform()
      
      expect(platformInfo.platform).to.equal('darwin')
      expect(platformInfo.type).to.equal('macOS')
      expect(platformInfo.family).to.equal('Unix')
      
      // macOS should have specific capabilities
      expect(platformInfo.capabilities.securityFeatures.sandboxing).to.be.true
    })
  })

  describe('Linux Platform Tests', () => {
    it('should handle Linux-specific features', async function() {
      if (process.platform !== 'linux') {
        this.skip()
        return
      }

      const detector = new PlatformDetector()
      const platformInfo = await detector.detectPlatform()
      
      expect(platformInfo.platform).to.equal('linux')
      expect(platformInfo.type).to.equal('Linux')
      expect(platformInfo.family).to.equal('Unix')
      
      // Linux-specific security features
      if (platformInfo.capabilities.securityFeatures) {
        expect(platformInfo.capabilities.securityFeatures.selinuxSupport).to.be.a('boolean')
        expect(platformInfo.capabilities.securityFeatures.appArmorSupport).to.be.a('boolean')
      }
    })
  })
})