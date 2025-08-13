/**
 * Dashboard Commands - Interactive UI and Dashboard Management
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const chalk = require('chalk')

class DashboardCommands {
  constructor(cliCore) {
    this.cliCore = cliCore
    this.commands = {}
  }
  
  async initialize() {
    this.commands = {
      dashboard: {
        description: 'Launch interactive dashboard with real-time monitoring',
        usage: 'catams dashboard [options]',
        aliases: ['dash', 'ui'],
        options: [
          { name: '--port <port>', description: 'Dashboard port (default: 3001)' },
          { name: '--host <host>', description: 'Dashboard host (default: localhost)' },
          { name: '--no-browser', description: 'Don\'t open browser automatically' }
        ],
        execute: async (options = {}) => {
          const port = options.port || 3001
          const host = options.host || 'localhost'
          
          try {
            console.log(chalk.blue('🚀 Launching interactive dashboard...'))
            
            const dashboard = await this.cliCore.launchDashboard({
              port,
              host,
              openBrowser: !options.noBrowser
            })
            
            console.log(chalk.green('📊 Dashboard launched successfully'))
            console.log(chalk.blue(`🌐 Access at: http://${host}:${port}`))
            
            // Keep the process running
            await new Promise(() => {}) // Run indefinitely
            
            return { success: true, port, host }
            
          } catch (error) {
            console.error(chalk.red('❌ Failed to launch dashboard:'), error.message)
            throw error
          }
        }
      }
    }
  }
  
  getCommands() {
    return this.commands
  }
}

module.exports = DashboardCommands