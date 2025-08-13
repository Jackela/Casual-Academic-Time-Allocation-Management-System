#!/usr/bin/env node
/**
 * CATAMS CLI - Revolutionary Command Line Interface
 * 
 * Enterprise-grade CLI with real-time monitoring, interactive dashboards,
 * and comprehensive system management capabilities.
 * 
 * Features:
 * - Real-time process monitoring with live updates
 * - Interactive dashboard mode with WebSocket integration
 * - Comprehensive help system with command completion
 * - Colored terminal output with progress visualization
 * - Multi-format export (JSON/CSV/HTML) capabilities
 * - Configuration hot-reload with schema validation
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const path = require('path')
const { Command } = require('commander')
const chalk = require('chalk')
const inquirer = require('inquirer')
const ora = require('ora')
const boxen = require('boxen')

// Import CLI components
const CLICore = require('./src/cli/core/CLICore')
const InteractiveDashboard = require('./src/cli/dashboard/InteractiveDashboard')
const CommandRegistry = require('./src/cli/core/CommandRegistry')
const ConfigManager = require('./src/cli/config/CLIConfigManager')
const ExportManager = require('./src/cli/export/ExportManager')
const HelpSystem = require('./src/cli/help/EnterpriseHelpSystem')
const ProgressManager = require('./src/cli/ui/ProgressManager')

// Package information
const packageInfo = require('./package.json')

// Global CLI instance
let cliCore = null

/**
 * Initialize CLI Core
 */
async function initializeCLI() {
  if (cliCore) return cliCore

  try {
    const spinner = ora('Initializing CATAMS CLI...').start()
    
    // Initialize configuration
    const configManager = new ConfigManager()
    await configManager.initialize()
    
    // Initialize CLI core with all components
    cliCore = new CLICore({
      configManager,
      version: packageInfo.version,
      enableColors: true,
      enableProgress: true,
      enableHotReload: true
    })
    
    await cliCore.initialize()
    
    spinner.succeed('CLI initialized successfully')
    return cliCore
  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize CLI:'), error.message)
    process.exit(1)
  }
}

/**
 * Create main CLI program
 */
function createProgram() {
  const program = new Command()
  
  program
    .name('catams')
    .description('CATAMS - Casual Academic Time Allocation Management System CLI')
    .version(packageInfo.version, '-v, --version', 'display version number')
    .option('-c, --config <path>', 'configuration file path')
    .option('--no-color', 'disable colored output')
    .option('--quiet', 'suppress non-essential output')
    .option('--verbose', 'enable verbose output')
    .option('--debug', 'enable debug mode')
    .hook('preAction', async (thisCommand) => {
      // Initialize CLI before any command execution
      if (!cliCore) {
        await initializeCLI()
        
        // Apply global options
        const opts = thisCommand.opts()
        if (opts.noColor) cliCore.setColorMode(false)
        if (opts.quiet) cliCore.setVerbosity('quiet')
        if (opts.verbose) cliCore.setVerbosity('verbose')
        if (opts.debug) cliCore.setVerbosity('debug')
        if (opts.config) await cliCore.loadConfig(opts.config)
      }
    })
  
  return program
}

/**
 * Register all CLI commands
 */
function registerCommands(program) {
  // CORE OPERATIONS COMMANDS
  program
    .command('monitor')
    .description('Real-time process monitoring with live updates')
    .option('-i, --interval <ms>', 'update interval in milliseconds', '1000')
    .option('-f, --format <type>', 'output format (table|json|compact)', 'table')
    .option('-s, --save <file>', 'save monitoring data to file')
    .option('-d, --dashboard', 'launch interactive dashboard')
    .action(async (options) => {
      await cliCore.executeCommand('monitor', options)
    })

  program
    .command('cleanup')
    .description('Intelligent cleanup operations with progress tracking')
    .option('-s, --strategy <type>', 'cleanup strategy (graceful|smart|aggressive)', 'smart')
    .option('-f, --force', 'force cleanup without confirmation')
    .option('-p, --preview', 'preview cleanup actions without executing')
    .option('--ports', 'cleanup orphaned ports')
    .option('--processes', 'cleanup orphaned processes')
    .option('--temp', 'cleanup temporary files')
    .action(async (options) => {
      await cliCore.executeCommand('cleanup', options)
    })

  program
    .command('validate')
    .description('System state validation with comprehensive reporting')
    .option('-t, --type <type>', 'validation type (system|performance|security|all)', 'all')
    .option('-r, --report <format>', 'report format (console|json|html)', 'console')
    .option('-o, --output <file>', 'output report to file')
    .option('--fix', 'attempt to fix discovered issues')
    .action(async (options) => {
      await cliCore.executeCommand('validate', options)
    })

  program
    .command('report')
    .description('Multi-format reporting with export capabilities')
    .option('-t, --type <type>', 'report type (status|performance|audit|all)', 'status')
    .option('-f, --format <format>', 'output format (json|csv|html|pdf)', 'json')
    .option('-o, --output <file>', 'output file path')
    .option('-p, --period <period>', 'time period (1h|1d|1w|1m)', '1h')
    .option('--template <name>', 'report template name')
    .action(async (options) => {
      await cliCore.executeCommand('report', options)
    })

  // DIAGNOSTICS COMMANDS
  program
    .command('diagnose')
    .description('AI-powered problem detection with solution recommendations')
    .option('-s, --scope <scope>', 'diagnostic scope (system|process|network|all)', 'all')
    .option('-a, --auto-fix', 'automatically apply recommended fixes')
    .option('-v, --verbose', 'verbose diagnostic output')
    .action(async (options) => {
      await cliCore.executeCommand('diagnose', options)
    })

  program
    .command('analyze')
    .description('Performance analysis tools with trend visualization')
    .option('-t, --target <target>', 'analysis target (cpu|memory|disk|network|all)', 'all')
    .option('-d, --duration <minutes>', 'analysis duration in minutes', '5')
    .option('--baseline', 'establish performance baseline')
    .option('--compare <file>', 'compare with previous analysis')
    .action(async (options) => {
      await cliCore.executeCommand('analyze', options)
    })

  program
    .command('audit')
    .description('Complete system audit with compliance reporting')
    .option('-s, --standards <standards>', 'audit standards (security|performance|compliance)', 'security')
    .option('-r, --report <format>', 'report format (detailed|summary|json)', 'detailed')
    .option('-o, --output <file>', 'output audit report to file')
    .action(async (options) => {
      await cliCore.executeCommand('audit', options)
    })

  program
    .command('benchmark')
    .description('Performance benchmarking with historical comparison')
    .option('-t, --tests <tests>', 'benchmark tests to run (all|cpu|memory|io)', 'all')
    .option('-c, --compare <baseline>', 'compare with baseline file')
    .option('--save <file>', 'save benchmark results')
    .action(async (options) => {
      await cliCore.executeCommand('benchmark', options)
    })

  // EMERGENCY COMMANDS
  program
    .command('emergency-cleanup')
    .description('Crisis response mode with safety confirmations')
    .option('-f, --force', 'force emergency cleanup')
    .option('--confirm', 'skip confirmation prompts')
    .action(async (options) => {
      await cliCore.executeCommand('emergency-cleanup', options)
    })

  program
    .command('force-reset')
    .description('System force restart with recovery validation')
    .option('--no-backup', 'skip backup creation')
    .option('--confirm', 'confirm force reset')
    .action(async (options) => {
      await cliCore.executeCommand('force-reset', options)
    })

  program
    .command('recovery-mode')
    .description('Safe mode operations with limited functionality')
    .action(async (options) => {
      await cliCore.executeCommand('recovery-mode', options)
    })

  program
    .command('safe-mode')
    .description('Conservative operations with enhanced safety checks')
    .action(async (options) => {
      await cliCore.executeCommand('safe-mode', options)
    })

  // CONFIGURATION COMMANDS
  program
    .command('config')
    .description('Configuration management with hot-reload capabilities')
    .option('get <key>', 'get configuration value')
    .option('set <key> <value>', 'set configuration value')
    .option('--reset', 'reset configuration to defaults')
    .option('--validate', 'validate current configuration')
    .option('--reload', 'reload configuration from file')
    .action(async (key, value, options) => {
      await cliCore.executeCommand('config', { key, value, ...options })
    })

  // DASHBOARD COMMAND
  program
    .command('dashboard')
    .description('Launch interactive dashboard with real-time monitoring')
    .option('-p, --port <port>', 'dashboard port', '3001')
    .option('--host <host>', 'dashboard host', 'localhost')
    .option('--no-browser', 'don\'t open browser automatically')
    .action(async (options) => {
      await cliCore.executeCommand('dashboard', options)
    })

  // EXPORT COMMAND
  program
    .command('export')
    .description('Export system data in various formats')
    .option('-t, --type <type>', 'data type (logs|metrics|config|all)', 'all')
    .option('-f, --format <format>', 'export format (json|csv|html|xlsx)', 'json')
    .option('-o, --output <file>', 'output file path')
    .option('-p, --period <period>', 'time period (1h|1d|1w|1m)', '1d')
    .action(async (options) => {
      await cliCore.executeCommand('export', options)
    })

  // STATUS COMMAND
  program
    .command('status')
    .description('Display comprehensive system status')
    .option('-f, --format <format>', 'output format (table|json|compact)', 'table')
    .option('-w, --watch', 'watch mode with real-time updates')
    .action(async (options) => {
      await cliCore.executeCommand('status', options)
    })

  // HELP COMMAND (Enhanced)
  program
    .command('help-system')
    .description('Interactive help system with command completion')
    .option('-s, --search <query>', 'search help topics')
    .option('-i, --interactive', 'interactive help mode')
    .action(async (options) => {
      await cliCore.executeCommand('help-system', options)
    })

  return program
}

/**
 * Handle CLI errors
 */
function setupErrorHandling(program) {
  // Handle unknown commands
  program.on('command:*', (operands) => {
    console.error(chalk.red(`❌ Unknown command: ${operands[0]}`))
    console.log()
    console.log('Run', chalk.cyan('catams --help'), 'for available commands')
    process.exit(1)
  })

  // Global error handler
  process.on('uncaughtException', async (error) => {
    console.error(chalk.red('\n💥 Uncaught Exception:'))
    console.error(error.stack)
    
    if (cliCore) {
      await cliCore.emergencyShutdown()
    }
    
    process.exit(1)
  })

  process.on('unhandledRejection', async (reason, promise) => {
    console.error(chalk.red('\n💥 Unhandled Rejection:'))
    console.error(reason)
    
    if (cliCore) {
      await cliCore.emergencyShutdown()
    }
    
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down gracefully...'))
    
    if (cliCore) {
      await cliCore.gracefulShutdown()
    }
    
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n🛑 Received SIGTERM, shutting down...'))
    
    if (cliCore) {
      await cliCore.gracefulShutdown()
    }
    
    process.exit(0)
  })
}

/**
 * Display welcome banner
 */
function displayBanner() {
  const banner = boxen(
    chalk.bold.blue('CATAMS CLI v' + packageInfo.version) + '\n' +
    chalk.gray('Casual Academic Time Allocation Management System\n') +
    chalk.green('🚀 Revolutionary CLI with Real-time Monitoring'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue'
    }
  )
  
  console.log(banner)
}

/**
 * Main CLI entry point
 */
async function main() {
  try {
    // Display banner for interactive mode
    if (process.argv.length === 2) {
      displayBanner()
    }
    
    // Create and configure program
    const program = createProgram()
    registerCommands(program)
    setupErrorHandling(program)
    
    // Parse arguments
    await program.parseAsync(process.argv)
    
    // If no command specified, show help
    if (process.argv.length === 2) {
      program.help()
    }
    
  } catch (error) {
    console.error(chalk.red('❌ CLI Error:'), error.message)
    
    if (process.argv.includes('--debug')) {
      console.error(error.stack)
    }
    
    process.exit(1)
  }
}

// Run CLI if called directly
if (require.main === module) {
  main()
}

module.exports = {
  main,
  createProgram,
  initializeCLI
}