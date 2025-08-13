/**
 * Graceful Strategy - Conservative cleanup approach with maximum safety
 *
 * Strategy characteristics:
 * - Conservative approach prioritizing system stability
 * - Sequential process termination with grace periods
 * - Extensive dependency checking before actions
 * - Rollback-friendly operations with minimal system impact
 * - Preferred for low-risk scenarios and production environments
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')

/**
 * Conservative cleanup strategy with maximum safety measures
 */
class GracefulStrategy extends EventEmitter {
  /**
   * Initialize GracefulStrategy
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} config - Strategy configuration
   */
  constructor (dependencies = {}, config = {}) {
    super()

    this.name = 'GracefulStrategy'
    this.description = 'Conservative cleanup with maximum safety measures'

    // Dependency injection
    this.processRegistry = dependencies.processRegistry
    this.realTimeMonitor = dependencies.realTimeMonitor
    this.auditLogger = dependencies.auditLogger

    // Configuration
    this.config = {
      // Timing settings
      gracePeriod: config.gracePeriod || 5000, // 5 seconds grace period
      maxWaitTime: config.maxWaitTime || 30000, // 30 seconds max wait
      retryInterval: config.retryInterval || 1000, // 1 second between retries
      maxRetries: config.maxRetries || 3,
      
      // Safety settings
      enableDependencyCheck: config.enableDependencyCheck !== false,
      enableBackup: config.enableBackup !== false,
      requireConfirmation: config.requireConfirmation === true,
      skipCriticalProcesses: config.skipCriticalProcesses !== false,
      
      // Resource limits
      maxConcurrentTerminations: config.maxConcurrentTerminations || 2,
      cpuUsageThreshold: config.cpuUsageThreshold || 70, // 70% CPU limit
      memoryUsageThreshold: config.memoryUsageThreshold || 80, // 80% memory limit
      
      ...config
    }

    // Strategy state
    this.isExecuting = false
    this.terminatedProcesses = []
    this.failedTerminations = []
    this.metrics = {
      totalAttempts: 0,
      successfulTerminations: 0,
      gracefulShutdowns: 0,
      forcedTerminations: 0,
      averageGracePeriod: 0,
      safetyChecksPerformed: 0
    }
  }

  /**
   * Initialize the strategy
   */
  async initialize () {
    this.auditLogger?.info('GracefulStrategy initialized', {
      component: 'GracefulStrategy',
      config: this.config
    })
  }

  /**
   * Execute graceful cleanup
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute (context, options = {}) {
    if (this.isExecuting) {
      throw new Error('GracefulStrategy is already executing')
    }

    const executionStart = Date.now()
    this.isExecuting = true

    try {
      this.auditLogger?.info('GracefulStrategy execution started', {
        component: 'GracefulStrategy',
        targets: context.cleanupRequest.targets.length,
        context: context.summary
      })

      // Phase 1: Pre-execution safety checks
      await this._performSafetyChecks(context)

      // Phase 2: Analyze dependencies and create execution plan
      const executionPlan = await this._createExecutionPlan(context)

      // Phase 3: Execute graceful terminations
      const result = await this._executeGracefulTerminations(executionPlan, context, options)

      // Phase 4: Verify cleanup completion
      await this._verifyCleanupCompletion(result, context)

      const executionTime = Date.now() - executionStart
      this.metrics.totalAttempts++

      const finalResult = {
        success: true,
        strategy: this.name,
        executionTime,
        terminatedProcesses: this.terminatedProcesses,
        failedTerminations: this.failedTerminations,
        metrics: this._getExecutionMetrics(),
        safetyMeasures: result.safetyMeasures,
        rollbackData: result.rollbackData
      }

      this.auditLogger?.info('GracefulStrategy execution completed successfully', {
        component: 'GracefulStrategy',
        ...finalResult
      })

      this.emit('executionCompleted', finalResult)
      return finalResult

    } catch (error) {
      const executionTime = Date.now() - executionStart
      
      this.auditLogger?.error('GracefulStrategy execution failed', {
        component: 'GracefulStrategy',
        executionTime,
        error: error.message,
        terminatedProcesses: this.terminatedProcesses.length,
        failedTerminations: this.failedTerminations.length
      })

      this.emit('executionFailed', {
        error: error.message,
        executionTime,
        partialResult: {
          terminatedProcesses: this.terminatedProcesses,
          failedTerminations: this.failedTerminations
        }
      })

      throw error

    } finally {
      this.isExecuting = false
      this._resetExecutionState()
    }
  }

  /**
   * Stop strategy execution
   */
  async stop () {
    if (!this.isExecuting) {
      return
    }

    this.auditLogger?.warn('GracefulStrategy stop requested', {
      component: 'GracefulStrategy'
    })

    this.isExecuting = false
    this.emit('executionStopped')
  }

  /**
   * Perform comprehensive safety checks
   * @param {Object} context - Cleanup context
   * @private
   */
  async _performSafetyChecks (context) {
    this.auditLogger?.info('Performing safety checks', {
      component: 'GracefulStrategy',
      checks: ['system_load', 'critical_processes', 'dependencies', 'resources']
    })

    // Check system load
    const performance = context.performanceState
    if (performance.overallLoad > 0.8) {
      throw new Error(`System load too high for graceful cleanup: ${(performance.overallLoad * 100).toFixed(1)}%`)
    }

    // Check for critical processes
    if (this.config.skipCriticalProcesses) {
      const criticalProcesses = context.cleanupRequest.targets.filter(target => 
        this._isCriticalProcess(target)
      )
      
      if (criticalProcesses.length > 0) {
        this.auditLogger?.warn('Critical processes detected - will be skipped', {
          component: 'GracefulStrategy',
          criticalProcesses: criticalProcesses.map(p => ({ pid: p.pid, name: p.name }))
        })
        
        // Remove critical processes from targets
        context.cleanupRequest.targets = context.cleanupRequest.targets.filter(target =>
          !this._isCriticalProcess(target)
        )
      }
    }

    // Check resource constraints
    const memoryUsage = performance.memory?.percentage || 0
    const cpuUsage = performance.cpu?.percentage || 0

    if (memoryUsage > this.config.memoryUsageThreshold) {
      throw new Error(`Memory usage too high: ${memoryUsage.toFixed(1)}%`)
    }

    if (cpuUsage > this.config.cpuUsageThreshold) {
      throw new Error(`CPU usage too high: ${cpuUsage.toFixed(1)}%`)
    }

    this.metrics.safetyChecksPerformed++

    this.auditLogger?.info('Safety checks completed successfully', {
      component: 'GracefulStrategy',
      systemLoad: (performance.overallLoad * 100).toFixed(1) + '%',
      memoryUsage: memoryUsage.toFixed(1) + '%',
      cpuUsage: cpuUsage.toFixed(1) + '%',
      targetsAfterFiltering: context.cleanupRequest.targets.length
    })
  }

  /**
   * Create execution plan with dependency ordering
   * @param {Object} context - Cleanup context
   * @returns {Promise<Object>} Execution plan
   * @private
   */
  async _createExecutionPlan (context) {
    this.auditLogger?.info('Creating graceful execution plan', {
      component: 'GracefulStrategy',
      targets: context.cleanupRequest.targets.length
    })

    const plan = {
      phases: [],
      rollbackData: new Map(),
      safetyMeasures: []
    }

    // Sort targets by dependency order (children first, then parents)
    const sortedTargets = await this._sortByDependencies(context.cleanupRequest.targets, context.dependencies)

    // Group targets into phases to respect concurrency limits
    const phases = []
    for (let i = 0; i < sortedTargets.length; i += this.config.maxConcurrentTerminations) {
      phases.push(sortedTargets.slice(i, i + this.config.maxConcurrentTerminations))
    }

    plan.phases = phases.map((phaseTargets, index) => ({
      phaseNumber: index + 1,
      targets: phaseTargets,
      estimatedTime: this._estimatePhaseTime(phaseTargets),
      safetyChecks: this._definePhaseSafetyChecks(phaseTargets)
    }))

    // Capture rollback data
    for (const target of context.cleanupRequest.targets) {
      plan.rollbackData.set(target.pid, await this._captureProcessState(target.pid))
    }

    plan.safetyMeasures = [
      'dependency_ordering',
      'phased_execution',
      'grace_periods',
      'rollback_data_captured',
      'resource_monitoring'
    ]

    this.auditLogger?.info('Execution plan created', {
      component: 'GracefulStrategy',
      phases: plan.phases.length,
      totalTargets: context.cleanupRequest.targets.length,
      estimatedTime: plan.phases.reduce((sum, phase) => sum + phase.estimatedTime, 0),
      safetyMeasures: plan.safetyMeasures
    })

    return plan
  }

  /**
   * Execute graceful terminations according to plan
   * @param {Object} plan - Execution plan
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   * @private
   */
  async _executeGracefulTerminations (plan, context, options) {
    this.auditLogger?.info('Starting graceful terminations', {
      component: 'GracefulStrategy',
      phases: plan.phases.length,
      totalTargets: plan.phases.reduce((sum, phase) => sum + phase.targets.length, 0)
    })

    const result = {
      phasesCompleted: 0,
      successfulTerminations: [],
      failedTerminations: [],
      safetyMeasures: plan.safetyMeasures,
      rollbackData: plan.rollbackData
    }

    for (const [phaseIndex, phase] of plan.phases.entries()) {
      if (!this.isExecuting) {
        throw new Error('Execution stopped by user request')
      }

      this.auditLogger?.info(`Executing phase ${phase.phaseNumber}`, {
        component: 'GracefulStrategy',
        phaseTargets: phase.targets.length,
        estimatedTime: phase.estimatedTime
      })

      // Perform phase safety checks
      await this._performPhaseSafetyChecks(phase, context)

      // Execute phase with graceful terminations
      const phaseResult = await this._executePhase(phase, context, options)

      result.successfulTerminations.push(...phaseResult.successful)
      result.failedTerminations.push(...phaseResult.failed)
      result.phasesCompleted++

      // Wait between phases for system stabilization
      if (phaseIndex < plan.phases.length - 1) {
        await this._waitForSystemStabilization()
      }

      this.auditLogger?.info(`Phase ${phase.phaseNumber} completed`, {
        component: 'GracefulStrategy',
        successful: phaseResult.successful.length,
        failed: phaseResult.failed.length,
        totalProcessed: result.phasesCompleted,
        remaining: plan.phases.length - result.phasesCompleted
      })
    }

    this.terminatedProcesses = result.successfulTerminations
    this.failedTerminations = result.failedTerminations

    this.auditLogger?.info('All phases completed', {
      component: 'GracefulStrategy',
      totalSuccessful: result.successfulTerminations.length,
      totalFailed: result.failedTerminations.length,
      phasesCompleted: result.phasesCompleted
    })

    return result
  }

  /**
   * Execute a single phase
   * @param {Object} phase - Phase to execute
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Phase result
   * @private
   */
  async _executePhase (phase, context, options) {
    const phaseStart = Date.now()
    const phaseResult = {
      successful: [],
      failed: []
    }

    // Execute terminations in parallel within concurrency limits
    const terminations = phase.targets.map(target => 
      this._terminateProcessGracefully(target, context, options)
    )

    const results = await Promise.allSettled(terminations)

    results.forEach((result, index) => {
      const target = phase.targets[index]
      if (result.status === 'fulfilled' && result.value.success) {
        phaseResult.successful.push({
          pid: target.pid,
          name: target.name,
          method: result.value.method,
          duration: result.value.duration
        })
        this.metrics.successfulTerminations++
        if (result.value.method === 'graceful') {
          this.metrics.gracefulShutdowns++
        } else {
          this.metrics.forcedTerminations++
        }
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value.error
        phaseResult.failed.push({
          pid: target.pid,
          name: target.name,
          error: error.message || error
        })
      }
    })

    const phaseTime = Date.now() - phaseStart
    this.auditLogger?.info(`Phase execution completed`, {
      component: 'GracefulStrategy',
      phaseNumber: phase.phaseNumber,
      duration: phaseTime,
      successful: phaseResult.successful.length,
      failed: phaseResult.failed.length
    })

    return phaseResult
  }

  /**
   * Terminate a process gracefully
   * @param {Object} target - Target process
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Termination result
   * @private
   */
  async _terminateProcessGracefully (target, context, options) {
    const terminationStart = Date.now()

    this.auditLogger?.info('Starting graceful termination', {
      component: 'GracefulStrategy',
      pid: target.pid,
      name: target.name
    })

    try {
      // Step 1: Attempt graceful shutdown
      let success = await this._attemptGracefulShutdown(target)
      let method = 'graceful'

      if (!success) {
        // Step 2: Wait grace period and retry
        await this._wait(this.config.gracePeriod)
        success = await this._attemptGracefulShutdown(target)
      }

      if (!success) {
        // Step 3: Escalate to forced termination with additional safety checks
        if (await this._canPerformForcedTermination(target, context)) {
          success = await this._performForcedTermination(target)
          method = 'forced'
        } else {
          throw new Error('Forced termination blocked by safety checks')
        }
      }

      const duration = Date.now() - terminationStart
      this.metrics.averageGracePeriod = (this.metrics.averageGracePeriod + duration) / 2

      this.auditLogger?.info('Process terminated successfully', {
        component: 'GracefulStrategy',
        pid: target.pid,
        method,
        duration
      })

      return { success: true, method, duration, pid: target.pid }

    } catch (error) {
      const duration = Date.now() - terminationStart

      this.auditLogger?.error('Process termination failed', {
        component: 'GracefulStrategy',
        pid: target.pid,
        name: target.name,
        duration,
        error: error.message
      })

      return { success: false, error, duration, pid: target.pid }
    }
  }

  /**
   * Attempt graceful shutdown
   * @param {Object} target - Target process
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _attemptGracefulShutdown (target) {
    try {
      // Platform-specific graceful shutdown
      if (process.platform === 'win32') {
        // Windows: Send WM_CLOSE message or use taskkill /t
        const { spawn } = require('child_process')
        const result = await new Promise((resolve) => {
          const child = spawn('taskkill', ['/pid', target.pid.toString(), '/t'], { stdio: 'pipe' })
          child.on('exit', (code) => resolve(code === 0))
        })
        return result
      } else {
        // Unix-like: Send SIGTERM
        process.kill(target.pid, 'SIGTERM')
        
        // Wait a short period and check if process still exists
        await this._wait(1000)
        return !await this._processExists(target.pid)
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Check if forced termination can be performed
   * @param {Object} target - Target process
   * @param {Object} context - Cleanup context
   * @returns {Promise<boolean>} Can perform forced termination
   * @private
   */
  async _canPerformForcedTermination (target, context) {
    // Additional safety checks before forced termination
    if (this._isCriticalProcess(target)) {
      return false
    }

    // Check if process has important children that might be affected
    const children = await this._getProcessChildren(target.pid)
    if (children.length > 5) {
      this.auditLogger?.warn('Process has many children - forced termination may have side effects', {
        component: 'GracefulStrategy',
        pid: target.pid,
        childrenCount: children.length
      })
      return false
    }

    // Check current system load
    const currentPerformance = await this._getCurrentPerformanceState()
    if (currentPerformance.overallLoad > 0.9) {
      return false
    }

    return true
  }

  /**
   * Perform forced termination
   * @param {Object} target - Target process
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _performForcedTermination (target) {
    try {
      if (process.platform === 'win32') {
        // Windows: Force kill
        const { spawn } = require('child_process')
        const result = await new Promise((resolve) => {
          const child = spawn('taskkill', ['/pid', target.pid.toString(), '/f', '/t'], { stdio: 'pipe' })
          child.on('exit', (code) => resolve(code === 0))
        })
        return result
      } else {
        // Unix-like: Send SIGKILL
        process.kill(target.pid, 'SIGKILL')
        
        // Wait and verify
        await this._wait(500)
        return !await this._processExists(target.pid)
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Sort targets by dependencies
   * @param {Array} targets - Target processes
   * @param {Object} dependencies - Dependency information
   * @returns {Promise<Array>} Sorted targets
   * @private
   */
  async _sortByDependencies (targets, dependencies) {
    // Create dependency graph
    const dependencyMap = new Map()
    
    for (const target of targets) {
      dependencyMap.set(target.pid, {
        target,
        children: [],
        parents: []
      })
    }

    // Build dependency relationships
    if (dependencies && dependencies.dependencies) {
      for (const dep of dependencies.dependencies) {
        const parent = dependencyMap.get(dep.target)
        if (parent) {
          for (const childPid of dep.children) {
            const child = dependencyMap.get(childPid)
            if (child) {
              parent.children.push(child)
              child.parents.push(parent)
            }
          }
        }
      }
    }

    // Topological sort (children first)
    const sorted = []
    const visited = new Set()
    const visiting = new Set()

    const visit = (node) => {
      if (visiting.has(node.target.pid)) {
        // Circular dependency - handle gracefully
        return
      }
      if (visited.has(node.target.pid)) {
        return
      }

      visiting.add(node.target.pid)
      
      // Visit children first
      for (const child of node.children) {
        visit(child)
      }
      
      visiting.delete(node.target.pid)
      visited.add(node.target.pid)
      sorted.push(node.target)
    }

    for (const node of dependencyMap.values()) {
      if (!visited.has(node.target.pid)) {
        visit(node)
      }
    }

    return sorted
  }

  /**
   * Estimate phase execution time
   * @param {Array} targets - Phase targets
   * @returns {number} Estimated time in milliseconds
   * @private
   */
  _estimatePhaseTime (targets) {
    // Base time per process + grace period + safety margin
    const baseTimePerProcess = 2000 // 2 seconds base
    const gracePeriodTime = this.config.gracePeriod
    const safetyMargin = 1000 // 1 second safety margin
    
    return (targets.length * baseTimePerProcess) + gracePeriodTime + safetyMargin
  }

  /**
   * Define phase safety checks
   * @param {Array} targets - Phase targets
   * @returns {Array} Safety check definitions
   * @private
   */
  _definePhaseSafetyChecks (targets) {
    return [
      'system_load_check',
      'resource_availability_check',
      'dependency_validation',
      'critical_process_filter'
    ]
  }

  /**
   * Perform phase-specific safety checks
   * @param {Object} phase - Phase to check
   * @param {Object} context - Cleanup context
   * @private
   */
  async _performPhaseSafetyChecks (phase, context) {
    // Check if system is still in acceptable state
    const currentPerformance = await this._getCurrentPerformanceState()
    if (currentPerformance.overallLoad > 0.85) {
      throw new Error(`System load increased during execution: ${(currentPerformance.overallLoad * 100).toFixed(1)}%`)
    }

    // Verify processes still exist and are in expected state
    for (const target of phase.targets) {
      const exists = await this._processExists(target.pid)
      if (!exists) {
        this.auditLogger?.warn('Target process no longer exists', {
          component: 'GracefulStrategy',
          pid: target.pid,
          name: target.name
        })
      }
    }
  }

  /**
   * Wait for system stabilization between phases
   * @private
   */
  async _waitForSystemStabilization () {
    const stabilizationTime = 2000 // 2 seconds
    
    this.auditLogger?.info('Waiting for system stabilization', {
      component: 'GracefulStrategy',
      waitTime: stabilizationTime
    })
    
    await this._wait(stabilizationTime)
  }

  /**
   * Verify cleanup completion
   * @param {Object} result - Execution result
   * @param {Object} context - Cleanup context
   * @private
   */
  async _verifyCleanupCompletion (result, context) {
    this.auditLogger?.info('Verifying cleanup completion', {
      component: 'GracefulStrategy',
      successful: result.successfulTerminations.length,
      failed: result.failedTerminations.length
    })

    // Verify terminated processes no longer exist
    for (const terminated of result.successfulTerminations) {
      const exists = await this._processExists(terminated.pid)
      if (exists) {
        throw new Error(`Process ${terminated.pid} still exists after termination`)
      }
    }

    // Check for any unexpected side effects
    const currentProcesses = await this.processRegistry?.getRunningProcesses() || []
    const unexpectedTerminations = []

    // This is a simplified check - in production, you'd want more sophisticated verification
    if (currentProcesses.length < context.systemState.processes.length - result.successfulTerminations.length) {
      this.auditLogger?.warn('Detected unexpected process terminations', {
        component: 'GracefulStrategy',
        expectedRemaining: context.systemState.processes.length - result.successfulTerminations.length,
        actualRemaining: currentProcesses.length
      })
    }
  }

  /**
   * Check if process is critical
   * @param {Object} target - Target process
   * @returns {boolean} Is critical
   * @private
   */
  _isCriticalProcess (target) {
    const criticalNames = [
      'init', 'kernel', 'systemd', 'explorer.exe', 'winlogon.exe', 
      'csrss.exe', 'lsass.exe', 'services.exe', 'svchost.exe'
    ]
    
    const processName = (target.name || '').toLowerCase()
    return criticalNames.some(critical => processName.includes(critical))
  }

  /**
   * Get process children
   * @param {number} pid - Parent process ID
   * @returns {Promise<Array>} Child processes
   * @private
   */
  async _getProcessChildren (pid) {
    try {
      const allProcesses = await this.processRegistry?.getRunningProcesses() || []
      return allProcesses.filter(p => p.parentPid === pid)
    } catch (error) {
      return []
    }
  }

  /**
   * Check if process exists
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} Process exists
   * @private
   */
  async _processExists (pid) {
    try {
      if (process.platform === 'win32') {
        const { spawn } = require('child_process')
        return new Promise((resolve) => {
          const child = spawn('tasklist', ['/fi', `PID eq ${pid}`], { stdio: 'pipe' })
          let output = ''
          child.stdout.on('data', (data) => { output += data.toString() })
          child.on('exit', () => {
            resolve(output.includes(pid.toString()))
          })
        })
      } else {
        process.kill(pid, 0) // Signal 0 just checks existence
        return true
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Capture process state for rollback
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Process state
   * @private
   */
  async _captureProcessState (pid) {
    try {
      const processInfo = await this.realTimeMonitor?.getProcessInfo?.(pid)
      return {
        pid,
        exists: true,
        info: processInfo,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        pid,
        exists: false,
        error: error.message,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Get current performance state
   * @returns {Promise<Object>} Performance state
   * @private
   */
  async _getCurrentPerformanceState () {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percentage: ((cpuUsage.user + cpuUsage.system) / 1000000)
      },
      overallLoad: Math.max(
        (memoryUsage.heapUsed / memoryUsage.heapTotal),
        Math.min(((cpuUsage.user + cpuUsage.system) / 1000000) / 100, 1)
      ),
      timestamp: Date.now()
    }
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
   * Get execution metrics
   * @returns {Object} Execution metrics
   * @private
   */
  _getExecutionMetrics () {
    return {
      ...this.metrics,
      successRate: this.metrics.totalAttempts > 0 ? 
        this.metrics.successfulTerminations / this.metrics.totalAttempts : 0,
      gracefulShutdownRate: this.metrics.successfulTerminations > 0 ?
        this.metrics.gracefulShutdowns / this.metrics.successfulTerminations : 0
    }
  }

  /**
   * Reset execution state
   * @private
   */
  _resetExecutionState () {
    this.terminatedProcesses = []
    this.failedTerminations = []
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics () {
    return {
      ...this._getExecutionMetrics(),
      isExecuting: this.isExecuting,
      config: this.config
    }
  }

  /**
   * Cleanup strategy resources
   */
  async cleanup () {
    if (this.isExecuting) {
      await this.stop()
    }
    
    this.removeAllListeners()
  }
}

module.exports = GracefulStrategy