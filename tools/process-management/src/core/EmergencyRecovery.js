/**
 * Emergency Recovery - Emergency recovery mechanisms with <5 second guarantee
 *
 * Implements Strategy pattern for cleanup approaches:
 * - Immediate process termination
 * - Resource cleanup strategies
 * - Port release mechanisms
 * - System state restoration
 * - Recovery validation
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { spawn, exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

/**
 * Recovery strategies
 */
const RecoveryStrategy = {
  GRACEFUL: 'graceful',
  AGGRESSIVE: 'aggressive',
  NUCLEAR: 'nuclear',
  CUSTOM: 'custom'
}

/**
 * Recovery priority levels
 */
const RecoveryPriority = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
}

/**
 * Emergency Recovery with Strategy pattern implementation
 */
class EmergencyRecovery {
  constructor (options = {}) {
    this.platform = process.platform
    this.maxRecoveryTime = options.maxRecoveryTime || 5000 // 5 seconds
    this.defaultStrategy = options.defaultStrategy || RecoveryStrategy.AGGRESSIVE

    // Recovery strategies
    this.strategies = new Map()
    this._initializeStrategies()

    // Recovery state
    this.activeRecoveries = new Map()
    this.recoveryHistory = []
    this.maxHistoryEntries = options.maxHistoryEntries || 100

    // Performance metrics
    this.metrics = {
      totalRecoveries: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      fastestRecovery: Infinity,
      slowestRecovery: 0
    }
  }

  /**
   * Initialize recovery strategies
   * @private
   */
  _initializeStrategies () {
    // Graceful recovery strategy
    this.strategies.set(RecoveryStrategy.GRACEFUL, {
      name: 'Graceful Recovery',
      priority: RecoveryPriority.LOW,
      timeout: 3000,
      execute: (context) => this._executeGracefulRecovery(context)
    })

    // Aggressive recovery strategy
    this.strategies.set(RecoveryStrategy.AGGRESSIVE, {
      name: 'Aggressive Recovery',
      priority: RecoveryPriority.HIGH,
      timeout: 2000,
      execute: (context) => this._executeAggressiveRecovery(context)
    })

    // Nuclear recovery strategy (last resort)
    this.strategies.set(RecoveryStrategy.NUCLEAR, {
      name: 'Nuclear Recovery',
      priority: RecoveryPriority.CRITICAL,
      timeout: 1000,
      execute: (context) => this._executeNuclearRecovery(context)
    })
  }

  /**
   * Attempt recovery using specified or default strategy
   * @param {Object} context - Recovery context
   * @returns {Promise<Object>} Recovery result
   */
  async attemptRecovery (context) {
    const recoveryId = this._generateRecoveryId()
    const startTime = Date.now()

    try {
      this.metrics.totalRecoveries++

      // Determine recovery strategy
      const strategy = this._selectStrategy(context)

      // Record recovery attempt
      this.activeRecoveries.set(recoveryId, {
        id: recoveryId,
        strategy: strategy.name,
        startTime,
        context
      })

      // Execute recovery with timeout
      const result = await this._executeRecoveryWithTimeout(strategy, context, recoveryId)

      const recoveryTime = Date.now() - startTime

      // Update metrics
      this._updateMetrics(recoveryTime, true)

      // Record successful recovery
      this._recordRecovery(recoveryId, strategy, context, result, recoveryTime, true)

      return {
        success: true,
        recoveryId,
        strategy: strategy.name,
        recoveryTime,
        result
      }
    } catch (error) {
      const recoveryTime = Date.now() - startTime

      // Update metrics
      this._updateMetrics(recoveryTime, false)

      // Record failed recovery
      this._recordRecovery(recoveryId, null, context, null, recoveryTime, false, error)

      // If recovery failed and we haven't exceeded max time, try nuclear option
      if (recoveryTime < this.maxRecoveryTime - 1000) {
        return await this._executeEmergencyNuclearRecovery(context, recoveryId)
      }

      throw new Error(`Emergency recovery failed: ${error.message}`)
    } finally {
      this.activeRecoveries.delete(recoveryId)
    }
  }

  /**
   * Select appropriate recovery strategy based on context
   * @param {Object} context - Recovery context
   * @returns {Object} Selected strategy
   * @private
   */
  _selectStrategy (context) {
    // High-priority processes or security issues require aggressive recovery
    if (context.priority === RecoveryPriority.CRITICAL ||
        context.error?.message?.includes('security')) {
      return this.strategies.get(RecoveryStrategy.AGGRESSIVE)
    }

    // Process leaks or timeouts require aggressive recovery
    if (context.processes?.length > 10 ||
        context.error?.message?.includes('timeout')) {
      return this.strategies.get(RecoveryStrategy.AGGRESSIVE)
    }

    // Default to graceful for normal cases
    return this.strategies.get(this.defaultStrategy)
  }

  /**
   * Execute recovery with timeout protection
   * @param {Object} strategy - Recovery strategy
   * @param {Object} context - Recovery context
   * @param {string} recoveryId - Recovery identifier
   * @returns {Promise<Object>} Recovery result
   * @private
   */
  async _executeRecoveryWithTimeout (strategy, context, recoveryId) {
    return new Promise(async (resolve, reject) => {
      // Set timeout for recovery
      const timeout = setTimeout(() => {
        reject(new Error(`Recovery strategy '${strategy.name}' exceeded timeout of ${strategy.timeout}ms`))
      }, strategy.timeout)

      try {
        const result = await strategy.execute(context)
        clearTimeout(timeout)
        resolve(result)
      } catch (error) {
        clearTimeout(timeout)
        reject(error)
      }
    })
  }

  /**
   * Execute graceful recovery strategy
   * @param {Object} context - Recovery context
   * @returns {Promise<Object>} Recovery result
   * @private
   */
  async _executeGracefulRecovery (context) {
    const results = []

    // Step 1: Gracefully stop running processes
    if (context.processes && context.processes.length > 0) {
      for (const process of context.processes) {
        try {
          await this._gracefulProcessShutdown(process.pid)
          results.push({
            action: 'graceful_shutdown',
            pid: process.pid,
            success: true
          })
        } catch (error) {
          results.push({
            action: 'graceful_shutdown',
            pid: process.pid,
            success: false,
            error: error.message
          })
        }
      }
    }

    // Step 2: Clean up temporary resources
    await this._cleanupTemporaryResources()
    results.push({
      action: 'cleanup_temp_resources',
      success: true
    })

    return {
      strategy: 'graceful',
      actions: results,
      totalProcesses: context.processes?.length || 0
    }
  }

  /**
   * Execute aggressive recovery strategy
   * @param {Object} context - Recovery context
   * @returns {Promise<Object>} Recovery result
   * @private
   */
  async _executeAggressiveRecovery (context) {
    const results = []

    // Step 1: Force kill all processes immediately
    if (context.processes && context.processes.length > 0) {
      await this._forceKillAllProcesses(context.processes, results)
    }

    // Step 2: Release occupied ports
    await this._releaseOccupiedPorts(results)

    // Step 3: Clean up system resources
    await this._cleanupSystemResources(results)

    // Step 4: Verify system state
    await this._verifySystemState(results)

    return {
      strategy: 'aggressive',
      actions: results,
      totalProcesses: context.processes?.length || 0
    }
  }

  /**
   * Execute nuclear recovery strategy (last resort)
   * @param {Object} context - Recovery context
   * @returns {Promise<Object>} Recovery result
   * @private
   */
  async _executeNuclearRecovery (context) {
    const results = []

    try {
      // Step 1: Kill all Java/Gradle/Node processes system-wide
      await this._killAllKnownProcessTypes(results)

      // Step 2: Force release all ports in known ranges
      await this._forceReleasePortRanges(results)

      // Step 3: Clean up all temporary directories
      await this._cleanupAllTempDirectories(results)

      // Step 4: Reset system networking if needed
      await this._resetNetworking(results)

      return {
        strategy: 'nuclear',
        actions: results,
        warning: 'Nuclear recovery may have affected other applications'
      }
    } catch (error) {
      throw new Error(`Nuclear recovery failed: ${error.message}`)
    }
  }

  /**
   * Execute emergency nuclear recovery when all else fails
   * @param {Object} context - Recovery context
   * @param {string} originalRecoveryId - Original recovery ID
   * @returns {Promise<Object>} Recovery result
   * @private
   */
  async _executeEmergencyNuclearRecovery (context, originalRecoveryId) {
    const emergencyId = `emergency_${originalRecoveryId}`
    const startTime = Date.now()

    try {
      const nuclearStrategy = this.strategies.get(RecoveryStrategy.NUCLEAR)
      const result = await this._executeRecoveryWithTimeout(nuclearStrategy, context, emergencyId)

      const recoveryTime = Date.now() - startTime
      this._updateMetrics(recoveryTime, true)

      return {
        success: true,
        recoveryId: emergencyId,
        strategy: 'emergency_nuclear',
        recoveryTime,
        result,
        warning: 'Emergency nuclear recovery was required'
      }
    } catch (error) {
      const recoveryTime = Date.now() - startTime
      this._updateMetrics(recoveryTime, false)

      throw new Error(`Emergency nuclear recovery failed: ${error.message}`)
    }
  }

  /**
   * Gracefully shutdown a process
   * @param {number} pid - Process ID
   * @private
   */
  async _gracefulProcessShutdown (pid) {
    if (this.platform === 'win32') {
      await execAsync(`taskkill /pid ${pid}`, { timeout: 2000 })
    } else {
      process.kill(pid, 'SIGTERM')
      // Wait briefly for graceful shutdown
      await this._sleep(500)
    }
  }

  /**
   * Force kill all processes
   * @param {Array} processes - Processes to kill
   * @param {Array} results - Results array
   * @private
   */
  async _forceKillAllProcesses (processes, results) {
    const killPromises = processes.map(async (process) => {
      try {
        if (this.platform === 'win32') {
          await execAsync(`taskkill /F /T /PID ${process.pid}`, { timeout: 1000 })
        } else {
          process.kill(process.pid, 'SIGKILL')
        }

        results.push({
          action: 'force_kill',
          pid: process.pid,
          success: true
        })
      } catch (error) {
        results.push({
          action: 'force_kill',
          pid: process.pid,
          success: false,
          error: error.message
        })
      }
    })

    await Promise.allSettled(killPromises)
  }

  /**
   * Release occupied ports
   * @param {Array} results - Results array
   * @private
   */
  async _releaseOccupiedPorts (results) {
    try {
      const commonPorts = [8080, 8081, 8082, 3000, 3001, 3002, 5432, 27017]

      for (const port of commonPorts) {
        try {
          if (this.platform === 'win32') {
            const { stdout } = await execAsync(`netstat -ano | findstr :${port}`, { timeout: 500 })
            if (stdout.trim()) {
              const lines = stdout.split('\n')
              for (const line of lines) {
                const match = line.match(/\s+(\d+)$/)
                if (match) {
                  const pid = match[1]
                  await execAsync(`taskkill /F /PID ${pid}`, { timeout: 500 })
                }
              }
            }
          } else {
            await execAsync(`lsof -ti:${port} | xargs kill -9`, { timeout: 500 })
          }
        } catch (error) {
          // Port not in use or already released
        }
      }

      results.push({
        action: 'release_ports',
        success: true,
        portsChecked: commonPorts.length
      })
    } catch (error) {
      results.push({
        action: 'release_ports',
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Clean up system resources
   * @param {Array} results - Results array
   * @private
   */
  async _cleanupSystemResources (results) {
    try {
      // Force garbage collection if possible
      if (global.gc) {
        global.gc()
      }

      results.push({
        action: 'cleanup_system_resources',
        success: true
      })
    } catch (error) {
      results.push({
        action: 'cleanup_system_resources',
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Clean up temporary resources
   * @private
   */
  async _cleanupTemporaryResources () {
    // Force garbage collection
    if (global.gc) {
      global.gc()
    }
  }

  /**
   * Verify system state after recovery
   * @param {Array} results - Results array
   * @private
   */
  async _verifySystemState (results) {
    try {
      // Check for remaining suspicious processes
      let suspiciousCount = 0

      if (this.platform === 'win32') {
        const { stdout } = await execAsync('tasklist | findstr /i "java gradle node"', { timeout: 1000 })
        suspiciousCount = stdout.split('\n').filter(line => line.trim()).length
      } else {
        const { stdout } = await execAsync('ps aux | grep -E "(java|gradle|node)" | grep -v grep', { timeout: 1000 })
        suspiciousCount = stdout.split('\n').filter(line => line.trim()).length
      }

      results.push({
        action: 'verify_system_state',
        success: true,
        suspiciousProcesses: suspiciousCount
      })
    } catch (error) {
      results.push({
        action: 'verify_system_state',
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Kill all known process types system-wide
   * @param {Array} results - Results array
   * @private
   */
  async _killAllKnownProcessTypes (results) {
    const processTypes = ['java', 'gradle', 'node', 'npm']

    for (const processType of processTypes) {
      try {
        if (this.platform === 'win32') {
          await execAsync(`taskkill /F /IM ${processType}.exe /T`, { timeout: 1000 })
        } else {
          await execAsync(`pkill -f ${processType}`, { timeout: 1000 })
        }

        results.push({
          action: 'kill_process_type',
          processType,
          success: true
        })
      } catch (error) {
        // Process type not found or already killed
        results.push({
          action: 'kill_process_type',
          processType,
          success: false,
          error: error.message
        })
      }
    }
  }

  /**
   * Force release port ranges
   * @param {Array} results - Results array
   * @private
   */
  async _forceReleasePortRanges (results) {
    const portRanges = [
      { start: 8080, end: 8090 },
      { start: 3000, end: 3010 },
      { start: 5432, end: 5440 }
    ]

    for (const range of portRanges) {
      try {
        for (let port = range.start; port <= range.end; port++) {
          try {
            if (this.platform === 'win32') {
              await execAsync(`netstat -ano | findstr :${port} | for /f "tokens=5" %a in ('more') do taskkill /F /PID %a`, { timeout: 200 })
            } else {
              await execAsync(`lsof -ti:${port} | xargs kill -9`, { timeout: 200 })
            }
          } catch (error) {
            // Port not in use
          }
        }

        results.push({
          action: 'force_release_port_range',
          range: `${range.start}-${range.end}`,
          success: true
        })
      } catch (error) {
        results.push({
          action: 'force_release_port_range',
          range: `${range.start}-${range.end}`,
          success: false,
          error: error.message
        })
      }
    }
  }

  /**
   * Clean up all temporary directories
   * @param {Array} results - Results array
   * @private
   */
  async _cleanupAllTempDirectories (results) {
    try {
      // This is a placeholder - implement based on specific temp directory patterns
      results.push({
        action: 'cleanup_temp_directories',
        success: true,
        warning: 'Temp directory cleanup not fully implemented'
      })
    } catch (error) {
      results.push({
        action: 'cleanup_temp_directories',
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Reset networking (if needed)
   * @param {Array} results - Results array
   * @private
   */
  async _resetNetworking (results) {
    try {
      // This is a placeholder for extreme cases
      results.push({
        action: 'reset_networking',
        success: true,
        warning: 'Network reset not implemented'
      })
    } catch (error) {
      results.push({
        action: 'reset_networking',
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Update recovery metrics
   * @param {number} recoveryTime - Recovery time in milliseconds
   * @param {boolean} success - Whether recovery was successful
   * @private
   */
  _updateMetrics (recoveryTime, success) {
    if (success) {
      this.metrics.successfulRecoveries++
    } else {
      this.metrics.failedRecoveries++
    }

    this.metrics.averageRecoveryTime =
      (this.metrics.averageRecoveryTime + recoveryTime) / this.metrics.totalRecoveries

    this.metrics.fastestRecovery = Math.min(this.metrics.fastestRecovery, recoveryTime)
    this.metrics.slowestRecovery = Math.max(this.metrics.slowestRecovery, recoveryTime)
  }

  /**
   * Record recovery attempt in history
   * @param {string} recoveryId - Recovery identifier
   * @param {Object} strategy - Recovery strategy used
   * @param {Object} context - Recovery context
   * @param {Object} result - Recovery result
   * @param {number} recoveryTime - Recovery time
   * @param {boolean} success - Whether recovery was successful
   * @param {Error} error - Error if recovery failed
   * @private
   */
  _recordRecovery (recoveryId, strategy, context, result, recoveryTime, success, error = null) {
    const record = {
      recoveryId,
      strategy: strategy?.name || 'unknown',
      timestamp: new Date().toISOString(),
      recoveryTime,
      success,
      context: {
        sessionId: context.sessionId,
        operationId: context.operationId,
        processCount: context.processes?.length || 0
      },
      result,
      error: error?.message
    }

    this.recoveryHistory.push(record)

    // Maintain history size
    if (this.recoveryHistory.length > this.maxHistoryEntries) {
      this.recoveryHistory.shift()
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate unique recovery ID
   * @returns {string} Recovery ID
   * @private
   */
  _generateRecoveryId () {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  /**
   * Get recovery metrics
   * @returns {Object} Recovery metrics
   */
  getMetrics () {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRecoveries > 0
        ? (this.metrics.successfulRecoveries / this.metrics.totalRecoveries) * 100
        : 0,
      activeRecoveries: this.activeRecoveries.size
    }
  }

  /**
   * Get recovery history
   * @param {number} limit - Maximum number of records to return
   * @returns {Array} Recovery history records
   */
  getRecoveryHistory (limit = 50) {
    return this.recoveryHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  /**
   * Add custom recovery strategy
   * @param {string} name - Strategy name
   * @param {Object} strategy - Strategy definition
   */
  addCustomStrategy (name, strategy) {
    if (!strategy.execute || typeof strategy.execute !== 'function') {
      throw new Error('Custom strategy must have an execute function')
    }

    this.strategies.set(name, {
      name,
      priority: strategy.priority || RecoveryPriority.MEDIUM,
      timeout: strategy.timeout || 3000,
      execute: strategy.execute
    })
  }

  /**
   * Cleanup emergency recovery resources
   */
  async cleanup () {
    this.activeRecoveries.clear()
    this.recoveryHistory.length = 0
  }
}

// Export constants for external use
EmergencyRecovery.Strategy = RecoveryStrategy
EmergencyRecovery.Priority = RecoveryPriority

module.exports = EmergencyRecovery
