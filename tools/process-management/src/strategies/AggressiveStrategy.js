/**
 * Aggressive Strategy - Fast cleanup approach for urgent scenarios
 *
 * Strategy characteristics:
 * - Fast execution with minimal grace periods
 * - Parallel process termination for maximum speed
 * - Suitable for urgent cleanup scenarios
 * - Higher risk tolerance for faster completion
 * - Optimized for performance over safety margins
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')

/**
 * Fast cleanup strategy optimized for urgent scenarios
 */
class AggressiveStrategy extends EventEmitter {
  /**
   * Initialize AggressiveStrategy
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} config - Strategy configuration
   */
  constructor (dependencies = {}, config = {}) {
    super()

    this.name = 'AggressiveStrategy'
    this.description = 'Fast cleanup optimized for urgent scenarios'

    // Dependency injection
    this.processRegistry = dependencies.processRegistry
    this.realTimeMonitor = dependencies.realTimeMonitor
    this.auditLogger = dependencies.auditLogger

    // Configuration
    this.config = {
      // Timing settings - optimized for speed
      gracePeriod: config.gracePeriod || 1000, // 1 second grace period
      maxWaitTime: config.maxWaitTime || 10000, // 10 seconds max wait
      retryInterval: config.retryInterval || 200, // 200ms between retries
      maxRetries: config.maxRetries || 2,
      
      // Aggressiveness settings
      enableFastTermination: config.enableFastTermination !== false,
      skipDependencyAnalysis: config.skipDependencyAnalysis === true,
      forcedTerminationThreshold: config.forcedTerminationThreshold || 2000, // 2 seconds
      
      // Concurrency settings
      maxConcurrentTerminations: config.maxConcurrentTerminations || 10,
      batchSize: config.batchSize || 5,
      parallelExecution: config.parallelExecution !== false,
      
      // Safety overrides
      allowCriticalProcesses: config.allowCriticalProcesses === true,
      bypassResourceChecks: config.bypassResourceChecks === true,
      skipConfirmation: config.skipConfirmation !== false,
      
      ...config
    }

    // Strategy state
    this.isExecuting = false
    this.executionStats = {
      startTime: 0,
      endTime: 0,
      totalTargets: 0,
      processedTargets: 0,
      successfulTerminations: 0,
      failedTerminations: 0,
      forcedTerminations: 0,
      fastTerminations: 0
    }

    this.metrics = {
      totalExecutions: 0,
      averageExecutionTime: 0,
      averageTargetsPerSecond: 0,
      successRate: 0,
      parallelEfficiency: 0,
      resourceImpact: 0
    }

    // Active termination tracking
    this.activeTerminations = new Map()
    this.terminationPromises = new Set()
  }

  /**
   * Initialize the strategy
   */
  async initialize () {
    this.auditLogger?.info('AggressiveStrategy initialized', {
      component: 'AggressiveStrategy',
      config: this.config
    })
  }

  /**
   * Execute aggressive cleanup
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute (context, options = {}) {
    if (this.isExecuting) {
      throw new Error('AggressiveStrategy is already executing')
    }

    const executionStart = Date.now()
    this.isExecuting = true
    this.executionStats.startTime = executionStart
    this.executionStats.totalTargets = context.cleanupRequest.targets.length

    try {
      this.auditLogger?.info('AggressiveStrategy execution started', {
        component: 'AggressiveStrategy',
        targets: context.cleanupRequest.targets.length,
        config: {
          gracePeriod: this.config.gracePeriod,
          maxConcurrency: this.config.maxConcurrentTerminations,
          parallelExecution: this.config.parallelExecution
        }
      })

      // Phase 1: Quick system validation (minimal checks)
      await this._performQuickValidation(context)

      // Phase 2: Fast execution planning
      const executionPlan = await this._createFastExecutionPlan(context)

      // Phase 3: Parallel aggressive terminations
      const result = await this._executeAggressiveTerminations(executionPlan, context, options)

      // Phase 4: Quick result verification
      await this._quickResultVerification(result)

      const executionTime = Date.now() - executionStart
      this.executionStats.endTime = Date.now()
      this._updateMetrics(executionTime, result)

      const finalResult = {
        success: true,
        strategy: this.name,
        executionTime,
        targetsProcessed: result.successful.length + result.failed.length,
        successfulTerminations: result.successful,
        failedTerminations: result.failed,
        metrics: this._getExecutionMetrics(),
        performance: {
          targetsPerSecond: (result.successful.length / executionTime) * 1000,
          parallelEfficiency: this._calculateParallelEfficiency(result),
          resourceImpact: result.resourceImpact
        }
      }

      this.auditLogger?.info('AggressiveStrategy execution completed successfully', {
        component: 'AggressiveStrategy',
        ...finalResult.performance,
        executionTime,
        successRate: (result.successful.length / (result.successful.length + result.failed.length)) * 100
      })

      this.emit('executionCompleted', finalResult)
      return finalResult

    } catch (error) {
      const executionTime = Date.now() - executionStart
      this.executionStats.endTime = Date.now()
      
      this.auditLogger?.error('AggressiveStrategy execution failed', {
        component: 'AggressiveStrategy',
        executionTime,
        error: error.message,
        processedTargets: this.executionStats.processedTargets
      })

      this.emit('executionFailed', {
        error: error.message,
        executionTime,
        partialResult: {
          processedTargets: this.executionStats.processedTargets,
          successfulTerminations: this.executionStats.successfulTerminations,
          failedTerminations: this.executionStats.failedTerminations
        }
      })

      throw error

    } finally {
      this.isExecuting = false
      await this._cleanupActiveTerminations()
    }
  }

  /**
   * Stop strategy execution immediately
   */
  async stop () {
    if (!this.isExecuting) {
      return
    }

    this.auditLogger?.warn('AggressiveStrategy emergency stop requested', {
      component: 'AggressiveStrategy',
      activeTerminations: this.activeTerminations.size
    })

    this.isExecuting = false

    // Cancel all active terminations
    await this._cleanupActiveTerminations()

    this.emit('executionStopped')
  }

  /**
   * Perform minimal validation checks
   * @param {Object} context - Cleanup context
   * @private
   */
  async _performQuickValidation (context) {
    this.auditLogger?.info('Performing quick validation', {
      component: 'AggressiveStrategy',
      targets: context.cleanupRequest.targets.length
    })

    // Only critical validations for speed
    if (context.cleanupRequest.targets.length === 0) {
      throw new Error('No targets specified for cleanup')
    }

    // Optional: Basic system overload check
    if (!this.config.bypassResourceChecks) {
      const performance = context.performanceState
      if (performance.overallLoad > 0.95) {
        this.auditLogger?.warn('System critically overloaded but proceeding with aggressive strategy', {
          component: 'AggressiveStrategy',
          systemLoad: (performance.overallLoad * 100).toFixed(1) + '%'
        })
      }
    }

    // Filter critical processes if not allowed
    if (!this.config.allowCriticalProcesses) {
      const originalLength = context.cleanupRequest.targets.length
      context.cleanupRequest.targets = context.cleanupRequest.targets.filter(target => 
        !this._isCriticalProcess(target)
      )
      
      if (context.cleanupRequest.targets.length < originalLength) {
        this.auditLogger?.info('Filtered out critical processes', {
          component: 'AggressiveStrategy',
          removed: originalLength - context.cleanupRequest.targets.length,
          remaining: context.cleanupRequest.targets.length
        })
      }
    }
  }

  /**
   * Create fast execution plan
   * @param {Object} context - Cleanup context
   * @returns {Promise<Object>} Execution plan
   * @private
   */
  async _createFastExecutionPlan (context) {
    const targets = context.cleanupRequest.targets
    
    const plan = {
      batches: [],
      strategy: 'parallel_aggressive',
      estimatedTime: this._estimateExecutionTime(targets.length),
      concurrency: Math.min(this.config.maxConcurrentTerminations, targets.length)
    }

    if (this.config.parallelExecution && targets.length > this.config.batchSize) {
      // Create batches for parallel execution
      for (let i = 0; i < targets.length; i += this.config.batchSize) {
        plan.batches.push({
          id: Math.floor(i / this.config.batchSize) + 1,
          targets: targets.slice(i, i + this.config.batchSize),
          strategy: 'parallel'
        })
      }
    } else {
      // Single batch for smaller target sets
      plan.batches.push({
        id: 1,
        targets: targets,
        strategy: 'parallel'
      })
    }

    this.auditLogger?.info('Fast execution plan created', {
      component: 'AggressiveStrategy',
      batches: plan.batches.length,
      concurrency: plan.concurrency,
      estimatedTime: plan.estimatedTime,
      totalTargets: targets.length
    })

    return plan
  }

  /**
   * Execute aggressive terminations
   * @param {Object} plan - Execution plan
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   * @private
   */
  async _executeAggressiveTerminations (plan, context, options) {
    this.auditLogger?.info('Starting aggressive terminations', {
      component: 'AggressiveStrategy',
      batches: plan.batches.length,
      totalTargets: plan.batches.reduce((sum, batch) => sum + batch.targets.length, 0)
    })

    const allResults = {
      successful: [],
      failed: [],
      resourceImpact: await this._captureResourceBaseline()
    }

    for (const [batchIndex, batch] of plan.batches.entries()) {
      if (!this.isExecuting) {
        throw new Error('Execution stopped by user request')
      }

      this.auditLogger?.info(`Processing batch ${batch.id}`, {
        component: 'AggressiveStrategy',
        batchTargets: batch.targets.length,
        batchIndex: batchIndex + 1,
        totalBatches: plan.batches.length
      })

      const batchResult = await this._processBatch(batch, context, options)
      
      allResults.successful.push(...batchResult.successful)
      allResults.failed.push(...batchResult.failed)

      this.executionStats.processedTargets += batch.targets.length
      this.executionStats.successfulTerminations += batchResult.successful.length
      this.executionStats.failedTerminations += batchResult.failed.length

      // Brief pause between batches for system stability (minimal)
      if (batchIndex < plan.batches.length - 1) {
        await this._wait(50) // 50ms pause
      }
    }

    // Calculate final resource impact
    allResults.resourceImpact = await this._calculateResourceImpact(allResults.resourceImpact)

    this.auditLogger?.info('All batches completed', {
      component: 'AggressiveStrategy',
      totalSuccessful: allResults.successful.length,
      totalFailed: allResults.failed.length,
      resourceImpact: allResults.resourceImpact
    })

    return allResults
  }

  /**
   * Process a single batch of targets
   * @param {Object} batch - Batch to process
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Batch result
   * @private
   */
  async _processBatch (batch, context, options) {
    const batchStart = Date.now()
    const batchResult = {
      successful: [],
      failed: []
    }

    // Execute all targets in parallel with aggressive approach
    const terminations = batch.targets.map(target => 
      this._terminateProcessAggressively(target, context, options)
    )

    // Track active terminations
    terminations.forEach((promise, index) => {
      const target = batch.targets[index]
      this.activeTerminations.set(target.pid, promise)
      this.terminationPromises.add(promise)
    })

    try {
      const results = await Promise.allSettled(terminations)

      results.forEach((result, index) => {
        const target = batch.targets[index]
        this.activeTerminations.delete(target.pid)

        if (result.status === 'fulfilled' && result.value.success) {
          batchResult.successful.push({
            pid: target.pid,
            name: target.name,
            method: result.value.method,
            duration: result.value.duration,
            attempts: result.value.attempts
          })

          if (result.value.method === 'fast') {
            this.executionStats.fastTerminations++
          } else if (result.value.method === 'forced') {
            this.executionStats.forcedTerminations++
          }
        } else {
          const error = result.status === 'rejected' ? result.reason : result.value.error
          batchResult.failed.push({
            pid: target.pid,
            name: target.name,
            error: error.message || error,
            attempts: result.value?.attempts || 0
          })
        }
      })

      // Clean up promises
      terminations.forEach(promise => this.terminationPromises.delete(promise))

    } catch (error) {
      this.auditLogger?.error('Batch processing error', {
        component: 'AggressiveStrategy',
        batchId: batch.id,
        error: error.message
      })
      throw error
    }

    const batchTime = Date.now() - batchStart
    this.auditLogger?.info(`Batch ${batch.id} completed`, {
      component: 'AggressiveStrategy',
      duration: batchTime,
      successful: batchResult.successful.length,
      failed: batchResult.failed.length,
      rate: (batchResult.successful.length / batchTime) * 1000
    })

    return batchResult
  }

  /**
   * Terminate process aggressively
   * @param {Object} target - Target process
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Termination result
   * @private
   */
  async _terminateProcessAggressively (target, context, options) {
    const terminationStart = Date.now()
    let attempts = 0

    this.auditLogger?.debug('Starting aggressive termination', {
      component: 'AggressiveStrategy',
      pid: target.pid,
      name: target.name
    })

    try {
      // Strategy 1: Fast termination (immediate force kill)
      attempts++
      if (this.config.enableFastTermination) {
        const fastResult = await this._attemptFastTermination(target)
        if (fastResult) {
          const duration = Date.now() - terminationStart
          return { success: true, method: 'fast', duration, attempts, pid: target.pid }
        }
      }

      // Strategy 2: Brief grace period then forced termination
      attempts++
      const gracefulResult = await this._attemptGracefulWithTimeout(target, this.config.gracePeriod)
      if (gracefulResult) {
        const duration = Date.now() - terminationStart
        return { success: true, method: 'graceful', duration, attempts, pid: target.pid }
      }

      // Strategy 3: Immediate forced termination
      attempts++
      const forcedResult = await this._attemptForcedTermination(target)
      if (forcedResult) {
        const duration = Date.now() - terminationStart
        return { success: true, method: 'forced', duration, attempts, pid: target.pid }
      }

      // All strategies failed
      throw new Error(`All termination strategies failed after ${attempts} attempts`)

    } catch (error) {
      const duration = Date.now() - terminationStart

      this.auditLogger?.debug('Aggressive termination failed', {
        component: 'AggressiveStrategy',
        pid: target.pid,
        name: target.name,
        duration,
        attempts,
        error: error.message
      })

      return { success: false, error, duration, attempts, pid: target.pid }
    }
  }

  /**
   * Attempt fast termination (immediate kill)
   * @param {Object} target - Target process
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _attemptFastTermination (target) {
    try {
      if (process.platform === 'win32') {
        // Windows: Immediate force kill
        const { spawn } = require('child_process')
        const result = await Promise.race([
          new Promise((resolve) => {
            const child = spawn('taskkill', ['/pid', target.pid.toString(), '/f'], { stdio: 'pipe' })
            child.on('exit', (code) => resolve(code === 0))
          }),
          new Promise((resolve) => setTimeout(() => resolve(false), 1000)) // 1 second timeout
        ])
        return result
      } else {
        // Unix-like: Send SIGKILL immediately
        process.kill(target.pid, 'SIGKILL')
        
        // Quick verification (100ms check)
        await this._wait(100)
        return !await this._processExists(target.pid)
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Attempt graceful shutdown with timeout
   * @param {Object} target - Target process
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _attemptGracefulWithTimeout (target, timeout) {
    try {
      const gracefulPromise = this._attemptGracefulShutdown(target)
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve(false), timeout)
      )

      return await Promise.race([gracefulPromise, timeoutPromise])
    } catch (error) {
      return false
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
      if (process.platform === 'win32') {
        // Windows: Quick taskkill without /f flag
        const { spawn } = require('child_process')
        const result = await new Promise((resolve) => {
          const child = spawn('taskkill', ['/pid', target.pid.toString()], { stdio: 'pipe' })
          child.on('exit', (code) => resolve(code === 0))
        })
        
        if (result) {
          await this._wait(200) // Brief wait to confirm termination
          return !await this._processExists(target.pid)
        }
        return false
      } else {
        // Unix-like: Send SIGTERM
        process.kill(target.pid, 'SIGTERM')
        
        // Quick check
        await this._wait(200)
        return !await this._processExists(target.pid)
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Attempt forced termination
   * @param {Object} target - Target process
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _attemptForcedTermination (target) {
    try {
      if (process.platform === 'win32') {
        // Windows: Force kill with tree termination
        const { spawn } = require('child_process')
        const result = await new Promise((resolve) => {
          const child = spawn('taskkill', ['/pid', target.pid.toString(), '/f', '/t'], { stdio: 'pipe' })
          child.on('exit', (code) => resolve(code === 0))
        })
        return result
      } else {
        // Unix-like: Send SIGKILL
        process.kill(target.pid, 'SIGKILL')
        
        // Verify termination
        await this._wait(100)
        return !await this._processExists(target.pid)
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Quick result verification
   * @param {Object} result - Execution result
   * @private
   */
  async _quickResultVerification (result) {
    // Minimal verification for speed - just check if any processes were terminated
    if (result.successful.length === 0 && result.failed.length === 0) {
      throw new Error('No processes were processed during execution')
    }

    this.auditLogger?.info('Quick verification completed', {
      component: 'AggressiveStrategy',
      successful: result.successful.length,
      failed: result.failed.length,
      successRate: (result.successful.length / (result.successful.length + result.failed.length)) * 100
    })
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
      'csrss.exe', 'lsass.exe', 'services.exe'
    ]
    
    const processName = (target.name || '').toLowerCase()
    return criticalNames.some(critical => processName.includes(critical))
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
   * Capture resource baseline
   * @returns {Promise<Object>} Resource baseline
   * @private
   */
  async _captureResourceBaseline () {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      memory: memoryUsage.heapUsed,
      cpu: cpuUsage.user + cpuUsage.system,
      timestamp: Date.now()
    }
  }

  /**
   * Calculate resource impact
   * @param {Object} baseline - Resource baseline
   * @returns {Promise<Object>} Resource impact
   * @private
   */
  async _calculateResourceImpact (baseline) {
    const current = await this._captureResourceBaseline()
    
    return {
      memoryDelta: current.memory - baseline.memory,
      cpuDelta: current.cpu - baseline.cpu,
      duration: current.timestamp - baseline.timestamp,
      impact: 'minimal' // Aggressive strategy typically has minimal resource overhead
    }
  }

  /**
   * Calculate parallel efficiency
   * @param {Object} result - Execution result
   * @returns {number} Parallel efficiency score
   * @private
   */
  _calculateParallelEfficiency (result) {
    const totalProcessed = result.successful.length + result.failed.length
    const executionTime = this.executionStats.endTime - this.executionStats.startTime
    
    if (executionTime === 0 || totalProcessed === 0) return 0
    
    // Theoretical sequential time vs actual parallel time
    const avgProcessTime = 2000 // Estimated 2 seconds per process sequentially
    const theoreticalSequentialTime = totalProcessed * avgProcessTime
    const actualTime = executionTime
    
    return Math.min(theoreticalSequentialTime / actualTime, 10) // Cap at 10x efficiency
  }

  /**
   * Estimate execution time
   * @param {number} targetCount - Number of targets
   * @returns {number} Estimated time in milliseconds
   * @private
   */
  _estimateExecutionTime (targetCount) {
    const baseTimePerProcess = 500 // 500ms per process in parallel
    const batchOverhead = 100 // 100ms overhead per batch
    const concurrency = Math.min(this.config.maxConcurrentTerminations, targetCount)
    
    const parallelTime = Math.ceil(targetCount / concurrency) * baseTimePerProcess
    const batchCount = Math.ceil(targetCount / this.config.batchSize)
    const totalOverhead = batchCount * batchOverhead
    
    return parallelTime + totalOverhead
  }

  /**
   * Update strategy metrics
   * @param {number} executionTime - Execution time
   * @param {Object} result - Execution result
   * @private
   */
  _updateMetrics (executionTime, result) {
    this.metrics.totalExecutions++
    this.metrics.averageExecutionTime = (this.metrics.averageExecutionTime + executionTime) / 2
    
    const totalProcessed = result.successful.length + result.failed.length
    const targetsPerSecond = (totalProcessed / executionTime) * 1000
    this.metrics.averageTargetsPerSecond = (this.metrics.averageTargetsPerSecond + targetsPerSecond) / 2
    
    const successRate = totalProcessed > 0 ? result.successful.length / totalProcessed : 0
    this.metrics.successRate = (this.metrics.successRate + successRate) / 2
    
    this.metrics.parallelEfficiency = this._calculateParallelEfficiency(result)
  }

  /**
   * Get execution metrics
   * @returns {Object} Execution metrics
   * @private
   */
  _getExecutionMetrics () {
    return {
      ...this.metrics,
      executionStats: this.executionStats,
      currentlyExecuting: this.isExecuting,
      activeTerminations: this.activeTerminations.size
    }
  }

  /**
   * Cleanup active terminations
   * @private
   */
  async _cleanupActiveTerminations () {
    if (this.terminationPromises.size > 0) {
      this.auditLogger?.info('Cleaning up active terminations', {
        component: 'AggressiveStrategy',
        activeCount: this.terminationPromises.size
      })

      // Wait for active terminations to complete or timeout
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second timeout
      await Promise.race([
        Promise.allSettled(Array.from(this.terminationPromises)),
        timeoutPromise
      ])
    }

    this.activeTerminations.clear()
    this.terminationPromises.clear()
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
    return {
      ...this._getExecutionMetrics(),
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
    
    await this._cleanupActiveTerminations()
    this.removeAllListeners()
  }
}

module.exports = AggressiveStrategy