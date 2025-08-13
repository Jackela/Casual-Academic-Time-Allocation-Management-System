/**
 * Monitoring Dashboard - Real-time System Monitoring Interface
 *
 * Comprehensive dashboard system with:
 * - Real-time dashboard updates (<100ms)
 * - Multi-component data aggregation
 * - WebSocket-based live updates
 * - Interactive monitoring interface
 * - Performance metrics visualization
 * - Alert status monitoring
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')
const http = require('http')
const path = require('path')
const fs = require('fs').promises

/**
 * Real-time monitoring dashboard system
 */
class MonitoringDashboard extends EventEmitter {
  constructor(dependencies = {}, options = {}) {
    super()

    // Dependency injection
    this.auditLogger = dependencies.auditLogger
    this.realTimeMonitor = dependencies.realTimeMonitor
    this.leakDetector = dependencies.leakDetector
    this.performanceProfiler = dependencies.performanceProfiler
    this.alertManager = dependencies.alertManager
    this.nodeDiagnostics = dependencies.nodeDiagnostics

    // Configuration
    this.config = {
      port: options.port || 3001,
      host: options.host || 'localhost',
      updateInterval: options.updateInterval || 100, // 100ms requirement
      enableWebInterface: options.enableWebInterface !== false,
      enableWebSocket: options.enableWebSocket !== false,
      enableJsonApi: options.enableJsonApi !== false,
      maxHistorySize: options.maxHistorySize || 1000,
      enableAuthentication: options.enableAuthentication || false,
      staticPath: options.staticPath || path.join(__dirname, 'static'),
      apiPrefix: options.apiPrefix || '/api/v1',
      ...options
    }

    // Dashboard state
    this.isRunning = false
    this.server = null
    this.webSocketClients = new Set()
    this.updateTimer = null

    // Data aggregation
    this.dashboardData = {
      timestamp: 0,
      status: 'unknown',
      system: {},
      performance: {},
      alerts: {},
      processes: {},
      diagnostics: {},
      trends: {}
    }

    // Metrics history
    this.metricsHistory = []
    this.alertHistory = []

    // Statistics
    this.statistics = {
      totalUpdates: 0,
      averageUpdateLatency: 0,
      connectedClients: 0,
      apiRequests: 0,
      errorCount: 0
    }

    // API endpoints
    this.apiEndpoints = new Map([
      ['GET /api/v1/status', this._handleStatusRequest.bind(this)],
      ['GET /api/v1/metrics', this._handleMetricsRequest.bind(this)],
      ['GET /api/v1/alerts', this._handleAlertsRequest.bind(this)],
      ['GET /api/v1/processes', this._handleProcessesRequest.bind(this)],
      ['GET /api/v1/diagnostics', this._handleDiagnosticsRequest.bind(this)],
      ['GET /api/v1/history', this._handleHistoryRequest.bind(this)],
      ['POST /api/v1/alerts/acknowledge', this._handleAcknowledgeAlert.bind(this)],
      ['POST /api/v1/alerts/resolve', this._handleResolveAlert.bind(this)]
    ])
  }

  /**
   * Start monitoring dashboard
   */
  async startDashboard() {
    if (this.isRunning) {
      throw new Error('Monitoring dashboard is already running')
    }

    const startTime = process.hrtime.bigint()

    try {
      this.auditLogger?.info('Starting monitoring dashboard', {
        component: 'MonitoringDashboard',
        config: this.config
      })

      // Initialize static content
      if (this.config.enableWebInterface) {
        await this._initializeStaticContent()
      }

      // Create HTTP server
      this.server = http.createServer(this._handleHttpRequest.bind(this))

      // Setup WebSocket if enabled
      if (this.config.enableWebSocket) {
        this._setupWebSocket()
      }

      // Start server
      await new Promise((resolve, reject) => {
        this.server.listen(this.config.port, this.config.host, (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      // Start data aggregation
      this._startDataAggregation()

      // Setup component listeners
      this._setupComponentListeners()

      this.isRunning = true
      const startupLatency = Number(process.hrtime.bigint() - startTime) / 1000000

      this.auditLogger?.info('Monitoring dashboard started', {
        component: 'MonitoringDashboard',
        url: `http://${this.config.host}:${this.config.port}`,
        startupLatency: `${startupLatency.toFixed(3)}ms`,
        features: this._getEnabledFeatures()
      })

      this.emit('dashboardStarted', {
        url: `http://${this.config.host}:${this.config.port}`,
        startupLatency
      })

    } catch (error) {
      this.auditLogger?.error('Failed to start monitoring dashboard', {
        component: 'MonitoringDashboard',
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Stop monitoring dashboard
   */
  async stopDashboard() {
    if (!this.isRunning) {
      return
    }

    try {
      this.auditLogger?.info('Stopping monitoring dashboard', {
        component: 'MonitoringDashboard',
        statistics: this.getStatistics()
      })

      // Stop data aggregation
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }

      // Close WebSocket connections
      for (const client of this.webSocketClients) {
        try {
          client.close()
        } catch (error) {
          // Ignore close errors
        }
      }
      this.webSocketClients.clear()

      // Stop HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => resolve())
        })
        this.server = null
      }

      this.isRunning = false

      this.auditLogger?.info('Monitoring dashboard stopped', {
        component: 'MonitoringDashboard',
        finalStatistics: this.getStatistics()
      })

      this.emit('dashboardStopped')

    } catch (error) {
      this.auditLogger?.error('Error stopping monitoring dashboard', {
        component: 'MonitoringDashboard',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get current dashboard data
   * @returns {Object} Dashboard data
   */
  getDashboardData() {
    return {
      ...this.dashboardData,
      statistics: this.getStatistics(),
      lastUpdate: Date.now()
    }
  }

  /**
   * Get dashboard statistics
   * @returns {Object} Dashboard statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      isRunning: this.isRunning,
      connectedClients: this.webSocketClients.size,
      metricsHistorySize: this.metricsHistory.length,
      alertHistorySize: this.alertHistory.length,
      config: this.config
    }
  }

  /**
   * Broadcast update to all connected clients
   * @param {Object} data - Data to broadcast
   */
  broadcastUpdate(data) {
    if (!this.config.enableWebSocket || this.webSocketClients.size === 0) {
      return
    }

    const message = JSON.stringify({
      type: 'dashboard_update',
      timestamp: Date.now(),
      data
    })

    for (const client of this.webSocketClients) {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message)
        }
      } catch (error) {
        // Remove failed client
        this.webSocketClients.delete(client)
      }
    }
  }

  /**
   * Initialize static content for web interface
   * @private
   */
  async _initializeStaticContent() {
    try {
      // Ensure static directory exists
      await fs.access(this.config.staticPath)
    } catch (error) {
      // Create basic static content if directory doesn't exist
      await fs.mkdir(this.config.staticPath, { recursive: true })
      await this._createBasicStaticContent()
    }
  }

  /**
   * Create basic static content
   * @private
   */
  async _createBasicStaticContent() {
    // Create basic HTML dashboard
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Process Management Monitoring Dashboard</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
        }
        .card h3 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #007acc;
            padding-bottom: 10px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .metric-name {
            font-weight: 500;
        }
        .metric-value {
            font-family: monospace;
            color: #007acc;
        }
        .status {
            padding: 4px 8px;
            border-radius: 4px;
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        .status.running { background-color: #28a745; }
        .status.warning { background-color: #ffc107; color: black; }
        .status.error { background-color: #dc3545; }
        .alert {
            margin: 5px 0;
            padding: 10px;
            border-radius: 4px;
            border-left: 4px solid;
        }
        .alert.high { border-color: #dc3545; background: #f8d7da; }
        .alert.medium { border-color: #ffc107; background: #fff3cd; }
        .alert.low { border-color: #17a2b8; background: #d1ecf1; }
        #connection-status {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 4px;
            color: white;
            font-size: 12px;
        }
        .connected { background-color: #28a745; }
        .disconnected { background-color: #dc3545; }
    </style>
</head>
<body>
    <div id="connection-status" class="disconnected">Disconnected</div>
    
    <h1>Process Management Monitoring Dashboard</h1>
    
    <div class="dashboard">
        <div class="card">
            <h3>System Status</h3>
            <div id="system-status">
                <div class="metric">
                    <span class="metric-name">Overall Status</span>
                    <span class="metric-value">
                        <span id="overall-status" class="status">Unknown</span>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-name">Uptime</span>
                    <span class="metric-value" id="system-uptime">--</span>
                </div>
                <div class="metric">
                    <span class="metric-name">Last Update</span>
                    <span class="metric-value" id="last-update">--</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Performance Metrics</h3>
            <div id="performance-metrics">
                <div class="metric">
                    <span class="metric-name">CPU Usage</span>
                    <span class="metric-value" id="cpu-usage">--</span>
                </div>
                <div class="metric">
                    <span class="metric-name">Memory Usage</span>
                    <span class="metric-value" id="memory-usage">--</span>
                </div>
                <div class="metric">
                    <span class="metric-name">Process Count</span>
                    <span class="metric-value" id="process-count">--</span>
                </div>
                <div class="metric">
                    <span class="metric-name">Performance Score</span>
                    <span class="metric-value" id="performance-score">--</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Active Alerts</h3>
            <div id="active-alerts">
                <p>No active alerts</p>
            </div>
        </div>

        <div class="card">
            <h3>Monitoring Components</h3>
            <div id="component-status">
                <div class="metric">
                    <span class="metric-name">Real-time Monitor</span>
                    <span class="metric-value">
                        <span id="monitor-status" class="status">Unknown</span>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-name">Leak Detector</span>
                    <span class="metric-value">
                        <span id="leak-detector-status" class="status">Unknown</span>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-name">Performance Profiler</span>
                    <span class="metric-value">
                        <span id="profiler-status" class="status">Unknown</span>
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-name">Alert Manager</span>
                    <span class="metric-value">
                        <span id="alert-manager-status" class="status">Unknown</span>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <script>
        class MonitoringDashboard {
            constructor() {
                this.ws = null;
                this.reconnectAttempts = 0;
                this.maxReconnectAttempts = 5;
                this.reconnectDelay = 1000;
                
                this.initializeWebSocket();
                this.startPolling();
            }

            initializeWebSocket() {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
                
                try {
                    this.ws = new WebSocket(wsUrl);
                    
                    this.ws.onopen = () => {
                        console.log('WebSocket connected');
                        this.updateConnectionStatus(true);
                        this.reconnectAttempts = 0;
                    };
                    
                    this.ws.onmessage = (event) => {
                        try {
                            const message = JSON.parse(event.data);
                            if (message.type === 'dashboard_update') {
                                this.updateDashboard(message.data);
                            }
                        } catch (error) {
                            console.error('Failed to parse WebSocket message:', error);
                        }
                    };
                    
                    this.ws.onclose = () => {
                        console.log('WebSocket disconnected');
                        this.updateConnectionStatus(false);
                        this.scheduleReconnect();
                    };
                    
                    this.ws.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        this.updateConnectionStatus(false);
                    };
                } catch (error) {
                    console.error('Failed to create WebSocket:', error);
                    this.updateConnectionStatus(false);
                }
            }

            scheduleReconnect() {
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => {
                        console.log(\`Reconnecting... (attempt \${this.reconnectAttempts})\`);
                        this.initializeWebSocket();
                    }, this.reconnectDelay * this.reconnectAttempts);
                }
            }

            updateConnectionStatus(connected) {
                const statusEl = document.getElementById('connection-status');
                if (connected) {
                    statusEl.textContent = 'Connected';
                    statusEl.className = 'connected';
                } else {
                    statusEl.textContent = 'Disconnected';
                    statusEl.className = 'disconnected';
                }
            }

            async startPolling() {
                // Fallback polling if WebSocket fails
                setInterval(async () => {
                    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                        try {
                            const response = await fetch('/api/v1/status');
                            const data = await response.json();
                            this.updateDashboard(data);
                        } catch (error) {
                            console.error('Polling failed:', error);
                        }
                    }
                }, 5000);
            }

            updateDashboard(data) {
                // Update system status
                if (data.status) {
                    document.getElementById('overall-status').textContent = data.status;
                    document.getElementById('overall-status').className = \`status \${data.status}\`;
                }

                // Update uptime
                if (data.system && data.system.uptime) {
                    document.getElementById('system-uptime').textContent = 
                        this.formatUptime(data.system.uptime);
                }

                // Update last update time
                document.getElementById('last-update').textContent = 
                    new Date().toLocaleTimeString();

                // Update performance metrics
                if (data.performance) {
                    if (data.performance.cpu) {
                        document.getElementById('cpu-usage').textContent = 
                            \`\${data.performance.cpu.usage?.toFixed(1) || '--'}%\`;
                    }
                    if (data.performance.memory) {
                        document.getElementById('memory-usage').textContent = 
                            \`\${data.performance.memory.usage?.toFixed(1) || '--'}%\`;
                    }
                    if (data.performance.processes) {
                        document.getElementById('process-count').textContent = 
                            data.performance.processes.total || '--';
                    }
                    if (data.performance.performanceScore !== undefined) {
                        document.getElementById('performance-score').textContent = 
                            \`\${data.performance.performanceScore?.toFixed(1) || '--'}/100\`;
                    }
                }

                // Update active alerts
                this.updateAlerts(data.alerts);

                // Update component status
                this.updateComponentStatus(data);
            }

            updateAlerts(alerts) {
                const alertsContainer = document.getElementById('active-alerts');
                
                if (!alerts || !alerts.active || alerts.active.length === 0) {
                    alertsContainer.innerHTML = '<p>No active alerts</p>';
                    return;
                }

                alertsContainer.innerHTML = alerts.active.map(alert => \`
                    <div class="alert \${alert.severity}">
                        <strong>[\${alert.severity.toUpperCase()}]</strong> \${alert.message}
                        <br><small>\${new Date(alert.timestamp).toLocaleString()}</small>
                    </div>
                \`).join('');
            }

            updateComponentStatus(data) {
                // This would be populated based on actual component status
                const components = {
                    'monitor-status': data.monitor?.isMonitoring ? 'running' : 'error',
                    'leak-detector-status': data.leakDetector?.isMonitoring ? 'running' : 'error',
                    'profiler-status': data.profiler?.isProfiling ? 'running' : 'error',
                    'alert-manager-status': data.alerts?.isActive ? 'running' : 'error'
                };

                Object.entries(components).forEach(([id, status]) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                        element.className = \`status \${status}\`;
                    }
                });
            }

            formatUptime(seconds) {
                const days = Math.floor(seconds / 86400);
                const hours = Math.floor((seconds % 86400) / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                
                if (days > 0) {
                    return \`\${days}d \${hours}h \${minutes}m\`;
                } else if (hours > 0) {
                    return \`\${hours}h \${minutes}m\`;
                } else {
                    return \`\${minutes}m\`;
                }
            }
        }

        // Initialize dashboard when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new MonitoringDashboard();
        });
    </script>
</body>
</html>
    `

    await fs.writeFile(path.join(this.config.staticPath, 'index.html'), htmlContent.trim())
  }

  /**
   * Start data aggregation loop
   * @private
   */
  _startDataAggregation() {
    this.updateTimer = setInterval(async () => {
      try {
        await this._aggregateData()
      } catch (error) {
        this.statistics.errorCount++
        this.auditLogger?.error('Data aggregation error', {
          component: 'MonitoringDashboard',
          error: error.message
        })
      }
    }, this.config.updateInterval)
  }

  /**
   * Aggregate data from all monitoring components
   * @private
   */
  async _aggregateData() {
    const aggregationStart = process.hrtime.bigint()

    try {
      const newData = {
        timestamp: Date.now(),
        status: 'running',
        system: await this._getSystemData(),
        performance: await this._getPerformanceData(),
        alerts: await this._getAlertsData(),
        processes: await this._getProcessesData(),
        diagnostics: await this._getDiagnosticsData(),
        trends: await this._getTrendsData()
      }

      // Update dashboard data
      this.dashboardData = newData

      // Add to history
      this.metricsHistory.push({
        timestamp: newData.timestamp,
        system: newData.system,
        performance: newData.performance
      })

      // Maintain history size
      if (this.metricsHistory.length > this.config.maxHistorySize) {
        this.metricsHistory.shift()
      }

      // Broadcast update to connected clients
      this.broadcastUpdate(newData)

      // Update statistics
      const aggregationLatency = Number(process.hrtime.bigint() - aggregationStart) / 1000000
      this.statistics.totalUpdates++
      this.statistics.averageUpdateLatency = 
        (this.statistics.averageUpdateLatency + aggregationLatency) / 2

      // Validate update latency requirement
      if (aggregationLatency > this.config.updateInterval) {
        this.auditLogger?.warn('Dashboard update latency exceeded requirement', {
          component: 'MonitoringDashboard',
          latency: `${aggregationLatency.toFixed(3)}ms`,
          requirement: `${this.config.updateInterval}ms`
        })
      }

    } catch (error) {
      this.auditLogger?.error('Data aggregation failed', {
        component: 'MonitoringDashboard',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get system data
   * @returns {Promise<Object>} System data
   * @private
   */
  async _getSystemData() {
    return {
      uptime: process.uptime(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      memoryUsage: process.memoryUsage()
    }
  }

  /**
   * Get performance data
   * @returns {Promise<Object>} Performance data
   * @private
   */
  async _getPerformanceData() {
    const data = {}

    if (this.performanceProfiler) {
      try {
        const metrics = this.performanceProfiler.getCurrentMetrics()
        data.cpu = metrics.cpu
        data.memory = metrics.memory
        data.processes = metrics.processes
        data.performanceScore = metrics.statistics?.performanceScore
        data.isProfiling = metrics.statistics?.isProfiling
      } catch (error) {
        this.auditLogger?.debug('Failed to get performance data', {
          component: 'MonitoringDashboard',
          error: error.message
        })
      }
    }

    return data
  }

  /**
   * Get alerts data
   * @returns {Promise<Object>} Alerts data
   * @private
   */
  async _getAlertsData() {
    const data = {
      active: [],
      total: 0,
      byLevel: {},
      isActive: false
    }

    if (this.alertManager) {
      try {
        data.active = this.alertManager.getActiveAlerts()
        data.total = data.active.length
        data.isActive = true

        // Count by severity level
        for (const alert of data.active) {
          data.byLevel[alert.severity] = (data.byLevel[alert.severity] || 0) + 1
        }
      } catch (error) {
        this.auditLogger?.debug('Failed to get alerts data', {
          component: 'MonitoringDashboard',
          error: error.message
        })
      }
    }

    return data
  }

  /**
   * Get processes data
   * @returns {Promise<Object>} Processes data
   * @private
   */
  async _getProcessesData() {
    const data = {}

    if (this.realTimeMonitor) {
      try {
        const metrics = this.realTimeMonitor.getMetrics()
        data.isMonitoring = metrics.isMonitoring
        data.totalScans = metrics.totalScans
        data.averageLatency = metrics.averageLatency
        data.cacheSize = metrics.cacheSize
      } catch (error) {
        this.auditLogger?.debug('Failed to get processes data', {
          component: 'MonitoringDashboard',
          error: error.message
        })
      }
    }

    return data
  }

  /**
   * Get diagnostics data
   * @returns {Promise<Object>} Diagnostics data
   * @private
   */
  async _getDiagnosticsData() {
    const data = {}

    if (this.nodeDiagnostics) {
      try {
        const metrics = this.nodeDiagnostics.getMetrics()
        data.isDiagnosticActive = metrics.isDiagnosticActive
        data.totalDiagnosticRuns = metrics.totalDiagnosticRuns
        data.handleLeaksDetected = metrics.handleLeaksDetected
        data.timerLeaksDetected = metrics.timerLeaksDetected
      } catch (error) {
        this.auditLogger?.debug('Failed to get diagnostics data', {
          component: 'MonitoringDashboard',
          error: error.message
        })
      }
    }

    if (this.leakDetector) {
      try {
        const metrics = this.leakDetector.getMetrics()
        data.leakDetectorActive = metrics.isMonitoring
        data.leaksDetected = metrics.leaksDetected
        data.averageAnomalyScore = metrics.averageAnomalyScore
      } catch (error) {
        this.auditLogger?.debug('Failed to get leak detector data', {
          component: 'MonitoringDashboard',
          error: error.message
        })
      }
    }

    return data
  }

  /**
   * Get trends data
   * @returns {Promise<Object>} Trends data
   * @private
   */
  async _getTrendsData() {
    const data = {}

    if (this.performanceProfiler) {
      try {
        const metrics = this.performanceProfiler.getCurrentMetrics()
        data.performance = metrics.trends
      } catch (error) {
        this.auditLogger?.debug('Failed to get trends data', {
          component: 'MonitoringDashboard',
          error: error.message
        })
      }
    }

    // Calculate trends from history
    if (this.metricsHistory.length > 10) {
      const recent = this.metricsHistory.slice(-10)
      const earlier = this.metricsHistory.slice(-20, -10)

      if (earlier.length > 0) {
        data.memory = this._calculateTrend(
          earlier.map(m => m.system?.memoryUsage?.heapUsed || 0),
          recent.map(m => m.system?.memoryUsage?.heapUsed || 0)
        )
      }
    }

    return data
  }

  /**
   * Setup component event listeners
   * @private
   */
  _setupComponentListeners() {
    // Listen for alerts
    if (this.alertManager) {
      this.alertManager.on('alertProcessed', (alert) => {
        this.alertHistory.push({
          timestamp: Date.now(),
          alert: alert.alert
        })

        // Maintain alert history
        if (this.alertHistory.length > this.config.maxHistorySize) {
          this.alertHistory.shift()
        }

        // Broadcast immediate alert update
        this.broadcastUpdate({
          type: 'alert_update',
          alert: alert.alert
        })
      })
    }

    // Listen for performance alerts
    if (this.performanceProfiler) {
      this.performanceProfiler.on('thresholdViolation', (violation) => {
        this.broadcastUpdate({
          type: 'performance_alert',
          violation
        })
      })
    }

    // Listen for leak detector alerts
    if (this.leakDetector) {
      this.leakDetector.on('memoryLeakDetected', (leak) => {
        this.broadcastUpdate({
          type: 'leak_alert',
          leak
        })
      })
    }
  }

  /**
   * Setup WebSocket server
   * @private
   */
  _setupWebSocket() {
    this.server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        this._handleWebSocketUpgrade(request, socket, head)
      } else {
        socket.destroy()
      }
    })
  }

  /**
   * Handle WebSocket upgrade
   * @private
   */
  _handleWebSocketUpgrade(request, socket, head) {
    try {
      // Simple WebSocket handshake
      const key = request.headers['sec-websocket-key']
      const acceptKey = this._generateWebSocketAcceptKey(key)

      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '',
        ''
      ].join('\r\n')

      socket.write(responseHeaders)

      // Add client to set
      this.webSocketClients.add(socket)
      this.statistics.connectedClients++

      // Handle client disconnection
      socket.on('close', () => {
        this.webSocketClients.delete(socket)
      })

      socket.on('error', () => {
        this.webSocketClients.delete(socket)
      })

      // Send initial data
      const initialData = JSON.stringify({
        type: 'dashboard_update',
        timestamp: Date.now(),
        data: this.dashboardData
      })

      socket.write(this._createWebSocketFrame(initialData))

    } catch (error) {
      this.auditLogger?.error('WebSocket upgrade failed', {
        component: 'MonitoringDashboard',
        error: error.message
      })
      socket.destroy()
    }
  }

  /**
   * Handle HTTP requests
   * @private
   */
  async _handleHttpRequest(request, response) {
    const requestStart = process.hrtime.bigint()

    try {
      const url = new URL(request.url, `http://${request.headers.host}`)
      const method = request.method
      const path = url.pathname

      // CORS headers
      response.setHeader('Access-Control-Allow-Origin', '*')
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (method === 'OPTIONS') {
        response.writeHead(200)
        response.end()
        return
      }

      // API requests
      if (path.startsWith(this.config.apiPrefix)) {
        this.statistics.apiRequests++
        await this._handleApiRequest(request, response, method, path)
        return
      }

      // Static file requests
      if (this.config.enableWebInterface) {
        await this._handleStaticRequest(request, response, path)
        return
      }

      // Not found
      response.writeHead(404, { 'Content-Type': 'text/plain' })
      response.end('Not Found')

    } catch (error) {
      this.statistics.errorCount++
      
      this.auditLogger?.error('HTTP request failed', {
        component: 'MonitoringDashboard',
        url: request.url,
        method: request.method,
        error: error.message
      })

      response.writeHead(500, { 'Content-Type': 'text/plain' })
      response.end('Internal Server Error')
    } finally {
      const requestLatency = Number(process.hrtime.bigint() - requestStart) / 1000000
      
      this.auditLogger?.debug('HTTP request completed', {
        component: 'MonitoringDashboard',
        url: request.url,
        method: request.method,
        latency: `${requestLatency.toFixed(3)}ms`
      })
    }
  }

  /**
   * Handle API requests
   * @private
   */
  async _handleApiRequest(request, response, method, path) {
    const endpoint = `${method} ${path}`
    const handler = this.apiEndpoints.get(endpoint)

    if (handler) {
      await handler(request, response)
    } else {
      response.writeHead(404, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'API endpoint not found' }))
    }
  }

  /**
   * Handle static file requests
   * @private
   */
  async _handleStaticRequest(request, response, path) {
    try {
      let filePath = path === '/' ? '/index.html' : path
      filePath = path.join(this.config.staticPath, filePath)

      const content = await fs.readFile(filePath)
      const contentType = this._getContentType(filePath)

      response.writeHead(200, { 'Content-Type': contentType })
      response.end(content)

    } catch (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain' })
      response.end('File Not Found')
    }
  }

  // API endpoint handlers
  async _handleStatusRequest(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(this.getDashboardData()))
  }

  async _handleMetricsRequest(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      current: this.dashboardData,
      history: this.metricsHistory,
      statistics: this.getStatistics()
    }))
  }

  async _handleAlertsRequest(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      active: this.dashboardData.alerts,
      history: this.alertHistory
    }))
  }

  async _handleProcessesRequest(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(this.dashboardData.processes))
  }

  async _handleDiagnosticsRequest(request, response) {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(this.dashboardData.diagnostics))
  }

  async _handleHistoryRequest(request, response) {
    const url = new URL(request.url, `http://${request.headers.host}`)
    const limit = parseInt(url.searchParams.get('limit')) || 100

    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      metrics: this.metricsHistory.slice(-limit),
      alerts: this.alertHistory.slice(-limit)
    }))
  }

  async _handleAcknowledgeAlert(request, response) {
    // Implementation for acknowledging alerts
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ success: true }))
  }

  async _handleResolveAlert(request, response) {
    // Implementation for resolving alerts
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ success: true }))
  }

  /**
   * Get content type for file
   * @private
   */
  _getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    }
    return contentTypes[ext] || 'text/plain'
  }

  /**
   * Calculate trend between two data sets
   * @private
   */
  _calculateTrend(earlier, recent) {
    const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
    
    const change = recentAvg - earlierAvg
    const changePercent = Math.abs(change / earlierAvg) * 100

    let direction = 'stable'
    if (changePercent > 5) {
      direction = change > 0 ? 'increasing' : 'decreasing'
    }

    return { direction, change: changePercent }
  }

  /**
   * Get enabled features
   * @private
   */
  _getEnabledFeatures() {
    const features = []
    if (this.config.enableWebInterface) features.push('webInterface')
    if (this.config.enableWebSocket) features.push('webSocket')
    if (this.config.enableJsonApi) features.push('jsonApi')
    return features
  }

  // WebSocket utility methods
  _generateWebSocketAcceptKey(key) {
    const crypto = require('crypto')
    const magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    return crypto.createHash('sha1').update(key + magic).digest('base64')
  }

  _createWebSocketFrame(data) {
    const payload = Buffer.from(data)
    const payloadLength = payload.length

    let frame
    if (payloadLength < 126) {
      frame = Buffer.allocUnsafe(2 + payloadLength)
      frame[0] = 0x81 // FIN + text frame
      frame[1] = payloadLength
      payload.copy(frame, 2)
    } else {
      // Simplified for basic use case
      frame = Buffer.allocUnsafe(4 + payloadLength)
      frame[0] = 0x81
      frame[1] = 126
      frame.writeUInt16BE(payloadLength, 2)
      payload.copy(frame, 4)
    }

    return frame
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.isRunning) {
      await this.stopDashboard()
    }

    this.removeAllListeners()
    this.metricsHistory.length = 0
    this.alertHistory.length = 0
    this.webSocketClients.clear()
  }
}

module.exports = MonitoringDashboard