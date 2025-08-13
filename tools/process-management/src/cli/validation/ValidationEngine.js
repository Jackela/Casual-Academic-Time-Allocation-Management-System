/**
 * Validation Engine - Command and System Validation
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const chalk = require('chalk')

class ValidationEngine {
  constructor(config = {}) {
    this.config = config
    this.validators = new Map()
  }
  
  async initialize() {
    // Setup command validators
    this.validators.set('monitor', this._validateMonitorCommand.bind(this))
    this.validators.set('cleanup', this._validateCleanupCommand.bind(this))
    this.validators.set('validate', this._validateValidateCommand.bind(this))
    this.validators.set('dashboard', this._validateDashboardCommand.bind(this))
  }
  
  async validateCommand(commandName, options) {
    const validator = this.validators.get(commandName)
    
    if (!validator) {
      return { valid: true } // No specific validation
    }
    
    return await validator(options)
  }
  
  _validateMonitorCommand(options) {
    const errors = []
    
    if (options.interval && (options.interval < 100 || options.interval > 60000)) {
      errors.push('Interval must be between 100ms and 60000ms')
    }
    
    if (options.format && !['table', 'json', 'compact'].includes(options.format)) {
      errors.push('Format must be one of: table, json, compact')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  _validateCleanupCommand(options) {
    const errors = []
    
    if (options.strategy && !['graceful', 'smart', 'aggressive'].includes(options.strategy)) {
      errors.push('Strategy must be one of: graceful, smart, aggressive')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  _validateValidateCommand(options) {
    const errors = []
    
    if (options.type && !['system', 'performance', 'security', 'all'].includes(options.type)) {
      errors.push('Type must be one of: system, performance, security, all')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  _validateDashboardCommand(options) {
    const errors = []
    
    if (options.port && (options.port < 1000 || options.port > 65535)) {
      errors.push('Port must be between 1000 and 65535')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

module.exports = ValidationEngine