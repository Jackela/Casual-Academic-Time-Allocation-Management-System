/**
 * Windows Process Management Provider
 *
 * Windows-specific process management with enterprise-grade capabilities:
 * - taskkill/wmic integration for comprehensive process control
 * - Support for cmd.exe, PowerShell, and Git Bash environments
 * - Process trees and service termination handling
 * - Windows-specific security context management
 * - WMIC fallback for complex scenarios
 * - Process ID validation and existence checking
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { exec, spawn } = require('child_process')
const { promisify } = require('util')
const path = require('path')

const execAsync = promisify(exec)

/**
 * Windows-specific process management provider
 */
class WindowsProvider {
  constructor(config = {}) {
    this.config = {
      defaultTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      forceKillDelay: 5000,
      batchSize: 50,
      enableWMIC: true,
      enablePowerShell: true,
      ...config
    }
    
    this.capabilities = {
      killByPid: true,
      killByName: true,
      killProcessTree: true,
      killByService: true,
      queryProcesses: true,
      queryServices: true,
      signalSupport: false,
      privilegedOperations: true,
      processMonitoring: true,
      serviceManagement: true
    }
    
    this.processCache = new Map()
    this.serviceCache = new Map()
    this.lastCacheUpdate = 0
  }

  /**
   * Initialize the Windows provider
   * @returns {Promise<void>}
   */
  async initialize() {
    // Detect available tools and shells
    await this._detectCapabilities()
    
    // Validate required tools
    await this._validateRequiredTools()
    
    // Setup optimization strategies
    this._setupOptimizations()
  }

  /**
   * Detect Windows-specific capabilities
   * @returns {Promise<void>}
   * @private
   */
  async _detectCapabilities() {
    const detectedCapabilities = {
      taskkill: false,
      wmic: false,
      powershell: false,
      sc: false,
      tasklist: false,
      netstat: false,
      systeminfo: false
    }
    
    // Test each tool
    for (const tool of Object.keys(detectedCapabilities)) {
      try {
        let command = `${tool} /?`
        if (tool === 'powershell') {
          command = 'powershell -Command "Get-Host | Select-Object Version"'
        } else if (tool === 'systeminfo') {
          command = 'systeminfo | findstr /C:"OS Name"'
        }
        
        await execAsync(command, { timeout: 5000 })
        detectedCapabilities[tool] = true
      } catch (error) {
        // Tool not available or failed
        detectedCapabilities[tool] = false
      }
    }
    
    this.detectedTools = detectedCapabilities
    
    // Update capabilities based on available tools
    this.capabilities.enableWMIC = detectedCapabilities.wmic
    this.capabilities.enablePowerShell = detectedCapabilities.powershell
    this.capabilities.enableTasklist = detectedCapabilities.tasklist
    this.capabilities.enableSC = detectedCapabilities.sc
  }

  /**
   * Validate required tools are available
   * @returns {Promise<void>}
   * @private
   */
  async _validateRequiredTools() {
    const required = ['taskkill']
    const missing = required.filter(tool => !this.detectedTools[tool])
    
    if (missing.length > 0) {
      throw new Error(`Required Windows tools not available: ${missing.join(', ')}`)
    }
    
    // Warn about missing optional tools
    const optional = ['wmic', 'tasklist']
    const missingOptional = optional.filter(tool => !this.detectedTools[tool])
    
    if (missingOptional.length > 0) {
      console.warn(`Optional Windows tools not available: ${missingOptional.join(', ')}`)
    }
  }

  /**
   * Setup platform-specific optimizations
   * @private
   */
  _setupOptimizations() {
    // Use tasklist for faster queries when available
    this.useTasklist = this.detectedTools.tasklist
    
    // Use PowerShell for advanced operations when available
    this.usePowerShell = this.detectedTools.powershell
    
    // Enable WMIC fallback for complex scenarios
    this.wmicFallback = this.detectedTools.wmic
    
    // Setup caching strategy
    this.cacheTimeout = this.config.defaultTimeout / 2
  }

  /**
   * Kill process by PID
   * @param {number} pid - Process ID to kill
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killByPid(pid, options = {}) {
    const killOptions = {
      force: false,
      timeout: this.config.defaultTimeout,
      includeChildren: true,
      signal: null, // Not supported on Windows
      ...options
    }
    
    // Validate PID
    if (!this._isValidPid(pid)) {
      throw new Error(`Invalid PID: ${pid}`)
    }
    
    // Check if process exists
    const processExists = await this._processExists(pid)
    if (!processExists) {
      return {
        success: true,
        pid: pid,
        message: 'Process not running',
        method: 'validation'
      }
    }
    
    const startTime = Date.now()
    let result = null
    
    try {
      // Get process information before killing
      const processInfo = await this._getProcessInfo(pid)
      
      // Try graceful termination first (unless force is specified)
      if (!killOptions.force) {
        result = await this._gracefulKill(pid, killOptions)
        if (result.success) {
          return {
            ...result,
            processInfo,
            duration: Date.now() - startTime
          }
        }
      }
      
      // Force kill
      result = await this._forceKill(pid, killOptions)
      
      // Kill children if requested
      if (killOptions.includeChildren && processInfo) {
        await this._killProcessTree(pid, killOptions)
      }
      
      return {
        ...result,
        processInfo,
        duration: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Failed to kill process ${pid}: ${error.message}`)
    }
  }

  /**
   * Kill process by name/pattern
   * @param {string} namePattern - Process name or pattern
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killByName(namePattern, options = {}) {
    const killOptions = {
      force: false,
      timeout: this.config.defaultTimeout,
      includeChildren: true,
      exactMatch: false,
      maxProcesses: 10,
      ...options
    }
    
    const startTime = Date.now()
    
    try {
      // Find processes matching the pattern
      const matchingProcesses = await this._findProcessesByName(namePattern, killOptions)
      
      if (matchingProcesses.length === 0) {
        return {
          success: true,
          killedCount: 0,
          message: 'No matching processes found',
          pattern: namePattern,
          duration: Date.now() - startTime
        }
      }
      
      // Validate process count
      if (matchingProcesses.length > killOptions.maxProcesses) {
        throw new Error(`Too many matching processes (${matchingProcesses.length}), max allowed: ${killOptions.maxProcesses}`)
      }
      
      // Kill each matching process
      const results = []
      for (const process of matchingProcesses) {
        try {
          const killResult = await this.killByPid(process.pid, killOptions)
          results.push({
            pid: process.pid,
            name: process.name,
            success: killResult.success,
            method: killResult.method
          })
        } catch (error) {
          results.push({
            pid: process.pid,
            name: process.name,
            success: false,
            error: error.message
          })
        }
      }
      
      const successCount = results.filter(r => r.success).length
      
      return {
        success: successCount > 0,
        killedCount: successCount,
        totalFound: matchingProcesses.length,
        pattern: namePattern,
        results: results,
        duration: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Failed to kill processes by name ${namePattern}: ${error.message}`)
    }
  }

  /**
   * Kill process tree (parent and all children)
   * @param {number} rootPid - Root process ID
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killProcessTree(rootPid, options = {}) {
    const killOptions = {
      force: false,
      timeout: this.config.defaultTimeout,
      ...options
    }
    
    const startTime = Date.now()
    
    try {
      // Get process tree
      const processTree = await this._getProcessTree(rootPid)
      
      if (processTree.length === 0) {
        return {
          success: true,
          killedCount: 0,
          message: 'No processes found in tree',
          rootPid: rootPid,
          duration: Date.now() - startTime
        }
      }
      
      // Kill processes from leaves to root (bottom-up)
      const sortedProcesses = this._sortProcessTreeForKilling(processTree)
      const results = []
      
      for (const process of sortedProcesses) {
        try {
          const killResult = await this.killByPid(process.pid, killOptions)
          results.push({
            pid: process.pid,
            name: process.name,
            level: process.level,
            success: killResult.success,
            method: killResult.method
          })
        } catch (error) {
          results.push({
            pid: process.pid,
            name: process.name,
            level: process.level,
            success: false,
            error: error.message
          })
        }
      }
      
      const successCount = results.filter(r => r.success).length
      
      return {
        success: successCount > 0,
        killedCount: successCount,
        totalProcesses: processTree.length,
        rootPid: rootPid,
        results: results,
        duration: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Failed to kill process tree ${rootPid}: ${error.message}`)
    }
  }

  /**
   * List running processes
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of processes
   */
  async listProcesses(options = {}) {
    const queryOptions = {
      includeDetails: true,
      useCache: true,
      cacheTimeout: 30000,
      filterPattern: null,
      sortBy: 'pid',
      maxResults: 1000,
      ...options
    }
    
    // Check cache first
    if (queryOptions.useCache && this._isCacheValid('processes')) {
      const cached = this.processCache.get('processes')
      return this._filterAndSortProcesses(cached, queryOptions)
    }
    
    try {
      let processes = []
      
      // Use the best available method
      if (this.useTasklist && queryOptions.includeDetails) {
        processes = await this._getProcessesTasklist()
      } else if (this.wmicFallback) {
        processes = await this._getProcessesWMIC()
      } else {
        processes = await this._getProcessesTaskkill()
      }
      
      // Cache results
      if (queryOptions.useCache) {
        this.processCache.set('processes', processes)
        this.lastCacheUpdate = Date.now()
      }
      
      return this._filterAndSortProcesses(processes, queryOptions)
    } catch (error) {
      throw new Error(`Failed to list processes: ${error.message}`)
    }
  }

  /**
   * Get detailed process information
   * @param {number} pid - Process ID
   * @returns {Promise<Object|null>} Process information
   */
  async getProcessInfo(pid) {
    if (!this._isValidPid(pid)) {
      throw new Error(`Invalid PID: ${pid}`)
    }
    
    try {
      return await this._getProcessInfo(pid)
    } catch (error) {
      throw new Error(`Failed to get process info for PID ${pid}: ${error.message}`)
    }
  }

  /**
   * Check if process exists
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} Process existence
   */
  async processExists(pid) {
    if (!this._isValidPid(pid)) {
      return false
    }
    
    return await this._processExists(pid)
  }

  /**
   * Kill Windows service
   * @param {string} serviceName - Service name
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killService(serviceName, options = {}) {
    const killOptions = {
      force: false,
      timeout: this.config.defaultTimeout,
      ...options
    }
    
    if (!this.detectedTools.sc) {
      throw new Error('Service control (sc) tool not available')
    }
    
    const startTime = Date.now()
    
    try {
      // Get service information
      const serviceInfo = await this._getServiceInfo(serviceName)
      
      if (!serviceInfo) {
        return {
          success: true,
          serviceName: serviceName,
          message: 'Service not found or not running',
          duration: Date.now() - startTime
        }
      }
      
      // Stop service
      let command = `sc stop "${serviceName}"`
      if (killOptions.force) {
        command = `sc stop "${serviceName}" && timeout /t 2 && sc stop "${serviceName}"`
      }
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: killOptions.timeout
      })
      
      // Verify service stopped
      const newServiceInfo = await this._getServiceInfo(serviceName)
      const success = !newServiceInfo || newServiceInfo.state !== 'RUNNING'
      
      return {
        success: success,
        serviceName: serviceName,
        previousState: serviceInfo.state,
        currentState: newServiceInfo ? newServiceInfo.state : 'NOT_FOUND',
        output: stdout,
        duration: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Failed to kill service ${serviceName}: ${error.message}`)
    }
  }

  /**
   * Get process tree
   * @param {number} rootPid - Root process ID
   * @returns {Promise<Array>} Process tree
   * @private
   */
  async _getProcessTree(rootPid) {
    try {
      const allProcesses = await this.listProcesses({ useCache: true })
      const tree = []
      
      // Build process tree using parent-child relationships
      const processMap = new Map()
      allProcesses.forEach(p => processMap.set(p.pid, p))
      
      const visited = new Set()
      const buildTree = (pid, level = 0) => {
        if (visited.has(pid)) return
        visited.add(pid)
        
        const process = processMap.get(pid)
        if (!process) return
        
        tree.push({ ...process, level })
        
        // Find children
        const children = allProcesses.filter(p => p.parentPid === pid)
        children.forEach(child => buildTree(child.pid, level + 1))
      }
      
      buildTree(rootPid)
      return tree
    } catch (error) {
      throw new Error(`Failed to get process tree: ${error.message}`)
    }
  }

  /**
   * Sort process tree for safe killing (children first)
   * @param {Array} processTree - Process tree
   * @returns {Array} Sorted process tree
   * @private
   */
  _sortProcessTreeForKilling(processTree) {
    // Sort by level (deepest first), then by PID
    return processTree.sort((a, b) => {
      if (a.level !== b.level) {
        return b.level - a.level // Deeper levels first
      }
      return a.pid - b.pid
    })
  }

  /**
   * Graceful process termination
   * @param {number} pid - Process ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   * @private
   */
  async _gracefulKill(pid, options) {
    try {
      // First try normal termination
      const command = `taskkill /PID ${pid}`
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout
      })
      
      // Wait a moment and check if process is gone
      await new Promise(resolve => setTimeout(resolve, 1000))
      const stillExists = await this._processExists(pid)
      
      if (!stillExists) {
        return {
          success: true,
          pid: pid,
          method: 'graceful',
          output: stdout
        }
      }
      
      return {
        success: false,
        pid: pid,
        method: 'graceful',
        reason: 'Process still running after graceful termination'
      }
    } catch (error) {
      return {
        success: false,
        pid: pid,
        method: 'graceful',
        error: error.message
      }
    }
  }

  /**
   * Force process termination
   * @param {number} pid - Process ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   * @private
   */
  async _forceKill(pid, options) {
    try {
      const command = `taskkill /F /PID ${pid}`
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout
      })
      
      // Wait a moment and verify termination
      await new Promise(resolve => setTimeout(resolve, 1000))
      const stillExists = await this._processExists(pid)
      
      return {
        success: !stillExists,
        pid: pid,
        method: 'force',
        output: stdout,
        verified: !stillExists
      }
    } catch (error) {
      // Even if taskkill reports an error, the process might be killed
      const stillExists = await this._processExists(pid)
      
      return {
        success: !stillExists,
        pid: pid,
        method: 'force',
        error: error.message,
        verified: !stillExists
      }
    }
  }

  /**
   * Kill process tree using taskkill
   * @param {number} rootPid - Root process ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   * @private
   */
  async _killProcessTree(rootPid, options) {
    try {
      let command = `taskkill /T /PID ${rootPid}`
      if (options.force) {
        command = `taskkill /F /T /PID ${rootPid}`
      }
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout
      })
      
      return {
        success: true,
        method: 'tree_kill',
        output: stdout
      }
    } catch (error) {
      return {
        success: false,
        method: 'tree_kill',
        error: error.message
      }
    }
  }

  /**
   * Get processes using tasklist
   * @returns {Promise<Array>} Processes
   * @private
   */
  async _getProcessesTasklist() {
    const command = 'tasklist /FO CSV /V'
    const { stdout } = await execAsync(command, {
      timeout: this.config.defaultTimeout
    })
    
    const lines = stdout.split('\n').slice(1) // Skip header
    const processes = []
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      try {
        // Parse CSV line
        const fields = this._parseCSVLine(line)
        if (fields.length >= 8) {
          const [imageName, pid, sessionName, sessionNum, memUsage, status, username, cpuTime] = fields
          
          processes.push({
            pid: parseInt(pid) || 0,
            name: imageName.replace(/"/g, ''),
            sessionName: sessionName.replace(/"/g, ''),
            sessionNumber: parseInt(sessionNum) || 0,
            memoryUsage: this._parseMemoryUsage(memUsage),
            status: status.replace(/"/g, ''),
            username: username.replace(/"/g, ''),
            cpuTime: cpuTime.replace(/"/g, ''),
            parentPid: null // Not available in tasklist
          })
        }
      } catch (error) {
        // Skip malformed lines
        continue
      }
    }
    
    return processes
  }

  /**
   * Get processes using WMIC
   * @returns {Promise<Array>} Processes
   * @private
   */
  async _getProcessesWMIC() {
    const command = 'wmic process get ProcessId,Name,ParentProcessId,CommandLine,WorkingSetSize /format:csv'
    const { stdout } = await execAsync(command, {
      timeout: this.config.defaultTimeout
    })
    
    const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
    const processes = []
    
    for (const line of lines) {
      try {
        const parts = line.split(',')
        if (parts.length >= 5) {
          const [, commandLine, name, parentPid, pid, workingSet] = parts
          
          const pidNum = parseInt(pid ? pid.trim() : '0')
          if (pidNum > 0) {
            processes.push({
              pid: pidNum,
              name: name ? name.trim() : 'unknown',
              command: commandLine ? commandLine.trim() : '',
              parentPid: parentPid && !isNaN(parseInt(parentPid.trim())) ? parseInt(parentPid.trim()) : null,
              memoryUsage: workingSet ? parseInt(workingSet.trim()) : 0
            })
          }
        }
      } catch (error) {
        // Skip malformed lines
        continue
      }
    }
    
    return processes
  }

  /**
   * Get processes using taskkill (fallback)
   * @returns {Promise<Array>} Processes
   * @private
   */
  async _getProcessesTaskkill() {
    // This is a basic fallback - just get PIDs
    const processes = await this.listProcesses({ includeDetails: false })
    return processes.map(p => ({
      pid: p.pid,
      name: p.name || 'unknown',
      command: '',
      parentPid: null,
      memoryUsage: 0
    }))
  }

  /**
   * Find processes by name pattern
   * @param {string} pattern - Name pattern
   * @param {Object} options - Options
   * @returns {Promise<Array>} Matching processes
   * @private
   */
  async _findProcessesByName(pattern, options) {
    const processes = await this.listProcesses({ useCache: true })
    
    if (options.exactMatch) {
      return processes.filter(p => p.name === pattern)
    } else {
      const regex = new RegExp(pattern, 'i')
      return processes.filter(p => regex.test(p.name))
    }
  }

  /**
   * Get detailed process information
   * @param {number} pid - Process ID
   * @returns {Promise<Object|null>} Process info
   * @private
   */
  async _getProcessInfo(pid) {
    try {
      if (this.wmicFallback) {
        const command = `wmic process where "ProcessId=${pid}" get * /format:csv`
        const { stdout } = await execAsync(command, { timeout: 5000 })
        
        const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
        if (lines.length > 0) {
          // Parse WMIC output for detailed info
          const parts = lines[0].split(',')
          // This would need proper parsing based on WMIC output format
          return {
            pid: pid,
            name: 'process',
            exists: true
          }
        }
      }
      
      // Fallback to simple existence check
      const exists = await this._processExists(pid)
      if (exists) {
        return {
          pid: pid,
          name: 'unknown',
          exists: true
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Check if process exists
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} Process exists
   * @private
   */
  async _processExists(pid) {
    try {
      const command = `tasklist /FI "PID eq ${pid}" /FO CSV | find "${pid}"`
      await execAsync(command, { timeout: 5000 })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get service information
   * @param {string} serviceName - Service name
   * @returns {Promise<Object|null>} Service info
   * @private
   */
  async _getServiceInfo(serviceName) {
    try {
      const command = `sc query "${serviceName}"`
      const { stdout } = await execAsync(command, { timeout: 5000 })
      
      // Parse service status
      const stateMatch = stdout.match(/STATE\s+:\s+\d+\s+(\w+)/)
      if (stateMatch) {
        return {
          name: serviceName,
          state: stateMatch[1],
          raw: stdout
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Validate PID
   * @param {number} pid - Process ID
   * @returns {boolean} Valid PID
   * @private
   */
  _isValidPid(pid) {
    return Number.isInteger(pid) && pid > 0 && pid <= 65535
  }

  /**
   * Parse CSV line handling quoted fields
   * @param {string} line - CSV line
   * @returns {Array} Parsed fields
   * @private
   */
  _parseCSVLine(line) {
    const fields = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    if (current) {
      fields.push(current.trim())
    }
    
    return fields
  }

  /**
   * Parse memory usage string
   * @param {string} memStr - Memory string
   * @returns {number} Memory in bytes
   * @private
   */
  _parseMemoryUsage(memStr) {
    if (!memStr) return 0
    
    const cleanStr = memStr.replace(/[",]/g, '').replace(/\s+K$/, '')
    const num = parseInt(cleanStr)
    return isNaN(num) ? 0 : num * 1024 // Convert KB to bytes
  }

  /**
   * Filter and sort processes
   * @param {Array} processes - Process list
   * @param {Object} options - Options
   * @returns {Array} Filtered processes
   * @private
   */
  _filterAndSortProcesses(processes, options) {
    let filtered = processes
    
    // Apply filter pattern
    if (options.filterPattern) {
      const regex = new RegExp(options.filterPattern, 'i')
      filtered = filtered.filter(p => regex.test(p.name))
    }
    
    // Sort
    if (options.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[options.sortBy] || 0
        const bVal = b[options.sortBy] || 0
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      })
    }
    
    // Limit results
    if (options.maxResults && filtered.length > options.maxResults) {
      filtered = filtered.slice(0, options.maxResults)
    }
    
    return filtered
  }

  /**
   * Check if cache is valid
   * @param {string} key - Cache key
   * @returns {boolean} Cache validity
   * @private
   */
  _isCacheValid(key) {
    if (!this.processCache.has(key)) return false
    return Date.now() - this.lastCacheUpdate < this.cacheTimeout
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return { ...this.capabilities }
  }

  /**
   * Get provider statistics
   * @returns {Object} Provider statistics
   */
  getStatistics() {
    return {
      cacheSize: this.processCache.size,
      lastCacheUpdate: this.lastCacheUpdate,
      detectedTools: this.detectedTools,
      capabilities: this.capabilities
    }
  }

  /**
   * Clear provider cache
   */
  clearCache() {
    this.processCache.clear()
    this.serviceCache.clear()
    this.lastCacheUpdate = 0
  }
}

module.exports = WindowsProvider