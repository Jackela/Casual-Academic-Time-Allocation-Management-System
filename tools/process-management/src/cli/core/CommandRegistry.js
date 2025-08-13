/**
 * Command Registry - Modular Command Management System
 * 
 * Features:
 * - Plugin-style command extensibility
 * - Command validation and lifecycle management
 * - Category-based organization
 * - Performance monitoring per command
 * - Dependency resolution
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const path = require('path')
const { EventEmitter } = require('events')
const chalk = require('chalk')

// Import command categories
const CoreCommands = require('../commands/CoreCommands')
const DiagnosticCommands = require('../commands/DiagnosticCommands')
const EmergencyCommands = require('../commands/EmergencyCommands')
const ConfigCommands = require('../commands/ConfigCommands')
const DashboardCommands = require('../commands/DashboardCommands')
const ExportCommands = require('../commands/ExportCommands')

/**
 * Command Registry
 */
class CommandRegistry extends EventEmitter {
  constructor(cliCore) {
    super()
    
    this.cliCore = cliCore
    this.commands = new Map()
    this.categories = new Map()
    this.aliases = new Map()
    this.dependencies = new Map()
    
    // Command execution statistics
    this.stats = {
      totalExecutions: 0,
      executionTimes: new Map(),
      errorCounts: new Map(),
      lastExecuted: new Map()
    }
    
    // Command categories
    this.categoryDefinitions = {
      core: {
        name: 'Core Operations',
        description: 'Essential system operations and monitoring',
        color: 'blue'
      },
      diagnostics: {
        name: 'Diagnostics & Analysis',
        description: 'System analysis and problem detection tools',
        color: 'green'
      },
      emergency: {
        name: 'Emergency Response',
        description: 'Crisis response and recovery operations',
        color: 'red'
      },
      config: {
        name: 'Configuration',
        description: 'Configuration management and settings',
        color: 'yellow'
      },
      dashboard: {
        name: 'Dashboard & UI',
        description: 'Interactive dashboard and user interface',
        color: 'magenta'
      },
      export: {
        name: 'Export & Reporting',
        description: 'Data export and report generation',
        color: 'cyan'
      }
    }
  }
  
  /**
   * Register all commands from all categories
   */
  async registerAllCommands() {
    try {
      // Initialize categories
      for (const [key, definition] of Object.entries(this.categoryDefinitions)) {
        this.categories.set(key, {
          ...definition,
          commands: new Set()
        })
      }
      
      // Register command categories
      await this._registerCommandCategory('core', new CoreCommands(this.cliCore))
      await this._registerCommandCategory('diagnostics', new DiagnosticCommands(this.cliCore))
      await this._registerCommandCategory('emergency', new EmergencyCommands(this.cliCore))
      await this._registerCommandCategory('config', new ConfigCommands(this.cliCore))
      await this._registerCommandCategory('dashboard', new DashboardCommands(this.cliCore))
      await this._registerCommandCategory('export', new ExportCommands(this.cliCore))
      
      this._log('info', `Registered ${this.commands.size} commands across ${this.categories.size} categories`)
      
    } catch (error) {
      this._log('error', 'Failed to register commands', { error: error.message })
      throw error
    }
  }
  
  /**
   * Execute a command
   */
  async executeCommand(commandName, options = {}) {
    // Resolve command name (handle aliases)
    const resolvedName = this.aliases.get(commandName) || commandName
    const command = this.commands.get(resolvedName)
    
    if (!command) {
      throw new Error(`Unknown command: ${commandName}`)
    }
    
    const startTime = process.hrtime.bigint()
    
    try {
      this._log('debug', `Executing command: ${resolvedName}`, { options })
      
      // Check dependencies
      await this._checkDependencies(resolvedName)
      
      // Validate command options
      await this._validateCommandOptions(resolvedName, options)
      
      // Execute pre-hooks
      await this._executeHooks(resolvedName, 'pre', options)
      
      // Execute main command
      const result = await command.execute(options)
      
      // Execute post-hooks
      await this._executeHooks(resolvedName, 'post', { options, result })
      
      // Update statistics
      this._updateCommandStats(resolvedName, process.hrtime.bigint() - startTime, true)
      
      this.emit('commandExecuted', {
        command: resolvedName,
        options,
        result,
        executionTime: Number(process.hrtime.bigint() - startTime) / 1000000
      })
      
      return result
      
    } catch (error) {
      // Update error statistics
      this._updateCommandStats(resolvedName, process.hrtime.bigint() - startTime, false)
      
      this.emit('commandFailed', {
        command: resolvedName,
        options,
        error: error.message,
        executionTime: Number(process.hrtime.bigint() - startTime) / 1000000
      })
      
      throw error
    }
  }
  
  /**
   * Register a single command
   */
  registerCommand(name, commandInstance, category = 'core') {
    if (this.commands.has(name)) {
      throw new Error(`Command already registered: ${name}`)
    }
    
    // Validate command instance
    if (!commandInstance || typeof commandInstance.execute !== 'function') {
      throw new Error(`Invalid command instance for: ${name}`)
    }
    
    // Register command
    this.commands.set(name, commandInstance)
    
    // Add to category
    if (this.categories.has(category)) {
      this.categories.get(category).commands.add(name)
    }
    
    // Register aliases if provided
    if (commandInstance.aliases) {
      for (const alias of commandInstance.aliases) {
        this.aliases.set(alias, name)
      }
    }
    
    // Register dependencies if provided
    if (commandInstance.dependencies) {
      this.dependencies.set(name, commandInstance.dependencies)
    }
    
    // Initialize statistics
    this.stats.executionTimes.set(name, [])
    this.stats.errorCounts.set(name, 0)
    
    this._log('debug', `Registered command: ${name}`, { category, aliases: commandInstance.aliases })
    
    this.emit('commandRegistered', { name, category })
  }
  
  /**
   * Unregister a command
   */
  unregisterCommand(name) {
    if (!this.commands.has(name)) {
      return false
    }
    
    // Remove from commands
    this.commands.delete(name)
    
    // Remove from categories
    for (const [categoryName, category] of this.categories) {
      category.commands.delete(name)
    }
    
    // Remove aliases
    for (const [alias, commandName] of this.aliases) {
      if (commandName === name) {
        this.aliases.delete(alias)
      }
    }
    
    // Remove dependencies
    this.dependencies.delete(name)
    
    // Remove statistics
    this.stats.executionTimes.delete(name)
    this.stats.errorCounts.delete(name)
    this.stats.lastExecuted.delete(name)
    
    this._log('debug', `Unregistered command: ${name}`)
    
    this.emit('commandUnregistered', { name })
    return true
  }
  
  /**
   * Get command information
   */
  getCommand(name) {
    const resolvedName = this.aliases.get(name) || name
    const command = this.commands.get(resolvedName)
    
    if (!command) {
      return null
    }
    
    return {
      name: resolvedName,
      instance: command,
      description: command.description || 'No description available',
      usage: command.usage || `catams ${resolvedName} [options]`,
      options: command.options || [],
      examples: command.examples || [],
      category: this._getCommandCategory(resolvedName),
      aliases: this._getCommandAliases(resolvedName),
      dependencies: this.dependencies.get(resolvedName) || [],
      stats: this._getCommandStats(resolvedName)
    }
  }
  
  /**
   * List all commands
   */
  listCommands(category = null) {
    const commands = []
    
    for (const [name, command] of this.commands) {
      const commandCategory = this._getCommandCategory(name)
      
      if (category && commandCategory !== category) {
        continue
      }
      
      commands.push({
        name,
        description: command.description || 'No description available',
        category: commandCategory,
        aliases: this._getCommandAliases(name)
      })
    }
    
    return commands.sort((a, b) => a.name.localeCompare(b.name))
  }
  
  /**
   * List all categories
   */
  listCategories() {
    const categories = []
    
    for (const [name, category] of this.categories) {
      categories.push({
        name,
        displayName: category.name,
        description: category.description,
        color: category.color,
        commandCount: category.commands.size,
        commands: Array.from(category.commands)
      })
    }
    
    return categories
  }
  
  /**
   * Search commands
   */
  searchCommands(query) {
    const results = []
    const lowerQuery = query.toLowerCase()
    
    for (const [name, command] of this.commands) {
      const matches = []
      
      // Check name match
      if (name.toLowerCase().includes(lowerQuery)) {
        matches.push('name')
      }
      
      // Check description match
      const description = command.description || ''
      if (description.toLowerCase().includes(lowerQuery)) {
        matches.push('description')
      }
      
      // Check aliases match
      const aliases = this._getCommandAliases(name)
      if (aliases.some(alias => alias.toLowerCase().includes(lowerQuery))) {
        matches.push('alias')
      }
      
      if (matches.length > 0) {
        results.push({
          name,
          description: command.description || 'No description available',
          category: this._getCommandCategory(name),
          matches,
          relevance: this._calculateRelevance(name, description, aliases, lowerQuery)
        })
      }
    }
    
    return results.sort((a, b) => b.relevance - a.relevance)
  }
  
  /**
   * Get registry statistics
   */
  getStatistics() {
    const commandStats = {}
    
    for (const [name] of this.commands) {
      commandStats[name] = this._getCommandStats(name)
    }
    
    return {
      totalCommands: this.commands.size,
      totalCategories: this.categories.size,
      totalExecutions: this.stats.totalExecutions,
      totalAliases: this.aliases.size,
      commandStats,
      categoryStats: this._getCategoryStats()
    }
  }
  
  /**
   * Register command category
   * @private
   */
  async _registerCommandCategory(categoryName, commandsInstance) {
    try {
      // Initialize commands instance if needed
      if (typeof commandsInstance.initialize === 'function') {
        await commandsInstance.initialize()
      }
      
      // Get all commands from the instance
      const commands = commandsInstance.getCommands()
      
      // Register each command
      for (const [commandName, command] of Object.entries(commands)) {
        this.registerCommand(commandName, command, categoryName)
      }
      
      this._log('debug', `Registered command category: ${categoryName}`, { 
        commandCount: Object.keys(commands).length 
      })
      
    } catch (error) {
      this._log('error', `Failed to register command category: ${categoryName}`, { error: error.message })
      throw error
    }
  }
  
  /**
   * Check command dependencies
   * @private
   */
  async _checkDependencies(commandName) {
    const dependencies = this.dependencies.get(commandName)
    
    if (!dependencies || dependencies.length === 0) {
      return
    }
    
    for (const dependency of dependencies) {
      if (!this.commands.has(dependency)) {
        throw new Error(`Command dependency not available: ${dependency}`)
      }
    }
  }
  
  /**
   * Validate command options
   * @private
   */
  async _validateCommandOptions(commandName, options) {
    const command = this.commands.get(commandName)
    
    if (command && typeof command.validateOptions === 'function') {
      await command.validateOptions(options)
    }
  }
  
  /**
   * Execute command hooks
   * @private
   */
  async _executeHooks(commandName, phase, data) {
    const command = this.commands.get(commandName)
    
    if (command && typeof command[`${phase}Hook`] === 'function') {
      await command[`${phase}Hook`](data)
    }
  }
  
  /**
   * Update command statistics
   * @private
   */
  _updateCommandStats(commandName, executionTime, success) {
    this.stats.totalExecutions++
    this.stats.lastExecuted.set(commandName, Date.now())
    
    // Update execution times
    const times = this.stats.executionTimes.get(commandName) || []
    times.push(Number(executionTime) / 1000000) // Convert to milliseconds
    
    // Keep only last 100 execution times
    if (times.length > 100) {
      times.shift()
    }
    
    this.stats.executionTimes.set(commandName, times)
    
    // Update error count
    if (!success) {
      const currentErrors = this.stats.errorCounts.get(commandName) || 0
      this.stats.errorCounts.set(commandName, currentErrors + 1)
    }
  }
  
  /**
   * Get command category
   * @private
   */
  _getCommandCategory(commandName) {
    for (const [categoryName, category] of this.categories) {
      if (category.commands.has(commandName)) {
        return categoryName
      }
    }
    return 'unknown'
  }
  
  /**
   * Get command aliases
   * @private
   */
  _getCommandAliases(commandName) {
    const aliases = []
    
    for (const [alias, name] of this.aliases) {
      if (name === commandName) {
        aliases.push(alias)
      }
    }
    
    return aliases
  }
  
  /**
   * Get command statistics
   * @private
   */
  _getCommandStats(commandName) {
    const executionTimes = this.stats.executionTimes.get(commandName) || []
    const errorCount = this.stats.errorCounts.get(commandName) || 0
    const lastExecuted = this.stats.lastExecuted.get(commandName)
    
    return {
      executionCount: executionTimes.length,
      averageExecutionTime: executionTimes.length > 0 
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
        : 0,
      minExecutionTime: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
      maxExecutionTime: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
      errorCount,
      successRate: executionTimes.length > 0 ? ((executionTimes.length - errorCount) / executionTimes.length) * 100 : 0,
      lastExecuted
    }
  }
  
  /**
   * Get category statistics
   * @private
   */
  _getCategoryStats() {
    const categoryStats = {}
    
    for (const [categoryName, category] of this.categories) {
      let totalExecutions = 0
      let totalErrors = 0
      
      for (const commandName of category.commands) {
        const execTimes = this.stats.executionTimes.get(commandName) || []
        const errors = this.stats.errorCounts.get(commandName) || 0
        
        totalExecutions += execTimes.length
        totalErrors += errors
      }
      
      categoryStats[categoryName] = {
        commandCount: category.commands.size,
        totalExecutions,
        totalErrors,
        successRate: totalExecutions > 0 ? ((totalExecutions - totalErrors) / totalExecutions) * 100 : 0
      }
    }
    
    return categoryStats
  }
  
  /**
   * Calculate search relevance
   * @private
   */
  _calculateRelevance(name, description, aliases, query) {
    let relevance = 0
    
    // Exact name match gets highest score
    if (name.toLowerCase() === query) {
      relevance += 100
    } else if (name.toLowerCase().includes(query)) {
      relevance += 50
    }
    
    // Description match
    if (description.toLowerCase().includes(query)) {
      relevance += 25
    }
    
    // Alias match
    if (aliases.some(alias => alias.toLowerCase() === query)) {
      relevance += 75
    } else if (aliases.some(alias => alias.toLowerCase().includes(query))) {
      relevance += 35
    }
    
    return relevance
  }
  
  /**
   * Internal logging
   * @private
   */
  _log(level, message, metadata = {}) {
    if (this.cliCore && typeof this.cliCore._log === 'function') {
      this.cliCore._log(level, `[CommandRegistry] ${message}`, metadata)
    }
  }
}

module.exports = CommandRegistry