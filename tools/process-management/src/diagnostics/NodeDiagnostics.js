/**
 * Node.js Diagnostics Integration
 *
 * Integrates why-is-node-running and other diagnostic tools for:
 * - Process hanging detection and analysis
 * - Handle leak identification
 * - Timer and resource tracking
 * - Event loop monitoring
 * - Memory dump analysis
 * - Comprehensive diagnostic reporting
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')
const fs = require('fs').promises
const path = require('path')
const util = require('util')

/**
 * Node.js diagnostic and analysis system
 */
class NodeDiagnostics extends EventEmitter {
  constructor(dependencies = {}, options = {}) {
    super()

    // Dependency injection
    this.auditLogger = dependencies.auditLogger
    this.processRegistry = dependencies.processRegistry

    // Configuration
    this.config = {
      enableHandleTracking: options.enableHandleTracking !== false,
      enableTimerTracking: options.enableTimerTracking !== false,
      enableEventLoopMonitoring: options.enableEventLoopMonitoring !== false,
      diagnosticInterval: options.diagnosticInterval || 30000, // 30 seconds
      handleLeakThreshold: options.handleLeakThreshold || 100,
      timerLeakThreshold: options.timerLeakThreshold || 50,
      eventLoopDelayThreshold: options.eventLoopDelayThreshold || 100, // 100ms
      reportDirectory: options.reportDirectory || path.join(process.cwd(), 'diagnostic-reports'),
      autoGenerateReports: options.autoGenerateReports !== false,
      maxReportFiles: options.maxReportFiles || 10,
      ...options
    }

    // Diagnostic state
    this.isDiagnosticActive = false
    this.diagnosticTimer = null
    this.handleHistory = []
    this.timerHistory = []
    this.eventLoopHistory = []

    // Handle tracking
    this.handleBaseline = new Map()
    this.currentHandles = new Map()
    this.suspiciousHandles = new Set()

    // Event loop monitoring
    this.eventLoopMonitor = null
    this.eventLoopDelays = []

    // Metrics
    this.metrics = {
      totalDiagnosticRuns: 0,
      handleLeaksDetected: 0,
      timerLeaksDetected: 0,
      eventLoopDelaysDetected: 0,
      reportsGenerated: 0,
      averageDiagnosticTime: 0
    }

    // Why-is-node-running integration
    this.whyIsNodeRunning = null
    this._initializeWhyIsNodeRunning()
  }

  /**
   * Start diagnostic monitoring
   */
  async startDiagnostics() {
    if (this.isDiagnosticActive) {
      throw new Error('Node diagnostics already active')
    }

    const startTime = process.hrtime.bigint()

    try {
      this.auditLogger?.info('Starting Node.js diagnostics', {
        component: 'NodeDiagnostics',
        config: this.config
      })

      // Ensure report directory exists
      await this._ensureReportDirectory()

      // Capture baseline
      await this._captureBaseline()

      // Start monitoring
      this._startDiagnosticLoop()

      // Setup event loop monitoring
      if (this.config.enableEventLoopMonitoring) {
        this._startEventLoopMonitoring()
      }

      this.isDiagnosticActive = true
      const startupLatency = Number(process.hrtime.bigint() - startTime) / 1000000

      this.auditLogger?.info('Node.js diagnostics started', {
        component: 'NodeDiagnostics',
        startupLatency: `${startupLatency.toFixed(3)}ms`,
        features: this._getEnabledFeatures()
      })

      this.emit('diagnosticsStarted', {
        startupLatency,
        config: this.config
      })

    } catch (error) {
      this.auditLogger?.error('Failed to start Node.js diagnostics', {
        component: 'NodeDiagnostics',
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Stop diagnostic monitoring
   */
  async stopDiagnostics() {
    if (!this.isDiagnosticActive) {
      return
    }

    try {
      this.auditLogger?.info('Stopping Node.js diagnostics', {
        component: 'NodeDiagnostics',
        metrics: this.getMetrics()
      })

      // Stop diagnostic loop
      if (this.diagnosticTimer) {
        clearInterval(this.diagnosticTimer)
        this.diagnosticTimer = null
      }

      // Stop event loop monitoring
      this._stopEventLoopMonitoring()

      // Generate final report
      if (this.config.autoGenerateReports) {
        await this.generateDiagnosticReport('shutdown')
      }

      this.isDiagnosticActive = false

      this.auditLogger?.info('Node.js diagnostics stopped', {
        component: 'NodeDiagnostics',
        finalMetrics: this.getMetrics()
      })

      this.emit('diagnosticsStopped', {
        metrics: this.getMetrics()
      })

    } catch (error) {
      this.auditLogger?.error('Error stopping Node.js diagnostics', {
        component: 'NodeDiagnostics',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Perform comprehensive diagnostic analysis
   * @returns {Promise<Object>} Diagnostic results
   */
  async performDiagnostic() {
    const diagnosticStart = process.hrtime.bigint()

    try {
      const results = {
        timestamp: Date.now(),
        processInfo: this._getProcessInfo(),
        handles: await this._analyzeHandles(),
        timers: await this._analyzeTimers(),
        eventLoop: await this._analyzeEventLoop(),
        memory: await this._analyzeMemory(),
        nodeRunning: await this._analyzeWhyNodeIsRunning(),
        recommendations: []
      }

      // Generate recommendations based on analysis
      results.recommendations = this._generateRecommendations(results)

      // Update metrics
      const diagnosticLatency = Number(process.hrtime.bigint() - diagnosticStart) / 1000000
      this._updateDiagnosticMetrics(diagnosticLatency)

      // Check for issues and emit alerts
      this._checkForIssues(results)

      this.auditLogger?.debug('Diagnostic analysis completed', {
        component: 'NodeDiagnostics',
        diagnosticLatency: `${diagnosticLatency.toFixed(3)}ms`,
        issues: results.recommendations.length
      })

      this.emit('diagnosticCompleted', {
        results,
        diagnosticLatency
      })

      return results

    } catch (error) {
      this.auditLogger?.error('Diagnostic analysis failed', {
        component: 'NodeDiagnostics',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Generate comprehensive diagnostic report
   * @param {string} trigger - What triggered the report
   * @returns {Promise<string>} Report file path
   */
  async generateDiagnosticReport(trigger = 'manual') {
    const reportStart = process.hrtime.bigint()

    try {
      // Perform diagnostic analysis
      const diagnosticResults = await this.performDiagnostic()

      // Generate report content
      const report = {
        metadata: {
          timestamp: new Date().toISOString(),
          trigger,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          uptime: process.uptime(),
          cwd: process.cwd()
        },
        diagnostics: diagnosticResults,
        metrics: this.getMetrics(),
        history: {
          handles: this.handleHistory.slice(-100), // Last 100 entries
          timers: this.timerHistory.slice(-100),
          eventLoop: this.eventLoopHistory.slice(-100)
        },
        processHandles: this._getCurrentHandleDetails(),
        recommendations: diagnosticResults.recommendations
      }

      // Write report to file
      const reportPath = await this._writeReport(report, trigger)

      // Cleanup old reports
      await this._cleanupOldReports()

      this.metrics.reportsGenerated++
      const reportLatency = Number(process.hrtime.bigint() - reportStart) / 1000000

      this.auditLogger?.info('Diagnostic report generated', {
        component: 'NodeDiagnostics',
        reportPath,
        trigger,
        reportLatency: `${reportLatency.toFixed(3)}ms`,
        reportSize: await this._getFileSize(reportPath)
      })

      this.emit('reportGenerated', {
        reportPath,
        trigger,
        reportLatency
      })

      return reportPath

    } catch (error) {
      this.auditLogger?.error('Failed to generate diagnostic report', {
        component: 'NodeDiagnostics',
        trigger,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Analyze specific process by PID
   * @param {number} pid - Process ID to analyze
   * @returns {Promise<Object>} Process analysis
   */
  async analyzeProcess(pid) {
    try {
      // Get process information
      const processInfo = await this.processRegistry?.getProcessInfo(pid)
      
      if (!processInfo) {
        throw new Error(`Process ${pid} not found or not accessible`)
      }

      const analysis = {
        pid,
        processInfo,
        handles: [],
        timers: [],
        memory: process.memoryUsage(),
        recommendations: []
      }

      // If analyzing current process, get detailed information
      if (pid === process.pid) {
        analysis.handles = this._getCurrentHandleDetails()
        analysis.timers = this._getCurrentTimerDetails()
        analysis.nodeRunning = await this._analyzeWhyNodeIsRunning()
      }

      this.auditLogger?.info('Process analysis completed', {
        component: 'NodeDiagnostics',
        pid,
        handleCount: analysis.handles.length,
        timerCount: analysis.timers.length
      })

      return analysis

    } catch (error) {
      this.auditLogger?.error('Process analysis failed', {
        component: 'NodeDiagnostics',
        pid,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get diagnostic metrics
   * @returns {Object} Diagnostic metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isDiagnosticActive: this.isDiagnosticActive,
      handleHistorySize: this.handleHistory.length,
      timerHistorySize: this.timerHistory.length,
      eventLoopHistorySize: this.eventLoopHistory.length,
      suspiciousHandles: this.suspiciousHandles.size,
      config: this.config
    }
  }

  /**
   * Initialize why-is-node-running integration
   * @private
   */
  _initializeWhyIsNodeRunning() {
    try {
      // Try to require why-is-node-running
      this.whyIsNodeRunning = require('why-is-node-running')
      
      this.auditLogger?.debug('why-is-node-running integration initialized', {
        component: 'NodeDiagnostics'
      })
    } catch (error) {
      this.auditLogger?.warn('why-is-node-running not available', {
        component: 'NodeDiagnostics',
        error: error.message,
        suggestion: 'Install with: npm install why-is-node-running'
      })
    }
  }

  /**
   * Ensure report directory exists
   * @private
   */
  async _ensureReportDirectory() {
    try {
      await fs.access(this.config.reportDirectory)
    } catch (error) {
      await fs.mkdir(this.config.reportDirectory, { recursive: true })
    }
  }

  /**
   * Capture diagnostic baseline
   * @private
   */
  async _captureBaseline() {
    try {
      // Capture handle baseline
      if (this.config.enableHandleTracking) {
        const handles = this._getCurrentHandleDetails()
        for (const handle of handles) {
          this.handleBaseline.set(handle.type, (this.handleBaseline.get(handle.type) || 0) + 1)
        }
      }

      this.auditLogger?.debug('Diagnostic baseline captured', {
        component: 'NodeDiagnostics',
        handleTypes: Array.from(this.handleBaseline.keys()),
        totalHandles: Array.from(this.handleBaseline.values()).reduce((sum, count) => sum + count, 0)
      })

    } catch (error) {
      this.auditLogger?.warn('Failed to capture diagnostic baseline', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }
  }

  /**
   * Start diagnostic monitoring loop
   * @private
   */
  _startDiagnosticLoop() {
    this.diagnosticTimer = setInterval(async () => {
      try {
        await this.performDiagnostic()
      } catch (error) {
        this.auditLogger?.error('Diagnostic loop error', {
          component: 'NodeDiagnostics',
          error: error.message
        })
      }
    }, this.config.diagnosticInterval)
  }

  /**
   * Start event loop monitoring
   * @private
   */
  _startEventLoopMonitoring() {
    try {
      const { monitorEventLoopDelay } = require('perf_hooks')
      this.eventLoopMonitor = monitorEventLoopDelay({ resolution: 20 })
      this.eventLoopMonitor.enable()

      this.auditLogger?.debug('Event loop monitoring started', {
        component: 'NodeDiagnostics'
      })
    } catch (error) {
      this.auditLogger?.warn('Failed to start event loop monitoring', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }
  }

  /**
   * Stop event loop monitoring
   * @private
   */
  _stopEventLoopMonitoring() {
    if (this.eventLoopMonitor) {
      this.eventLoopMonitor.disable()
      this.eventLoopMonitor = null
    }
  }

  /**
   * Get current process information
   * @returns {Object} Process information
   * @private
   */
  _getProcessInfo() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      title: process.title,
      argv: process.argv,
      execPath: process.execPath,
      cwd: process.cwd(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  }

  /**
   * Analyze process handles
   * @returns {Promise<Object>} Handle analysis
   * @private
   */
  async _analyzeHandles() {
    const analysis = {
      current: [],
      counts: new Map(),
      leaks: [],
      suspicious: []
    }

    if (!this.config.enableHandleTracking) {
      return analysis
    }

    try {
      // Get current handles
      const currentHandles = this._getCurrentHandleDetails()
      analysis.current = currentHandles

      // Count by type
      for (const handle of currentHandles) {
        analysis.counts.set(handle.type, (analysis.counts.get(handle.type) || 0) + 1)
      }

      // Compare with baseline to detect leaks
      for (const [type, currentCount] of analysis.counts) {
        const baselineCount = this.handleBaseline.get(type) || 0
        const growth = currentCount - baselineCount

        if (growth > this.config.handleLeakThreshold) {
          analysis.leaks.push({
            type,
            baseline: baselineCount,
            current: currentCount,
            growth,
            severity: growth > (this.config.handleLeakThreshold * 2) ? 'high' : 'medium'
          })
        }
      }

      // Record history
      this.handleHistory.push({
        timestamp: Date.now(),
        totalHandles: currentHandles.length,
        byType: Object.fromEntries(analysis.counts)
      })

      // Maintain history size
      if (this.handleHistory.length > 1000) {
        this.handleHistory.shift()
      }

    } catch (error) {
      this.auditLogger?.error('Handle analysis failed', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }

    return analysis
  }

  /**
   * Analyze timers
   * @returns {Promise<Object>} Timer analysis
   * @private
   */
  async _analyzeTimers() {
    const analysis = {
      active: [],
      counts: {
        setTimeout: 0,
        setInterval: 0,
        setImmediate: 0
      },
      leaks: []
    }

    if (!this.config.enableTimerTracking) {
      return analysis
    }

    try {
      // Get current timer information (simplified)
      const timerDetails = this._getCurrentTimerDetails()
      analysis.active = timerDetails

      // Count timers by type
      for (const timer of timerDetails) {
        if (analysis.counts.hasOwnProperty(timer.type)) {
          analysis.counts[timer.type]++
        }
      }

      // Check for timer leaks
      const totalTimers = Object.values(analysis.counts).reduce((sum, count) => sum + count, 0)
      if (totalTimers > this.config.timerLeakThreshold) {
        analysis.leaks.push({
          type: 'excessive_timers',
          count: totalTimers,
          threshold: this.config.timerLeakThreshold,
          severity: totalTimers > (this.config.timerLeakThreshold * 2) ? 'high' : 'medium'
        })
      }

      // Record history
      this.timerHistory.push({
        timestamp: Date.now(),
        totalTimers,
        byType: { ...analysis.counts }
      })

      // Maintain history size
      if (this.timerHistory.length > 1000) {
        this.timerHistory.shift()
      }

    } catch (error) {
      this.auditLogger?.error('Timer analysis failed', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }

    return analysis
  }

  /**
   * Analyze event loop
   * @returns {Promise<Object>} Event loop analysis
   * @private
   */
  async _analyzeEventLoop() {
    const analysis = {
      delay: null,
      blocked: false,
      performance: 'good'
    }

    if (!this.config.enableEventLoopMonitoring || !this.eventLoopMonitor) {
      return analysis
    }

    try {
      const delay = this.eventLoopMonitor.mean / 1000000 // Convert to milliseconds
      analysis.delay = delay

      // Check if event loop is blocked
      if (delay > this.config.eventLoopDelayThreshold) {
        analysis.blocked = true
        analysis.performance = delay > (this.config.eventLoopDelayThreshold * 2) ? 'poor' : 'degraded'

        this.metrics.eventLoopDelaysDetected++
      }

      // Record history
      this.eventLoopHistory.push({
        timestamp: Date.now(),
        delay,
        blocked: analysis.blocked
      })

      // Maintain history size
      if (this.eventLoopHistory.length > 1000) {
        this.eventLoopHistory.shift()
      }

    } catch (error) {
      this.auditLogger?.error('Event loop analysis failed', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }

    return analysis
  }

  /**
   * Analyze memory usage
   * @returns {Promise<Object>} Memory analysis
   * @private
   */
  async _analyzeMemory() {
    const memoryUsage = process.memoryUsage()

    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      heapUtilization: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      memoryPressure: memoryUsage.heapUsed > (1024 * 1024 * 512) // 512MB threshold
    }
  }

  /**
   * Analyze why node is running
   * @returns {Promise<Object>} Why-is-node-running analysis
   * @private
   */
  async _analyzeWhyNodeIsRunning() {
    if (!this.whyIsNodeRunning) {
      return { available: false, reason: 'why-is-node-running not installed' }
    }

    try {
      // Capture why-is-node-running output
      let output = ''
      const originalLog = console.log

      console.log = (...args) => {
        output += args.join(' ') + '\n'
      }

      this.whyIsNodeRunning()

      console.log = originalLog

      return {
        available: true,
        output,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        available: false,
        error: error.message
      }
    }
  }

  /**
   * Get current handle details
   * @returns {Array} Handle details
   * @private
   */
  _getCurrentHandleDetails() {
    const handles = []

    try {
      // Use process._getActiveHandles if available
      if (process._getActiveHandles) {
        const activeHandles = process._getActiveHandles()
        
        for (const handle of activeHandles) {
          handles.push({
            type: handle.constructor.name,
            readable: handle.readable || false,
            writable: handle.writable || false,
            connecting: handle.connecting || false
          })
        }
      }
    } catch (error) {
      this.auditLogger?.debug('Failed to get handle details', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }

    return handles
  }

  /**
   * Get current timer details
   * @returns {Array} Timer details
   * @private
   */
  _getCurrentTimerDetails() {
    const timers = []

    try {
      // Use process._getActiveRequests if available
      if (process._getActiveRequests) {
        const activeRequests = process._getActiveRequests()
        
        for (const request of activeRequests) {
          timers.push({
            type: request.constructor.name,
            hasRef: request.hasRef ? request.hasRef() : true
          })
        }
      }
    } catch (error) {
      this.auditLogger?.debug('Failed to get timer details', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }

    return timers
  }

  /**
   * Generate recommendations based on analysis
   * @param {Object} results - Diagnostic results
   * @returns {Array} Recommendations
   * @private
   */
  _generateRecommendations(results) {
    const recommendations = []

    // Handle leak recommendations
    if (results.handles.leaks.length > 0) {
      recommendations.push({
        type: 'handle_leak',
        severity: 'high',
        message: 'Handle leaks detected',
        details: results.handles.leaks,
        action: 'Review and close unused handles'
      })
    }

    // Timer leak recommendations
    if (results.timers.leaks.length > 0) {
      recommendations.push({
        type: 'timer_leak',
        severity: 'medium',
        message: 'Excessive timers detected',
        details: results.timers.leaks,
        action: 'Review and clear unused timers'
      })
    }

    // Event loop recommendations
    if (results.eventLoop.blocked) {
      recommendations.push({
        type: 'event_loop_blocked',
        severity: 'high',
        message: 'Event loop is blocked',
        details: { delay: results.eventLoop.delay },
        action: 'Identify and optimize blocking operations'
      })
    }

    // Memory recommendations
    if (results.memory.memoryPressure) {
      recommendations.push({
        type: 'memory_pressure',
        severity: 'medium',
        message: 'High memory usage detected',
        details: results.memory,
        action: 'Review memory usage and optimize'
      })
    }

    return recommendations
  }

  /**
   * Check for issues and emit alerts
   * @param {Object} results - Diagnostic results
   * @private
   */
  _checkForIssues(results) {
    // Emit alerts for critical issues
    for (const recommendation of results.recommendations) {
      if (recommendation.severity === 'high') {
        this.emit('diagnosticAlert', {
          type: recommendation.type,
          severity: recommendation.severity,
          message: recommendation.message,
          details: recommendation.details,
          timestamp: Date.now()
        })
      }
    }

    // Update metrics based on issues found
    if (results.handles.leaks.length > 0) {
      this.metrics.handleLeaksDetected += results.handles.leaks.length
    }

    if (results.timers.leaks.length > 0) {
      this.metrics.timerLeaksDetected += results.timers.leaks.length
    }
  }

  /**
   * Write diagnostic report to file
   * @param {Object} report - Report data
   * @param {string} trigger - Report trigger
   * @returns {Promise<string>} Report file path
   * @private
   */
  async _writeReport(report, trigger) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `diagnostic-report-${trigger}-${timestamp}.json`
    const reportPath = path.join(this.config.reportDirectory, filename)

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')

    return reportPath
  }

  /**
   * Cleanup old report files
   * @private
   */
  async _cleanupOldReports() {
    try {
      const files = await fs.readdir(this.config.reportDirectory)
      const reportFiles = files
        .filter(file => file.startsWith('diagnostic-report-') && file.endsWith('.json'))
        .map(file => path.join(this.config.reportDirectory, file))

      if (reportFiles.length > this.config.maxReportFiles) {
        // Sort by creation time and remove oldest
        const fileStats = await Promise.all(
          reportFiles.map(async file => ({
            path: file,
            stats: await fs.stat(file)
          }))
        )

        fileStats.sort((a, b) => a.stats.mtime - b.stats.mtime)

        const filesToDelete = fileStats.slice(0, fileStats.length - this.config.maxReportFiles)
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path)
        }

        this.auditLogger?.debug('Old diagnostic reports cleaned up', {
          component: 'NodeDiagnostics',
          deletedFiles: filesToDelete.length
        })
      }
    } catch (error) {
      this.auditLogger?.warn('Failed to cleanup old reports', {
        component: 'NodeDiagnostics',
        error: error.message
      })
    }
  }

  /**
   * Get file size
   * @param {string} filePath - File path
   * @returns {Promise<number>} File size in bytes
   * @private
   */
  async _getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch (error) {
      return 0
    }
  }

  /**
   * Update diagnostic metrics
   * @param {number} latency - Diagnostic latency
   * @private
   */
  _updateDiagnosticMetrics(latency) {
    this.metrics.totalDiagnosticRuns++
    this.metrics.averageDiagnosticTime = 
      (this.metrics.averageDiagnosticTime + latency) / 2
  }

  /**
   * Get enabled features
   * @returns {Array} Enabled feature names
   * @private
   */
  _getEnabledFeatures() {
    const features = []
    if (this.config.enableHandleTracking) features.push('handleTracking')
    if (this.config.enableTimerTracking) features.push('timerTracking')
    if (this.config.enableEventLoopMonitoring) features.push('eventLoopMonitoring')
    if (this.whyIsNodeRunning) features.push('whyIsNodeRunning')
    return features
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.isDiagnosticActive) {
      await this.stopDiagnostics()
    }

    this.removeAllListeners()
    this.handleHistory.length = 0
    this.timerHistory.length = 0
    this.eventLoopHistory.length = 0
    this.handleBaseline.clear()
    this.currentHandles.clear()
    this.suspiciousHandles.clear()
  }
}

module.exports = NodeDiagnostics