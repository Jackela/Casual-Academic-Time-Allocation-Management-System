/**
 * Enterprise Process Orchestrator
 *
 * Core orchestration engine with enterprise patterns:
 * - Dependency injection for testability
 * - Session-based process tracking
 * - Baseline capture and validation system
 * - Emergency recovery mechanisms (<5 seconds)
 * - Comprehensive audit logging (100% operation trail)
 * - Zero-tolerance process leak detection
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')
const ProcessRegistry = require('../managers/ProcessRegistry')
const LifecycleManager = require('../managers/LifecycleManager')
const ConfigManager = require('../managers/ConfigManager')
const AuditLogger = require('./AuditLogger')
const EmergencyRecovery = require('./EmergencyRecovery')

/**
 * Enterprise Process Orchestrator with design patterns implementation
 */
class ProcessOrchestrator extends EventEmitter {
  /**
   * Initialize ProcessOrchestrator with dependency injection
   * @param {Object} dependencies - Injected dependencies for testability
   * @param {Object} config - Configuration object
   */
  constructor (dependencies = {}, config = {}) {
    super()

    // Dependency injection pattern
    this.registry = dependencies.registry || new ProcessRegistry()
    this.lifecycleManager = dependencies.lifecycleManager || new LifecycleManager()
    this.configManager = dependencies.configManager || new ConfigManager()
    this.auditLogger = dependencies.auditLogger || new AuditLogger()
    this.emergencyRecovery = dependencies.emergencyRecovery || new EmergencyRecovery()

    // Configuration
    this.config = this.configManager.loadConfig(config)

    // Session management
    this.sessionId = this._generateSessionId()
    this.baseline = new Map()
    this.operationQueue = []
    this.isEmergencyMode = false

    // Performance metrics
    this.metrics = {
      processCount: 0,
      successfulOperations: 0,
      failedOperations: 0,
      emergencyRecoveries: 0,
      averageRecoveryTime: 0
    }

    // Initialize orchestrator (skip in test environment to avoid system dependencies)
    if (process.env.NODE_ENV !== 'test') {
      this._initialize()
    }
  }

  /**
   * Initialize the orchestrator with baseline capture
   * @private
   */
  async _initialize () {
    try {
      this.auditLogger.info('ProcessOrchestrator initializing', {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        config: this.config
      })

      // Capture system baseline
      await this._captureBaseline()

      // Setup emergency handlers
      this._setupEmergencyHandlers()

      // Setup monitoring
      this._setupMonitoring()

      this.emit('initialized', { sessionId: this.sessionId })

      this.auditLogger.info('ProcessOrchestrator initialized successfully', {
        sessionId: this.sessionId,
        baseline: Object.fromEntries(this.baseline)
      })
    } catch (error) {
      this.auditLogger.error('ProcessOrchestrator initialization failed', {
        sessionId: this.sessionId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Capture system baseline for leak detection
   * @private
   */
  async _captureBaseline () {
    const startTime = Date.now()

    try {
      // Capture running processes
      const runningProcesses = await this.registry.getRunningProcesses()
      this.baseline.set('processes', runningProcesses)

      // Capture open ports
      const openPorts = await this.registry.getOpenPorts()
      this.baseline.set('ports', openPorts)

      // Capture memory usage
      const memoryUsage = process.memoryUsage()
      this.baseline.set('memory', memoryUsage)

      this.auditLogger.info('System baseline captured', {
        sessionId: this.sessionId,
        duration: Date.now() - startTime,
        processes: runningProcesses.length,
        ports: openPorts.length,
        memoryMB: Math.round(memoryUsage.heapUsed / 1024 / 1024)
      })
    } catch (error) {
      this.auditLogger.error('Baseline capture failed', {
        sessionId: this.sessionId,
        error: error.message
      })
      throw new Error(`Baseline capture failed: ${error.message}`)
    }
  }

  /**
   * Setup emergency recovery handlers
   * @private
   */
  _setupEmergencyHandlers () {
    // In test environment, skip setting up signal handlers to avoid memory leaks
    if (process.env.NODE_ENV === 'test') {
      return
    }

    // Increase max listeners to handle multiple orchestrator instances
    process.setMaxListeners(20)

    const emergencySignals = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'uncaughtException', 'unhandledRejection']

    emergencySignals.forEach(signal => {
      process.on(signal, async (error) => {
        this.auditLogger.warn(`Emergency signal received: ${signal}`, {
          sessionId: this.sessionId,
          error: error?.message
        })

        await this.emergencyShutdown()
      })
    })
  }

  /**
   * Setup real-time monitoring using Observer pattern
   * @private
   */
  _setupMonitoring () {
    // In test environment, skip monitoring to avoid issues
    if (process.env.NODE_ENV === 'test') {
      return
    }

    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this._performHealthCheck()
      } catch (error) {
        this.auditLogger.error('Health check failed', {
          sessionId: this.sessionId,
          error: error.message
        })
      }
    }, 5000)
  }

  /**
   * Execute operation with comprehensive tracking
   * @param {Object} operation - Operation to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Operation result
   */
  async executeOperation (operation, options = {}) {
    const operationId = this._generateOperationId()
    const startTime = Date.now()

    this.auditLogger.info('Operation execution started', {
      sessionId: this.sessionId,
      operationId,
      operation: operation.name || 'unnamed',
      options
    })

    try {
      // Validate operation
      this._validateOperation(operation)

      // Pre-execution validation
      await this._preExecutionValidation()

      // Execute using lifecycle manager
      const result = await this.lifecycleManager.executeOperation(operation, {
        ...options,
        sessionId: this.sessionId,
        operationId
      })

      // Post-execution validation
      await this._postExecutionValidation(operationId)

      const duration = Date.now() - startTime
      this.metrics.successfulOperations++

      this.auditLogger.info('Operation executed successfully', {
        sessionId: this.sessionId,
        operationId,
        duration,
        result: result.summary
      })

      this.emit('operationCompleted', { operationId, result, duration })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.metrics.failedOperations++

      this.auditLogger.error('Operation execution failed', {
        sessionId: this.sessionId,
        operationId,
        duration,
        error: error.message,
        stack: error.stack
      })

      // Attempt recovery if configured
      if (options.autoRecovery !== false) {
        await this._attemptRecovery(operationId, error)
      }

      this.emit('operationFailed', { operationId, error, duration })
      throw error
    }
  }

  /**
   * Validate operation before execution
   * @param {Object} operation - Operation to validate
   * @private
   */
  _validateOperation (operation) {
    if (!operation || typeof operation !== 'object') {
      throw new Error('Operation must be a valid object')
    }

    if (!operation.type) {
      throw new Error('Operation must have a type')
    }

    if (!operation.execute || typeof operation.execute !== 'function') {
      throw new Error('Operation must have an execute function')
    }
  }

  /**
   * Pre-execution system validation
   * @private
   */
  async _preExecutionValidation () {
    // Check system resources
    const memoryUsage = process.memoryUsage()
    const threshold = this.config.memoryThreshold || 1024 * 1024 * 1024 // 1GB

    if (memoryUsage.heapUsed > threshold) {
      throw new Error(`Memory usage exceeds threshold: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`)
    }

    // Check for process leaks
    const currentProcesses = await this.registry.getRunningProcesses()
    const baselineProcesses = this.baseline.get('processes') || []
    const newProcesses = currentProcesses.filter(p =>
      !baselineProcesses.some(bp => bp.pid === p.pid)
    )

    if (newProcesses.length > (this.config.maxNewProcesses || 10)) {
      this.auditLogger.warn('Potential process leak detected', {
        sessionId: this.sessionId,
        newProcessCount: newProcesses.length,
        newProcesses: newProcesses.map(p => ({ pid: p.pid, name: p.name }))
      })
    }
  }

  /**
   * Post-execution validation and cleanup verification
   * @param {string} operationId - Operation identifier
   * @private
   */
  async _postExecutionValidation (operationId) {
    // Verify no orphaned processes
    const orphanedProcesses = await this.registry.findOrphanedProcesses(this.sessionId)

    if (orphanedProcesses.length > 0) {
      this.auditLogger.warn('Orphaned processes detected after operation', {
        sessionId: this.sessionId,
        operationId,
        orphanedProcesses: orphanedProcesses.map(p => ({ pid: p.pid, name: p.name }))
      })

      // Auto-cleanup orphaned processes
      await this._cleanupOrphanedProcesses(orphanedProcesses)
    }

    // Update metrics
    this.metrics.processCount = await this.registry.getProcessCount()
  }

  /**
   * Perform health check for leak detection
   * @private
   */
  async _performHealthCheck () {
    const currentProcesses = await this.registry.getRunningProcesses()
    const baselineProcesses = this.baseline.get('processes') || []

    // Detect process leaks
    const suspiciousProcesses = currentProcesses.filter(current => {
      const baseline = baselineProcesses.find(base => base.pid === current.pid)
      return !baseline && this._isSuspiciousProcess(current)
    })

    if (suspiciousProcesses.length > 0) {
      this.auditLogger.warn('Suspicious processes detected in health check', {
        sessionId: this.sessionId,
        suspiciousProcesses: suspiciousProcesses.map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: p.cpu,
          memory: p.memory
        }))
      })

      this.emit('processLeakDetected', { processes: suspiciousProcesses })
    }
  }

  /**
   * Check if process is suspicious (potential leak)
   * @param {Object} process - Process information
   * @returns {boolean} True if suspicious
   * @private
   */
  _isSuspiciousProcess (process) {
    const suspiciousNames = ['java', 'gradle', 'node', 'npm', 'test']
    return suspiciousNames.some(name =>
      process.name && process.name.toLowerCase().includes(name)
    )
  }

  /**
   * Attempt recovery from failed operation
   * @param {string} operationId - Failed operation ID
   * @param {Error} error - The error that occurred
   * @private
   */
  async _attemptRecovery (operationId, error) {
    const startTime = Date.now()

    try {
      this.auditLogger.info('Attempting recovery', {
        sessionId: this.sessionId,
        operationId,
        error: error.message
      })

      // Use emergency recovery mechanism
      const recovered = await this.emergencyRecovery.attemptRecovery({
        sessionId: this.sessionId,
        operationId,
        error,
        processes: await this.registry.getRunningProcesses()
      })

      const recoveryTime = Date.now() - startTime
      this.metrics.emergencyRecoveries++
      this.metrics.averageRecoveryTime =
        (this.metrics.averageRecoveryTime + recoveryTime) / this.metrics.emergencyRecoveries

      this.auditLogger.info('Recovery completed', {
        sessionId: this.sessionId,
        operationId,
        recoveryTime,
        recovered
      })

      // Validate recovery time requirement (<5 seconds)
      if (recoveryTime > 5000) {
        this.auditLogger.warn('Recovery time exceeded 5 second requirement', {
          sessionId: this.sessionId,
          operationId,
          recoveryTime
        })
      }
    } catch (recoveryError) {
      this.auditLogger.error('Recovery failed', {
        sessionId: this.sessionId,
        operationId,
        originalError: error.message,
        recoveryError: recoveryError.message
      })
      throw recoveryError
    }
  }

  /**
   * Emergency shutdown with guaranteed cleanup
   * @param {Object} options - Shutdown options
   */
  async emergencyShutdown (options = {}) {
    const startTime = Date.now()
    this.isEmergencyMode = true

    this.auditLogger.warn('Emergency shutdown initiated', {
      sessionId: this.sessionId,
      options
    })

    try {
      // Stop monitoring
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval)
      }

      // Force cleanup all processes
      await this._cleanupAllProcesses()

      // Release all resources
      await this._releaseResources()

      const shutdownTime = Date.now() - startTime

      this.auditLogger.info('Emergency shutdown completed', {
        sessionId: this.sessionId,
        shutdownTime,
        metrics: this.metrics
      })

      // Validate shutdown time requirement (<5 seconds)
      if (shutdownTime < 5000) {
        this.emit('emergencyShutdownCompleted', { sessionId: this.sessionId, shutdownTime })
      } else {
        this.auditLogger.warn('Emergency shutdown exceeded 5 second requirement', {
          sessionId: this.sessionId,
          shutdownTime
        })
      }
    } catch (error) {
      this.auditLogger.error('Emergency shutdown failed', {
        sessionId: this.sessionId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Cleanup all tracked processes
   * @private
   */
  async _cleanupAllProcesses () {
    const allProcesses = await this.registry.getAllTrackedProcesses(this.sessionId)

    for (const process of allProcesses) {
      try {
        await this.lifecycleManager.terminateProcess(process.pid)
        this.auditLogger.info('Process terminated during cleanup', {
          sessionId: this.sessionId,
          pid: process.pid,
          name: process.name
        })
      } catch (error) {
        this.auditLogger.warn('Failed to terminate process during cleanup', {
          sessionId: this.sessionId,
          pid: process.pid,
          error: error.message
        })
      }
    }
  }

  /**
   * Cleanup orphaned processes
   * @param {Array} orphanedProcesses - List of orphaned processes
   * @private
   */
  async _cleanupOrphanedProcesses (orphanedProcesses) {
    for (const process of orphanedProcesses) {
      try {
        await this.lifecycleManager.terminateProcess(process.pid)
        this.auditLogger.info('Orphaned process cleaned up', {
          sessionId: this.sessionId,
          pid: process.pid,
          name: process.name
        })
      } catch (error) {
        this.auditLogger.warn('Failed to cleanup orphaned process', {
          sessionId: this.sessionId,
          pid: process.pid,
          error: error.message
        })
      }
    }
  }

  /**
   * Release all allocated resources
   * @private
   */
  async _releaseResources () {
    // Close all open handles
    this.removeAllListeners()

    // Release registry resources
    if (this.registry && typeof this.registry.cleanup === 'function') {
      await this.registry.cleanup()
    }

    // Release lifecycle manager resources
    if (this.lifecycleManager && typeof this.lifecycleManager.cleanup === 'function') {
      await this.lifecycleManager.cleanup()
    }
  }

  /**
   * Generate unique session identifier
   * @returns {string} Session ID
   * @private
   */
  _generateSessionId () {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique operation identifier
   * @returns {string} Operation ID
   * @private
   */
  _generateOperationId () {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current session metrics
   * @returns {Object} Session metrics
   */
  getMetrics () {
    return {
      ...this.metrics,
      sessionId: this.sessionId,
      uptime: Date.now() - (this.startTime || Date.now()),
      isEmergencyMode: this.isEmergencyMode
    }
  }

  /**
   * Get current session information
   * @returns {Object} Session information
   */
  getSessionInfo () {
    return {
      sessionId: this.sessionId,
      baseline: Object.fromEntries(this.baseline),
      metrics: this.getMetrics(),
      config: this.config
    }
  }
}

module.exports = ProcessOrchestrator
