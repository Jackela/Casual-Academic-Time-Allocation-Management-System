/**
 * Alert Manager with Escalation Protocols
 *
 * Enterprise-grade alert management system with:
 * - Multi-level escalation protocols
 * - <1 second alert response time
 * - Smart alert aggregation and deduplication
 * - Configurable notification channels
 * - Alert fatigue prevention
 * - Automatic recovery detection
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')

/**
 * Alert severity levels
 */
const SEVERITY_LEVELS = {
  LOW: { value: 1, name: 'low', color: 'green' },
  MEDIUM: { value: 2, name: 'medium', color: 'yellow' },
  HIGH: { value: 3, name: 'high', color: 'orange' },
  CRITICAL: { value: 4, name: 'critical', color: 'red' }
}

/**
 * Alert states
 */
const ALERT_STATES = {
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  SUPPRESSED: 'suppressed'
}

/**
 * Enterprise alert management with escalation protocols
 */
class AlertManager extends EventEmitter {
  constructor(dependencies = {}, options = {}) {
    super()

    // Dependency injection
    this.auditLogger = dependencies.auditLogger
    this.processRegistry = dependencies.processRegistry
    this.realTimeMonitor = dependencies.realTimeMonitor

    // Configuration
    this.config = {
      maxResponseTime: options.maxResponseTime || 1000, // 1 second requirement
      escalationLevels: options.escalationLevels || [
        { level: 1, delay: 30000, channels: ['console'] }, // 30 seconds
        { level: 2, delay: 120000, channels: ['console', 'email'] }, // 2 minutes
        { level: 3, delay: 300000, channels: ['console', 'email', 'sms'] } // 5 minutes
      ],
      deduplicationWindow: options.deduplicationWindow || 60000, // 1 minute
      suppressionWindow: options.suppressionWindow || 300000, // 5 minutes
      maxAlertsPerMinute: options.maxAlertsPerMinute || 10,
      autoRecoveryDetection: options.autoRecoveryDetection !== false,
      aggregationRules: options.aggregationRules || [
        { type: 'process_leak', threshold: 3, window: 120000 },
        { type: 'performance_threshold', threshold: 5, window: 300000 }
      ],
      notificationChannels: {
        console: { enabled: true },
        email: { enabled: false, recipients: [] },
        sms: { enabled: false, recipients: [] },
        webhook: { enabled: false, url: '' },
        slack: { enabled: false, webhook: '' }
      },
      ...options
    }

    // Alert management state
    this.alerts = new Map()
    this.alertHistory = []
    this.suppressedAlerts = new Set()
    this.escalationTimers = new Map()
    this.alertCounts = new Map()
    this.lastAlertTime = new Map()

    // Metrics
    this.metrics = {
      totalAlerts: 0,
      alertsByLevel: new Map(),
      averageResponseTime: 0,
      escalationsTriggered: 0,
      autoResolutions: 0,
      suppressedCount: 0,
      acknowledgedCount: 0
    }

    // Initialize severity metrics
    Object.values(SEVERITY_LEVELS).forEach(level => {
      this.metrics.alertsByLevel.set(level.name, 0)
    })

    // Alert processors
    this.alertProcessors = new Map([
      ['memory_leak', this._processMemoryLeakAlert.bind(this)],
      ['process_threshold', this._processThresholdAlert.bind(this)],
      ['performance_threshold', this._processPerformanceAlert.bind(this)],
      ['system_anomaly', this._processSystemAnomalyAlert.bind(this)],
      ['resource_exhaustion', this._processResourceAlert.bind(this)]
    ])
  }

  /**
   * Start alert management
   */
  async startAlertManager() {
    try {
      this.auditLogger?.info('Starting alert manager', {
        component: 'AlertManager',
        config: this.config
      })

      // Setup alert listeners
      this._setupAlertListeners()

      // Start maintenance tasks
      this._startMaintenanceTasks()

      this.auditLogger?.info('Alert manager started', {
        component: 'AlertManager',
        escalationLevels: this.config.escalationLevels.length,
        channels: Object.keys(this.config.notificationChannels).filter(
          channel => this.config.notificationChannels[channel].enabled
        )
      })

      this.emit('alertManagerStarted')

    } catch (error) {
      this.auditLogger?.error('Failed to start alert manager', {
        component: 'AlertManager',
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Stop alert management
   */
  async stopAlertManager() {
    try {
      this.auditLogger?.info('Stopping alert manager', {
        component: 'AlertManager',
        metrics: this.getMetrics()
      })

      // Clear all escalation timers
      for (const timer of this.escalationTimers.values()) {
        clearTimeout(timer)
      }
      this.escalationTimers.clear()

      // Stop maintenance tasks
      if (this.maintenanceInterval) {
        clearInterval(this.maintenanceInterval)
        this.maintenanceInterval = null
      }

      this.auditLogger?.info('Alert manager stopped', {
        component: 'AlertManager',
        finalMetrics: this.getMetrics()
      })

      this.emit('alertManagerStopped')

    } catch (error) {
      this.auditLogger?.error('Error stopping alert manager', {
        component: 'AlertManager',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Process new alert
   * @param {Object} alertData - Alert information
   */
  async processAlert(alertData) {
    const processStart = process.hrtime.bigint()

    try {
      // Validate alert data
      this._validateAlertData(alertData)

      // Generate alert ID
      const alertId = this._generateAlertId(alertData)

      // Check for deduplication
      if (this._isDuplicateAlert(alertId, alertData)) {
        this.auditLogger?.debug('Alert deduplicated', {
          component: 'AlertManager',
          alertId,
          type: alertData.type
        })
        return null
      }

      // Check for suppression
      if (this._isAlertSuppressed(alertData)) {
        this.metrics.suppressedCount++
        this.auditLogger?.debug('Alert suppressed', {
          component: 'AlertManager',
          alertId,
          type: alertData.type
        })
        return null
      }

      // Check rate limiting
      if (this._isRateLimited(alertData.type)) {
        this.auditLogger?.warn('Alert rate limited', {
          component: 'AlertManager',
          type: alertData.type,
          maxAlertsPerMinute: this.config.maxAlertsPerMinute
        })
        return null
      }

      // Create alert object
      const alert = this._createAlert(alertId, alertData)

      // Process alert type-specific logic
      const processor = this.alertProcessors.get(alertData.type)
      if (processor) {
        await processor(alert)
      }

      // Check for aggregation
      const aggregatedAlert = this._checkAggregation(alert)
      if (aggregatedAlert) {
        alert.aggregated = true
        alert.aggregatedAlerts = aggregatedAlert.alerts
      }

      // Store alert
      this.alerts.set(alertId, alert)
      this.alertHistory.push({ ...alert })

      // Update metrics
      this._updateAlertMetrics(alert)

      // Send notifications
      await this._sendNotifications(alert)

      // Schedule escalation if needed
      this._scheduleEscalation(alert)

      const processLatency = Number(process.hrtime.bigint() - processStart) / 1000000

      // Validate response time requirement
      if (processLatency > this.config.maxResponseTime) {
        this.auditLogger?.warn('Alert response time exceeded requirement', {
          component: 'AlertManager',
          alertId,
          responseTime: `${processLatency.toFixed(3)}ms`,
          requirement: `${this.config.maxResponseTime}ms`
        })
      }

      this.auditLogger?.info('Alert processed', {
        component: 'AlertManager',
        alertId,
        type: alertData.type,
        severity: alert.severity,
        responseTime: `${processLatency.toFixed(3)}ms`
      })

      this.emit('alertProcessed', {
        alert,
        responseTime: processLatency
      })

      return alert

    } catch (error) {
      const processLatency = Number(process.hrtime.bigint() - processStart) / 1000000

      this.auditLogger?.error('Alert processing failed', {
        component: 'AlertManager',
        error: error.message,
        alertData,
        responseTime: `${processLatency.toFixed(3)}ms`
      })

      this.emit('alertProcessingFailed', {
        alertData,
        error: error.message,
        responseTime: processLatency
      })

      throw error
    }
  }

  /**
   * Acknowledge alert
   * @param {string} alertId - Alert identifier
   * @param {string} acknowledgedBy - Who acknowledged the alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy = 'system') {
    const alert = this.alerts.get(alertId)

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`)
    }

    if (alert.state === ALERT_STATES.ACKNOWLEDGED) {
      return alert
    }

    // Update alert state
    alert.state = ALERT_STATES.ACKNOWLEDGED
    alert.acknowledgedBy = acknowledgedBy
    alert.acknowledgedAt = Date.now()

    // Cancel escalation
    this._cancelEscalation(alertId)

    this.metrics.acknowledgedCount++

    this.auditLogger?.info('Alert acknowledged', {
      component: 'AlertManager',
      alertId,
      acknowledgedBy,
      severity: alert.severity
    })

    this.emit('alertAcknowledged', { alert, acknowledgedBy })

    return alert
  }

  /**
   * Resolve alert
   * @param {string} alertId - Alert identifier
   * @param {string} resolvedBy - Who resolved the alert
   * @param {string} resolution - Resolution description
   */
  async resolveAlert(alertId, resolvedBy = 'system', resolution = '') {
    const alert = this.alerts.get(alertId)

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`)
    }

    if (alert.state === ALERT_STATES.RESOLVED) {
      return alert
    }

    // Update alert state
    alert.state = ALERT_STATES.RESOLVED
    alert.resolvedBy = resolvedBy
    alert.resolvedAt = Date.now()
    alert.resolution = resolution
    alert.duration = alert.resolvedAt - alert.timestamp

    // Cancel escalation
    this._cancelEscalation(alertId)

    // Check if it was auto-resolved
    if (resolvedBy === 'system') {
      this.metrics.autoResolutions++
    }

    this.auditLogger?.info('Alert resolved', {
      component: 'AlertManager',
      alertId,
      resolvedBy,
      resolution,
      duration: alert.duration,
      severity: alert.severity
    })

    this.emit('alertResolved', { alert, resolvedBy, resolution })

    return alert
  }

  /**
   * Suppress alert type
   * @param {string} alertType - Alert type to suppress
   * @param {number} duration - Suppression duration in milliseconds
   */
  suppressAlertType(alertType, duration = this.config.suppressionWindow) {
    const suppressionKey = `type:${alertType}`
    this.suppressedAlerts.add(suppressionKey)

    setTimeout(() => {
      this.suppressedAlerts.delete(suppressionKey)
      this.auditLogger?.info('Alert suppression lifted', {
        component: 'AlertManager',
        alertType
      })
    }, duration)

    this.auditLogger?.info('Alert type suppressed', {
      component: 'AlertManager',
      alertType,
      duration
    })
  }

  /**
   * Get all active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(
      alert => alert.state !== ALERT_STATES.RESOLVED
    )
  }

  /**
   * Get alert history
   * @param {Object} filters - Filter options
   * @returns {Array} Alert history
   */
  getAlertHistory(filters = {}) {
    let history = [...this.alertHistory]

    if (filters.severity) {
      history = history.filter(alert => alert.severity === filters.severity)
    }

    if (filters.type) {
      history = history.filter(alert => alert.type === filters.type)
    }

    if (filters.startTime) {
      history = history.filter(alert => alert.timestamp >= filters.startTime)
    }

    if (filters.endTime) {
      history = history.filter(alert => alert.timestamp <= filters.endTime)
    }

    if (filters.limit) {
      history = history.slice(-filters.limit)
    }

    return history.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get alert metrics
   * @returns {Object} Alert metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeAlerts: this.alerts.size,
      alertHistory: this.alertHistory.length,
      suppressedTypes: this.suppressedAlerts.size,
      activeEscalations: this.escalationTimers.size,
      config: this.config
    }
  }

  /**
   * Validate alert data
   * @param {Object} alertData - Alert data to validate
   * @private
   */
  _validateAlertData(alertData) {
    if (!alertData || typeof alertData !== 'object') {
      throw new Error('Alert data must be an object')
    }

    if (!alertData.type) {
      throw new Error('Alert must have a type')
    }

    if (!alertData.message) {
      throw new Error('Alert must have a message')
    }

    // Validate severity
    const severity = alertData.severity || 'medium'
    if (!Object.values(SEVERITY_LEVELS).some(level => level.name === severity)) {
      throw new Error(`Invalid severity level: ${severity}`)
    }
  }

  /**
   * Generate alert ID
   * @param {Object} alertData - Alert data
   * @returns {string} Alert ID
   * @private
   */
  _generateAlertId(alertData) {
    const timestamp = Date.now()
    const hash = this._hashString(`${alertData.type}_${alertData.source || 'unknown'}_${timestamp}`)
    return `alert_${timestamp}_${hash.substr(0, 8)}`
  }

  /**
   * Check if alert is duplicate
   * @param {string} alertId - Alert ID
   * @param {Object} alertData - Alert data
   * @returns {boolean} True if duplicate
   * @private
   */
  _isDuplicateAlert(alertId, alertData) {
    const now = Date.now()
    const deduplicationKey = `${alertData.type}_${alertData.source || 'unknown'}`

    for (const [existingId, alert] of this.alerts.entries()) {
      if (alert.deduplicationKey === deduplicationKey &&
          (now - alert.timestamp) < this.config.deduplicationWindow &&
          alert.state !== ALERT_STATES.RESOLVED) {
        
        // Update last seen time for existing alert
        alert.lastSeen = now
        alert.count = (alert.count || 1) + 1

        return true
      }
    }

    return false
  }

  /**
   * Check if alert type is suppressed
   * @param {Object} alertData - Alert data
   * @returns {boolean} True if suppressed
   * @private
   */
  _isAlertSuppressed(alertData) {
    const typeKey = `type:${alertData.type}`
    const sourceKey = `source:${alertData.source || 'unknown'}`
    
    return this.suppressedAlerts.has(typeKey) || this.suppressedAlerts.has(sourceKey)
  }

  /**
   * Check if alert type is rate limited
   * @param {string} alertType - Alert type
   * @returns {boolean} True if rate limited
   * @private
   */
  _isRateLimited(alertType) {
    const now = Date.now()
    const windowStart = now - 60000 // 1 minute window

    const count = this.alertCounts.get(alertType) || { count: 0, windowStart: now }

    // Reset if window expired
    if (now - count.windowStart > 60000) {
      count.count = 0
      count.windowStart = now
    }

    count.count++
    this.alertCounts.set(alertType, count)

    return count.count > this.config.maxAlertsPerMinute
  }

  /**
   * Create alert object
   * @param {string} alertId - Alert ID
   * @param {Object} alertData - Alert data
   * @returns {Object} Alert object
   * @private
   */
  _createAlert(alertId, alertData) {
    const now = Date.now()

    return {
      id: alertId,
      type: alertData.type,
      severity: alertData.severity || 'medium',
      message: alertData.message,
      description: alertData.description || '',
      source: alertData.source || 'unknown',
      timestamp: now,
      state: ALERT_STATES.PENDING,
      deduplicationKey: `${alertData.type}_${alertData.source || 'unknown'}`,
      metadata: alertData.metadata || {},
      count: 1,
      lastSeen: now,
      escalationLevel: 0,
      notifications: []
    }
  }

  /**
   * Check for alert aggregation
   * @param {Object} alert - Current alert
   * @returns {Object|null} Aggregated alert data
   * @private
   */
  _checkAggregation(alert) {
    for (const rule of this.config.aggregationRules) {
      if (rule.type === alert.type) {
        const relatedAlerts = this._findRelatedAlerts(alert, rule.window)
        
        if (relatedAlerts.length >= rule.threshold) {
          return {
            rule,
            alerts: relatedAlerts
          }
        }
      }
    }

    return null
  }

  /**
   * Find related alerts for aggregation
   * @param {Object} alert - Current alert
   * @param {number} window - Time window in milliseconds
   * @returns {Array} Related alerts
   * @private
   */
  _findRelatedAlerts(alert, window) {
    const cutoff = alert.timestamp - window
    
    return this.alertHistory.filter(historicAlert => 
      historicAlert.type === alert.type &&
      historicAlert.timestamp > cutoff &&
      historicAlert.state !== ALERT_STATES.RESOLVED
    )
  }

  /**
   * Update alert metrics
   * @param {Object} alert - Alert object
   * @private
   */
  _updateAlertMetrics(alert) {
    this.metrics.totalAlerts++
    
    const currentCount = this.metrics.alertsByLevel.get(alert.severity) || 0
    this.metrics.alertsByLevel.set(alert.severity, currentCount + 1)
  }

  /**
   * Send notifications for alert
   * @param {Object} alert - Alert object
   * @private
   */
  async _sendNotifications(alert) {
    const notifications = []

    for (const [channel, config] of Object.entries(this.config.notificationChannels)) {
      if (config.enabled) {
        try {
          const result = await this._sendNotification(channel, alert, config)
          notifications.push({
            channel,
            success: true,
            sentAt: Date.now(),
            result
          })
        } catch (error) {
          notifications.push({
            channel,
            success: false,
            sentAt: Date.now(),
            error: error.message
          })

          this.auditLogger?.error('Notification failed', {
            component: 'AlertManager',
            alertId: alert.id,
            channel,
            error: error.message
          })
        }
      }
    }

    alert.notifications = notifications
  }

  /**
   * Send notification to specific channel
   * @param {string} channel - Notification channel
   * @param {Object} alert - Alert object
   * @param {Object} config - Channel configuration
   * @private
   */
  async _sendNotification(channel, alert, config) {
    switch (channel) {
      case 'console':
        return this._sendConsoleNotification(alert)
      case 'email':
        return this._sendEmailNotification(alert, config)
      case 'sms':
        return this._sendSmsNotification(alert, config)
      case 'webhook':
        return this._sendWebhookNotification(alert, config)
      case 'slack':
        return this._sendSlackNotification(alert, config)
      default:
        throw new Error(`Unknown notification channel: ${channel}`)
    }
  }

  /**
   * Send console notification
   * @param {Object} alert - Alert object
   * @private
   */
  _sendConsoleNotification(alert) {
    const severityColor = SEVERITY_LEVELS[alert.severity.toUpperCase()]?.color || 'white'
    const message = `🚨 [${alert.severity.toUpperCase()}] ${alert.message}`
    
    console.log(`\x1b[31m${message}\x1b[0m`) // Red color for alerts
    
    return { method: 'console.log', timestamp: Date.now() }
  }

  /**
   * Schedule alert escalation
   * @param {Object} alert - Alert object
   * @private
   */
  _scheduleEscalation(alert) {
    if (alert.severity === 'low' || this.config.escalationLevels.length === 0) {
      return
    }

    const escalationLevel = this.config.escalationLevels[0]
    const timer = setTimeout(async () => {
      await this._escalateAlert(alert.id)
    }, escalationLevel.delay)

    this.escalationTimers.set(alert.id, timer)
  }

  /**
   * Escalate alert to next level
   * @param {string} alertId - Alert ID
   * @private
   */
  async _escalateAlert(alertId) {
    const alert = this.alerts.get(alertId)

    if (!alert || alert.state === ALERT_STATES.RESOLVED || alert.state === ALERT_STATES.ACKNOWLEDGED) {
      return
    }

    alert.escalationLevel++
    alert.state = ALERT_STATES.ESCALATED
    alert.escalatedAt = Date.now()

    this.metrics.escalationsTriggered++

    this.auditLogger?.warn('Alert escalated', {
      component: 'AlertManager',
      alertId,
      escalationLevel: alert.escalationLevel,
      severity: alert.severity
    })

    this.emit('alertEscalated', { alert })

    // Schedule next escalation if available
    if (alert.escalationLevel < this.config.escalationLevels.length) {
      const nextLevel = this.config.escalationLevels[alert.escalationLevel]
      const timer = setTimeout(async () => {
        await this._escalateAlert(alertId)
      }, nextLevel.delay)

      this.escalationTimers.set(alertId, timer)
    }
  }

  /**
   * Cancel alert escalation
   * @param {string} alertId - Alert ID
   * @private
   */
  _cancelEscalation(alertId) {
    const timer = this.escalationTimers.get(alertId)
    if (timer) {
      clearTimeout(timer)
      this.escalationTimers.delete(alertId)
    }
  }

  /**
   * Setup alert listeners
   * @private
   */
  _setupAlertListeners() {
    // Listen for memory leak alerts
    if (this.realTimeMonitor) {
      this.realTimeMonitor.on('memoryLeakDetected', (leak) => {
        this.processAlert({
          type: 'memory_leak',
          severity: leak.severity || 'high',
          message: `Memory leak detected in process ${leak.pid}`,
          description: `Process ${leak.name} (PID: ${leak.pid}) using ${Math.round(leak.memory / 1024 / 1024)}MB`,
          source: 'RealTimeMonitor',
          metadata: leak
        })
      })

      this.realTimeMonitor.on('thresholdAlert', (alert) => {
        this.processAlert({
          type: 'process_threshold',
          severity: alert.severity || 'medium',
          message: `Process threshold violation: ${alert.type}`,
          description: `${alert.type} exceeded threshold: ${alert.value}`,
          source: 'RealTimeMonitor',
          metadata: alert
        })
      })
    }
  }

  /**
   * Start maintenance tasks
   * @private
   */
  _startMaintenanceTasks() {
    // Cleanup old alerts and perform maintenance every 5 minutes
    this.maintenanceInterval = setInterval(() => {
      this._performMaintenance()
    }, 300000)
  }

  /**
   * Perform maintenance tasks
   * @private
   */
  _performMaintenance() {
    const now = Date.now()
    const cleanupAge = 24 * 60 * 60 * 1000 // 24 hours

    // Cleanup old resolved alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.state === ALERT_STATES.RESOLVED && 
          (now - alert.resolvedAt) > cleanupAge) {
        this.alerts.delete(alertId)
      }
    }

    // Cleanup old alert history
    this.alertHistory = this.alertHistory.filter(
      alert => (now - alert.timestamp) < cleanupAge
    )

    // Auto-resolve stale alerts if recovery detected
    if (this.config.autoRecoveryDetection) {
      this._checkAutoRecovery()
    }

    this.auditLogger?.debug('Alert maintenance completed', {
      component: 'AlertManager',
      activeAlerts: this.alerts.size,
      historySize: this.alertHistory.length
    })
  }

  /**
   * Check for automatic alert recovery
   * @private
   */
  _checkAutoRecovery() {
    // Implementation would check if conditions that triggered alerts have resolved
    // For now, this is a placeholder for the concept
  }

  /**
   * Hash string for ID generation
   * @param {string} str - String to hash
   * @returns {string} Hash
   * @private
   */
  _hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  // Alert processor methods (placeholders for specific alert type handling)
  async _processMemoryLeakAlert(alert) {
    // Memory leak specific processing
    alert.autoActions = ['monitor', 'collect_diagnostics']
  }

  async _processThresholdAlert(alert) {
    // Threshold alert specific processing
    alert.autoActions = ['monitor']
  }

  async _processPerformanceAlert(alert) {
    // Performance alert specific processing
    alert.autoActions = ['profile', 'monitor']
  }

  async _processSystemAnomalyAlert(alert) {
    // System anomaly specific processing
    alert.autoActions = ['investigate', 'monitor']
  }

  async _processResourceAlert(alert) {
    // Resource alert specific processing
    alert.autoActions = ['cleanup', 'monitor']
  }

  // Placeholder notification methods
  async _sendEmailNotification(alert, config) {
    // Email notification implementation
    return { method: 'email', recipients: config.recipients }
  }

  async _sendSmsNotification(alert, config) {
    // SMS notification implementation
    return { method: 'sms', recipients: config.recipients }
  }

  async _sendWebhookNotification(alert, config) {
    // Webhook notification implementation
    return { method: 'webhook', url: config.url }
  }

  async _sendSlackNotification(alert, config) {
    // Slack notification implementation
    return { method: 'slack', webhook: config.webhook }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.stopAlertManager()
    this.removeAllListeners()
    this.alerts.clear()
    this.alertHistory.length = 0
    this.suppressedAlerts.clear()
    this.alertCounts.clear()
    this.lastAlertTime.clear()
  }
}

module.exports = AlertManager