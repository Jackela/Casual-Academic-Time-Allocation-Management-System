/**
 * Enterprise Help System - Interactive Command Documentation
 * 
 * Features:
 * - Interactive help with command completion
 * - Contextual guidance and examples
 * - Search functionality with fuzzy matching
 * - Command usage validation
 * - Progressive help disclosure
 * - Multi-format help output
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const chalk = require('chalk')
const inquirer = require('inquirer')
const fuzzy = require('fuzzy')

/**
 * Enterprise Help System
 */
class EnterpriseHelpSystem {
  constructor(config = {}) {
    this.config = {
      enableInteractive: config.enableInteractive !== false,
      enableColors: config.enableColors !== false,
      enableFuzzySearch: config.enableFuzzySearch !== false,
      maxSearchResults: config.maxSearchResults || 10,
      ...config
    }
    
    this.commandRegistry = null
    this.helpDatabase = new Map()
    this.usageHistory = new Map()
    this.searchIndex = new Map()
    
    // Help categories and structure
    this.helpStructure = {
      'getting-started': {
        title: '🚀 Getting Started',
        description: 'Basic CLI usage and common commands',
        priority: 1
      },
      'core-operations': {
        title: '⚙️ Core Operations',
        description: 'Essential system operations and monitoring',
        priority: 2
      },
      'diagnostics': {
        title: '🔍 Diagnostics & Troubleshooting',
        description: 'Problem detection and analysis tools',
        priority: 3
      },
      'emergency': {
        title: '🚨 Emergency Response',
        description: 'Crisis management and recovery procedures',
        priority: 4
      },
      'configuration': {
        title: '⚙️ Configuration Management',
        description: 'Settings and configuration options',
        priority: 5
      },
      'advanced': {
        title: '🎯 Advanced Features',
        description: 'Power user features and automation',
        priority: 6
      }
    }
    
    // Interactive completion support
    this.completionCache = new Map()
    this.lastCompletionTime = 0
  }
  
  /**
   * Initialize help system
   */
  async initialize(commandRegistry) {
    this.commandRegistry = commandRegistry
    
    try {
      await this._buildHelpDatabase()
      await this._buildSearchIndex()
      
      console.log(chalk.blue('📚 Enterprise Help System initialized'))
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize help system:'), error.message)
      throw error
    }
  }
  
  /**
   * Show interactive help
   */
  async showInteractiveHelp(query = null) {
    if (!this.config.enableInteractive) {
      return this.showBasicHelp(query)
    }
    
    try {
      console.log(this._formatHeader('🎯 CATAMS Interactive Help System'))
      
      if (query) {
        return await this._handleSearchQuery(query)
      }
      
      const choice = await inquirer.prompt([
        {
          type: 'list',
          name: 'helpType',
          message: 'What would you like help with?',
          choices: [
            { name: '🔍 Search for specific command or topic', value: 'search' },
            { name: '📋 Browse all commands by category', value: 'browse' },
            { name: '🚀 Getting started guide', value: 'getting-started' },
            { name: '🎯 Command usage examples', value: 'examples' },
            { name: '⚙️ Configuration help', value: 'config' },
            { name: '❓ Frequently asked questions', value: 'faq' },
            new inquirer.Separator(),
            { name: '🚪 Exit help', value: 'exit' }
          ],
          pageSize: 10
        }
      ])
      
      switch (choice.helpType) {
        case 'search':
          return await this._interactiveSearch()
        case 'browse':
          return await this._browseCategorizedHelp()
        case 'getting-started':
          return await this._showGettingStarted()
        case 'examples':
          return await this._showUsageExamples()
        case 'config':
          return await this._showConfigurationHelp()
        case 'faq':
          return await this._showFAQ()
        case 'exit':
          console.log(chalk.green('👋 Happy coding with CATAMS!'))
          return
        default:
          return await this.showBasicHelp()
      }
      
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        console.log(chalk.yellow('\n👋 Help session cancelled'))
        return
      }
      
      console.error(chalk.red('❌ Interactive help error:'), error.message)
      return this.showBasicHelp(query)
    }
  }
  
  /**
   * Show basic help
   */
  showBasicHelp(query = null) {
    if (query) {
      return this._searchHelp(query)
    }
    
    console.log(this._formatHeader('📚 CATAMS CLI Help'))
    
    // Show overview
    console.log(chalk.cyan('OVERVIEW:'))
    console.log('  CATAMS CLI provides comprehensive system monitoring and management capabilities.')
    console.log('  Use commands to monitor processes, diagnose issues, and manage system resources.\n')
    
    // Show command categories
    this._showCommandCategories()
    
    // Show usage patterns
    console.log(chalk.cyan('USAGE PATTERNS:'))
    console.log('  catams <command> [options]           Execute a command with options')
    console.log('  catams help-system --search <query>  Search for specific help')
    console.log('  catams help-system --interactive     Launch interactive help')
    console.log('  catams dashboard                     Launch monitoring dashboard')
    console.log('')
    
    // Show common examples
    console.log(chalk.cyan('COMMON EXAMPLES:'))
    console.log('  catams monitor                       Start real-time monitoring')
    console.log('  catams cleanup --strategy smart      Perform intelligent cleanup')
    console.log('  catams diagnose --scope system       Run system diagnostics')
    console.log('  catams status --format table         Show system status')
    console.log('')
    
    console.log(chalk.blue('💡 TIP: Use'), chalk.yellow('catams help-system --interactive'), chalk.blue('for guided help'))
  }
  
  /**
   * Get command help
   */
  getCommandHelp(commandName) {
    const helpData = this.helpDatabase.get(commandName)
    
    if (!helpData) {
      return null
    }
    
    // Track usage
    this._trackHelpUsage(commandName)
    
    return this._formatCommandHelp(helpData)
  }
  
  /**
   * Search help
   */
  searchHelp(query) {
    return this._searchHelp(query)
  }
  
  /**
   * Get command completions
   */
  getCompletions(partial) {
    if (!this.commandRegistry) {
      return []
    }
    
    const commands = this.commandRegistry.listCommands()
    const completions = []
    
    // Use fuzzy search if enabled
    if (this.config.enableFuzzySearch) {
      const results = fuzzy.filter(partial, commands, {
        extract: (cmd) => cmd.name
      })
      
      return results.slice(0, this.config.maxSearchResults).map(result => ({
        name: result.original.name,
        description: result.original.description,
        score: result.score
      }))
    }
    
    // Basic prefix matching
    return commands
      .filter(cmd => cmd.name.toLowerCase().startsWith(partial.toLowerCase()))
      .slice(0, this.config.maxSearchResults)
      .map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        score: 1
      }))
  }
  
  /**
   * Validate command usage
   */
  validateCommandUsage(commandName, options) {
    const helpData = this.helpDatabase.get(commandName)
    
    if (!helpData) {
      return { valid: true } // No validation data available
    }
    
    const validation = {
      valid: true,
      warnings: [],
      suggestions: []
    }
    
    // Check required options
    if (helpData.requiredOptions) {
      for (const required of helpData.requiredOptions) {
        if (!options.hasOwnProperty(required)) {
          validation.valid = false
          validation.warnings.push(`Missing required option: --${required}`)
        }
      }
    }
    
    // Check deprecated options
    if (helpData.deprecatedOptions) {
      for (const [deprecated, replacement] of Object.entries(helpData.deprecatedOptions)) {
        if (options.hasOwnProperty(deprecated)) {
          validation.warnings.push(`Option --${deprecated} is deprecated. Use --${replacement} instead.`)
        }
      }
    }
    
    // Suggest common combinations
    if (helpData.commonCombinations && Object.keys(options).length === 1) {
      const suggestions = helpData.commonCombinations
        .filter(combo => combo.some(opt => options.hasOwnProperty(opt)))
        .map(combo => `Consider using: --${combo.join(' --')}`)
      
      validation.suggestions.push(...suggestions)
    }
    
    return validation
  }
  
  /**
   * Get help statistics
   */
  getHelpStatistics() {
    const totalCommands = this.helpDatabase.size
    const searchedCommands = Array.from(this.usageHistory.values())
      .reduce((sum, count) => sum + count, 0)
    
    const mostSearched = Array.from(this.usageHistory.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cmd, count]) => ({ command: cmd, searches: count }))
    
    return {
      totalCommands,
      searchedCommands,
      mostSearched,
      indexSize: this.searchIndex.size
    }
  }
  
  /**
   * Build help database
   * @private
   */
  async _buildHelpDatabase() {
    if (!this.commandRegistry) {
      throw new Error('Command registry not available')
    }
    
    const commands = this.commandRegistry.listCommands()
    
    for (const command of commands) {
      const detailedInfo = this.commandRegistry.getCommand(command.name)
      
      if (detailedInfo) {
        this.helpDatabase.set(command.name, {
          name: command.name,
          description: detailedInfo.description,
          usage: detailedInfo.usage,
          options: detailedInfo.options,
          examples: detailedInfo.examples,
          category: detailedInfo.category,
          aliases: detailedInfo.aliases,
          dependencies: detailedInfo.dependencies,
          
          // Enhanced help data
          longDescription: this._generateLongDescription(detailedInfo),
          commonCombinations: this._getCommonOptionCombinations(detailedInfo),
          relatedCommands: this._findRelatedCommands(detailedInfo),
          troubleshooting: this._getTroubleshootingTips(detailedInfo),
          requiredOptions: this._extractRequiredOptions(detailedInfo),
          deprecatedOptions: this._getDeprecatedOptions(detailedInfo)
        })
      }
    }
    
    console.log(chalk.blue(`📝 Built help database with ${this.helpDatabase.size} commands`))
  }
  
  /**
   * Build search index
   * @private
   */
  async _buildSearchIndex() {
    this.searchIndex.clear()
    
    for (const [commandName, helpData] of this.helpDatabase) {
      const searchTerms = new Set()
      
      // Add command name and aliases
      searchTerms.add(commandName.toLowerCase())
      if (helpData.aliases) {
        helpData.aliases.forEach(alias => searchTerms.add(alias.toLowerCase()))
      }
      
      // Add description keywords
      if (helpData.description) {
        const words = helpData.description.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.length > 2) { // Skip very short words
            searchTerms.add(word)
          }
        })
      }
      
      // Add category
      if (helpData.category) {
        searchTerms.add(helpData.category.toLowerCase())
      }
      
      // Add option names
      if (helpData.options) {
        helpData.options.forEach(opt => {
          if (typeof opt === 'string') {
            searchTerms.add(opt.toLowerCase())
          } else if (opt.name) {
            searchTerms.add(opt.name.toLowerCase())
          }
        })
      }
      
      // Store search terms for this command
      for (const term of searchTerms) {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, new Set())
        }
        this.searchIndex.get(term).add(commandName)
      }
    }
    
    console.log(chalk.blue(`🔍 Built search index with ${this.searchIndex.size} terms`))
  }
  
  /**
   * Handle search query
   * @private
   */
  async _handleSearchQuery(query) {
    const results = this._searchHelp(query)
    
    if (results.length === 0) {
      console.log(chalk.yellow(`No help found for: ${query}`))
      console.log(chalk.blue('💡 Try using broader search terms or browse categories'))
      return
    }
    
    if (results.length === 1) {
      return this._showDetailedCommandHelp(results[0].name)
    }
    
    // Multiple results - let user choose
    console.log(chalk.green(`Found ${results.length} results for: ${query}\n`))
    
    const choices = results.map(result => ({
      name: `${result.name} - ${result.description}`,
      value: result.name
    }))
    
    choices.push(new inquirer.Separator())
    choices.push({ name: '🔙 Back to main help', value: 'back' })
    
    const selection = await inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: 'Select a command for detailed help:',
        choices,
        pageSize: 15
      }
    ])
    
    if (selection.command === 'back') {
      return this.showInteractiveHelp()
    }
    
    return this._showDetailedCommandHelp(selection.command)
  }
  
  /**
   * Interactive search
   * @private
   */
  async _interactiveSearch() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter search terms:',
        validate: (input) => {
          return input.trim().length > 0 || 'Please enter search terms'
        }
      }
    ])
    
    return this._handleSearchQuery(answers.query)
  }
  
  /**
   * Browse categorized help
   * @private
   */
  async _browseCategorizedHelp() {
    const categories = this.commandRegistry.listCategories()
      .sort((a, b) => (this.helpStructure[a.name]?.priority || 999) - (this.helpStructure[b.name]?.priority || 999))
    
    const choices = categories.map(cat => {
      const structure = this.helpStructure[cat.name] || {}
      return {
        name: `${structure.title || cat.displayName} (${cat.commandCount} commands)`,
        value: cat.name,
        short: cat.name
      }
    })
    
    choices.push(new inquirer.Separator())
    choices.push({ name: '🔙 Back to main help', value: 'back' })
    
    const selection = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Select a category to explore:',
        choices,
        pageSize: 15
      }
    ])
    
    if (selection.category === 'back') {
      return this.showInteractiveHelp()
    }
    
    return this._showCategoryHelp(selection.category)
  }
  
  /**
   * Show category help
   * @private
   */
  async _showCategoryHelp(categoryName) {
    const category = this.commandRegistry.listCategories()
      .find(cat => cat.name === categoryName)
    
    if (!category) {
      console.log(chalk.red(`Category not found: ${categoryName}`))
      return
    }
    
    const structure = this.helpStructure[categoryName] || {}
    
    console.log(this._formatHeader(structure.title || category.displayName))
    console.log(chalk.gray(structure.description || category.description))
    console.log('')
    
    const commands = this.commandRegistry.listCommands(categoryName)
    const choices = commands.map(cmd => ({
      name: `${cmd.name} - ${cmd.description}`,
      value: cmd.name
    }))
    
    choices.push(new inquirer.Separator())
    choices.push({ name: '🔙 Back to categories', value: 'back' })
    
    const selection = await inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: 'Select a command for detailed help:',
        choices,
        pageSize: 15
      }
    ])
    
    if (selection.command === 'back') {
      return this._browseCategorizedHelp()
    }
    
    return this._showDetailedCommandHelp(selection.command)
  }
  
  /**
   * Show detailed command help
   * @private
   */
  async _showDetailedCommandHelp(commandName) {
    const helpData = this.helpDatabase.get(commandName)
    
    if (!helpData) {
      console.log(chalk.red(`No help available for command: ${commandName}`))
      return
    }
    
    console.log(this._formatCommandHelp(helpData))
    
    // Interactive options
    const actions = [
      { name: '📋 Show usage examples', value: 'examples' },
      { name: '🔧 Show troubleshooting tips', value: 'troubleshooting' },
      { name: '🔗 Show related commands', value: 'related' },
      new inquirer.Separator(),
      { name: '🔍 Search again', value: 'search' },
      { name: '🔙 Back to main help', value: 'back' }
    ]
    
    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do next?',
        choices: actions
      }
    ])
    
    switch (action.action) {
      case 'examples':
        this._showCommandExamples(helpData)
        break
      case 'troubleshooting':
        this._showTroubleshootingTips(helpData)
        break
      case 'related':
        this._showRelatedCommands(helpData)
        break
      case 'search':
        return this._interactiveSearch()
      case 'back':
        return this.showInteractiveHelp()
    }
    
    // Continue interaction
    return this._showDetailedCommandHelp(commandName)
  }
  
  /**
   * Search help
   * @private
   */
  _searchHelp(query) {
    const queryTerms = query.toLowerCase().split(/\s+/)
    const commandMatches = new Map()
    
    // Search through index
    for (const term of queryTerms) {
      // Exact matches
      if (this.searchIndex.has(term)) {
        for (const commandName of this.searchIndex.get(term)) {
          const score = commandMatches.get(commandName) || 0
          commandMatches.set(commandName, score + 2)
        }
      }
      
      // Partial matches
      for (const [indexTerm, commands] of this.searchIndex) {
        if (indexTerm.includes(term) || term.includes(indexTerm)) {
          for (const commandName of commands) {
            const score = commandMatches.get(commandName) || 0
            commandMatches.set(commandName, score + 1)
          }
        }
      }
    }
    
    // Convert to results array and sort by relevance
    const results = Array.from(commandMatches.entries())
      .map(([name, score]) => ({
        name,
        score,
        description: this.helpDatabase.get(name)?.description || 'No description'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxSearchResults)
    
    // Track search
    this._trackSearchQuery(query, results.length)
    
    return results
  }
  
  /**
   * Format command help
   * @private
   */
  _formatCommandHelp(helpData) {
    let output = []
    
    // Header
    output.push(this._formatHeader(`📋 ${helpData.name.toUpperCase()}`))
    
    // Description
    if (helpData.description) {
      output.push(chalk.cyan('DESCRIPTION:'))
      output.push(`  ${helpData.description}`)
      output.push('')
    }
    
    // Long description
    if (helpData.longDescription) {
      output.push(chalk.cyan('DETAILS:'))
      output.push(`  ${helpData.longDescription}`)
      output.push('')
    }
    
    // Usage
    if (helpData.usage) {
      output.push(chalk.cyan('USAGE:'))
      output.push(`  ${helpData.usage}`)
      output.push('')
    }
    
    // Options
    if (helpData.options && helpData.options.length > 0) {
      output.push(chalk.cyan('OPTIONS:'))
      for (const option of helpData.options) {
        if (typeof option === 'string') {
          output.push(`  ${option}`)
        } else {
          const name = option.name || option.flag || 'Unknown'
          const desc = option.description || 'No description'
          const required = option.required ? chalk.red(' (required)') : ''
          output.push(`  ${chalk.yellow(name)}${required}`)
          output.push(`    ${desc}`)
        }
      }
      output.push('')
    }
    
    // Examples
    if (helpData.examples && helpData.examples.length > 0) {
      output.push(chalk.cyan('EXAMPLES:'))
      helpData.examples.forEach(example => {
        if (typeof example === 'string') {
          output.push(`  ${chalk.gray('$')} catams ${example}`)
        } else {
          output.push(`  ${chalk.gray('$')} catams ${example.command}`)
          if (example.description) {
            output.push(`    ${chalk.dim(example.description)}`)
          }
        }
      })
      output.push('')
    }
    
    // Category and aliases
    const metadata = []
    if (helpData.category) metadata.push(`Category: ${helpData.category}`)
    if (helpData.aliases && helpData.aliases.length > 0) {
      metadata.push(`Aliases: ${helpData.aliases.join(', ')}`)
    }
    
    if (metadata.length > 0) {
      output.push(chalk.dim(metadata.join(' | ')))
      output.push('')
    }
    
    return output.join('\n')
  }
  
  /**
   * Format header
   * @private
   */
  _formatHeader(title) {
    const width = 60
    const padding = Math.max(0, (width - title.length) / 2)
    const separator = '═'.repeat(width)
    
    return chalk.blue(separator) + '\n' +
           chalk.blue('║') + ' '.repeat(Math.floor(padding)) + chalk.bold.white(title) + 
           ' '.repeat(Math.ceil(padding)) + chalk.blue('║') + '\n' +
           chalk.blue(separator)
  }
  
  /**
   * Show command categories
   * @private
   */
  _showCommandCategories() {
    if (!this.commandRegistry) return
    
    const categories = this.commandRegistry.listCategories()
      .sort((a, b) => (this.helpStructure[a.name]?.priority || 999) - (this.helpStructure[b.name]?.priority || 999))
    
    console.log(chalk.cyan('COMMAND CATEGORIES:'))
    
    categories.forEach(category => {
      const structure = this.helpStructure[category.name] || {}
      const title = structure.title || category.displayName
      const description = structure.description || category.description
      
      console.log(`  ${title}`)
      console.log(`    ${chalk.dim(description)} (${category.commandCount} commands)`)
    })
    
    console.log('')
  }
  
  /**
   * Track help usage
   * @private
   */
  _trackHelpUsage(commandName) {
    const current = this.usageHistory.get(commandName) || 0
    this.usageHistory.set(commandName, current + 1)
  }
  
  /**
   * Track search query
   * @private
   */
  _trackSearchQuery(query, resultCount) {
    console.log(chalk.blue(`🔍 Search: "${query}" (${resultCount} results)`))
  }
  
  /**
   * Generate enhanced help data methods
   * @private
   */
  _generateLongDescription(commandInfo) {
    // This would be enhanced with command-specific detailed descriptions
    return commandInfo.description + '. Use --help with the command for detailed options.'
  }
  
  _getCommonOptionCombinations(commandInfo) {
    // Common option combinations based on command type
    const combinations = {
      monitor: [['interval', 'format'], ['save', 'dashboard']],
      cleanup: [['strategy', 'preview'], ['force', 'ports']],
      diagnose: [['scope', 'verbose'], ['auto-fix', 'verbose']],
      analyze: [['target', 'duration'], ['baseline', 'compare']]
    }
    
    return combinations[commandInfo.name] || []
  }
  
  _findRelatedCommands(commandInfo) {
    // Find commands in same category or with similar functionality
    if (!this.commandRegistry) return []
    
    return this.commandRegistry.listCommands(commandInfo.category)
      .filter(cmd => cmd.name !== commandInfo.name)
      .slice(0, 3)
      .map(cmd => cmd.name)
  }
  
  _getTroubleshootingTips(commandInfo) {
    // Command-specific troubleshooting tips
    const tips = {
      monitor: [
        'If monitoring seems slow, try increasing --interval value',
        'Use --format compact for better performance with large datasets'
      ],
      cleanup: [
        'Always use --preview first to see what will be cleaned',
        'Use --strategy graceful for production environments'
      ],
      diagnose: [
        'Run with --verbose for detailed diagnostic information',
        'Check system logs if diagnostics fail'
      ]
    }
    
    return tips[commandInfo.name] || []
  }
  
  _extractRequiredOptions(commandInfo) {
    if (!commandInfo.options) return []
    
    return commandInfo.options
      .filter(opt => opt.required)
      .map(opt => opt.name || opt.flag)
  }
  
  _getDeprecatedOptions(commandInfo) {
    // Deprecated option mappings
    const deprecations = {
      monitor: { 'refresh': 'interval' },
      cleanup: { 'aggressive': 'strategy' }
    }
    
    return deprecations[commandInfo.name] || {}
  }
  
  // Additional interactive methods would be implemented here...
  _showGettingStarted() {
    console.log(this._formatHeader('🚀 Getting Started with CATAMS CLI'))
    console.log('Welcome to the CATAMS CLI! Here\'s how to get started:\n')
    
    console.log(chalk.cyan('1. Check System Status:'))
    console.log('   catams status\n')
    
    console.log(chalk.cyan('2. Start Real-time Monitoring:'))
    console.log('   catams monitor --dashboard\n')
    
    console.log(chalk.cyan('3. Run System Diagnostics:'))
    console.log('   catams diagnose --scope system\n')
    
    console.log(chalk.cyan('4. Launch Interactive Dashboard:'))
    console.log('   catams dashboard\n')
    
    console.log(chalk.blue('💡 Pro tip: Most commands support --help for detailed options'))
  }
  
  _showUsageExamples() {
    console.log(this._formatHeader('🎯 Common Usage Examples'))
    
    const examples = [
      {
        category: 'Monitoring',
        commands: [
          'catams monitor --interval 2000 --format table',
          'catams status --watch',
          'catams dashboard --port 3001'
        ]
      },
      {
        category: 'Cleanup & Maintenance',
        commands: [
          'catams cleanup --strategy smart --preview',
          'catams cleanup --ports --temp',
          'catams validate --type system --fix'
        ]
      },
      {
        category: 'Diagnostics',
        commands: [
          'catams diagnose --scope all --verbose',
          'catams analyze --target memory --duration 10',
          'catams audit --standards security'
        ]
      }
    ]
    
    examples.forEach(({ category, commands }) => {
      console.log(chalk.cyan(`${category}:`))
      commands.forEach(cmd => {
        console.log(`  ${chalk.gray('$')} ${cmd}`)
      })
      console.log('')
    })
  }
  
  _showConfigurationHelp() {
    console.log(this._formatHeader('⚙️ Configuration Help'))
    console.log('CATAMS CLI supports hierarchical configuration with hot-reload capabilities.\n')
    
    console.log(chalk.cyan('Configuration Commands:'))
    console.log('  catams config get <key>              Get configuration value')
    console.log('  catams config set <key> <value>      Set configuration value')
    console.log('  catams config --validate             Validate configuration')
    console.log('  catams config --reload               Reload from file')
    console.log('')
  }
  
  _showFAQ() {
    console.log(this._formatHeader('❓ Frequently Asked Questions'))
    
    const faqs = [
      {
        q: 'How do I start monitoring?',
        a: 'Use "catams monitor" or "catams dashboard" for interactive monitoring.'
      },
      {
        q: 'What if a command is not responding?',
        a: 'Press Ctrl+C to cancel. For emergency cleanup use "catams emergency-cleanup".'
      },
      {
        q: 'How do I export monitoring data?',
        a: 'Use "catams export --type metrics --format json" to export data.'
      },
      {
        q: 'Can I run multiple CLI instances?',
        a: 'Yes, but dashboard ports must be different. Use --port option.'
      }
    ]
    
    faqs.forEach(({ q, a }) => {
      console.log(chalk.cyan(`Q: ${q}`))
      console.log(`A: ${a}\n`)
    })
  }
  
  _showCommandExamples(helpData) {
    if (!helpData.examples || helpData.examples.length === 0) {
      console.log(chalk.yellow('No examples available for this command.'))
      return
    }
    
    console.log(chalk.cyan(`Examples for ${helpData.name}:`))
    helpData.examples.forEach(example => {
      if (typeof example === 'string') {
        console.log(`  ${chalk.gray('$')} catams ${example}`)
      } else {
        console.log(`  ${chalk.gray('$')} catams ${example.command}`)
        if (example.description) {
          console.log(`    ${chalk.dim(example.description)}`)
        }
      }
    })
    console.log('')
  }
  
  _showTroubleshootingTips(helpData) {
    if (!helpData.troubleshooting || helpData.troubleshooting.length === 0) {
      console.log(chalk.yellow('No troubleshooting tips available for this command.'))
      return
    }
    
    console.log(chalk.cyan(`Troubleshooting tips for ${helpData.name}:`))
    helpData.troubleshooting.forEach((tip, index) => {
      console.log(`  ${index + 1}. ${tip}`)
    })
    console.log('')
  }
  
  _showRelatedCommands(helpData) {
    if (!helpData.relatedCommands || helpData.relatedCommands.length === 0) {
      console.log(chalk.yellow('No related commands found.'))
      return
    }
    
    console.log(chalk.cyan(`Commands related to ${helpData.name}:`))
    helpData.relatedCommands.forEach(cmd => {
      const cmdHelp = this.helpDatabase.get(cmd)
      const description = cmdHelp ? cmdHelp.description : 'No description'
      console.log(`  ${chalk.yellow(cmd)} - ${description}`)
    })
    console.log('')
  }
}

module.exports = EnterpriseHelpSystem