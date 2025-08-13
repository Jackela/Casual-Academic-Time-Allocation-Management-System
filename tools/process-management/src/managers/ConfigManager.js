/**
 * Configuration Manager - JSON schema validation and configuration management
 *
 * Implements configuration management with:
 * - JSON schema validation using AJV
 * - Environment-specific configurations
 * - Configuration inheritance and merging
 * - Runtime configuration updates
 * - Configuration validation and error reporting
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const fs = require('fs')
const path = require('path')

/**
 * Configuration Manager with JSON schema validation
 */
class ConfigManager {
  constructor (options = {}) {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false
    })
    addFormats(this.ajv)

    this.baseConfigPath = options.baseConfigPath || path.join(__dirname, '..', 'config')
    this.environment = options.environment || process.env.NODE_ENV || 'development'
    this.schema = null
    this.config = {}
    this.validators = new Map()

    // Initialize with default schema
    this._initializeSchema()
  }

  /**
   * Initialize default configuration schema
   * @private
   */
  _initializeSchema () {
    this.schema = {
      type: 'object',
      properties: {
        orchestrator: {
          type: 'object',
          properties: {
            sessionTimeout: { type: 'number', minimum: 1000 },
            maxConcurrentOperations: { type: 'number', minimum: 1, maximum: 100 },
            emergencyRecoveryTimeout: { type: 'number', minimum: 1000, maximum: 10000 },
            auditLogLevel: { type: 'string', enum: ['error', 'warn', 'info', 'debug'] },
            memoryThreshold: { type: 'number', minimum: 1024 * 1024 * 100 }, // 100MB minimum
            maxNewProcesses: { type: 'number', minimum: 1, maximum: 1000 }
          },
          required: ['sessionTimeout', 'emergencyRecoveryTimeout'],
          additionalProperties: false
        },
        lifecycle: {
          type: 'object',
          properties: {
            defaultTimeout: { type: 'number', minimum: 1000 },
            gracefulTimeout: { type: 'number', minimum: 1000 },
            forceKillDelay: { type: 'number', minimum: 1000 },
            maxRetries: { type: 'number', minimum: 0, maximum: 10 },
            retryDelay: { type: 'number', minimum: 100 }
          },
          required: ['defaultTimeout', 'gracefulTimeout'],
          additionalProperties: false
        },
        registry: {
          type: 'object',
          properties: {
            cleanupInterval: { type: 'number', minimum: 1000 },
            processCheckInterval: { type: 'number', minimum: 100 },
            maxTrackedProcesses: { type: 'number', minimum: 10 },
            enableCrossSessionTracking: { type: 'boolean' }
          },
          required: ['cleanupInterval'],
          additionalProperties: false
        },
        platform: {
          type: 'object',
          properties: {
            windows: {
              type: 'object',
              properties: {
                killCommand: { type: 'string' },
                listProcessCommand: { type: 'string' },
                portCheckCommand: { type: 'string' }
              },
              additionalProperties: false
            },
            unix: {
              type: 'object',
              properties: {
                killCommand: { type: 'string' },
                listProcessCommand: { type: 'string' },
                portCheckCommand: { type: 'string' }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        security: {
          type: 'object',
          properties: {
            allowedCommands: {
              type: 'array',
              items: { type: 'string' }
            },
            blockedCommands: {
              type: 'array',
              items: { type: 'string' }
            },
            requireConfirmation: { type: 'boolean' },
            maxCommandLength: { type: 'number', minimum: 100 }
          },
          additionalProperties: false
        },
        monitoring: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            interval: { type: 'number', minimum: 1000 },
            metrics: {
              type: 'object',
              properties: {
                enableCpuMonitoring: { type: 'boolean' },
                enableMemoryMonitoring: { type: 'boolean' },
                enableDiskMonitoring: { type: 'boolean' }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      },
      required: ['orchestrator', 'lifecycle', 'registry'],
      additionalProperties: false
    }

    // Compile validator
    this.validators.set('main', this.ajv.compile(this.schema))
  }

  /**
   * Load configuration from file or object
   * @param {string|Object} configSource - Configuration file path or object
   * @returns {Object} Loaded and validated configuration
   */
  loadConfig (configSource = {}) {
    try {
      let rawConfig

      if (typeof configSource === 'string') {
        // Load from file
        rawConfig = this._loadConfigFromFile(configSource)
      } else if (typeof configSource === 'object') {
        // Use provided object
        rawConfig = configSource
      } else {
        throw new Error('Config source must be a file path or object')
      }

      // First validate the user configuration structure (before merging)
      if (Object.keys(rawConfig).length > 0) {
        this._validateUserConfig(rawConfig)
      }

      // Apply default configuration
      const defaultConfig = this._getDefaultConfig()
      const mergedConfig = this._mergeConfigs(defaultConfig, rawConfig)

      // Validate final merged configuration
      this._validateConfig(mergedConfig)

      // Store validated configuration
      this.config = mergedConfig

      return this.config
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`)
    }
  }

  /**
   * Load configuration from file
   * @param {string} configPath - Configuration file path
   * @returns {Object} Raw configuration
   * @private
   */
  _loadConfigFromFile (configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`)
    }

    try {
      const fileContent = fs.readFileSync(configPath, 'utf8')

      if (configPath.endsWith('.json')) {
        return JSON.parse(fileContent)
      } else if (configPath.endsWith('.js')) {
        return require(configPath)
      } else {
        throw new Error(`Unsupported configuration file format: ${path.extname(configPath)}`)
      }
    } catch (error) {
      throw new Error(`Failed to parse configuration file: ${error.message}`)
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   * @private
   */
  _getDefaultConfig () {
    return {
      orchestrator: {
        sessionTimeout: 300000, // 5 minutes
        maxConcurrentOperations: 10,
        emergencyRecoveryTimeout: 5000, // 5 seconds
        auditLogLevel: 'info',
        memoryThreshold: 1024 * 1024 * 1024, // 1GB
        maxNewProcesses: 50
      },
      lifecycle: {
        defaultTimeout: 30000, // 30 seconds
        gracefulTimeout: 10000, // 10 seconds
        forceKillDelay: 5000, // 5 seconds
        maxRetries: 3,
        retryDelay: 1000 // 1 second
      },
      registry: {
        cleanupInterval: 60000, // 1 minute
        processCheckInterval: 5000, // 5 seconds
        maxTrackedProcesses: 1000,
        enableCrossSessionTracking: false
      },
      platform: {
        windows: {
          killCommand: 'taskkill /F /T /PID',
          listProcessCommand: 'wmic process get ProcessId,Name,CommandLine,ParentProcessId /format:csv',
          portCheckCommand: 'netstat -ano'
        },
        unix: {
          killCommand: 'kill -9',
          listProcessCommand: 'ps -eo pid,ppid,comm,args --no-headers',
          portCheckCommand: 'lsof -i -P -n | grep LISTEN'
        }
      },
      security: {
        allowedCommands: [],
        blockedCommands: ['rm -rf', 'del /s', 'format', 'fdisk'],
        requireConfirmation: false,
        maxCommandLength: 10000
      },
      monitoring: {
        enabled: true,
        interval: 5000, // 5 seconds
        metrics: {
          enableCpuMonitoring: true,
          enableMemoryMonitoring: true,
          enableDiskMonitoring: false
        }
      }
    }
  }

  /**
   * Merge configurations with deep merging
   * @param {Object} defaultConfig - Default configuration
   * @param {Object} userConfig - User configuration
   * @returns {Object} Merged configuration
   * @private
   */
  _mergeConfigs (defaultConfig, userConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig))

    const merge = (target, source) => {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) {
              target[key] = {}
            }
            merge(target[key], source[key])
          } else {
            target[key] = source[key]
          }
        }
      }
    }

    merge(merged, userConfig)
    return merged
  }

  /**
   * Validate user configuration for required fields (before merging)
   * @param {Object} userConfig - User configuration to validate
   * @private
   */
  _validateUserConfig (userConfig) {
    // Check for complete sections only - if a section has ANY required field,
    // then ALL required fields for that section must be present
    const requiredFields = {
      orchestrator: ['sessionTimeout', 'emergencyRecoveryTimeout'],
      lifecycle: ['defaultTimeout', 'gracefulTimeout'],
      registry: ['cleanupInterval']
    }

    for (const [section, required] of Object.entries(requiredFields)) {
      if (userConfig[section]) {
        const sectionConfig = userConfig[section]
        
        // Check if any required field is present
        const hasAnyRequired = required.some(field => sectionConfig[field] !== undefined)
        
        if (hasAnyRequired) {
          // If any required field is present, all must be present
          for (const field of required) {
            if (sectionConfig[field] === undefined) {
              throw new Error(`Configuration validation failed:\n  • ${section}.${field}: is required when ${section} section is provided`)
            }
          }
        }
      }
    }
  }

  /**
   * Validate configuration against schema
   * @param {Object} config - Configuration to validate
   * @private
   */
  _validateConfig (config) {
    const validator = this.validators.get('main')
    const valid = validator(config)

    if (!valid) {
      const errors = this._formatValidationErrors(validator.errors)
      throw new Error(`Configuration validation failed:\n${errors}`)
    }
  }

  /**
   * Format validation errors for display
   * @param {Array} errors - AJV validation errors
   * @returns {string} Formatted error message
   * @private
   */
  _formatValidationErrors (errors) {
    return errors.map(error => {
      const path = error.instancePath || 'root'
      const message = error.message
      const allowedValues = error.params?.allowedValues
        ? ` (allowed: ${error.params.allowedValues.join(', ')})`
        : ''

      return `  • ${path}: ${message}${allowedValues}`
    }).join('\n')
  }

  /**
   * Update configuration at runtime
   * @param {string} path - Configuration path (dot notation)
   * @param {*} value - New value
   */
  updateConfig (path, value) {
    const pathParts = path.split('.')
    let current = this.config

    // Navigate to parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {}
      }
      current = current[pathParts[i]]
    }

    // Set value
    const finalKey = pathParts[pathParts.length - 1]
    current[finalKey] = value

    // Validate updated configuration
    this._validateConfig(this.config)
  }

  /**
   * Get configuration value
   * @param {string} path - Configuration path (dot notation)
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Configuration value
   */
  getConfig (path, defaultValue = undefined) {
    const pathParts = path.split('.')
    let current = this.config

    for (const part of pathParts) {
      if (current && current.hasOwnProperty(part)) {
        current = current[part]
      } else {
        return defaultValue
      }
    }

    return current
  }

  /**
   * Check if configuration has a specific path
   * @param {string} path - Configuration path (dot notation)
   * @returns {boolean} True if path exists
   */
  hasConfig (path) {
    const pathParts = path.split('.')
    let current = this.config

    for (const part of pathParts) {
      if (current && current.hasOwnProperty(part)) {
        current = current[part]
      } else {
        return false
      }
    }

    return true
  }

  /**
   * Add custom validation schema
   * @param {string} name - Schema name
   * @param {Object} schema - JSON schema
   */
  addSchema (name, schema) {
    try {
      const validator = this.ajv.compile(schema)
      this.validators.set(name, validator)
    } catch (error) {
      throw new Error(`Failed to compile schema '${name}': ${error.message}`)
    }
  }

  /**
   * Validate data against custom schema
   * @param {string} schemaName - Schema name
   * @param {*} data - Data to validate
   * @returns {Object} Validation result
   */
  validate (schemaName, data) {
    const validator = this.validators.get(schemaName)

    if (!validator) {
      throw new Error(`Schema '${schemaName}' not found`)
    }

    const valid = validator(data)

    return {
      valid,
      errors: valid ? null : this._formatValidationErrors(validator.errors)
    }
  }

  /**
   * Save current configuration to file
   * @param {string} filePath - Output file path
   */
  saveConfig (filePath) {
    try {
      const configJson = JSON.stringify(this.config, null, 2)
      fs.writeFileSync(filePath, configJson, 'utf8')
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`)
    }
  }

  /**
   * Load environment-specific configuration
   * @param {string} environment - Environment name
   * @returns {Object} Environment configuration
   */
  loadEnvironmentConfig (environment = this.environment) {
    const envConfigPath = path.join(this.baseConfigPath, `${environment}.json`)

    if (fs.existsSync(envConfigPath)) {
      const envConfig = this._loadConfigFromFile(envConfigPath)
      this.config = this._mergeConfigs(this.config, envConfig)
      this._validateConfig(this.config)
    }

    return this.config
  }

  /**
   * Get configuration schema
   * @returns {Object} JSON schema
   */
  getSchema () {
    return this.schema
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getCurrentConfig () {
    return JSON.parse(JSON.stringify(this.config))
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults () {
    this.config = this._getDefaultConfig()
  }

  /**
   * Get configuration summary for logging
   * @returns {Object} Configuration summary
   */
  getConfigSummary () {
    return {
      environment: this.environment,
      orchestrator: {
        sessionTimeout: this.config.orchestrator?.sessionTimeout,
        emergencyRecoveryTimeout: this.config.orchestrator?.emergencyRecoveryTimeout,
        auditLogLevel: this.config.orchestrator?.auditLogLevel
      },
      lifecycle: {
        defaultTimeout: this.config.lifecycle?.defaultTimeout,
        gracefulTimeout: this.config.lifecycle?.gracefulTimeout
      },
      monitoring: {
        enabled: this.config.monitoring?.enabled,
        interval: this.config.monitoring?.interval
      }
    }
  }
}

module.exports = ConfigManager
