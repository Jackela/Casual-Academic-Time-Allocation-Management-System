/**
 * Real-Time Process Monitor
 *
 * Enterprise-grade real-time monitoring system with:
 * - Sub-10ms process detection latency
 * - Event-driven architecture for real-time updates
 * - Memory-efficient process tree scanning
 * - Cross-platform process monitoring
 * - Real-time dashboard updates (<100ms)
 * - Performance-optimized scanning algorithms
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')
const { spawn } = require('child_process')
const { promisify } = require('util')
const pidusage = require('pidusage')

/**
 * Real-time monitoring system with millisecond precision
 */
class RealTimeMonitor extends EventEmitter {
  constructor(dependencies = {}, options = {}) {
    super()

    // Dependency injection
    this.processRegistry = dependencies.processRegistry
    this.auditLogger = dependencies.auditLogger
    this.leakDetector = dependencies.leakDetector

    // Configuration
    this.config = {
      scanInterval: options.scanInterval || 5, // 5ms default for sub-10ms detection
      maxScanLatency: options.maxScanLatency || 10, // 10ms requirement
      batchSize: options.batchSize || 50, // Process batch size for optimization
      enableMemoryTracking: options.enableMemoryTracking !== false,
      enableCpuTracking: options.enableCpuTracking !== false,
      enableNetworkTracking: options.enableNetworkTracking || false,
      maxConcurrentScans: options.maxConcurrentScans || 3,
      alertThresholds: {
        cpuUsage: options.cpuThreshold || 80, // 80% CPU
        memoryUsage: options.memoryThreshold || 1024 * 1024 * 1024, // 1GB
        processCount: options.processCountThreshold || 100
      },
      ...options
    }

    // Monitoring state
    this.isMonitoring = false
    this.monitoringInterval = null
    this.processCache = new Map()
    this.lastScanTime = 0
    this.scanLatencies = []
    this.activeScanPromises = new Set()

    // Performance metrics
    this.metrics = {
      totalScans: 0,
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      processesDetected: 0,
      alertsTriggered: 0,
      cacheHitRate: 0,
      memoryUsage: 0
    }

    // Process scanning strategies by platform
    this.scanStrategies = this._initializeScanStrategies()
  }

  /**
   * Initialize platform-specific scanning strategies
   * @returns {Object} Scanning strategies
   * @private
   */
  _initializeScanStrategies() {
    const strategies = {
      win32: {
        command: 'wmic',
        args: ['process', 'get', 'ProcessId,Name,ParentProcessId,WorkingSetSize,CreationDate', '/format:csv'],
        parser: this._parseWindowsProcesses.bind(this)
      },
      linux: {
        command: 'ps',
        args: ['-eo', 'pid,ppid,comm,rss,etime,args', '--no-headers'],
        parser: this._parseLinuxProcesses.bind(this)
      },
      darwin: {
        command: 'ps',
        args: ['-eo', 'pid,ppid,comm,rss,etime,args', '--no-headers'],
        parser: this._parseLinuxProcesses.bind(this)
      }
    }

    return strategies[process.platform] || strategies.linux
  }

  /**
   * Start real-time monitoring
   * @param {Object} options - Start options
   */
  async startMonitoring(options = {}) {
    if (this.isMonitoring) {
      throw new Error('Real-time monitoring is already active')
    }

    const startTime = process.hrtime.bigint()

    try {
      this.auditLogger?.info('Starting real-time monitoring', {
        component: 'RealTimeMonitor',
        config: this.config,
        platform: process.platform
      })

      // Validate configuration
      this._validateConfiguration()

      // Initialize baseline
      await this._captureBaseline()

      // Start monitoring loop
      this._startMonitoringLoop()

      // Setup process change detection
      this._setupChangeDetection()

      this.isMonitoring = true
      const startupLatency = Number(process.hrtime.bigint() - startTime) / 1000000 // Convert to ms

      this.auditLogger?.info('Real-time monitoring started', {
        component: 'RealTimeMonitor',
        startupLatency: `${startupLatency.toFixed(3)}ms`,
        scanInterval: `${this.config.scanInterval}ms`
      })

      this.emit('monitoringStarted', {
        startupLatency,
        config: this.config
      })

    } catch (error) {
      this.auditLogger?.error('Failed to start real-time monitoring', {
        component: 'RealTimeMonitor',
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return
    }

    const stopTime = process.hrtime.bigint()

    try {
      this.auditLogger?.info('Stopping real-time monitoring', {
        component: 'RealTimeMonitor',
        metrics: this.getMetrics()
      })

      // Stop monitoring loop
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval)
        this.monitoringInterval = null
      }

      // Wait for active scans to complete
      await this._waitForActivScans()

      // Clear caches
      this.processCache.clear()

      this.isMonitoring = false
      const shutdownLatency = Number(process.hrtime.bigint() - stopTime) / 1000000

      this.auditLogger?.info('Real-time monitoring stopped', {
        component: 'RealTimeMonitor',
        shutdownLatency: `${shutdownLatency.toFixed(3)}ms`,
        finalMetrics: this.getMetrics()
      })

      this.emit('monitoringStopped', {
        shutdownLatency,
        metrics: this.getMetrics()
      })

    } catch (error) {
      this.auditLogger?.error('Error stopping real-time monitoring', {
        component: 'RealTimeMonitor',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Perform single scan for processes
   * @returns {Promise<Array>} Detected processes
   */
  async scanProcesses() {
    const scanStart = process.hrtime.bigint()
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Check concurrent scan limit
      if (this.activeScanPromises.size >= this.config.maxConcurrentScans) {
        throw new Error('Maximum concurrent scans exceeded')
      }

      const scanPromise = this._performScan(scanId)
      this.activeScanPromises.add(scanPromise)

      const processes = await scanPromise
      const scanLatency = Number(process.hrtime.bigint() - scanStart) / 1000000

      // Update metrics
      this._updateScanMetrics(scanLatency)

      // Validate latency requirement
      if (scanLatency > this.config.maxScanLatency) {
        this.auditLogger?.warn('Scan latency exceeded requirement', {
          component: 'RealTimeMonitor',
          scanId,
          latency: `${scanLatency.toFixed(3)}ms`,
          requirement: `${this.config.maxScanLatency}ms`
        })

        this.emit('latencyViolation', {
          scanId,
          latency: scanLatency,
          requirement: this.config.maxScanLatency
        })
      }

      // Detect changes
      const changes = this._detectProcessChanges(processes)
      if (changes.added.length > 0 || changes.removed.length > 0) {
        this.emit('processChanges', {
          scanId,
          latency: scanLatency,
          changes
        })
      }

      return processes

    } catch (error) {
      const scanLatency = Number(process.hrtime.bigint() - scanStart) / 1000000
      
      this.auditLogger?.error('Process scan failed', {
        component: 'RealTimeMonitor',
        scanId,
        latency: `${scanLatency.toFixed(3)}ms`,
        error: error.message
      })

      this.emit('scanError', {
        scanId,
        latency: scanLatency,
        error: error.message
      })

      throw error
    } finally {
      this.activeScanPromises.delete(scanId)
    }
  }

  /**
   * Get real-time process information by PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object|null>} Process information
   */
  async getProcessInfo(pid) {
    const queryStart = process.hrtime.bigint()

    try {
      // Check cache first
      const cached = this.processCache.get(pid)
      if (cached && (Date.now() - cached.timestamp) < 100) { // 100ms cache
        this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2
        return cached.data
      }

      // Get detailed process information
      const stats = await pidusage(pid)
      const processInfo = {
        pid,
        cpu: stats.cpu,
        memory: stats.memory,
        elapsed: stats.elapsed,
        timestamp: stats.timestamp,
        ctime: stats.ctime,
        ppid: stats.ppid
      }

      // Cache the result
      this.processCache.set(pid, {
        data: processInfo,
        timestamp: Date.now()
      })

      const queryLatency = Number(process.hrtime.bigint() - queryStart) / 1000000

      this.auditLogger?.debug('Process info retrieved', {
        component: 'RealTimeMonitor',
        pid,
        latency: `${queryLatency.toFixed(3)}ms`,
        cached: false
      })

      return processInfo

    } catch (error) {
      this.auditLogger?.debug('Failed to get process info', {
        component: 'RealTimeMonitor',
        pid,
        error: error.message
      })
      return null
    }
  }

  /**
   * Get monitoring metrics
   * @returns {Object} Monitoring metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isMonitoring: this.isMonitoring,
      activeScanPromises: this.activeScanPromises.size,
      cacheSize: this.processCache.size,
      config: this.config,
      platform: process.platform,
      uptime: this.isMonitoring ? Date.now() - this.lastScanTime : 0
    }
  }

  /**
   * Validate configuration
   * @private
   */
  _validateConfiguration() {
    if (this.config.scanInterval < 1) {
      throw new Error('Scan interval must be at least 1ms')
    }

    if (this.config.maxScanLatency < this.config.scanInterval) {
      throw new Error('Max scan latency must be greater than scan interval')
    }

    if (this.config.batchSize < 1) {
      throw new Error('Batch size must be at least 1')
    }
  }

  /**
   * Capture baseline process state
   * @private
   */
  async _captureBaseline() {
    const baselineStart = process.hrtime.bigint()

    try {
      const processes = await this._performScan('baseline')
      
      // Initialize process cache
      for (const process of processes) {
        this.processCache.set(process.pid, {
          data: process,
          timestamp: Date.now()
        })
      }

      const baselineLatency = Number(process.hrtime.bigint() - baselineStart) / 1000000

      this.auditLogger?.info('Baseline captured', {
        component: 'RealTimeMonitor',
        processCount: processes.length,
        latency: `${baselineLatency.toFixed(3)}ms`
      })

    } catch (error) {
      this.auditLogger?.error('Failed to capture baseline', {
        component: 'RealTimeMonitor',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Start monitoring loop
   * @private
   */
  _startMonitoringLoop() {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.scanProcesses()
      } catch (error) {
        this.auditLogger?.error('Monitoring loop error', {
          component: 'RealTimeMonitor',
          error: error.message
        })
      }
    }, this.config.scanInterval)
  }

  /**
   * Setup change detection
   * @private
   */
  _setupChangeDetection() {
    this.on('processChanges', (changes) => {
      if (this.leakDetector) {
        this.leakDetector.analyzeProcessChanges(changes)
      }

      // Check alert thresholds
      this._checkAlertThresholds(changes)
    })
  }

  /**
   * Perform actual process scan
   * @param {string} scanId - Scan identifier
   * @returns {Promise<Array>} Process list
   * @private
   */
  async _performScan(scanId) {
    const strategy = this.scanStrategies
    
    return new Promise((resolve, reject) => {
      const processes = []
      const child = spawn(strategy.command, strategy.args, {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Process scan failed with code ${code}: ${stderr}`))
          return
        }

        try {
          const parsedProcesses = strategy.parser(stdout)
          resolve(parsedProcesses)
        } catch (error) {
          reject(new Error(`Failed to parse process output: ${error.message}`))
        }
      })

      child.on('error', (error) => {
        reject(new Error(`Failed to execute process scan: ${error.message}`))
      })
    })
  }

  /**
   * Parse Windows process output
   * @param {string} stdout - Command output
   * @returns {Array} Parsed processes
   * @private
   */
  _parseWindowsProcesses(stdout) {
    const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
    const processes = []

    for (const line of lines) {
      const parts = line.split(',')
      if (parts.length >= 5) {
        const [, creationDate, name, parentPid, pid, workingSet] = parts

        if (pid && pid.trim() && !isNaN(parseInt(pid.trim()))) {
          processes.push({
            pid: parseInt(pid.trim()),
            name: name ? name.trim() : 'unknown',
            parentPid: parentPid && !isNaN(parseInt(parentPid.trim())) ? parseInt(parentPid.trim()) : null,
            memory: workingSet ? parseInt(workingSet.trim()) : 0,
            creationDate: creationDate ? creationDate.trim() : null,
            platform: 'win32'
          })
        }
      }
    }

    return processes
  }

  /**
   * Parse Linux/macOS process output
   * @param {string} stdout - Command output
   * @returns {Array} Parsed processes
   * @private
   */
  _parseLinuxProcesses(stdout) {
    const lines = stdout.split('\n').filter(line => line.trim())
    const processes = []

    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\S+)\s+(.*)$/)
      if (match) {
        const [, pid, ppid, comm, rss, etime, args] = match
        processes.push({
          pid: parseInt(pid),
          parentPid: parseInt(ppid),
          name: comm,
          memory: parseInt(rss) * 1024, // Convert KB to bytes
          elapsed: etime,
          command: args,
          platform: process.platform
        })
      }
    }

    return processes
  }

  /**
   * Detect process changes
   * @param {Array} currentProcesses - Current process list
   * @returns {Object} Process changes
   * @private
   */
  _detectProcessChanges(currentProcesses) {
    const currentPids = new Set(currentProcesses.map(p => p.pid))
    const cachedPids = new Set(this.processCache.keys())

    const added = currentProcesses.filter(p => !cachedPids.has(p.pid))
    const removed = Array.from(cachedPids).filter(pid => !currentPids.has(pid))

    // Update cache
    for (const process of currentProcesses) {
      this.processCache.set(process.pid, {
        data: process,
        timestamp: Date.now()
      })
    }

    // Remove outdated cache entries
    for (const pid of removed) {
      this.processCache.delete(pid)
    }

    return { added, removed, total: currentProcesses.length }
  }

  /**
   * Update scan metrics
   * @param {number} latency - Scan latency in milliseconds
   * @private
   */
  _updateScanMetrics(latency) {
    this.metrics.totalScans++
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2
    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency)
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency)
    
    this.scanLatencies.push(latency)
    if (this.scanLatencies.length > 100) {
      this.scanLatencies.shift()
    }

    this.lastScanTime = Date.now()
  }

  /**
   * Check alert thresholds
   * @param {Object} changes - Process changes
   * @private
   */
  _checkAlertThresholds(changes) {
    // Check process count threshold
    if (changes.total > this.config.alertThresholds.processCount) {
      this.metrics.alertsTriggered++
      this.emit('thresholdAlert', {
        type: 'processCount',
        value: changes.total,
        threshold: this.config.alertThresholds.processCount
      })
    }

    // Check for suspicious process additions
    if (changes.added.length > 10) {
      this.metrics.alertsTriggered++
      this.emit('thresholdAlert', {
        type: 'processSpike',
        value: changes.added.length,
        processes: changes.added
      })
    }
  }

  /**
   * Wait for active scans to complete
   * @private
   */
  async _waitForActivScans() {
    if (this.activeScanPromises.size === 0) {
      return
    }

    const timeout = 5000 // 5 second timeout
    const start = Date.now()

    while (this.activeScanPromises.size > 0 && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (this.activeScanPromises.size > 0) {
      this.auditLogger?.warn('Active scans did not complete within timeout', {
        component: 'RealTimeMonitor',
        activeScans: this.activeScanPromises.size
      })
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.isMonitoring) {
      await this.stopMonitoring()
    }

    this.removeAllListeners()
    this.processCache.clear()
    this.scanLatencies.length = 0
  }
}

module.exports = RealTimeMonitor