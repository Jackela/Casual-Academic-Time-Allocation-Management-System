/**
 * Interactive Dashboard - Real-time Monitoring Interface
 * 
 * Features:
 * - Real-time process monitoring with WebSocket updates
 * - Interactive web interface with live charts
 * - System metrics visualization
 * - Command execution monitoring
 * - Alert management and notifications
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const { EventEmitter } = require('events')
const http = require('http')
const WebSocket = require('ws')
const path = require('path')
const fs = require('fs').promises
const chalk = require('chalk')

/**
 * Interactive Dashboard
 */
class InteractiveDashboard extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.config = {
      port: options.port || 3001,
      host: options.host || 'localhost',
      updateInterval: options.updateInterval || 1000,
      enableAuth: options.enableAuth || false,
      enableSSL: options.enableSSL || false,
      ...options
    }
    
    // Core dependencies
    this.cliCore = options.cliCore
    this.monitoringSystem = options.monitoringSystem
    this.configManager = options.configManager
    
    // Server components
    this.httpServer = null
    this.wsServer = null
    this.isRunning = false
    
    // Dashboard state
    this.connectedClients = new Set()
    this.updateTimer = null
    this.lastUpdate = null
    
    // Data aggregation
    this.metrics = {
      system: {},
      processes: [],
      performance: {},
      alerts: [],
      commands: []
    }
    
    // Update tracking
    this.updateSequence = 0
    this.clientSubscriptions = new Map()
  }
  
  /**
   * Start dashboard server
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Dashboard is already running')
    }
    
    try {
      await this._createHttpServer()
      await this._createWebSocketServer()
      await this._startDataUpdates()
      
      this.isRunning = true
      this.lastUpdate = Date.now()
      
      console.log(chalk.green(`📊 Dashboard started at http://${this.config.host}:${this.config.port}`))
      
      this.emit('started', {
        host: this.config.host,
        port: this.config.port,
        url: `http://${this.config.host}:${this.config.port}`
      })
      
    } catch (error) {
      await this._cleanup()
      throw error
    }
  }
  
  /**
   * Stop dashboard server
   */
  async stop() {
    if (!this.isRunning) {
      return
    }
    
    try {
      // Stop data updates
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
      
      // Close WebSocket connections
      this._broadcastToClients({
        type: 'server_shutdown',
        message: 'Dashboard server is shutting down'
      })
      
      // Wait a moment for clients to receive shutdown message
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await this._cleanup()
      
      this.isRunning = false
      console.log(chalk.yellow('📊 Dashboard stopped'))
      
      this.emit('stopped')
      
    } catch (error) {
      console.error(chalk.red('❌ Error stopping dashboard:'), error.message)
      throw error
    }
  }
  
  /**
   * Emergency stop
   */
  async emergencyStop() {
    console.log(chalk.red('🚨 Dashboard emergency stop'))
    
    try {
      if (this.updateTimer) {
        clearInterval(this.updateTimer)
        this.updateTimer = null
      }
      
      await this._cleanup()
      this.isRunning = false
      
      this.emit('emergencyStopped')
      
    } catch (error) {
      console.error('💀 Emergency stop failed:', error.message)
    }
  }
  
  /**
   * Get dashboard status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      host: this.config.host,
      port: this.config.port,
      url: this.isRunning ? `http://${this.config.host}:${this.config.port}` : null,
      connectedClients: this.connectedClients.size,
      lastUpdate: this.lastUpdate,
      updateInterval: this.config.updateInterval,
      metrics: {
        totalUpdates: this.updateSequence,
        dataSize: this._calculateDataSize(),
        uptime: this.isRunning && this.lastUpdate ? Date.now() - this.lastUpdate : 0
      }
    }
  }
  
  /**
   * Send data to specific client
   */
  sendToClient(clientId, data) {
    const client = Array.from(this.connectedClients).find(c => c.id === clientId)
    
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data))
        return true
      } catch (error) {
        console.error(`Error sending data to client ${clientId}:`, error.message)
        return false
      }
    }
    
    return false
  }
  
  /**
   * Broadcast data to all clients
   */
  broadcast(data) {
    this._broadcastToClients(data)
  }
  
  /**
   * Create HTTP server
   * @private
   */
  async _createHttpServer() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(async (req, res) => {
        try {
          await this._handleHttpRequest(req, res)
        } catch (error) {
          console.error('HTTP request error:', error.message)
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Internal Server Error')
        }
      })
      
      this.httpServer.listen(this.config.port, this.config.host, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
      
      this.httpServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.config.port} is already in use`))
        } else {
          reject(error)
        }
      })
    })
  }
  
  /**
   * Create WebSocket server
   * @private
   */
  async _createWebSocketServer() {
    this.wsServer = new WebSocket.Server({ 
      server: this.httpServer,
      path: '/ws'
    })
    
    this.wsServer.on('connection', (ws, req) => {
      this._handleWebSocketConnection(ws, req)
    })
    
    this.wsServer.on('error', (error) => {
      console.error('WebSocket server error:', error.message)
    })
  }
  
  /**
   * Handle HTTP requests
   * @private
   */
  async _handleHttpRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`)
    
    // Serve dashboard HTML
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await this._generateDashboardHTML()
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)
      return
    }
    
    // Serve dashboard CSS
    if (url.pathname === '/dashboard.css') {
      const css = await this._generateDashboardCSS()
      res.writeHead(200, { 'Content-Type': 'text/css' })
      res.end(css)
      return
    }
    
    // Serve dashboard JavaScript
    if (url.pathname === '/dashboard.js') {
      const js = await this._generateDashboardJS()
      res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end(js)
      return
    }
    
    // API endpoints
    if (url.pathname.startsWith('/api/')) {
      await this._handleApiRequest(req, res, url)
      return
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
  
  /**
   * Handle WebSocket connections
   * @private
   */
  _handleWebSocketConnection(ws, req) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    ws.id = clientId
    
    this.connectedClients.add(ws)
    
    console.log(chalk.cyan(`📱 Dashboard client connected: ${clientId} (${this.connectedClients.size} total)`))
    
    // Send initial data
    this._sendInitialData(ws)
    
    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString())
        this._handleClientMessage(ws, data)
      } catch (error) {
        console.error('Invalid message from client:', error.message)
      }
    })
    
    // Handle client disconnect
    ws.on('close', () => {
      this.connectedClients.delete(ws)
      this.clientSubscriptions.delete(clientId)
      
      console.log(chalk.cyan(`📱 Dashboard client disconnected: ${clientId} (${this.connectedClients.size} remaining)`))
    })
    
    // Handle client errors
    ws.on('error', (error) => {
      console.error(`Client ${clientId} error:`, error.message)
      this.connectedClients.delete(ws)
      this.clientSubscriptions.delete(clientId)
    })
  }
  
  /**
   * Start data updates
   * @private
   */
  async _startDataUpdates() {
    // Initial data aggregation
    await this._aggregateData()
    
    // Start periodic updates
    this.updateTimer = setInterval(async () => {
      try {
        await this._aggregateData()
        await this._broadcastUpdates()
      } catch (error) {
        console.error('Data update error:', error.message)
      }
    }, this.config.updateInterval)
  }
  
  /**
   * Aggregate data from all sources
   * @private
   */
  async _aggregateData() {
    const startTime = process.hrtime.bigint()
    
    try {
      // System metrics
      this.metrics.system = await this._getSystemMetrics()
      
      // Process information
      this.metrics.processes = await this._getProcessMetrics()
      
      // Performance data
      this.metrics.performance = await this._getPerformanceMetrics()
      
      // Recent alerts
      this.metrics.alerts = await this._getRecentAlerts()
      
      // Command history
      this.metrics.commands = await this._getCommandHistory()
      
      // Update metadata
      this.metrics.lastUpdate = Date.now()
      this.metrics.updateSequence = ++this.updateSequence
      this.metrics.aggregationTime = Number(process.hrtime.bigint() - startTime) / 1000000
      
    } catch (error) {
      console.error('Data aggregation error:', error.message)
    }
  }
  
  /**
   * Get system metrics
   * @private
   */
  async _getSystemMetrics() {
    const os = require('os')
    
    const metrics = {
      timestamp: Date.now(),
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        process: process.memoryUsage()
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        processUptime: process.uptime()
      }
    }
    
    // Add CLI Core metrics if available
    if (this.cliCore) {
      const cliStatus = this.cliCore.getSystemStatus()
      metrics.cli = cliStatus.cli
      metrics.components = cliStatus.components
    }
    
    return metrics
  }
  
  /**
   * Get process metrics
   * @private
   */
  async _getProcessMetrics() {
    const processes = []
    
    if (this.monitoringSystem && typeof this.monitoringSystem.getSystemStatus === 'function') {
      const status = this.monitoringSystem.getSystemStatus()
      
      if (status.components && status.components.realTimeMonitor) {
        // Get process data from monitoring system
        // This would be enhanced with actual process data
        processes.push({
          pid: process.pid,
          name: 'CATAMS CLI',
          cpu: 0,
          memory: process.memoryUsage().rss,
          uptime: process.uptime() * 1000,
          status: 'running'
        })
      }
    }
    
    return processes
  }
  
  /**
   * Get performance metrics
   * @private
   */
  async _getPerformanceMetrics() {
    const performance = {
      timestamp: Date.now(),
      responseTimes: [],
      throughput: 0,
      errors: 0
    }
    
    if (this.cliCore) {
      const cliMetrics = this.cliCore.getSystemStatus().cli.metrics
      
      performance.responseTimes = [cliMetrics.averageResponseTime]
      performance.throughput = cliMetrics.commandsExecuted
      performance.errors = cliMetrics.errorCount
    }
    
    return performance
  }
  
  /**
   * Get recent alerts
   * @private
   */
  async _getRecentAlerts() {
    const alerts = []
    
    // This would be enhanced to pull from actual alert system
    if (this.monitoringSystem) {
      // Add sample alerts for demo
      alerts.push({
        id: 'alert_1',
        type: 'info',
        message: 'Dashboard connected successfully',
        timestamp: Date.now(),
        source: 'Dashboard'
      })
    }
    
    return alerts
  }
  
  /**
   * Get command history
   * @private
   */
  async _getCommandHistory() {
    const commands = []
    
    if (this.cliCore && this.cliCore.commandRegistry) {
      const stats = this.cliCore.commandRegistry.getStatistics()
      
      for (const [name, commandStats] of Object.entries(stats.commandStats)) {
        if (commandStats.lastExecuted) {
          commands.push({
            name,
            executionCount: commandStats.executionCount,
            averageTime: commandStats.averageExecutionTime,
            successRate: commandStats.successRate,
            lastExecuted: commandStats.lastExecuted
          })
        }
      }
    }
    
    return commands.sort((a, b) => b.lastExecuted - a.lastExecuted).slice(0, 10)
  }
  
  /**
   * Send initial data to new client
   * @private
   */
  _sendInitialData(ws) {
    const initialData = {
      type: 'initial_data',
      data: {
        ...this.metrics,
        config: {
          updateInterval: this.config.updateInterval,
          serverTime: Date.now()
        }
      }
    }
    
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(initialData))
      } catch (error) {
        console.error('Error sending initial data:', error.message)
      }
    }
  }
  
  /**
   * Handle client messages
   * @private
   */
  _handleClientMessage(ws, message) {
    switch (message.type) {
      case 'subscribe':
        this._handleSubscription(ws, message.data)
        break
        
      case 'unsubscribe':
        this._handleUnsubscription(ws, message.data)
        break
        
      case 'command':
        this._handleClientCommand(ws, message.data)
        break
        
      case 'ping':
        this._sendPong(ws)
        break
        
      default:
        console.warn('Unknown message type:', message.type)
    }
  }
  
  /**
   * Handle client subscriptions
   * @private
   */
  _handleSubscription(ws, subscriptionData) {
    if (!this.clientSubscriptions.has(ws.id)) {
      this.clientSubscriptions.set(ws.id, new Set())
    }
    
    const subs = this.clientSubscriptions.get(ws.id)
    subs.add(subscriptionData.topic)
    
    console.log(`Client ${ws.id} subscribed to: ${subscriptionData.topic}`)
  }
  
  /**
   * Handle client commands
   * @private
   */
  async _handleClientCommand(ws, commandData) {
    try {
      // Execute command through CLI Core
      const result = await this.cliCore.executeCommand(commandData.command, commandData.options)
      
      // Send result back to client
      const response = {
        type: 'command_result',
        commandId: commandData.id,
        success: true,
        result
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response))
      }
      
    } catch (error) {
      const response = {
        type: 'command_result',
        commandId: commandData.id,
        success: false,
        error: error.message
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response))
      }
    }
  }
  
  /**
   * Send pong response
   * @private
   */
  _sendPong(ws) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }))
      } catch (error) {
        console.error('Error sending pong:', error.message)
      }
    }
  }
  
  /**
   * Broadcast updates to clients
   * @private
   */
  async _broadcastUpdates() {
    if (this.connectedClients.size === 0) {
      return
    }
    
    const updateData = {
      type: 'data_update',
      data: this.metrics
    }
    
    this._broadcastToClients(updateData)
  }
  
  /**
   * Broadcast to all connected clients
   * @private
   */
  _broadcastToClients(data) {
    const message = JSON.stringify(data)
    
    for (const client of this.connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message)
        } catch (error) {
          console.error('Error broadcasting to client:', error.message)
          // Remove failed client
          this.connectedClients.delete(client)
        }
      }
    }
  }
  
  /**
   * Calculate data size
   * @private
   */
  _calculateDataSize() {
    return JSON.stringify(this.metrics).length
  }
  
  /**
   * Cleanup resources
   * @private
   */
  async _cleanup() {
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close()
      this.wsServer = null
    }
    
    // Close HTTP server
    if (this.httpServer) {
      await new Promise((resolve) => {
        this.httpServer.close(resolve)
      })
      this.httpServer = null
    }
    
    // Clear connected clients
    this.connectedClients.clear()
    this.clientSubscriptions.clear()
  }
  
  /**
   * Generate dashboard HTML
   * @private
   */
  async _generateDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CATAMS Dashboard</title>
    <link rel="stylesheet" href="/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <header class="dashboard-header">
            <h1>🚀 CATAMS Dashboard</h1>
            <div class="connection-status" id="connectionStatus">
                <span class="status-indicator disconnected"></span>
                <span>Connecting...</span>
            </div>
        </header>
        
        <div class="dashboard-grid">
            <div class="widget system-metrics">
                <h2>System Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="metric-label">CPU Usage</span>
                        <span class="metric-value" id="cpuUsage">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Memory Usage</span>
                        <span class="metric-value" id="memoryUsage">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value" id="uptime">-</span>
                    </div>
                </div>
            </div>
            
            <div class="widget process-list">
                <h2>Active Processes</h2>
                <div id="processList" class="process-container">
                    <p>Loading processes...</p>
                </div>
            </div>
            
            <div class="widget performance-chart">
                <h2>Performance Trends</h2>
                <canvas id="performanceChart" width="400" height="200"></canvas>
            </div>
            
            <div class="widget command-history">
                <h2>Recent Commands</h2>
                <div id="commandHistory" class="command-container">
                    <p>Loading command history...</p>
                </div>
            </div>
            
            <div class="widget alerts">
                <h2>Alerts & Notifications</h2>
                <div id="alertsList" class="alerts-container">
                    <p>No alerts</p>
                </div>
            </div>
            
            <div class="widget command-interface">
                <h2>Command Interface</h2>
                <div class="command-input-group">
                    <input type="text" id="commandInput" placeholder="Enter command..." />
                    <button id="executeCommand">Execute</button>
                </div>
                <div id="commandOutput" class="command-output"></div>
            </div>
        </div>
    </div>
    
    <script src="/dashboard.js"></script>
</body>
</html>`
  }
  
  /**
   * Generate dashboard CSS
   * @private
   */
  async _generateDashboardCSS() {
    return `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #1e3c72, #2a5298);
    color: #fff;
    min-height: 100vh;
}

.dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    backdrop-filter: blur(10px);
}

.dashboard-header h1 {
    font-size: 2.5rem;
    font-weight: bold;
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

.status-indicator.connected {
    background: #4ade80;
}

.status-indicator.disconnected {
    background: #ef4444;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

.widget {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 25px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.widget h2 {
    margin-bottom: 20px;
    color: #e2e8f0;
    font-size: 1.3rem;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 15px;
}

.metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.metric-label {
    font-size: 0.9rem;
    color: #cbd5e1;
    margin-bottom: 5px;
}

.metric-value {
    font-size: 1.8rem;
    font-weight: bold;
    color: #60a5fa;
}

.process-container, .command-container, .alerts-container {
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: thin;
}

.process-item, .command-item, .alert-item {
    padding: 10px;
    margin-bottom: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border-left: 4px solid #60a5fa;
}

.command-input-group {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}

.command-input-group input {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 1rem;
}

.command-input-group button {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    background: #3b82f6;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s;
}

.command-input-group button:hover {
    background: #2563eb;
}

.command-output {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 15px;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    min-height: 100px;
    overflow-y: auto;
}

.alert-item.error {
    border-left-color: #ef4444;
}

.alert-item.warning {
    border-left-color: #f59e0b;
}

.alert-item.success {
    border-left-color: #10b981;
}

.alert-item.info {
    border-left-color: #3b82f6;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@media (max-width: 768px) {
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
    
    .dashboard-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    .dashboard-header h1 {
        font-size: 2rem;
    }
}
`
  }
  
  /**
   * Generate dashboard JavaScript
   * @private
   */
  async _generateDashboardJS() {
    return `
class DashboardClient {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.isConnected = false;
        
        this.performanceChart = null;
        this.chartData = {
            labels: [],
            datasets: [{
                label: 'Response Time (ms)',
                data: [],
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                tension: 0.1
            }]
        };
        
        this.initializeConnection();
        this.initializeEventListeners();
        this.initializeChart();
    }
    
    initializeConnection() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to dashboard');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from dashboard');
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.scheduleReconnect();
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                console.log(\`Reconnection attempt \${this.reconnectAttempts}/\${this.maxReconnectAttempts}\`);
                this.initializeConnection();
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'initial_data':
                this.updateDashboard(data.data);
                break;
            case 'data_update':
                this.updateDashboard(data.data);
                break;
            case 'command_result':
                this.handleCommandResult(data);
                break;
            case 'server_shutdown':
                this.handleServerShutdown(data);
                break;
            case 'pong':
                // Handle ping/pong for keep-alive
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    updateDashboard(data) {
        this.updateSystemMetrics(data.system);
        this.updateProcessList(data.processes);
        this.updatePerformanceChart(data.performance);
        this.updateCommandHistory(data.commands);
        this.updateAlerts(data.alerts);
    }
    
    updateSystemMetrics(system) {
        if (!system) return;
        
        // CPU Usage
        const cpuUsage = system.memory ? 
            ((system.memory.used / system.memory.total) * 100).toFixed(1) + '%' : 
            'N/A';
        document.getElementById('cpuUsage').textContent = cpuUsage;
        
        // Memory Usage
        const memoryUsage = system.memory ? 
            \`\${(system.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB\` : 
            'N/A';
        document.getElementById('memoryUsage').textContent = memoryUsage;
        
        // Uptime
        const uptime = system.system ? 
            this.formatUptime(system.system.processUptime) : 
            'N/A';
        document.getElementById('uptime').textContent = uptime;
    }
    
    updateProcessList(processes) {
        const container = document.getElementById('processList');
        
        if (!processes || processes.length === 0) {
            container.innerHTML = '<p>No processes detected</p>';
            return;
        }
        
        const html = processes.map(process => \`
            <div class="process-item">
                <strong>\${process.name}</strong> (PID: \${process.pid})<br>
                <small>Memory: \${(process.memory / 1024 / 1024).toFixed(1)} MB | Status: \${process.status}</small>
            </div>
        \`).join('');
        
        container.innerHTML = html;
    }
    
    updatePerformanceChart(performance) {
        if (!this.performanceChart || !performance) return;
        
        const now = new Date().toLocaleTimeString();
        
        this.chartData.labels.push(now);
        this.chartData.datasets[0].data.push(performance.responseTimes[0] || 0);
        
        // Keep only last 20 data points
        if (this.chartData.labels.length > 20) {
            this.chartData.labels.shift();
            this.chartData.datasets[0].data.shift();
        }
        
        this.performanceChart.update('none');
    }
    
    updateCommandHistory(commands) {
        const container = document.getElementById('commandHistory');
        
        if (!commands || commands.length === 0) {
            container.innerHTML = '<p>No recent commands</p>';
            return;
        }
        
        const html = commands.map(cmd => \`
            <div class="command-item">
                <strong>\${cmd.name}</strong><br>
                <small>
                    Executions: \${cmd.executionCount} | 
                    Avg Time: \${cmd.averageTime.toFixed(2)}ms | 
                    Success: \${cmd.successRate.toFixed(1)}%
                </small>
            </div>
        \`).join('');
        
        container.innerHTML = html;
    }
    
    updateAlerts(alerts) {
        const container = document.getElementById('alertsList');
        
        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<p>No alerts</p>';
            return;
        }
        
        const html = alerts.map(alert => \`
            <div class="alert-item \${alert.type}">
                <strong>\${alert.message}</strong><br>
                <small>Source: \${alert.source} | \${new Date(alert.timestamp).toLocaleTimeString()}</small>
            </div>
        \`).join('');
        
        container.innerHTML = html;
    }
    
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        const indicator = statusEl.querySelector('.status-indicator');
        const text = statusEl.querySelector('span:last-child');
        
        if (connected) {
            indicator.className = 'status-indicator connected';
            text.textContent = 'Connected';
        } else {
            indicator.className = 'status-indicator disconnected';
            text.textContent = 'Disconnected';
        }
    }
    
    initializeEventListeners() {
        const commandInput = document.getElementById('commandInput');
        const executeButton = document.getElementById('executeCommand');
        const commandOutput = document.getElementById('commandOutput');
        
        const executeCommand = () => {
            const command = commandInput.value.trim();
            if (!command || !this.isConnected) return;
            
            const commandId = \`cmd_\${Date.now()}\`;
            
            this.ws.send(JSON.stringify({
                type: 'command',
                data: {
                    id: commandId,
                    command: command.split(' ')[0],
                    options: this.parseCommandOptions(command)
                }
            }));
            
            commandOutput.innerHTML += \`<div><strong>$ \${command}</strong></div>\`;
            commandInput.value = '';
        };
        
        executeButton.addEventListener('click', executeCommand);
        commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeCommand();
        });
    }
    
    initializeChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        
        this.performanceChart = new Chart(ctx, {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#e2e8f0' },
                        grid: { color: 'rgba(226, 232, 240, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#e2e8f0' },
                        grid: { color: 'rgba(226, 232, 240, 0.1)' }
                    }
                },
                elements: {
                    point: {
                        radius: 3,
                        hoverRadius: 5
                    }
                }
            }
        });
    }
    
    handleCommandResult(data) {
        const output = document.getElementById('commandOutput');
        
        if (data.success) {
            output.innerHTML += \`<div style="color: #4ade80;">Result: \${JSON.stringify(data.result, null, 2)}</div>\`;
        } else {
            output.innerHTML += \`<div style="color: #ef4444;">Error: \${data.error}</div>\`;
        }
        
        output.scrollTop = output.scrollHeight;
    }
    
    handleServerShutdown(data) {
        const output = document.getElementById('commandOutput');
        output.innerHTML += \`<div style="color: #f59e0b;">Server: \${data.message}</div>\`;
        this.updateConnectionStatus(false);
    }
    
    parseCommandOptions(commandString) {
        const parts = commandString.split(' ');
        const options = {};
        
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('--')) {
                const key = part.substring(2);
                const nextPart = parts[i + 1];
                if (nextPart && !nextPart.startsWith('-')) {
                    options[key] = nextPart;
                    i++;
                } else {
                    options[key] = true;
                }
            } else if (part.startsWith('-')) {
                options[part.substring(1)] = true;
            }
        }
        
        return options;
    }
    
    formatUptime(seconds) {
        if (!seconds) return 'N/A';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return \`\${days}d \${hours}h \${minutes}m\`;
        if (hours > 0) return \`\${hours}h \${minutes}m\`;
        return \`\${minutes}m\`;
    }
    
    // Send ping to keep connection alive
    ping() {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardClient();
    
    // Keep connection alive with periodic pings
    setInterval(() => {
        if (window.dashboard) {
            window.dashboard.ping();
        }
    }, 30000); // 30 seconds
});
`
  }
}

module.exports = InteractiveDashboard