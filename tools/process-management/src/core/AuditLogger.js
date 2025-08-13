/**
 * Audit Logger - Comprehensive audit logging with 100% operation trail
 *
 * Provides enterprise-grade audit logging with:
 * - Structured logging using Winston
 * - Multiple log levels and transports
 * - Audit trail compliance
 * - Performance metrics logging
 * - Security event logging
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const winston = require('winston')
const path = require('path')
const fs = require('fs')

/**
 * Audit Logger with comprehensive audit trail capabilities
 */
class AuditLogger {
  constructor (options = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), 'logs')
    this.logLevel = options.logLevel || 'info'
    this.enableConsole = options.enableConsole !== false
    this.enableFile = options.enableFile !== false
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024 // 10MB
    this.maxFiles = options.maxFiles || 5

    // Ensure log directory exists
    this._ensureLogDirectory()

    // Initialize Winston logger
    this.logger = this._createLogger()

    // Audit trail storage
    this.auditTrail = []
    this.maxAuditEntries = options.maxAuditEntries || 10000
  }

  /**
   * Ensure log directory exists
   * @private
   */
  _ensureLogDirectory () {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  /**
   * Create Winston logger instance
   * @returns {winston.Logger} Configured logger
   * @private
   */
  _createLogger () {
    const transports = []

    // Console transport
    if (this.enableConsole) {
      transports.push(new winston.transports.Console({
        level: this.logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
            return `${timestamp} [${level}]: ${message}${metaStr}`
          })
        )
      }))
    }

    // File transport for general logs
    if (this.enableFile) {
      transports.push(new winston.transports.File({
        filename: path.join(this.logDir, 'process-orchestrator.log'),
        level: this.logLevel,
        maxsize: this.maxFileSize,
        maxFiles: this.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }))
    }

    // Separate audit trail file
    transports.push(new winston.transports.File({
      filename: path.join(this.logDir, 'audit-trail.log'),
      level: 'info',
      maxsize: this.maxFileSize,
      maxFiles: this.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }))

    // Error file transport
    transports.push(new winston.transports.File({
      filename: path.join(this.logDir, 'errors.log'),
      level: 'error',
      maxsize: this.maxFileSize,
      maxFiles: this.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }))

    return winston.createLogger({
      level: this.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      exitOnError: false
    })
  }

  /**
   * Log info message with audit trail
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  info (message, metadata = {}) {
    const logEntry = this._createLogEntry('info', message, metadata)
    this.logger.info(message, metadata)
    this._addToAuditTrail(logEntry)
  }

  /**
   * Log warning message with audit trail
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  warn (message, metadata = {}) {
    const logEntry = this._createLogEntry('warn', message, metadata)
    this.logger.warn(message, metadata)
    this._addToAuditTrail(logEntry)
  }

  /**
   * Log error message with audit trail
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  error (message, metadata = {}) {
    const logEntry = this._createLogEntry('error', message, metadata)
    this.logger.error(message, metadata)
    this._addToAuditTrail(logEntry)
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  debug (message, metadata = {}) {
    const logEntry = this._createLogEntry('debug', message, metadata)
    this.logger.debug(message, metadata)
    this._addToAuditTrail(logEntry)
  }

  /**
   * Log security event with special handling
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   */
  security (event, details = {}) {
    const logEntry = this._createLogEntry('security', `SECURITY_EVENT: ${event}`, {
      eventType: event,
      ...details,
      severity: 'HIGH'
    })

    this.logger.warn(`SECURITY_EVENT: ${event}`, {
      eventType: event,
      ...details,
      severity: 'HIGH'
    })

    this._addToAuditTrail(logEntry)
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {Object} metrics - Performance metrics
   */
  performance (operation, metrics = {}) {
    const logEntry = this._createLogEntry('performance', `PERFORMANCE: ${operation}`, {
      operation,
      ...metrics,
      category: 'PERFORMANCE'
    })

    this.logger.info(`PERFORMANCE: ${operation}`, {
      operation,
      ...metrics,
      category: 'PERFORMANCE'
    })

    this._addToAuditTrail(logEntry)
  }

  /**
   * Log operation start
   * @param {string} operationId - Operation identifier
   * @param {string} operationType - Type of operation
   * @param {Object} context - Operation context
   */
  operationStart (operationId, operationType, context = {}) {
    this.info(`Operation started: ${operationType}`, {
      operationId,
      operationType,
      phase: 'START',
      ...context
    })
  }

  /**
   * Log operation completion
   * @param {string} operationId - Operation identifier
   * @param {string} operationType - Type of operation
   * @param {Object} result - Operation result
   */
  operationComplete (operationId, operationType, result = {}) {
    this.info(`Operation completed: ${operationType}`, {
      operationId,
      operationType,
      phase: 'COMPLETE',
      ...result
    })
  }

  /**
   * Log operation failure
   * @param {string} operationId - Operation identifier
   * @param {string} operationType - Type of operation
   * @param {Error} error - Error that occurred
   */
  operationFailed (operationId, operationType, error) {
    this.error(`Operation failed: ${operationType}`, {
      operationId,
      operationType,
      phase: 'FAILED',
      error: error.message,
      stack: error.stack
    })
  }

  /**
   * Create structured log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Log entry
   * @private
   */
  _createLogEntry (level, message, metadata) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      pid: process.pid,
      hostname: require('os').hostname(),
      version: '1.0.0'
    }
  }

  /**
   * Add entry to in-memory audit trail
   * @param {Object} logEntry - Log entry to add
   * @private
   */
  _addToAuditTrail (logEntry) {
    this.auditTrail.push(logEntry)

    // Maintain maximum audit entries
    if (this.auditTrail.length > this.maxAuditEntries) {
      this.auditTrail.shift()
    }
  }

  /**
   * Get audit trail entries
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered audit trail entries
   */
  getAuditTrail (filters = {}) {
    let entries = [...this.auditTrail]

    // Apply filters
    if (filters.level) {
      entries = entries.filter(entry => entry.level === filters.level)
    }

    if (filters.sessionId) {
      entries = entries.filter(entry =>
        entry.metadata.sessionId === filters.sessionId
      )
    }

    if (filters.operationId) {
      entries = entries.filter(entry =>
        entry.metadata.operationId === filters.operationId
      )
    }

    if (filters.startTime) {
      entries = entries.filter(entry =>
        new Date(entry.timestamp) >= new Date(filters.startTime)
      )
    }

    if (filters.endTime) {
      entries = entries.filter(entry =>
        new Date(entry.timestamp) <= new Date(filters.endTime)
      )
    }

    // Sort by timestamp
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    return entries
  }

  /**
   * Export audit trail to file
   * @param {string} filePath - Output file path
   * @param {Object} filters - Filter criteria
   */
  exportAuditTrail (filePath, filters = {}) {
    const entries = this.getAuditTrail(filters)
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      filters,
      entries
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8')
      this.info('Audit trail exported', {
        filePath,
        entriesCount: entries.length
      })
    } catch (error) {
      this.error('Failed to export audit trail', {
        filePath,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get audit statistics
   * @returns {Object} Audit statistics
   */
  getAuditStatistics () {
    const stats = {
      totalEntries: this.auditTrail.length,
      byLevel: {},
      recentActivity: {
        lastHour: 0,
        lastDay: 0
      }
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    for (const entry of this.auditTrail) {
      // Count by level
      stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1

      // Count recent activity
      const entryTime = new Date(entry.timestamp)
      if (entryTime > oneHourAgo) {
        stats.recentActivity.lastHour++
      }
      if (entryTime > oneDayAgo) {
        stats.recentActivity.lastDay++
      }
    }

    return stats
  }

  /**
   * Clear audit trail (use with caution)
   * @param {boolean} confirm - Confirmation flag
   */
  clearAuditTrail (confirm = false) {
    if (!confirm) {
      throw new Error('Audit trail clearing requires explicit confirmation')
    }

    this.warn('Audit trail cleared', {
      clearedEntries: this.auditTrail.length,
      clearedAt: new Date().toISOString()
    })

    this.auditTrail.length = 0
  }

  /**
   * Set log level
   * @param {string} level - New log level
   */
  setLogLevel (level) {
    this.logLevel = level
    this.logger.level = level
    this.info('Log level changed', { newLevel: level })
  }

  /**
   * Get current log level
   * @returns {string} Current log level
   */
  getLogLevel () {
    return this.logLevel
  }

  /**
   * Cleanup logger resources
   */
  async cleanup () {
    return new Promise((resolve) => {
      this.logger.end(() => {
        this.info('Audit logger cleanup completed')
        resolve()
      })
    })
  }
}

module.exports = AuditLogger
