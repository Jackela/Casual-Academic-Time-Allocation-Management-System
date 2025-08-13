/**
 * CLI Core - Central Command Processing Engine
 * 
 * Revolutionary CLI architecture with:
 * - Modular command structure with plugin-style extensibility
 * - Real-time updates with WebSocket integration
 * - Interactive prompts with confirmation dialogs
 * - Colored terminal output with progress visualization
 * - Configuration hot-reload with schema validation
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const { EventEmitter } = require('events')
const chalk = require('chalk')
const ora = require('ora')

// Import CLI components
const CommandRegistry = require('./CommandRegistry')
const InteractiveDashboard = require('../dashboard/InteractiveDashboard')
const ExportManager = require('../export/ExportManager')
const ProgressManager = require('../ui/ProgressManager')
const HelpSystem = require('../help/EnterpriseHelpSystem')
const ValidationEngine = require('../validation/ValidationEngine')

// Import system components
const MonitoringSystem = require('../../MonitoringSystem')
const ProcessOrchestrator = require('../../core/ProcessOrchestrator')
const IntelligentCleaner = require('../../core/IntelligentCleaner')
const AuditLogger = require('../../core/AuditLogger')

/**
 * CLI Core Engine
 */
class CLICore extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.config = {
      version: options.version || '2.0.0',
      enableColors: options.enableColors !== false,
      enableProgress: options.enableProgress !== false,
      enableHotReload: options.enableHotReload !== false,
      verbosity: options.verbosity || 'normal', // quiet, normal, verbose, debug
      ...options
    }
    
    // Core state
    this.isInitialized = false
    this.isShuttingDown = false
    this.activeCommands = new Map()
    this.systemComponents = new Map()
    
    // Initialize managers
    this.configManager = options.configManager
    this.commandRegistry = new CommandRegistry(this)
    this.progressManager = new ProgressManager(this.config)
    this.exportManager = new ExportManager(this.config)
    this.helpSystem = new HelpSystem(this.config)
    this.validationEngine = new ValidationEngine(this.config)
    
    // Dashboard instance
    this.dashboard = null
    
    // Performance metrics
    this.metrics = {
      commandsExecuted: 0,
      totalExecutionTime: 0,
      averageResponseTime: 0,
      errorCount: 0,
      startTime: null
    }
    
    this._setupEventHandlers()
  }
  
  /**
   * Initialize CLI Core
   */
  async initialize() {
    if (this.isInitialized) return
    
    const spinner = ora('Initializing CLI Core...').start()
    
    try {
      this.metrics.startTime = Date.now()
      
      // Initialize configuration if needed
      if (this.configManager && !this.configManager.isInitialized) {
        await this.configManager.initialize()
      }
      
      // Initialize system components
      await this._initializeSystemComponents()
      
      // Register all commands
      await this.commandRegistry.registerAllCommands()
      
      // Initialize help system
      await this.helpSystem.initialize(this.commandRegistry)
      
      // Initialize validation engine
      await this.validationEngine.initialize()
      
      // Setup hot-reload if enabled
      if (this.config.enableHotReload && this.configManager) {
        this.configManager.on('configChanged', this._handleConfigChange.bind(this))
      }
      
      this.isInitialized = true
      spinner.succeed('CLI Core initialized successfully')
      
      this.emit('initialized')
      
    } catch (error) {
      spinner.fail('Failed to initialize CLI Core')
      throw error
    }
  }
  
  /**
   * Execute a command
   */
  async executeCommand(commandName, options = {}) {
    if (!this.isInitialized) {
      throw new Error('CLI Core not initialized')
    }
    
    const startTime = process.hrtime.bigint()
    const commandId = `${commandName}-${Date.now()}`
    
    try {
      // Add to active commands
      this.activeCommands.set(commandId, {
        name: commandName,
        startTime: Date.now(),
        options
      })
      
      this._log('debug', `Executing command: ${commandName}`, { commandId, options })
      
      // Pre-execution validation
      if (options.validate !== false) {
        await this._validateCommand(commandName, options)
      }
      
      // Execute command through registry
      const result = await this.commandRegistry.executeCommand(commandName, options)
      
      // Update metrics
      const executionTime = Number(process.hrtime.bigint() - startTime) / 1000000
      this._updateMetrics(executionTime, true)
      
      this._log('info', `Command completed: ${commandName}`, {
        commandId,
        executionTime: `${executionTime.toFixed(3)}ms`,
        success: true
      })
      
      return result
      
    } catch (error) {
      const executionTime = Number(process.hrtime.bigint() - startTime) / 1000000
      this._updateMetrics(executionTime, false)
      
      this._log('error', `Command failed: ${commandName}`, {
        commandId,
        error: error.message,
        executionTime: `${executionTime.toFixed(3)}ms`
      })
      
      // Re-throw for handling by CLI
      throw error
      
    } finally {
      // Remove from active commands
      this.activeCommands.delete(commandId)
    }
  }
  
  /**
   * Launch interactive dashboard
   */
  async launchDashboard(options = {}) {
    if (this.dashboard && this.dashboard.isRunning) {
      this._log('warn', 'Dashboard is already running')
      return this.dashboard
    }
    
    try {
      this.dashboard = new InteractiveDashboard({
        ...options,
        cliCore: this,
        monitoringSystem: this.systemComponents.get('monitoringSystem'),
        configManager: this.configManager
      })
      
      await this.dashboard.start()
      
      this._log('info', `Dashboard launched at http://${options.host || 'localhost'}:${options.port || 3001}`)
      
      return this.dashboard
      
    } catch (error) {
      this._log('error', 'Failed to launch dashboard', { error: error.message })
      throw error
    }
  }
  
  /**
   * Set color mode
   */
  setColorMode(enabled) {
    this.config.enableColors = enabled
    
    if (!enabled) {
      // Disable chalk colors
      chalk.level = 0
    }
    
    this.emit('colorModeChanged', enabled)
  }
  
  /**
   * Set verbosity level
   */
  setVerbosity(level) {
    const validLevels = ['quiet', 'normal', 'verbose', 'debug']
    
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid verbosity level: ${level}`)
    }
    
    this.config.verbosity = level
    this.emit('verbosityChanged', level)
  }
  
  /**
   * Load configuration from file
   */
  async loadConfig(configPath) {
    if (!this.configManager) {
      throw new Error('Configuration manager not available')
    }
    
    try {
      await this.configManager.loadFromFile(configPath)
      this._log('info', `Configuration loaded from: ${configPath}`)
      
      // Apply configuration changes
      await this._applyConfigChanges()
      
    } catch (error) {
      this._log('error', `Failed to load configuration from: ${configPath}`, { error: error.message })
      throw error
    }
  }
  
  /**
   * Get system status
   */
  getSystemStatus() {
    const uptime = this.metrics.startTime ? Date.now() - this.metrics.startTime : 0
    
    return {
      cli: {
        version: this.config.version,
        initialized: this.isInitialized,
        uptime,
        activeCommands: this.activeCommands.size,
        metrics: {
          ...this.metrics,
          uptime
        }
      },
      components: this._getComponentStatus(),
      dashboard: this.dashboard ? this.dashboard.getStatus() : null
    }
  }
  
  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    if (this.isShuttingDown) return
    
    this.isShuttingDown = true
    this._log('info', 'Initiating graceful shutdown...')
    
    try {
      // Wait for active commands to complete (with timeout)
      if (this.activeCommands.size > 0) {
        this._log('info', `Waiting for ${this.activeCommands.size} active commands to complete...`)
        await this._waitForActiveCommands(10000) // 10 second timeout
      }
      
      // Stop dashboard if running
      if (this.dashboard && this.dashboard.isRunning) {
        await this.dashboard.stop()
      }
      
      // Shutdown system components
      for (const [name, component] of this.systemComponents) {
        try {
          if (component && typeof component.cleanup === 'function') {
            await component.cleanup()
            this._log('debug', `Component ${name} shut down`)
          }
        } catch (error) {
          this._log('warn', `Error shutting down component ${name}`, { error: error.message })
        }
      }
      
      this._log('info', 'Graceful shutdown completed')
      this.emit('shutdown')
      
    } catch (error) {
      this._log('error', 'Error during graceful shutdown', { error: error.message })
      throw error
    }
  }
  
  /**
   * Emergency shutdown
   */
  async emergencyShutdown() {
    this._log('warn', 'Initiating emergency shutdown...')
    
    try {
      // Force stop all active commands
      for (const [commandId, command] of this.activeCommands) {
        this._log('warn', `Force terminating command: ${command.name}`, { commandId })
      }
      this.activeCommands.clear()
      
      // Emergency stop dashboard
      if (this.dashboard && this.dashboard.isRunning) {
        await this.dashboard.emergencyStop()
      }
      
      // Emergency cleanup system components
      const monitoringSystem = this.systemComponents.get('monitoringSystem')
      if (monitoringSystem && typeof monitoringSystem.cleanup === 'function') {
        await monitoringSystem.cleanup()
      }
      
      this._log('info', 'Emergency shutdown completed')
      this.emit('emergencyShutdown')
      
    } catch (error) {
      console.error('💀 Emergency shutdown failed:', error.message)
    }
  }
  
  /**
   * Initialize system components
   * @private
   */
  async _initializeSystemComponents() {
    try {
      // Initialize monitoring system
      const monitoringSystem = new MonitoringSystem({
        enableDashboard: false // We'll handle dashboard separately
      })
      
      this.systemComponents.set('monitoringSystem', monitoringSystem)
      
      // Initialize process orchestrator
      const processOrchestrator = new ProcessOrchestrator()
      this.systemComponents.set('processOrchestrator', processOrchestrator)
      
      // Initialize intelligent cleaner
      const intelligentCleaner = new IntelligentCleaner()
      this.systemComponents.set('intelligentCleaner', intelligentCleaner)
      
      // Initialize audit logger
      const auditLogger = new AuditLogger()
      this.systemComponents.set('auditLogger', auditLogger)
      
      this._log('debug', 'System components initialized')
      
    } catch (error) {
      this._log('error', 'Failed to initialize system components', { error: error.message })
      throw error
    }
  }
  
  /**
   * Setup event handlers
   * @private
   */
  _setupEventHandlers() {
    // Handle configuration changes
    this.on('configChanged', this._handleConfigChange.bind(this))
    
    // Handle component errors
    this.on('componentError', this._handleComponentError.bind(this))
    
    // Handle dashboard events
    this.on('dashboardStarted', (info) => {
      this._log('info', 'Dashboard started', info)
    })
    
    this.on('dashboardStopped', () => {
      this._log('info', 'Dashboard stopped')
    })
  }
  
  /**
   * Handle configuration changes
   * @private
   */
  async _handleConfigChange(changes) {
    this._log('info', 'Configuration changed, applying updates...', { changes })
    
    try {
      await this._applyConfigChanges()
      this.emit('configApplied', changes)
    } catch (error) {
      this._log('error', 'Failed to apply configuration changes', { error: error.message })
    }
  }
  
  /**
   * Apply configuration changes
   * @private
   */
  async _applyConfigChanges() {
    if (!this.configManager) return
    
    const config = this.configManager.getConfig()
    
    // Update CLI configuration
    if (config.cli) {
      Object.assign(this.config, config.cli)
    }
    
    // Update component configurations
    for (const [name, component] of this.systemComponents) {
      if (component && typeof component.updateConfig === 'function' && config[name]) {
        try {
          await component.updateConfig(config[name])
          this._log('debug', `Configuration updated for component: ${name}`)
        } catch (error) {
          this._log('warn', `Failed to update configuration for component: ${name}`, { error: error.message })
        }
      }
    }
  }
  
  /**
   * Handle component errors
   * @private
   */
  _handleComponentError(componentName, error) {
    this._log('error', `Component error: ${componentName}`, { error: error.message })
    this.metrics.errorCount++
  }
  
  /**
   * Validate command before execution
   * @private
   */
  async _validateCommand(commandName, options) {
    try {
      await this.validationEngine.validateCommand(commandName, options)
    } catch (error) {
      throw new Error(`Command validation failed: ${error.message}`)
    }
  }
  
  /**
   * Update performance metrics
   * @private
   */
  _updateMetrics(executionTime, success) {
    this.metrics.commandsExecuted++
    this.metrics.totalExecutionTime += executionTime
    this.metrics.averageResponseTime = this.metrics.totalExecutionTime / this.metrics.commandsExecuted
    
    if (!success) {
      this.metrics.errorCount++
    }
  }
  
  /**
   * Get component status
   * @private
   */
  _getComponentStatus() {
    const status = {}
    
    for (const [name, component] of this.systemComponents) {
      try {
        if (component && typeof component.getStatus === 'function') {
          status[name] = component.getStatus()
        } else {
          status[name] = { available: !!component }
        }
      } catch (error) {
        status[name] = { error: error.message }
      }
    }
    
    return status
  }
  
  /**
   * Wait for active commands to complete
   * @private
   */
  async _waitForActiveCommands(timeout = 10000) {
    return new Promise((resolve) => {
      if (this.activeCommands.size === 0) {
        resolve()
        return
      }
      
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        if (this.activeCommands.size === 0 || (Date.now() - startTime) > timeout) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  }
  
  /**
   * Internal logging
   * @private
   */
  _log(level, message, metadata = {}) {
    // Only log if verbosity level allows it
    const levelPriority = { quiet: 0, normal: 1, verbose: 2, debug: 3 }
    const messagePriority = { error: 0, warn: 1, info: 1, debug: 3 }
    
    if (levelPriority[this.config.verbosity] < messagePriority[level]) {
      return
    }
    
    // Color-coded output if colors enabled
    if (this.config.enableColors) {
      const colors = {
        error: chalk.red,
        warn: chalk.yellow,
        info: chalk.blue,
        debug: chalk.gray
      }
      
      const colorFn = colors[level] || ((x) => x)
      console.log(`${colorFn(`[${level.toUpperCase()}]`)} ${message}`)
      
      if (Object.keys(metadata).length > 0 && level === 'debug') {
        console.log(chalk.gray(JSON.stringify(metadata, null, 2)))
      }
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`)
      
      if (Object.keys(metadata).length > 0 && level === 'debug') {
        console.log(JSON.stringify(metadata, null, 2))
      }
    }
    
    // Forward to audit logger if available
    const auditLogger = this.systemComponents.get('auditLogger')
    if (auditLogger && typeof auditLogger.log === 'function') {
      auditLogger.log(level, 'CLI', message, metadata)
    }
  }
}

module.exports = CLICore