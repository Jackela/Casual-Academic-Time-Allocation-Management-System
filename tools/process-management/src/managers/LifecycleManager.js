/**
 * Lifecycle Manager - Process lifecycle coordination and management
 *
 * Implements Command pattern for operation queuing and execution:
 * - Process creation and termination
 * - Lifecycle state management
 * - Operation timeout handling
 * - Resource cleanup coordination
 * - Cross-platform process control
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { spawn, exec } = require('child_process')
const { promisify } = require('util')
const { EventEmitter } = require('events')

const execAsync = promisify(exec)

/**
 * Process lifecycle states
 */
const LifecycleState = {
  CREATED: 'created',
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  ERROR: 'error',
  TIMEOUT: 'timeout'
}

/**
 * Operation types
 */
const OperationType = {
  START_PROCESS: 'start_process',
  STOP_PROCESS: 'stop_process',
  RESTART_PROCESS: 'restart_process',
  KILL_PROCESS: 'kill_process',
  CUSTOM: 'custom'
}

/**
 * Lifecycle Manager for process coordination using Command pattern
 */
class LifecycleManager extends EventEmitter {
  constructor (options = {}) {
    super()

    this.platform = process.platform
    this.defaultTimeout = options.defaultTimeout || 30000 // 30 seconds
    this.gracefulTimeout = options.gracefulTimeout || 10000 // 10 seconds
    this.forceKillDelay = options.forceKillDelay || 5000 // 5 seconds

    // Command queue for operation management
    this.operationQueue = []
    this.activeOperations = new Map()
    this.processStates = new Map()

    // Performance tracking
    this.metrics = {
      operationsExecuted: 0,
      operationsFailed: 0,
      averageExecutionTime: 0,
      processesStarted: 0,
      processesTerminated: 0
    }
  }

  /**
   * Execute an operation using Command pattern
   * @param {Object} operation - Operation to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Operation result
   */
  async executeOperation (operation, options = {}) {
    const operationId = options.operationId || this._generateOperationId()
    const startTime = Date.now()

    try {
      this._validateOperation(operation)

      // Create command object
      const command = this._createCommand(operation, options)

      // Queue or execute immediately
      if (options.queue !== false) {
        return await this._queueOperation(command)
      } else {
        return await this._executeCommand(command)
      }
    } catch (error) {
      this.metrics.operationsFailed++
      this.emit('operationFailed', { operationId, error })
      throw error
    } finally {
      const executionTime = Date.now() - startTime
      this.metrics.operationsExecuted++
      this.metrics.averageExecutionTime =
        (this.metrics.averageExecutionTime + executionTime) / this.metrics.operationsExecuted
    }
  }

  /**
   * Start a new process
   * @param {Object} processConfig - Process configuration
   * @param {Object} options - Start options
   * @returns {Promise<Object>} Process information
   */
  async startProcess (processConfig, options = {}) {
    const operation = {
      type: OperationType.START_PROCESS,
      config: processConfig,
      execute: (cmd) => this._executeStartProcess(cmd)
    }

    return await this.executeOperation(operation, options)
  }

  /**
   * Stop a process gracefully
   * @param {number} pid - Process ID
   * @param {Object} options - Stop options
   * @returns {Promise<Object>} Stop result
   */
  async stopProcess (pid, options = {}) {
    const operation = {
      type: OperationType.STOP_PROCESS,
      pid,
      execute: (cmd) => this._executeStopProcess(cmd)
    }

    return await this.executeOperation(operation, options)
  }

  /**
   * Force terminate a process
   * @param {number} pid - Process ID
   * @param {Object} options - Termination options
   * @returns {Promise<Object>} Termination result
   */
  async terminateProcess (pid, options = {}) {
    const operation = {
      type: OperationType.KILL_PROCESS,
      pid,
      force: true,
      execute: (cmd) => this._executeKillProcess(cmd)
    }

    return await this.executeOperation(operation, options)
  }

  /**
   * Restart a process
   * @param {number} pid - Process ID
   * @param {Object} processConfig - New process configuration
   * @param {Object} options - Restart options
   * @returns {Promise<Object>} Restart result
   */
  async restartProcess (pid, processConfig, options = {}) {
    const operation = {
      type: OperationType.RESTART_PROCESS,
      pid,
      config: processConfig,
      execute: (cmd) => this._executeRestartProcess(cmd)
    }

    return await this.executeOperation(operation, options)
  }

  /**
   * Execute start process command
   * @param {Object} command - Command object
   * @returns {Promise<Object>} Process information
   * @private
   */
  async _executeStartProcess (command) {
    const { config, options } = command
    const processId = this._generateProcessId()

    this._updateProcessState(processId, LifecycleState.STARTING)

    try {
      const spawnOptions = {
        cwd: config.cwd || process.cwd(),
        env: { ...process.env, ...config.env },
        detached: config.detached || false,
        stdio: config.stdio || 'pipe'
      }

      // Handle shell commands
      let child
      if (config.shell || this.platform === 'win32') {
        child = spawn(config.command, config.args || [], {
          ...spawnOptions,
          shell: true
        })
      } else {
        child = spawn(config.command, config.args || [], spawnOptions)
      }

      const processInfo = {
        processId,
        pid: child.pid,
        command: config.command,
        args: config.args || [],
        startedAt: new Date().toISOString(),
        child
      }

      // Setup process monitoring
      this._setupProcessMonitoring(processInfo, options)

      // Wait for process to start successfully
      await this._waitForProcessStart(child, options.startTimeout || this.defaultTimeout)

      this._updateProcessState(processId, LifecycleState.RUNNING, processInfo)
      this.metrics.processesStarted++

      this.emit('processStarted', processInfo)

      return {
        success: true,
        processId,
        pid: child.pid,
        startedAt: processInfo.startedAt
      }
    } catch (error) {
      this._updateProcessState(processId, LifecycleState.ERROR, { error: error.message })
      this.emit('processStartFailed', { processId, error })
      throw new Error(`Failed to start process: ${error.message}`)
    }
  }

  /**
   * Execute stop process command
   * @param {Object} command - Command object
   * @returns {Promise<Object>} Stop result
   * @private
   */
  async _executeStopProcess (command) {
    const { pid, options } = command
    const processState = this._getProcessState(pid)

    if (processState?.state === LifecycleState.STOPPED) {
      return { success: true, message: 'Process already stopped' }
    }

    this._updateProcessState(pid, LifecycleState.STOPPING)

    try {
      // Try graceful shutdown first
      const gracefulResult = await this._gracefulShutdown(pid, options)

      if (gracefulResult.success) {
        this._updateProcessState(pid, LifecycleState.STOPPED)
        this.metrics.processesTerminated++
        this.emit('processStopped', { pid, graceful: true })

        return gracefulResult
      }

      // If graceful shutdown failed, force kill
      return await this._forceKill(pid, options)
    } catch (error) {
      this._updateProcessState(pid, LifecycleState.ERROR, { error: error.message })
      throw new Error(`Failed to stop process ${pid}: ${error.message}`)
    }
  }

  /**
   * Execute kill process command
   * @param {Object} command - Command object
   * @returns {Promise<Object>} Kill result
   * @private
   */
  async _executeKillProcess (command) {
    const { pid, options } = command

    this._updateProcessState(pid, LifecycleState.STOPPING)

    try {
      const result = await this._forceKill(pid, options)

      this._updateProcessState(pid, LifecycleState.STOPPED)
      this.metrics.processesTerminated++
      this.emit('processKilled', { pid })

      return result
    } catch (error) {
      this._updateProcessState(pid, LifecycleState.ERROR, { error: error.message })
      throw new Error(`Failed to kill process ${pid}: ${error.message}`)
    }
  }

  /**
   * Execute restart process command
   * @param {Object} command - Command object
   * @returns {Promise<Object>} Restart result
   * @private
   */
  async _executeRestartProcess (command) {
    const { pid, config, options } = command

    try {
      // Stop existing process
      await this._executeStopProcess({ pid, options })

      // Wait a moment for cleanup
      await this._sleep(1000)

      // Start new process
      const startResult = await this._executeStartProcess({ config, options })

      this.emit('processRestarted', {
        oldPid: pid,
        newPid: startResult.pid,
        processId: startResult.processId
      })

      return {
        success: true,
        message: 'Process restarted successfully',
        oldPid: pid,
        newPid: startResult.pid,
        processId: startResult.processId
      }
    } catch (error) {
      throw new Error(`Failed to restart process ${pid}: ${error.message}`)
    }
  }

  /**
   * Setup process monitoring
   * @param {Object} processInfo - Process information
   * @param {Object} options - Monitoring options
   * @private
   */
  _setupProcessMonitoring (processInfo, options) {
    const { child, pid, processId } = processInfo

    // Handle process exit
    child.on('exit', (code, signal) => {
      this._updateProcessState(processId, LifecycleState.STOPPED, {
        exitCode: code,
        signal,
        exitedAt: new Date().toISOString()
      })

      this.emit('processExited', { pid, processId, code, signal })
    })

    // Handle process error
    child.on('error', (error) => {
      this._updateProcessState(processId, LifecycleState.ERROR, {
        error: error.message,
        erroredAt: new Date().toISOString()
      })

      this.emit('processError', { pid, processId, error })
    })

    // Setup timeout if specified
    if (options.timeout) {
      setTimeout(() => {
        if (this._getProcessState(processId)?.state === LifecycleState.RUNNING) {
          this._updateProcessState(processId, LifecycleState.TIMEOUT)
          this.emit('processTimeout', { pid, processId })
          this.terminateProcess(pid).catch(() => {
            // Ignore termination errors during timeout
          })
        }
      }, options.timeout)
    }
  }

  /**
   * Wait for process to start successfully
   * @param {Object} child - Child process
   * @param {number} timeout - Start timeout
   * @returns {Promise<void>}
   * @private
   */
  async _waitForProcessStart (child, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Process start timeout after ${timeout}ms`))
      }, timeout)

      // If process exits immediately, it might be an error
      child.on('exit', (code) => {
        clearTimeout(timer)
        if (code !== 0) {
          reject(new Error(`Process exited immediately with code ${code}`))
        } else {
          resolve()
        }
      })

      // Process started successfully
      setTimeout(() => {
        if (!child.killed && child.pid) {
          clearTimeout(timer)
          resolve()
        }
      }, 100) // Give process 100ms to fail if it's going to fail immediately
    })
  }

  /**
   * Attempt graceful process shutdown
   * @param {number} pid - Process ID
   * @param {Object} options - Shutdown options
   * @returns {Promise<Object>} Shutdown result
   * @private
   */
  async _gracefulShutdown (pid, options = {}) {
    const timeout = options.gracefulTimeout || this.gracefulTimeout

    try {
      // Send SIGTERM (graceful shutdown signal)
      if (this.platform === 'win32') {
        // Windows doesn't have SIGTERM, try taskkill with /T flag
        await execAsync(`taskkill /pid ${pid} /T`, { timeout })
      } else {
        process.kill(pid, 'SIGTERM')
      }

      // Wait for process to exit gracefully
      const exited = await this._waitForProcessExit(pid, timeout)

      if (exited) {
        return {
          success: true,
          method: 'graceful',
          message: `Process ${pid} shutdown gracefully`
        }
      } else {
        return {
          success: false,
          method: 'graceful',
          message: `Process ${pid} did not exit within timeout`
        }
      }
    } catch (error) {
      return {
        success: false,
        method: 'graceful',
        error: error.message
      }
    }
  }

  /**
   * Force kill a process
   * @param {number} pid - Process ID
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill result
   * @private
   */
  async _forceKill (pid, options = {}) {
    try {
      if (this.platform === 'win32') {
        // Windows force kill
        await execAsync(`taskkill /F /T /PID ${pid}`)
      } else {
        // Unix force kill
        process.kill(pid, 'SIGKILL')
      }

      // Wait briefly to confirm termination
      await this._sleep(500)

      return {
        success: true,
        method: 'force',
        message: `Process ${pid} force killed`
      }
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('No such process')) {
        // Process already dead
        return {
          success: true,
          method: 'force',
          message: `Process ${pid} was already terminated`
        }
      }

      throw new Error(`Force kill failed: ${error.message}`)
    }
  }

  /**
   * Wait for process to exit
   * @param {number} pid - Process ID
   * @param {number} timeout - Wait timeout
   * @returns {Promise<boolean>} True if process exited
   * @private
   */
  async _waitForProcessExit (pid, timeout) {
    const checkInterval = 100
    const maxChecks = Math.floor(timeout / checkInterval)

    for (let i = 0; i < maxChecks; i++) {
      try {
        // Check if process is still running
        if (this.platform === 'win32') {
          await execAsync(`tasklist /FI "PID eq ${pid}" | findstr ${pid}`)
        } else {
          process.kill(pid, 0) // Signal 0 just checks if process exists
        }

        // If we get here, process is still running
        await this._sleep(checkInterval)
      } catch (error) {
        // Process doesn't exist anymore
        return true
      }
    }

    return false // Timeout reached
  }

  /**
   * Queue an operation for execution
   * @param {Object} command - Command to queue
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _queueOperation (command) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        command,
        resolve,
        reject,
        queuedAt: Date.now()
      })

      this._processQueue()
    })
  }

  /**
   * Process the operation queue
   * @private
   */
  async _processQueue () {
    if (this.operationQueue.length === 0) {
      return
    }

    const operation = this.operationQueue.shift()

    try {
      const result = await this._executeCommand(operation.command)
      operation.resolve(result)
    } catch (error) {
      operation.reject(error)
    }

    // Process next operation
    setImmediate(() => this._processQueue())
  }

  /**
   * Execute a command
   * @param {Object} command - Command to execute
   * @returns {Promise<Object>} Execution result
   * @private
   */
  async _executeCommand (command) {
    const operationId = command.operationId
    this.activeOperations.set(operationId, command)

    try {
      const result = await command.execute(command)
      this.activeOperations.delete(operationId)
      return result
    } catch (error) {
      this.activeOperations.delete(operationId)
      throw error
    }
  }

  /**
   * Create a command object
   * @param {Object} operation - Operation definition
   * @param {Object} options - Command options
   * @returns {Object} Command object
   * @private
   */
  _createCommand (operation, options) {
    return {
      operationId: options.operationId || this._generateOperationId(),
      type: operation.type,
      ...operation,
      options,
      createdAt: new Date().toISOString()
    }
  }

  /**
   * Validate operation
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
   * Update process state
   * @param {string} processId - Process identifier
   * @param {string} state - New state
   * @param {Object} metadata - Additional metadata
   * @private
   */
  _updateProcessState (processId, state, metadata = {}) {
    this.processStates.set(processId, {
      state,
      updatedAt: new Date().toISOString(),
      ...metadata
    })

    this.emit('stateChanged', { processId, state, metadata })
  }

  /**
   * Get process state
   * @param {string} processId - Process identifier
   * @returns {Object|null} Process state
   * @private
   */
  _getProcessState (processId) {
    return this.processStates.get(processId) || null
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
   * Generate unique operation ID
   * @returns {string} Operation ID
   * @private
   */
  _generateOperationId () {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique process ID
   * @returns {string} Process ID
   * @private
   */
  _generateProcessId () {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get lifecycle manager metrics
   * @returns {Object} Metrics
   */
  getMetrics () {
    return {
      ...this.metrics,
      queuedOperations: this.operationQueue.length,
      activeOperations: this.activeOperations.size,
      trackedProcesses: this.processStates.size
    }
  }

  /**
   * Get process states summary
   * @returns {Object} Process states summary
   */
  getProcessStates () {
    const states = {}
    for (const [processId, state] of this.processStates) {
      states[processId] = state
    }
    return states
  }

  /**
   * Cleanup lifecycle manager resources
   */
  async cleanup () {
    // Clear operation queue
    this.operationQueue.length = 0

    // Clear active operations
    this.activeOperations.clear()

    // Clear process states
    this.processStates.clear()

    // Remove all listeners
    this.removeAllListeners()
  }
}

// Export constants for external use
LifecycleManager.State = LifecycleState
LifecycleManager.OperationType = OperationType

module.exports = LifecycleManager
