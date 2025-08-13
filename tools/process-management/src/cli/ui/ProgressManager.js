/**
 * Progress Manager - Advanced UI Components
 * 
 * Features:
 * - Multi-style progress bars with animations
 * - Status indicators with color coding
 * - Real-time performance metrics display
 * - Customizable themes and layouts
 * - Terminal-aware responsive design
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const chalk = require('chalk')
const ora = require('ora')
const cliProgress = require('cli-progress')
const boxen = require('boxen')
const figlet = require('figlet')
const gradient = require('gradient-string')

/**
 * Progress Manager
 */
class ProgressManager {
  constructor(config = {}) {
    this.config = {
      enableColors: config.enableColors !== false,
      enableAnimations: config.enableAnimations !== false,
      enableGradients: config.enableGradients !== false,
      theme: config.theme || 'modern',
      updateInterval: config.updateInterval || 100,
      ...config
    }
    
    // Active progress bars and spinners
    this.activeProgressBars = new Map()
    this.activeSpinners = new Map()
    this.activeCounters = new Map()
    
    // Theme configurations
    this.themes = {
      classic: {
        progressBar: {
          format: '{bar} | {percentage}% | {value}/{total} | ETA: {eta}s',
          barCompleteChar: '█',
          barIncompleteChar: '░',
          hideCursor: true
        },
        colors: {
          success: 'green',
          warning: 'yellow',
          error: 'red',
          info: 'blue',
          progress: 'cyan'
        }
      },
      modern: {
        progressBar: {
          format: '▐{bar}▌ {percentage}% | {value}/{total} | {duration_formatted} | ETA: {eta_formatted}',
          barCompleteChar: '▰',
          barIncompleteChar: '▱',
          hideCursor: true,
          barsize: 30,
          align: 'left'
        },
        colors: {
          success: 'greenBright',
          warning: 'yellowBright',
          error: 'redBright',
          info: 'blueBright',
          progress: 'cyanBright'
        }
      },
      minimal: {
        progressBar: {
          format: '{bar} {percentage}%',
          barCompleteChar: '■',
          barIncompleteChar: '□',
          hideCursor: true,
          barsize: 20
        },
        colors: {
          success: 'green',
          warning: 'yellow',
          error: 'red',
          info: 'blue',
          progress: 'white'
        }
      }
    }
    
    // Status symbols
    this.symbols = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳',
      progress: '🔄',
      completed: '🎉',
      stopped: '🛑',
      paused: '⏸️',
      bullet: '•',
      arrow: '→',
      check: '✓',
      cross: '✗'
    }
    
    // Performance tracking
    this.performanceMetrics = {
      renderTime: [],
      updateCount: 0,
      lastUpdate: Date.now()
    }
  }
  
  /**
   * Create a new progress bar
   */
  createProgressBar(id, options = {}) {
    const theme = this.themes[this.config.theme] || this.themes.modern
    
    const progressBar = new cliProgress.SingleBar({
      ...theme.progressBar,
      ...options,
      formatBar: this.config.enableColors ? this._formatProgressBar.bind(this) : undefined
    }, cliProgress.Presets.shades_classic)
    
    this.activeProgressBars.set(id, {
      bar: progressBar,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      options
    })
    
    return {
      start: (total, startValue = 0, payload = {}) => {
        progressBar.start(total, startValue, payload)
      },
      update: (value, payload = {}) => {
        this._updatePerformanceMetrics()
        progressBar.update(value, payload)
      },
      increment: (delta = 1, payload = {}) => {
        this._updatePerformanceMetrics()
        progressBar.increment(delta, payload)
      },
      stop: () => {
        progressBar.stop()
        this.activeProgressBars.delete(id)
      },
      getMetrics: () => this._getProgressMetrics(id)
    }
  }
  
  /**
   * Create a multi-progress bar container
   */
  createMultiProgress(id, options = {}) {
    const multibar = new cliProgress.MultiBar({
      clearOnComplete: options.clearOnComplete || false,
      hideCursor: true,
      format: options.format || '▐{bar}▌ {name} | {percentage}% | {value}/{total} | ETA: {eta_formatted}',
      ...options
    }, cliProgress.Presets.shades_grey)
    
    this.activeProgressBars.set(id, {
      multibar,
      bars: new Map(),
      startTime: Date.now(),
      options
    })
    
    return {
      create: (barId, total, startValue = 0, payload = {}) => {
        const bar = multibar.create(total, startValue, payload)
        this.activeProgressBars.get(id).bars.set(barId, bar)
        return bar
      },
      remove: (barId) => {
        const bars = this.activeProgressBars.get(id).bars
        const bar = bars.get(barId)
        if (bar) {
          multibar.remove(bar)
          bars.delete(barId)
        }
      },
      stop: () => {
        multibar.stop()
        this.activeProgressBars.delete(id)
      },
      getMetrics: () => this._getMultiProgressMetrics(id)
    }
  }
  
  /**
   * Create a spinner with status text
   */
  createSpinner(id, options = {}) {
    const spinnerOptions = {
      text: options.text || 'Loading...',
      color: options.color || this._getThemeColor('progress'),
      spinner: options.spinner || 'dots12',
      prefixText: options.prefixText || '',
      ...options
    }
    
    const spinner = ora(spinnerOptions)
    
    this.activeSpinners.set(id, {
      spinner,
      startTime: Date.now(),
      options: spinnerOptions
    })
    
    return {
      start: (text) => {
        if (text) spinner.text = text
        spinner.start()
      },
      succeed: (text) => {
        if (text) spinner.text = text
        spinner.succeed()
        this.activeSpinners.delete(id)
      },
      fail: (text) => {
        if (text) spinner.text = text
        spinner.fail()
        this.activeSpinners.delete(id)
      },
      warn: (text) => {
        if (text) spinner.text = text
        spinner.warn()
        this.activeSpinners.delete(id)
      },
      info: (text) => {
        if (text) spinner.text = text
        spinner.info()
        this.activeSpinners.delete(id)
      },
      stop: () => {
        spinner.stop()
        this.activeSpinners.delete(id)
      },
      update: (text, options = {}) => {
        if (text) spinner.text = text
        if (options.color) spinner.color = options.color
        if (options.spinner) spinner.spinner = options.spinner
      },
      getMetrics: () => this._getSpinnerMetrics(id)
    }
  }
  
  /**
   * Create a real-time counter display
   */
  createCounter(id, options = {}) {
    const counter = {
      value: options.startValue || 0,
      label: options.label || 'Count',
      format: options.format || '{label}: {value}',
      color: options.color || 'cyan',
      updateInterval: options.updateInterval || 1000,
      autoUpdate: options.autoUpdate || false,
      timer: null,
      display: () => {
        const formatted = counter.format
          .replace('{label}', counter.label)
          .replace('{value}', counter.value.toLocaleString())
        
        if (this.config.enableColors) {
          console.log(chalk[counter.color](formatted))
        } else {
          console.log(formatted)
        }
      }
    }
    
    this.activeCounters.set(id, counter)
    
    if (counter.autoUpdate) {
      counter.timer = setInterval(() => {
        counter.display()
      }, counter.updateInterval)
    }
    
    return {
      increment: (delta = 1) => {
        counter.value += delta
        if (!counter.autoUpdate) counter.display()
      },
      decrement: (delta = 1) => {
        counter.value = Math.max(0, counter.value - delta)
        if (!counter.autoUpdate) counter.display()
      },
      set: (value) => {
        counter.value = value
        if (!counter.autoUpdate) counter.display()
      },
      get: () => counter.value,
      display: counter.display,
      stop: () => {
        if (counter.timer) {
          clearInterval(counter.timer)
          counter.timer = null
        }
        this.activeCounters.delete(id)
      }
    }
  }
  
  /**
   * Display status message with icon and styling
   */
  showStatus(message, type = 'info', options = {}) {
    const symbol = this.symbols[type] || this.symbols.info
    const color = this._getThemeColor(type)
    const timestamp = options.timestamp ? `[${new Date().toLocaleTimeString()}] ` : ''
    
    let output = `${timestamp}${symbol} ${message}`
    
    if (this.config.enableColors) {
      output = chalk[color](output)
    }
    
    if (options.box) {
      output = boxen(output, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: color
      })
    }
    
    console.log(output)
    
    if (options.duration) {
      setTimeout(() => {
        console.log('\x1b[1A\x1b[2K') // Clear the line
      }, options.duration)
    }
  }
  
  /**
   * Display a formatted table
   */
  showTable(data, options = {}) {
    if (!Array.isArray(data) || data.length === 0) {
      this.showStatus('No data to display', 'warning')
      return
    }
    
    const headers = options.headers || Object.keys(data[0])
    const columnWidths = this._calculateColumnWidths(data, headers)
    
    // Header row
    const headerRow = headers.map((header, index) => 
      this._padString(header.toUpperCase(), columnWidths[index])
    ).join(' │ ')
    
    console.log(chalk.bold.cyan(`┌${'─'.repeat(headerRow.length - 2)}┐`))
    console.log(chalk.bold.cyan(`│${headerRow}│`))
    console.log(chalk.cyan(`├${'─'.repeat(headerRow.length - 2)}┤`))
    
    // Data rows
    data.forEach((row, rowIndex) => {
      const formattedRow = headers.map((header, colIndex) => {
        const value = this._formatCellValue(row[header], options.formatters?.[header])
        return this._padString(value, columnWidths[colIndex])
      }).join(' │ ')
      
      const color = rowIndex % 2 === 0 ? 'white' : 'gray'
      console.log(chalk[color](`│${formattedRow}│`))
    })
    
    console.log(chalk.cyan(`└${'─'.repeat(headerRow.length - 2)}┘`))
  }
  
  /**
   * Display system metrics in a dashboard format
   */
  showMetricsDashboard(metrics, options = {}) {
    const title = options.title || 'System Metrics'
    const width = options.width || 80
    
    // Title with gradient effect
    let titleDisplay = title
    if (this.config.enableGradients && this.config.enableColors) {
      titleDisplay = gradient.rainbow(figlet.textSync(title, { font: 'Small' }))
    } else if (this.config.enableColors) {
      titleDisplay = chalk.bold.blue(title)
    }
    
    console.log(boxen(titleDisplay, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue',
      align: 'center'
    }))
    
    // Metrics grid
    const metricsPerRow = options.metricsPerRow || 3
    const metricsArray = Object.entries(metrics)
    
    for (let i = 0; i < metricsArray.length; i += metricsPerRow) {
      const row = metricsArray.slice(i, i + metricsPerRow)
      const formattedRow = row.map(([key, value]) => {
        const formattedValue = this._formatMetricValue(value)
        return this._formatMetricBox(key, formattedValue)
      })
      
      console.log(formattedRow.join('  '))
    }
    
    // Performance indicators
    if (options.showPerformance && this.performanceMetrics.renderTime.length > 0) {
      const avgRenderTime = this.performanceMetrics.renderTime
        .reduce((sum, time) => sum + time, 0) / this.performanceMetrics.renderTime.length
      
      console.log(chalk.dim(`\nRender performance: ${avgRenderTime.toFixed(2)}ms avg | ${this.performanceMetrics.updateCount} updates`))
    }
  }
  
  /**
   * Create an interactive progress tracker for multiple operations
   */
  createOperationTracker(id, operations, options = {}) {
    const tracker = {
      operations: new Map(),
      totalOperations: operations.length,
      completedOperations: 0,
      startTime: Date.now(),
      options
    }
    
    // Initialize operations
    operations.forEach((op, index) => {
      tracker.operations.set(op.id || index, {
        name: op.name || `Operation ${index + 1}`,
        status: 'pending',
        progress: 0,
        startTime: null,
        endTime: null,
        error: null,
        ...op
      })
    })
    
    this.activeProgressBars.set(id, tracker)
    
    return {
      start: (operationId) => {
        const operation = tracker.operations.get(operationId)
        if (operation) {
          operation.status = 'running'
          operation.startTime = Date.now()
          this._renderOperationTracker(id)
        }
      },
      
      update: (operationId, progress, message) => {
        const operation = tracker.operations.get(operationId)
        if (operation) {
          operation.progress = Math.min(100, Math.max(0, progress))
          if (message) operation.message = message
          this._renderOperationTracker(id)
        }
      },
      
      complete: (operationId, message) => {
        const operation = tracker.operations.get(operationId)
        if (operation && operation.status !== 'completed') {
          operation.status = 'completed'
          operation.progress = 100
          operation.endTime = Date.now()
          if (message) operation.message = message
          tracker.completedOperations++
          this._renderOperationTracker(id)
        }
      },
      
      fail: (operationId, error) => {
        const operation = tracker.operations.get(operationId)
        if (operation) {
          operation.status = 'failed'
          operation.endTime = Date.now()
          operation.error = error
          this._renderOperationTracker(id)
        }
      },
      
      getStatus: () => ({
        completed: tracker.completedOperations,
        total: tracker.totalOperations,
        percentage: (tracker.completedOperations / tracker.totalOperations) * 100,
        elapsed: Date.now() - tracker.startTime,
        operations: Array.from(tracker.operations.values())
      }),
      
      stop: () => {
        this.activeProgressBars.delete(id)
      }
    }
  }
  
  /**
   * Clean up all active UI components
   */
  cleanup() {
    // Stop all progress bars
    this.activeProgressBars.forEach((progressData, id) => {
      try {
        if (progressData.bar && typeof progressData.bar.stop === 'function') {
          progressData.bar.stop()
        } else if (progressData.multibar && typeof progressData.multibar.stop === 'function') {
          progressData.multibar.stop()
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })
    this.activeProgressBars.clear()
    
    // Stop all spinners
    this.activeSpinners.forEach((spinnerData) => {
      try {
        if (spinnerData.spinner && typeof spinnerData.spinner.stop === 'function') {
          spinnerData.spinner.stop()
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    })
    this.activeSpinners.clear()
    
    // Stop all counters
    this.activeCounters.forEach((counter) => {
      if (counter.timer) {
        clearInterval(counter.timer)
      }
    })
    this.activeCounters.clear()
  }
  
  /**
   * Get UI performance metrics
   */
  getPerformanceMetrics() {
    const avgRenderTime = this.performanceMetrics.renderTime.length > 0
      ? this.performanceMetrics.renderTime.reduce((sum, time) => sum + time, 0) / this.performanceMetrics.renderTime.length
      : 0
    
    return {
      averageRenderTime: avgRenderTime,
      totalUpdates: this.performanceMetrics.updateCount,
      activeComponents: {
        progressBars: this.activeProgressBars.size,
        spinners: this.activeSpinners.size,
        counters: this.activeCounters.size
      },
      lastUpdate: this.performanceMetrics.lastUpdate,
      renderTimes: this.performanceMetrics.renderTime.slice(-10) // Last 10 render times
    }
  }
  
  // Private methods
  
  /**
   * Format progress bar with colors
   * @private
   */
  _formatProgressBar(progress, options) {
    if (!this.config.enableColors) {
      return progress
    }
    
    const theme = this.themes[this.config.theme] || this.themes.modern
    const completeColor = chalk[theme.colors.success]
    const incompleteColor = chalk.gray
    
    return completeColor(progress.substring(0, Math.round(progress.length * options.progress))) +
           incompleteColor(progress.substring(Math.round(progress.length * options.progress)))
  }
  
  /**
   * Get theme color
   * @private
   */
  _getThemeColor(type) {
    const theme = this.themes[this.config.theme] || this.themes.modern
    return theme.colors[type] || 'white'
  }
  
  /**
   * Update performance metrics
   * @private
   */
  _updatePerformanceMetrics() {
    const now = Date.now()
    const renderTime = now - this.performanceMetrics.lastUpdate
    
    this.performanceMetrics.renderTime.push(renderTime)
    if (this.performanceMetrics.renderTime.length > 100) {
      this.performanceMetrics.renderTime.shift()
    }
    
    this.performanceMetrics.updateCount++
    this.performanceMetrics.lastUpdate = now
  }
  
  /**
   * Calculate column widths for table display
   * @private
   */
  _calculateColumnWidths(data, headers) {
    const widths = headers.map(header => header.length)
    
    data.forEach(row => {
      headers.forEach((header, index) => {
        const value = String(row[header] || '')
        widths[index] = Math.max(widths[index], value.length)
      })
    })
    
    return widths
  }
  
  /**
   * Pad string to specified width
   * @private
   */
  _padString(str, width) {
    const strLength = String(str).length
    if (strLength >= width) return str
    return str + ' '.repeat(width - strLength)
  }
  
  /**
   * Format cell value for display
   * @private
   */
  _formatCellValue(value, formatter) {
    if (formatter && typeof formatter === 'function') {
      return formatter(value)
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗'
    }
    
    return String(value || '')
  }
  
  /**
   * Format metric value for dashboard
   * @private
   */
  _formatMetricValue(value) {
    if (typeof value === 'number') {
      if (value > 1000000) {
        return (value / 1000000).toFixed(1) + 'M'
      } else if (value > 1000) {
        return (value / 1000).toFixed(1) + 'K'
      }
      return value.toLocaleString()
    }
    
    return String(value)
  }
  
  /**
   * Format metric box for dashboard
   * @private
   */
  _formatMetricBox(label, value) {
    const content = `${label.toUpperCase()}\n${value}`
    
    if (this.config.enableColors) {
      return boxen(content, {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'blue',
        textAlignment: 'center',
        width: 20
      })
    }
    
    return boxen(content, {
      padding: 1,
      borderStyle: 'single',
      textAlignment: 'center',
      width: 20
    })
  }
  
  /**
   * Render operation tracker
   * @private
   */
  _renderOperationTracker(id) {
    const tracker = this.activeProgressBars.get(id)
    if (!tracker) return
    
    console.clear()
    console.log(chalk.bold.blue('📊 Operation Progress Tracker\n'))
    
    const operations = Array.from(tracker.operations.values())
    
    operations.forEach(operation => {
      const statusIcon = this._getOperationStatusIcon(operation.status)
      const progressBar = this._createMiniProgressBar(operation.progress)
      const elapsed = operation.startTime ? Date.now() - operation.startTime : 0
      
      console.log(`${statusIcon} ${operation.name}`)
      console.log(`   ${progressBar} ${operation.progress.toFixed(0)}% ${operation.message || ''}`)
      
      if (operation.error) {
        console.log(chalk.red(`   Error: ${operation.error}`))
      }
      
      console.log()
    })
    
    // Overall progress
    const overallProgress = (tracker.completedOperations / tracker.totalOperations) * 100
    const overallBar = this._createMiniProgressBar(overallProgress)
    console.log(chalk.bold(`Overall: ${overallBar} ${overallProgress.toFixed(0)}% (${tracker.completedOperations}/${tracker.totalOperations})`))
  }
  
  /**
   * Get operation status icon
   * @private
   */
  _getOperationStatusIcon(status) {
    const icons = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌'
    }
    
    return icons[status] || '❓'
  }
  
  /**
   * Create mini progress bar
   * @private
   */
  _createMiniProgressBar(progress) {
    const width = 20
    const filled = Math.round((progress / 100) * width)
    const empty = width - filled
    
    if (this.config.enableColors) {
      return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
    }
    
    return '█'.repeat(filled) + '░'.repeat(empty)
  }
  
  /**
   * Get progress metrics
   * @private
   */
  _getProgressMetrics(id) {
    const progressData = this.activeProgressBars.get(id)
    if (!progressData) return null
    
    return {
      id,
      startTime: progressData.startTime,
      elapsed: Date.now() - progressData.startTime,
      lastUpdate: progressData.lastUpdate
    }
  }
  
  /**
   * Get multi-progress metrics
   * @private
   */
  _getMultiProgressMetrics(id) {
    const progressData = this.activeProgressBars.get(id)
    if (!progressData) return null
    
    return {
      id,
      startTime: progressData.startTime,
      elapsed: Date.now() - progressData.startTime,
      activeBars: progressData.bars.size
    }
  }
  
  /**
   * Get spinner metrics
   * @private
   */
  _getSpinnerMetrics(id) {
    const spinnerData = this.activeSpinners.get(id)
    if (!spinnerData) return null
    
    return {
      id,
      startTime: spinnerData.startTime,
      elapsed: Date.now() - spinnerData.startTime,
      text: spinnerData.options.text
    }
  }
}

module.exports = ProgressManager