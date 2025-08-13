/**
 * CLI Configuration Manager - Hierarchical Configuration with Hot-reload
 * 
 * Features:
 * - Hierarchical configuration (defaults < user < environment < runtime)
 * - Hot-reload capabilities with file watching
 * - Schema validation with error reporting
 * - Environment variable override support
 * - Configuration merging and inheritance
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const fs = require('fs').promises
const path = require('path')
const { EventEmitter } = require('events')
const Ajv = require('ajv')
const chalk = require('chalk')

/**
 * CLI Configuration Manager
 */
class CLIConfigManager extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      enableHotReload: options.enableHotReload !== false,
      enableValidation: options.enableValidation !== false,
      configDir: options.configDir || path.join(process.cwd(), 'config'),
      userConfigDir: options.userConfigDir || path.join(require('os').homedir(), '.catams'),
      enableEnvironmentOverrides: options.enableEnvironmentOverrides !== false,
      ...options
    }
    
    // Configuration state
    this.isInitialized = false
    this.config = {}
    this.schema = null
    this.validator = null
    this.fileWatchers = new Map()
    
    // Configuration hierarchy
    this.configSources = [
      { name: 'defaults', priority: 1, config: {} },
      { name: 'system', priority: 2, config: {}, path: null },
      { name: 'user', priority: 3, config: {}, path: null },
      { name: 'project', priority: 4, config: {}, path: null },
      { name: 'environment', priority: 5, config: {} },
      { name: 'runtime', priority: 6, config: {} }
    ]
    
    // Configuration schema
    this.configSchema = {
      type: 'object',
      properties: {
        cli: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['classic', 'modern', 'minimal'], default: 'modern' },
            enableColors: { type: 'boolean', default: true },
            enableAnimations: { type: 'boolean', default: true },
            updateInterval: { type: 'number', minimum: 100, default: 1000 },
            verbosity: { type: 'string', enum: ['quiet', 'normal', 'verbose', 'debug'], default: 'normal' }
          }
        },
        dashboard: {
          type: 'object',
          properties: {
            port: { type: 'number', minimum: 1000, maximum: 65535, default: 3001 },
            host: { type: 'string', default: 'localhost' },
            enableAuth: { type: 'boolean', default: false },
            updateInterval: { type: 'number', minimum: 100, default: 1000 }
          }
        },
        monitoring: {
          type: 'object',
          properties: {
            processDetectionLatency: { type: 'number', minimum: 1, default: 10 },
            memoryLeakThreshold: { type: 'number', minimum: 1024, default: 52428800 },
            alertResponseTime: { type: 'number', minimum: 100, default: 1000 },
            enableRealTimeMonitor: { type: 'boolean', default: true },
            enableLeakDetector: { type: 'boolean', default: true }
          }
        },
        export: {
          type: 'object',
          properties: {
            defaultFormat: { type: 'string', enum: ['json', 'csv', 'html', 'xlsx'], default: 'json' },
            outputDir: { type: 'string', default: './exports' },
            maxFileSize: { type: 'number', minimum: 1024, default: 10485760 },
            compressionEnabled: { type: 'boolean', default: false }
          }
        }
      },
      additionalProperties: true
    }
    
    this._setupValidator()
  }
  
  /**
   * Initialize configuration manager
   */
  async initialize() {
    if (this.isInitialized) {
      return
    }
    
    try {
      console.log(chalk.blue('⚙️ Initializing configuration manager...'))
      
      // Load default configuration
      await this._loadDefaults()
      
      // Load configuration files
      await this._loadConfigurationFiles()
      
      // Load environment variables
      await this._loadEnvironmentVariables()
      
      // Merge all configurations
      await this._mergeConfigurations()
      
      // Validate final configuration
      if (this.options.enableValidation) {
        await this._validateConfiguration()
      }
      
      // Setup hot-reload if enabled
      if (this.options.enableHotReload) {
        await this._setupHotReload()
      }
      
      this.isInitialized = true
      
      console.log(chalk.green('✅ Configuration manager initialized'))
      this.emit('initialized', this.config)
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize configuration:'), error.message)
      throw error
    }
  }
  
  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    if (!key) {
      return this.config
    }
    
    return this._getNestedValue(this.config, key, defaultValue)
  }
  
  /**
   * Set configuration value
   */
  set(key, value) {
    if (!key) {
      throw new Error('Configuration key is required')
    }
    
    const runtimeConfig = this._getConfigSource('runtime')
    this._setNestedValue(runtimeConfig.config, key, value)
    
    // Re-merge and validate
    this._mergeConfigurations()
    
    if (this.options.enableValidation) {
      this._validateConfiguration()
    }
    
    this.emit('configChanged', { key, value, source: 'runtime' })
  }
  
  /**
   * Load configuration from file
   */
  async loadFromFile(filePath) {
    try {
      const absolutePath = path.resolve(filePath)
      const configData = await this._loadConfigFile(absolutePath)
      
      // Add as project configuration
      const projectConfig = this._getConfigSource('project')
      projectConfig.config = configData
      projectConfig.path = absolutePath
      
      await this._mergeConfigurations()
      
      if (this.options.enableValidation) {
        await this._validateConfiguration()
      }
      
      console.log(chalk.green(`📁 Configuration loaded from: ${filePath}`))
      this.emit('configLoaded', { path: filePath, config: configData })
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load configuration from ${filePath}:`), error.message)
      throw error
    }
  }
  
  /**
   * Save configuration to file
   */
  async saveToFile(filePath, source = 'user') {
    try {
      const config = this._getConfigSource(source).config
      const content = JSON.stringify(config, null, 2)
      
      const absolutePath = path.resolve(filePath)
      const dir = path.dirname(absolutePath)
      
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(absolutePath, content, 'utf8')
      
      console.log(chalk.green(`💾 Configuration saved to: ${filePath}`))
      this.emit('configSaved', { path: filePath, source })
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save configuration to ${filePath}:`), error.message)
      throw error
    }
  }
  
  /**
   * Validate configuration
   */
  async validateConfiguration() {
    try {
      const isValid = this.validator(this.config)
      
      if (!isValid) {
        const errors = this.validator.errors.map(error => ({
          path: error.instancePath,
          message: error.message,
          value: error.data
        }))
        
        return {
          valid: false,
          errors
        }
      }
      
      return { valid: true, errors: [] }
      
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: error.message }]
      }
    }
  }
  
  /**
   * Get configuration sources
   */
  getConfigSources() {
    return this.configSources.map(source => ({
      name: source.name,
      priority: source.priority,
      path: source.path,
      hasConfig: Object.keys(source.config).length > 0
    }))
  }
  
  /**
   * Reset configuration to defaults
   */
  async resetToDefaults() {
    // Clear all non-default configurations
    this.configSources.forEach(source => {
      if (source.name !== 'defaults') {
        source.config = {}
      }
    })
    
    await this._mergeConfigurations()
    
    console.log(chalk.yellow('🔄 Configuration reset to defaults'))
    this.emit('configReset')
  }
  
  /**
   * Reload configuration
   */
  async reload() {
    try {
      console.log(chalk.blue('🔄 Reloading configuration...'))
      
      // Clear current configuration
      this.config = {}
      
      // Reload all sources
      await this._loadConfigurationFiles()
      await this._loadEnvironmentVariables()
      await this._mergeConfigurations()
      
      if (this.options.enableValidation) {
        await this._validateConfiguration()
      }
      
      console.log(chalk.green('✅ Configuration reloaded'))
      this.emit('configReloaded', this.config)
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to reload configuration:'), error.message)
      throw error
    }
  }
  
  /**
   * Get current configuration
   */
  getConfig() {
    return JSON.parse(JSON.stringify(this.config)) // Deep clone
  }
  
  /**
   * Cleanup resources
   */
  async cleanup() {
    // Stop file watchers
    for (const [filePath, watcher] of this.fileWatchers) {
      try {
        if (watcher && typeof watcher.close === 'function') {
          await watcher.close()
        }
      } catch (error) {
        console.warn(`Warning: Failed to close file watcher for ${filePath}`)
      }
    }
    
    this.fileWatchers.clear()
    this.removeAllListeners()
    
    console.log(chalk.blue('🧹 Configuration manager cleanup completed'))
  }
  
  // Private methods
  
  /**
   * Setup JSON schema validator
   * @private
   */
  _setupValidator() {
    const ajv = new Ajv({ 
      allErrors: true,
      useDefaults: true,
      removeAdditional: false,
      coerceTypes: true
    })
    
    this.validator = ajv.compile(this.configSchema)
  }
  
  /**
   * Load default configuration
   * @private
   */
  async _loadDefaults() {
    const defaults = {
      cli: {
        theme: 'modern',
        enableColors: true,
        enableAnimations: true,
        updateInterval: 1000,
        verbosity: 'normal'
      },
      dashboard: {
        port: 3001,
        host: 'localhost',
        enableAuth: false,
        updateInterval: 1000
      },
      monitoring: {
        processDetectionLatency: 10,
        memoryLeakThreshold: 50 * 1024 * 1024,
        alertResponseTime: 1000,
        enableRealTimeMonitor: true,
        enableLeakDetector: true
      },
      export: {
        defaultFormat: 'json',
        outputDir: './exports',
        maxFileSize: 10 * 1024 * 1024,
        compressionEnabled: false
      }
    }
    
    this._getConfigSource('defaults').config = defaults
  }
  
  /**
   * Load configuration files
   * @private
   */
  async _loadConfigurationFiles() {
    const configFiles = [
      // System config
      { source: 'system', paths: ['/etc/catams/config.json', '/usr/local/etc/catams/config.json'] },
      // User config
      { source: 'user', paths: [path.join(this.options.userConfigDir, 'config.json')] },
      // Project config
      { source: 'project', paths: ['catams.config.json', '.catams.json', 'config/catams.json'] }
    ]
    
    for (const { source, paths } of configFiles) {
      for (const configPath of paths) {
        try {
          const absolutePath = path.resolve(configPath)
          const config = await this._loadConfigFile(absolutePath)
          
          const configSource = this._getConfigSource(source)
          configSource.config = config
          configSource.path = absolutePath
          
          console.log(chalk.blue(`📄 Loaded ${source} config: ${absolutePath}`))
          break // Use first found config
          
        } catch (error) {
          // Config file doesn't exist or is invalid, continue to next
          continue
        }
      }
    }
  }
  
  /**
   * Load environment variables
   * @private
   */
  async _loadEnvironmentVariables() {
    if (!this.options.enableEnvironmentOverrides) {
      return
    }
    
    const envConfig = {}
    
    // Map environment variables to config keys
    const envMappings = {
      'CATAMS_CLI_THEME': 'cli.theme',
      'CATAMS_CLI_COLORS': 'cli.enableColors',
      'CATAMS_CLI_VERBOSITY': 'cli.verbosity',
      'CATAMS_DASHBOARD_PORT': 'dashboard.port',
      'CATAMS_DASHBOARD_HOST': 'dashboard.host',
      'CATAMS_MONITORING_INTERVAL': 'monitoring.processDetectionLatency',
      'CATAMS_EXPORT_FORMAT': 'export.defaultFormat'
    }
    
    for (const [envVar, configKey] of Object.entries(envMappings)) {
      const value = process.env[envVar]
      if (value !== undefined) {
        this._setNestedValue(envConfig, configKey, this._parseEnvironmentValue(value))
      }
    }
    
    this._getConfigSource('environment').config = envConfig
  }
  
  /**
   * Merge all configurations
   * @private
   */
  async _mergeConfigurations() {
    this.config = {}
    
    // Sort sources by priority
    const sortedSources = [...this.configSources].sort((a, b) => a.priority - b.priority)
    
    // Merge in priority order
    for (const source of sortedSources) {
      if (Object.keys(source.config).length > 0) {
        this.config = this._deepMerge(this.config, source.config)
      }
    }
  }
  
  /**
   * Validate current configuration
   * @private
   */
  async _validateConfiguration() {
    const validation = await this.validateConfiguration()
    
    if (!validation.valid) {
      console.warn(chalk.yellow('⚠️ Configuration validation warnings:'))
      validation.errors.forEach(error => {
        console.warn(chalk.yellow(`  ${error.path || 'root'}: ${error.message}`))
      })
    }
  }
  
  /**
   * Setup hot-reload file watching
   * @private
   */
  async _setupHotReload() {
    const filesToWatch = this.configSources
      .filter(source => source.path)
      .map(source => source.path)
    
    for (const filePath of filesToWatch) {
      try {
        const watcher = require('fs').watch(filePath, { persistent: false })
        
        watcher.on('change', async () => {
          try {
            console.log(chalk.blue(`🔄 Configuration file changed: ${filePath}`))
            await this.reload()
          } catch (error) {
            console.error(chalk.red('❌ Hot-reload failed:'), error.message)
          }
        })
        
        this.fileWatchers.set(filePath, watcher)
        
      } catch (error) {
        console.warn(chalk.yellow(`⚠️ Cannot watch config file: ${filePath}`))
      }
    }
    
    console.log(chalk.blue(`👁️ Hot-reload enabled for ${this.fileWatchers.size} config files`))
  }
  
  /**
   * Load configuration file
   * @private
   */
  async _loadConfigFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${filePath}`)
      } else if (error.name === 'SyntaxError') {
        throw new Error(`Invalid JSON in configuration file: ${filePath}`)
      }
      throw error
    }
  }
  
  /**
   * Get configuration source
   * @private
   */
  _getConfigSource(name) {
    return this.configSources.find(source => source.name === name)
  }
  
  /**
   * Get nested value from object
   * @private
   */
  _getNestedValue(obj, key, defaultValue = null) {
    const keys = key.split('.')
    let current = obj
    
    for (const k of keys) {
      if (current === null || current === undefined || !current.hasOwnProperty(k)) {
        return defaultValue
      }
      current = current[k]
    }
    
    return current
  }
  
  /**
   * Set nested value in object
   * @private
   */
  _setNestedValue(obj, key, value) {
    const keys = key.split('.')
    let current = obj
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!current.hasOwnProperty(k) || typeof current[k] !== 'object') {
        current[k] = {}
      }
      current = current[k]
    }
    
    current[keys[keys.length - 1]] = value
  }
  
  /**
   * Deep merge objects
   * @private
   */
  _deepMerge(target, source) {
    const result = { ...target }
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this._deepMerge(result[key] || {}, source[key])
        } else {
          result[key] = source[key]
        }
      }
    }
    
    return result
  }
  
  /**
   * Parse environment variable value
   * @private
   */
  _parseEnvironmentValue(value) {
    // Boolean
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
    
    // Number
    if (/^\d+$/.test(value)) return parseInt(value, 10)
    if (/^\d*\.\d+$/.test(value)) return parseFloat(value)
    
    // String
    return value
  }
}

module.exports = CLIConfigManager