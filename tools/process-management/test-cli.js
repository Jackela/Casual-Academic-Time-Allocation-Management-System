#!/usr/bin/env node
/**
 * CLI Testing Script - Comprehensive CLI Validation
 * 
 * Tests all CLI functionality including:
 * - Command execution and validation
 * - Interactive features and error handling
 * - Performance and responsiveness
 * - Cross-platform compatibility
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const chalk = require('chalk')
const { performance } = require('perf_hooks')

// Import CLI components
const CLICore = require('./src/cli/core/CLICore')
const CLIConfigManager = require('./src/cli/config/CLIConfigManager')
const ProgressManager = require('./src/cli/ui/ProgressManager')

/**
 * CLI Test Suite
 */
class CLITestSuite {
  constructor() {
    this.testResults = []
    this.totalTests = 0
    this.passedTests = 0
    this.failedTests = 0
    
    this.performanceTargets = {
      initializationTime: 5000, // 5 seconds
      commandResponseTime: 2000, // 2 seconds
      memoryUsageLimit: 100 * 1024 * 1024 // 100MB
    }
  }
  
  /**
   * Run all tests
   */
  async runAllTests() {
    console.log(chalk.bold.blue('🧪 CATAMS CLI Test Suite'))
    console.log(chalk.gray('Testing comprehensive CLI functionality\n'))
    
    const startTime = performance.now()
    
    try {
      // Core functionality tests
      await this._testCLIInitialization()
      await this._testCommandRegistry()
      await this._testConfigurationManager()
      await this._testProgressManager()
      
      // Command execution tests
      await this._testCoreCommands()
      await this._testDiagnosticCommands()
      await this._testEmergencyCommands()
      
      // Integration tests
      await this._testHelpSystem()
      await this._testExportFunctionality()
      await this._testValidationEngine()
      
      // Performance tests
      await this._testPerformance()
      
      // Cross-platform tests
      await this._testCrossPlatformCompatibility()
      
    } catch (error) {
      this._logError('Test suite execution failed', error)
    }
    
    const totalTime = performance.now() - startTime
    this._displayTestResults(totalTime)
  }
  
  /**
   * Test CLI Core initialization
   */
  async _testCLIInitialization() {
    await this._runTest('CLI Core Initialization', async () => {
      const startTime = performance.now()
      
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      const initTime = performance.now() - startTime
      
      if (initTime > this.performanceTargets.initializationTime) {
        throw new Error(`Initialization too slow: ${initTime}ms > ${this.performanceTargets.initializationTime}ms`)
      }
      
      if (!cliCore.isInitialized) {
        throw new Error('CLI Core not properly initialized')
      }
      
      await cliCore.gracefulShutdown()
      
      return { initializationTime: initTime }
    })
  }
  
  /**
   * Test Command Registry functionality
   */
  async _testCommandRegistry() {
    await this._runTest('Command Registry', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      const registry = cliCore.commandRegistry
      
      // Test command registration
      const commands = registry.listCommands()
      if (commands.length === 0) {
        throw new Error('No commands registered')
      }
      
      // Test command search
      const searchResults = registry.searchCommands('monitor')
      if (searchResults.length === 0) {
        throw new Error('Command search not working')
      }
      
      // Test command categories
      const categories = registry.listCategories()
      if (categories.length === 0) {
        throw new Error('No command categories found')
      }
      
      await cliCore.gracefulShutdown()
      
      return { 
        totalCommands: commands.length,
        categories: categories.length,
        searchResults: searchResults.length
      }
    })
  }
  
  /**
   * Test Configuration Manager
   */
  async _testConfigurationManager() {
    await this._runTest('Configuration Manager', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      // Test configuration access
      const theme = configManager.get('cli.theme')
      if (!theme) {
        throw new Error('Configuration access failed')
      }
      
      // Test configuration modification
      configManager.set('cli.theme', 'minimal')
      const newTheme = configManager.get('cli.theme')
      if (newTheme !== 'minimal') {
        throw new Error('Configuration modification failed')
      }
      
      // Test validation
      const validation = await configManager.validateConfiguration()
      if (!validation.valid && validation.errors.length > 0) {
        console.warn('Configuration validation warnings:', validation.errors)
      }
      
      await configManager.cleanup()
      
      return { theme: newTheme, validation: validation.valid }
    })
  }
  
  /**
   * Test Progress Manager UI components
   */
  async _testProgressManager() {
    await this._runTest('Progress Manager', async () => {
      const progressManager = new ProgressManager({ enableColors: false })
      
      // Test progress bar creation
      const progressBar = progressManager.createProgressBar('test', { 
        format: '{bar} {percentage}%' 
      })
      
      progressBar.start(100, 0)
      progressBar.update(50)
      progressBar.stop()
      
      // Test spinner creation
      const spinner = progressManager.createSpinner('test-spinner', {
        text: 'Testing spinner...'
      })
      
      spinner.start()
      await new Promise(resolve => setTimeout(resolve, 100))
      spinner.succeed('Spinner test completed')
      
      // Test counter
      const counter = progressManager.createCounter('test-counter', {
        label: 'Test Counter',
        startValue: 0
      })
      
      counter.increment(5)
      counter.stop()
      
      // Cleanup
      progressManager.cleanup()
      
      return { success: true }
    })
  }
  
  /**
   * Test Core Commands
   */
  async _testCoreCommands() {
    await this._runTest('Core Commands Execution', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      const results = {}
      
      // Test status command
      const statusResult = await cliCore.executeCommand('status', { format: 'json' })
      if (!statusResult.success) {
        throw new Error('Status command failed')
      }
      results.status = statusResult
      
      // Test validation command
      const validateResult = await cliCore.executeCommand('validate', { type: 'system' })
      if (!validateResult.success) {
        throw new Error('Validate command failed')
      }
      results.validate = validateResult
      
      // Test config command
      const configResult = await cliCore.executeCommand('config', { validate: true })
      if (!configResult.success) {
        throw new Error('Config command failed')
      }
      results.config = configResult
      
      await cliCore.gracefulShutdown()
      
      return results
    })
  }
  
  /**
   * Test Diagnostic Commands
   */
  async _testDiagnosticCommands() {
    await this._runTest('Diagnostic Commands', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      // Test diagnose command
      const diagnoseResult = await cliCore.executeCommand('diagnose', { scope: 'system' })
      if (!diagnoseResult.success) {
        throw new Error('Diagnose command failed')
      }
      
      // Test analyze command
      const analyzeResult = await cliCore.executeCommand('analyze', { target: 'all' })
      if (!analyzeResult.success) {
        throw new Error('Analyze command failed')
      }
      
      await cliCore.gracefulShutdown()
      
      return { diagnose: diagnoseResult, analyze: analyzeResult }
    })
  }
  
  /**
   * Test Emergency Commands
   */
  async _testEmergencyCommands() {
    await this._runTest('Emergency Commands', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      // Test safe-mode command
      const safeModeResult = await cliCore.executeCommand('safe-mode')
      if (!safeModeResult.success) {
        throw new Error('Safe mode command failed')
      }
      
      // Test recovery-mode command
      const recoveryResult = await cliCore.executeCommand('recovery-mode')
      if (!recoveryResult.success) {
        throw new Error('Recovery mode command failed')
      }
      
      await cliCore.gracefulShutdown()
      
      return { safeMode: safeModeResult, recovery: recoveryResult }
    })
  }
  
  /**
   * Test Help System
   */
  async _testHelpSystem() {
    await this._runTest('Enterprise Help System', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      const helpSystem = cliCore.helpSystem
      
      // Test command help retrieval
      const commandHelp = helpSystem.getCommandHelp('monitor')
      if (!commandHelp) {
        throw new Error('Command help retrieval failed')
      }
      
      // Test search functionality
      const searchResults = helpSystem.searchHelp('monitor')
      if (searchResults.length === 0) {
        throw new Error('Help search failed')
      }
      
      // Test command completions
      const completions = helpSystem.getCompletions('mon')
      if (completions.length === 0) {
        throw new Error('Command completion failed')
      }
      
      await cliCore.gracefulShutdown()
      
      return {
        helpAvailable: !!commandHelp,
        searchResults: searchResults.length,
        completions: completions.length
      }
    })
  }
  
  /**
   * Test Export Functionality
   */
  async _testExportFunctionality() {
    await this._runTest('Export Functionality', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      // Test JSON export
      const jsonResult = await cliCore.executeCommand('export', { 
        type: 'metrics', 
        format: 'json' 
      })
      if (!jsonResult.success) {
        throw new Error('JSON export failed')
      }
      
      // Test CSV export
      const csvResult = await cliCore.executeCommand('export', { 
        type: 'metrics', 
        format: 'csv' 
      })
      if (!csvResult.success) {
        throw new Error('CSV export failed')
      }
      
      await cliCore.gracefulShutdown()
      
      return { json: jsonResult, csv: csvResult }
    })
  }
  
  /**
   * Test Validation Engine
   */
  async _testValidationEngine() {
    await this._runTest('Validation Engine', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      const validationEngine = cliCore.validationEngine
      
      // Test valid command validation
      const validResult = await validationEngine.validateCommand('monitor', { 
        interval: 1000, 
        format: 'table' 
      })
      if (!validResult.valid) {
        throw new Error('Valid command validation failed')
      }
      
      // Test invalid command validation
      const invalidResult = await validationEngine.validateCommand('monitor', { 
        interval: 50, // Too low
        format: 'invalid' 
      })
      if (invalidResult.valid) {
        throw new Error('Invalid command validation should have failed')
      }
      
      await cliCore.gracefulShutdown()
      
      return { valid: validResult.valid, invalid: !invalidResult.valid }
    })
  }
  
  /**
   * Test Performance
   */
  async _testPerformance() {
    await this._runTest('Performance Validation', async () => {
      const configManager = new CLIConfigManager()
      await configManager.initialize()
      
      const cliCore = new CLICore({ configManager })
      await cliCore.initialize()
      
      const results = {}
      
      // Test command response time
      const startTime = performance.now()
      await cliCore.executeCommand('status')
      const responseTime = performance.now() - startTime
      
      if (responseTime > this.performanceTargets.commandResponseTime) {
        throw new Error(`Command response too slow: ${responseTime}ms`)
      }
      
      results.responseTime = responseTime
      
      // Test memory usage
      const memUsage = process.memoryUsage()
      if (memUsage.heapUsed > this.performanceTargets.memoryUsageLimit) {
        console.warn(`High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)
      }
      
      results.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024)
      
      // Test concurrent command execution
      const concurrentStart = performance.now()
      await Promise.all([
        cliCore.executeCommand('status'),
        cliCore.executeCommand('validate', { type: 'system' }),
        cliCore.executeCommand('config', { validate: true })
      ])
      const concurrentTime = performance.now() - concurrentStart
      
      results.concurrentTime = concurrentTime
      
      await cliCore.gracefulShutdown()
      
      return results
    })
  }
  
  /**
   * Test Cross-platform Compatibility
   */
  async _testCrossPlatformCompatibility() {
    await this._runTest('Cross-platform Compatibility', async () => {
      const platform = process.platform
      const arch = process.arch
      const nodeVersion = process.version
      
      // Test path handling
      const path = require('path')
      const testPath = path.join('test', 'directory', 'file.txt')
      
      // Test process detection
      const currentPid = process.pid
      if (!currentPid || currentPid <= 0) {
        throw new Error('Process ID detection failed')
      }
      
      // Test environment variables
      const envTest = process.env.NODE_ENV !== undefined
      
      return {
        platform,
        architecture: arch,
        nodeVersion,
        pathHandling: testPath.includes(path.sep),
        processDetection: currentPid > 0,
        environmentAccess: envTest
      }
    })
  }
  
  /**
   * Run individual test
   * @private
   */
  async _runTest(testName, testFunction) {
    this.totalTests++
    
    const startTime = performance.now()
    
    try {
      console.log(chalk.blue(`🧪 Running: ${testName}`))
      
      const result = await testFunction()
      const duration = performance.now() - startTime
      
      this.passedTests++
      this.testResults.push({
        name: testName,
        status: 'passed',
        duration: duration.toFixed(2),
        result
      })
      
      console.log(chalk.green(`✅ ${testName} - PASSED (${duration.toFixed(2)}ms)`))
      
    } catch (error) {
      const duration = performance.now() - startTime
      
      this.failedTests++
      this.testResults.push({
        name: testName,
        status: 'failed',
        duration: duration.toFixed(2),
        error: error.message
      })
      
      console.log(chalk.red(`❌ ${testName} - FAILED (${duration.toFixed(2)}ms)`))
      console.log(chalk.red(`   Error: ${error.message}`))
    }
  }
  
  /**
   * Display test results
   * @private
   */
  _displayTestResults(totalTime) {
    console.log('\n' + chalk.bold.blue('📊 Test Results Summary'))
    console.log(chalk.gray('='.repeat(50)))
    
    console.log(`${chalk.cyan('Total Tests:')} ${this.totalTests}`)
    console.log(`${chalk.green('Passed:')} ${this.passedTests}`)
    console.log(`${chalk.red('Failed:')} ${this.failedTests}`)
    console.log(`${chalk.yellow('Success Rate:')} ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`)
    console.log(`${chalk.blue('Total Time:')} ${totalTime.toFixed(2)}ms`)
    
    console.log('\n' + chalk.cyan('Test Details:'))
    this.testResults.forEach(test => {
      const status = test.status === 'passed' ? chalk.green('✅') : chalk.red('❌')
      console.log(`  ${status} ${test.name} (${test.duration}ms)`)
      
      if (test.error) {
        console.log(chalk.red(`    Error: ${test.error}`))
      }
    })
    
    // Performance summary
    const performanceTests = this.testResults.filter(t => t.result && typeof t.result === 'object')
    if (performanceTests.length > 0) {
      console.log('\n' + chalk.cyan('Performance Metrics:'))
      performanceTests.forEach(test => {
        if (test.result.responseTime) {
          console.log(`  Response Time: ${test.result.responseTime.toFixed(2)}ms`)
        }
        if (test.result.memoryUsage) {
          console.log(`  Memory Usage: ${test.result.memoryUsage}MB`)
        }
        if (test.result.initializationTime) {
          console.log(`  Initialization: ${test.result.initializationTime.toFixed(2)}ms`)
        }
      })
    }
    
    if (this.failedTests === 0) {
      console.log('\n' + chalk.bold.green('🎉 All tests passed! CLI is ready for production.'))
    } else {
      console.log('\n' + chalk.bold.yellow(`⚠️ ${this.failedTests} test(s) failed. Please review and fix issues.`))
    }
  }
  
  /**
   * Log error
   * @private
   */
  _logError(message, error) {
    console.error(chalk.red(`❌ ${message}:`), error.message)
    if (error.stack) {
      console.error(chalk.gray(error.stack))
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new CLITestSuite()
  testSuite.runAllTests()
    .then(() => {
      process.exit(testSuite.failedTests > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error(chalk.red('💥 Test suite crashed:'), error.message)
      process.exit(1)
    })
}

module.exports = CLITestSuite