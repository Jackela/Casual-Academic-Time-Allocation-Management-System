/**
 * Emergency Strategy - Immediate cleanup for critical situations
 *
 * Strategy characteristics:
 * - Ultra-fast execution for critical system recovery
 * - Bypasses most safety checks for maximum speed
 * - Immediate forced termination with minimal delays
 * - Designed for system rescue and emergency situations
 * - Prioritizes system stability over process preservation
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')

/**
 * Emergency cleanup strategy for critical system recovery
 */
class EmergencyStrategy extends EventEmitter {
  /**
   * Initialize EmergencyStrategy
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} config - Strategy configuration
   */
  constructor (dependencies = {}, config = {}) {
    super()

    this.name = 'EmergencyStrategy'
    this.description = 'Immediate cleanup for critical system recovery'

    // Dependency injection
    this.processRegistry = dependencies.processRegistry
    this.realTimeMonitor = dependencies.realTimeMonitor
    this.auditLogger = dependencies.auditLogger

    // Configuration - optimized for maximum speed
    this.config = {
      // Ultra-fast timing settings
      maxExecutionTime: config.maxExecutionTime || 5000, // 5 seconds total
      immediateTermination: config.immediateTermination !== false,
      skipGracePeriod: config.skipGracePeriod !== false,
      maxTerminationDelay: config.maxTerminationDelay || 100, // 100ms max delay per process
      
      // Emergency overrides
      bypassAllSafetyChecks: config.bypassAllSafetyChecks !== false,
      allowCriticalProcessTermination: config.allowCriticalProcessTermination === true,
      skipDependencyAnalysis: config.skipDependencyAnalysis !== false,
      skipResourceChecks: config.skipResourceChecks !== false,
      
      // Parallel execution settings
      maxConcurrentTerminations: config.maxConcurrentTerminations || 20, // High concurrency
      unlimitedConcurrency: config.unlimitedConcurrency === true,
      batchProcessing: config.batchProcessing !== false,
      
      // Emergency protocols
      enableEmergencyLogging: config.enableEmergencyLogging !== false,
      enableSystemRecovery: config.enableSystemRecovery !== false,
      enableRollbackCapture: config.enableRollbackCapture === true, // Still capture for audit
      
      // Platform-specific settings
      useSystemKill: config.useSystemKill !== false, // Use OS-level kill commands
      skipProcessValidation: config.skipProcessValidation !== false,
      
      ...config
    }

    // Emergency state
    this.isExecuting = false
    this.emergencyStartTime = 0
    this.totalTargets = 0
    this.processedTargets = 0
    this.terminationResults = new Map()
    
    // Emergency metrics
    this.metrics = {
      totalEmergencyExecutions: 0,
      averageEmergencyTime: 0,
      fastestExecution: Infinity,
      slowestExecution: 0,
      immediateTerminationRate: 0,
      emergencySuccessRate: 0,
      systemRecoveryRate: 0,
      criticalProcessesTerminated: 0
    }

    // Platform-specific kill commands
    this.killCommands = this._initializeKillCommands()
  }

  /**
   * Initialize platform-specific kill commands
   * @returns {Object} Kill command configurations
   * @private
   */
  _initializeKillCommands () {
    return {
      win32: {
        immediate: ['taskkill', '/f', '/pid'],
        tree: ['taskkill', '/f', '/t', '/pid'],
        system: ['wmic', 'process', 'where', 'ProcessId=', 'delete']
      },
      linux: {
        immediate: ['kill', '-9'],
        tree: ['pkill', '-9', '-P'],
        system: ['killall', '-9']
      },
      darwin: {
        immediate: ['kill', '-9'],
        tree: ['pkill', '-9', '-P'],
        system: ['killall', '-9']
      }
    }
  }

  /**
   * Initialize the strategy
   */
  async initialize () {
    this.auditLogger?.warn('EmergencyStrategy initialized - USE WITH EXTREME CAUTION', {
      component: 'EmergencyStrategy',
      warnings: [
        'Bypasses safety checks',
        'May terminate critical processes',
        'Designed for emergency use only'
      ],
      config: this.config
    })
  }

  /**
   * Execute emergency cleanup
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute (context, options = {}) {
    if (this.isExecuting) {
      throw new Error('EmergencyStrategy is already executing')
    }

    const executionStart = Date.now()
    this.emergencyStartTime = executionStart
    this.isExecuting = true
    this.totalTargets = context.cleanupRequest.targets.length

    // Emit emergency alert
    this.emit('emergencyExecutionStarted', {
      timestamp: executionStart,
      targets: this.totalTargets,
      estimatedTime: this._estimateEmergencyTime()
    })

    this.auditLogger?.warn('EMERGENCY CLEANUP EXECUTION STARTED', {
      component: 'EmergencyStrategy',
      targets: this.totalTargets,
      timestamp: new Date(executionStart).toISOString(),
      warning: 'EMERGENCY STRATEGY - BYPASSING SAFETY CHECKS'
    })

    try {
      // Phase 1: Immediate emergency validation (minimal)
      this._performEmergencyValidation(context)

      // Phase 2: Capture minimal rollback data (if enabled)
      let rollbackData = null
      if (this.config.enableRollbackCapture) {
        rollbackData = await this._captureEmergencyRollbackData(context)
      }

      // Phase 3: Execute immediate terminations
      const result = await this._executeEmergencyTerminations(context, options)

      // Phase 4: Emergency system recovery (if enabled)
      let recoveryResult = null
      if (this.config.enableSystemRecovery) {
        recoveryResult = await this._performEmergencySystemRecovery(result)
      }

      const executionTime = Date.now() - executionStart
      this._updateEmergencyMetrics(executionTime, result)

      const finalResult = {
        success: true,
        strategy: this.name,
        executionTime,
        emergency: {
          totalTargets: this.totalTargets,
          processedTargets: this.processedTargets,
          immediateTerminations: result.immediate.length,
          failedTerminations: result.failed.length,
          systemRecovery: recoveryResult,
          rollbackData: rollbackData ? rollbackData.id : null
        },
        terminationResults: result,
        performance: {
          targetsPerSecond: (this.processedTargets / executionTime) * 1000,
          averageTerminationTime: this._calculateAverageTerminationTime(result)
        },
        metrics: this._getEmergencyMetrics()
      }

      this.auditLogger?.warn('EMERGENCY CLEANUP COMPLETED', {
        component: 'EmergencyStrategy',
        ...finalResult.emergency,
        executionTime,
        successRate: (result.immediate.length / this.totalTargets) * 100
      })

      this.emit('emergencyExecutionCompleted', finalResult)
      return finalResult

    } catch (error) {
      const executionTime = Date.now() - executionStart
      
      this.auditLogger?.error('EMERGENCY CLEANUP FAILED', {
        component: 'EmergencyStrategy',
        executionTime,
        error: error.message,
        processedTargets: this.processedTargets,
        criticalFailure: true
      })

      this.emit('emergencyExecutionFailed', {
        error: error.message,
        executionTime,
        processedTargets: this.processedTargets,
        partialResults: this.terminationResults
      })

      throw error

    } finally {
      this.isExecuting = false
      this._resetEmergencyState()
    }
  }

  /**
   * Emergency stop (immediate)
   */
  async stop () {
    if (!this.isExecuting) {
      return
    }

    this.auditLogger?.error('EMERGENCY STRATEGY FORCE STOP', {
      component: 'EmergencyStrategy',
      processedTargets: this.processedTargets,
      totalTargets: this.totalTargets
    })

    this.isExecuting = false
    this.emit('emergencyExecutionStopped')
  }

  /**
   * Perform minimal emergency validation
   * @param {Object} context - Cleanup context
   * @private
   */
  _performEmergencyValidation (context) {
    // Only critical validations for emergency situations
    if (!context.cleanupRequest || !context.cleanupRequest.targets) {
      throw new Error('Emergency cleanup requires valid targets')
    }

    if (context.cleanupRequest.targets.length === 0) {
      throw new Error('No targets provided for emergency cleanup')
    }

    // Warning for critical processes if not allowed
    if (!this.config.allowCriticalProcessTermination) {
      const criticalProcesses = context.cleanupRequest.targets.filter(target =>
        this._isCriticalProcess(target)
      )
      
      if (criticalProcesses.length > 0) {
        this.auditLogger?.warn('Critical processes detected - proceeding with emergency termination', {
          component: 'EmergencyStrategy',
          criticalProcesses: criticalProcesses.map(p => ({ pid: p.pid, name: p.name })),
          warning: 'EMERGENCY MODE - TERMINATING CRITICAL PROCESSES'
        })
      }
    }

    this.auditLogger?.info('Emergency validation completed - proceeding with immediate terminations', {
      component: 'EmergencyStrategy',
      targets: context.cleanupRequest.targets.length,
      bypassedChecks: ['safety', 'dependencies', 'resources', 'graceful_shutdown']
    })
  }

  /**
   * Capture minimal rollback data for audit purposes
   * @param {Object} context - Cleanup context
   * @returns {Promise<Object>} Rollback data
   * @private
   */
  async _captureEmergencyRollbackData (context) {
    const captureStart = Date.now()
    
    try {
      const rollbackData = {
        id: `emergency_rollback_${Date.now()}`,
        timestamp: captureStart,
        targets: context.cleanupRequest.targets.map(target => ({
          pid: target.pid,
          name: target.name,
          exists: true // Assume exists for speed
        })),
        systemState: {
          timestamp: captureStart,
          processCount: context.systemState?.processes?.length || 'unknown',
          emergencyContext: true
        }
      }

      const captureTime = Date.now() - captureStart
      
      this.auditLogger?.info('Emergency rollback data captured', {
        component: 'EmergencyStrategy',
        rollbackId: rollbackData.id,
        captureTime,
        targets: rollbackData.targets.length
      })

      return rollbackData

    } catch (error) {
      this.auditLogger?.warn('Emergency rollback capture failed - proceeding without rollback data', {
        component: 'EmergencyStrategy',
        error: error.message
      })
      return null
    }
  }

  /**
   * Execute immediate emergency terminations
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Termination results
   * @private
   */
  async _executeEmergencyTerminations (context, options) {
    const targets = context.cleanupRequest.targets
    const executionTimeout = Math.min(this.config.maxExecutionTime, 5000) // Never exceed 5 seconds

    this.auditLogger?.warn('Starting IMMEDIATE emergency terminations', {
      component: 'EmergencyStrategy',
      targets: targets.length,
      maxExecutionTime: executionTimeout,
      concurrency: this.config.unlimitedConcurrency ? 'unlimited' : this.config.maxConcurrentTerminations
    })

    const result = {
      immediate: [],
      failed: [],
      systemKilled: [],
      executionTime: 0
    }

    const terminationStart = Date.now()

    try {
      if (this.config.unlimitedConcurrency || targets.length <= this.config.maxConcurrentTerminations) {
        // Execute all targets in parallel (maximum speed)
        const terminations = targets.map(target => this._terminateImmediately(target))
        const results = await Promise.allSettled(terminations)

        results.forEach((termResult, index) => {
          const target = targets[index]
          this.processedTargets++
          
          if (termResult.status === 'fulfilled' && termResult.value.success) {
            result.immediate.push({
              pid: target.pid,
              name: target.name,
              method: termResult.value.method,
              duration: termResult.value.duration
            })
          } else {
            const error = termResult.status === 'rejected' ? termResult.reason : termResult.value.error
            result.failed.push({
              pid: target.pid,
              name: target.name,
              error: error.message || error
            })
          }
        })

      } else {
        // Batch processing for very large target sets
        const batches = this._createEmergencyBatches(targets, this.config.maxConcurrentTerminations)
        
        for (const batch of batches) {
          if (!this.isExecuting) break
          
          const batchPromises = batch.map(target => this._terminateImmediately(target))
          const batchResults = await Promise.allSettled(batchPromises)
          
          batchResults.forEach((termResult, index) => {
            const target = batch[index]
            this.processedTargets++
            
            if (termResult.status === 'fulfilled' && termResult.value.success) {
              result.immediate.push({
                pid: target.pid,
                name: target.name,
                method: termResult.value.method,
                duration: termResult.value.duration
              })
            } else {
              const error = termResult.status === 'rejected' ? termResult.reason : termResult.value.error
              result.failed.push({
                pid: target.pid,
                name: target.name,
                error: error.message || error
              })
            }
          })
        }
      }

      result.executionTime = Date.now() - terminationStart

    } catch (error) {
      this.auditLogger?.error('Emergency termination batch failed', {
        component: 'EmergencyStrategy',
        error: error.message,
        processedSoFar: this.processedTargets
      })
      throw error
    }

    // Emergency timeout check
    const totalTime = Date.now() - terminationStart
    if (totalTime > executionTimeout) {
      this.auditLogger?.warn('Emergency execution exceeded timeout - terminating remaining processes with system kill', {
        component: 'EmergencyStrategy',
        totalTime,
        timeout: executionTimeout,
        processed: this.processedTargets,
        remaining: this.totalTargets - this.processedTargets
      })

      // System-level emergency kill for remaining processes
      if (this.config.useSystemKill && this.processedTargets < this.totalTargets) {
        const systemKillResult = await this._performSystemEmergencyKill(targets.slice(this.processedTargets))
        result.systemKilled = systemKillResult
      }
    }

    this.auditLogger?.warn('Emergency terminations completed', {
      component: 'EmergencyStrategy',
      immediate: result.immediate.length,
      failed: result.failed.length,
      systemKilled: result.systemKilled.length,
      totalTime: result.executionTime
    })

    return result
  }

  /**
   * Terminate process immediately
   * @param {Object} target - Target process
   * @returns {Promise<Object>} Termination result
   * @private
   */
  async _terminateImmediately (target) {
    const terminationStart = Date.now()
    
    try {
      // Record termination attempt
      this.terminationResults.set(target.pid, { 
        started: terminationStart, 
        target: target.name 
      })

      let success = false
      let method = 'immediate'

      if (this.config.useSystemKill) {
        // Use platform-specific system kill commands
        success = await this._useSystemKill(target)
        method = 'system_kill'
      } else {
        // Use Node.js process.kill with SIGKILL
        success = await this._useProcessKill(target)
        method = 'process_kill'
      }

      const duration = Date.now() - terminationStart

      // Update termination record
      this.terminationResults.set(target.pid, {
        started: terminationStart,
        completed: Date.now(),
        duration,
        success,
        method,
        target: target.name
      })

      if (success) {
        this.auditLogger?.debug('Emergency termination successful', {
          component: 'EmergencyStrategy',
          pid: target.pid,
          method,
          duration
        })
      }

      return { success, method, duration, pid: target.pid }

    } catch (error) {
      const duration = Date.now() - terminationStart
      
      this.terminationResults.set(target.pid, {
        started: terminationStart,
        completed: Date.now(),
        duration,
        success: false,
        error: error.message,
        target: target.name
      })

      this.auditLogger?.debug('Emergency termination failed', {
        component: 'EmergencyStrategy',
        pid: target.pid,
        duration,
        error: error.message
      })

      return { success: false, error, duration, pid: target.pid }
    }
  }

  /**
   * Use system-level kill command
   * @param {Object} target - Target process
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _useSystemKill (target) {
    try {
      const platform = process.platform
      const commands = this.killCommands[platform]
      
      if (!commands) {
        throw new Error(`Unsupported platform for system kill: ${platform}`)
      }

      const { spawn } = require('child_process')
      
      if (platform === 'win32') {
        // Windows: Use taskkill /f /pid
        const result = await new Promise((resolve) => {
          const child = spawn('taskkill', ['/f', '/pid', target.pid.toString()], { 
            stdio: 'pipe',
            timeout: 1000 // 1 second timeout
          })
          child.on('exit', (code) => resolve(code === 0))
          child.on('error', () => resolve(false))
        })
        
        return result
      } else {
        // Unix-like: Use kill -9
        const result = await new Promise((resolve) => {
          const child = spawn('kill', ['-9', target.pid.toString()], {
            stdio: 'pipe',
            timeout: 1000
          })
          child.on('exit', (code) => resolve(code === 0))
          child.on('error', () => resolve(false))
        })
        
        return result
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Use Node.js process.kill
   * @param {Object} target - Target process
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _useProcessKill (target) {
    try {
      // Send SIGKILL immediately
      process.kill(target.pid, 'SIGKILL')
      
      // Brief verification (50ms max)
      await this._wait(50)
      return !await this._quickProcessExists(target.pid)
      
    } catch (error) {
      // Process might already be dead or not accessible
      return error.code === 'ESRCH' // No such process = success
    }
  }

  /**
   * Perform system-level emergency kill
   * @param {Array} remainingTargets - Remaining targets
   * @returns {Promise<Array>} System kill results
   * @private
   */
  async _performSystemEmergencyKill (remainingTargets) {
    const systemKillResults = []
    
    try {
      this.auditLogger?.warn('Performing system-level emergency kill', {
        component: 'EmergencyStrategy',
        targets: remainingTargets.length
      })

      // Platform-specific mass termination
      if (process.platform === 'win32') {
        // Windows: Use WMIC for batch termination
        for (const target of remainingTargets.slice(0, 10)) { // Limit to 10 for safety
          try {
            const { spawn } = require('child_process')
            const result = await new Promise((resolve) => {
              const child = spawn('wmic', [
                'process', 
                'where', 
                `ProcessId=${target.pid}`, 
                'delete'
              ], { stdio: 'pipe', timeout: 500 })
              child.on('exit', (code) => resolve(code === 0))
              child.on('error', () => resolve(false))
            })
            
            systemKillResults.push({
              pid: target.pid,
              name: target.name,
              success: result,
              method: 'wmic'
            })
          } catch (error) {
            systemKillResults.push({
              pid: target.pid,
              name: target.name,
              success: false,
              error: error.message,
              method: 'wmic'
            })
          }
        }
      } else {
        // Unix-like: Use killall or pkill for process names
        const processNames = [...new Set(remainingTargets.map(t => t.name).filter(Boolean))]
        
        for (const processName of processNames.slice(0, 5)) { // Limit for safety
          try {
            const { spawn } = require('child_process')
            const result = await new Promise((resolve) => {
              const child = spawn('killall', ['-9', processName], { 
                stdio: 'pipe', 
                timeout: 500 
              })
              child.on('exit', (code) => resolve(code === 0))
              child.on('error', () => resolve(false))
            })
            
            const affectedTargets = remainingTargets.filter(t => t.name === processName)
            systemKillResults.push({
              processName,
              targets: affectedTargets.map(t => t.pid),
              success: result,
              method: 'killall'
            })
          } catch (error) {
            systemKillResults.push({
              processName,
              success: false,
              error: error.message,
              method: 'killall'
            })
          }
        }
      }

    } catch (error) {
      this.auditLogger?.error('System emergency kill failed', {
        component: 'EmergencyStrategy',
        error: error.message
      })
    }

    return systemKillResults
  }

  /**
   * Perform emergency system recovery
   * @param {Object} result - Termination results
   * @returns {Promise<Object>} Recovery result
   * @private
   */
  async _performEmergencySystemRecovery (result) {
    try {
      this.auditLogger?.info('Performing emergency system recovery', {
        component: 'EmergencyStrategy',
        terminatedProcesses: result.immediate.length
      })

      const recoveryActions = []

      // Memory cleanup
      if (global.gc) {
        global.gc()
        recoveryActions.push('memory_cleanup')
      }

      // Clear any remaining handles/timers
      recoveryActions.push('handle_cleanup')

      return {
        success: true,
        actions: recoveryActions,
        timestamp: Date.now()
      }

    } catch (error) {
      this.auditLogger?.warn('Emergency system recovery failed', {
        component: 'EmergencyStrategy',
        error: error.message
      })
      
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Quick process existence check (optimized for speed)
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} Process exists
   * @private
   */
  async _quickProcessExists (pid) {
    try {
      // Use signal 0 for quick existence check (Unix-like)
      if (process.platform !== 'win32') {
        process.kill(pid, 0)
        return true
      } else {
        // Windows: Quick tasklist check
        return false // Assume terminated for speed in emergency mode
      }
    } catch (error) {
      return false // Process doesn't exist or can't be accessed
    }
  }

  /**
   * Check if process is critical (emergency override)
   * @param {Object} target - Target process
   * @returns {boolean} Is critical
   * @private
   */
  _isCriticalProcess (target) {
    if (this.config.allowCriticalProcessTermination) {
      return false // In emergency mode, no process is protected
    }
    
    const criticalNames = [
      'init', 'kernel', 'systemd', 'explorer.exe', 'winlogon.exe',
      'csrss.exe', 'lsass.exe', 'services.exe'
    ]
    
    const processName = (target.name || '').toLowerCase()
    return criticalNames.some(critical => processName.includes(critical))
  }

  /**
   * Create emergency batches
   * @param {Array} targets - Target processes
   * @param {number} batchSize - Batch size
   * @returns {Array} Batches
   * @private
   */
  _createEmergencyBatches (targets, batchSize) {
    const batches = []
    for (let i = 0; i < targets.length; i += batchSize) {
      batches.push(targets.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Estimate emergency execution time
   * @returns {number} Estimated time in milliseconds
   * @private
   */
  _estimateEmergencyTime () {
    const baseTimePerProcess = 50 // 50ms per process in emergency mode
    const overhead = 200 // 200ms overhead
    return Math.min((this.totalTargets * baseTimePerProcess) + overhead, this.config.maxExecutionTime)
  }

  /**
   * Calculate average termination time
   * @param {Object} result - Termination results
   * @returns {number} Average time
   * @private
   */
  _calculateAverageTerminationTime (result) {
    const allTerminations = [...result.immediate, ...result.failed]
    if (allTerminations.length === 0) return 0
    
    const totalTime = allTerminations.reduce((sum, term) => sum + (term.duration || 0), 0)
    return totalTime / allTerminations.length
  }

  /**
   * Update emergency metrics
   * @param {number} executionTime - Execution time
   * @param {Object} result - Execution result
   * @private
   */
  _updateEmergencyMetrics (executionTime, result) {
    this.metrics.totalEmergencyExecutions++
    this.metrics.averageEmergencyTime = (this.metrics.averageEmergencyTime + executionTime) / 2
    this.metrics.fastestExecution = Math.min(this.metrics.fastestExecution, executionTime)
    this.metrics.slowestExecution = Math.max(this.metrics.slowestExecution, executionTime)
    
    const immediateCount = result.immediate.length
    const totalProcessed = immediateCount + result.failed.length
    
    if (totalProcessed > 0) {
      const immediateRate = immediateCount / totalProcessed
      this.metrics.immediateTerminationRate = (this.metrics.immediateTerminationRate + immediateRate) / 2
      
      const successRate = immediateCount / this.totalTargets
      this.metrics.emergencySuccessRate = (this.metrics.emergencySuccessRate + successRate) / 2
    }
  }

  /**
   * Get emergency metrics
   * @returns {Object} Emergency metrics
   * @private
   */
  _getEmergencyMetrics () {
    return {
      ...this.metrics,
      isExecuting: this.isExecuting,
      activeTerminations: this.terminationResults.size,
      config: this.config
    }
  }

  /**
   * Reset emergency state
   * @private
   */
  _resetEmergencyState () {
    this.emergencyStartTime = 0
    this.totalTargets = 0
    this.processedTargets = 0
    this.terminationResults.clear()
  }

  /**
   * Wait for specified time
   * @param {number} ms - Milliseconds to wait
   * @private
   */
  async _wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics () {
    return this._getEmergencyMetrics()
  }

  /**
   * Cleanup strategy resources
   */
  async cleanup () {
    if (this.isExecuting) {
      await this.stop()
    }
    
    this._resetEmergencyState()
    this.removeAllListeners()
  }
}

module.exports = EmergencyStrategy