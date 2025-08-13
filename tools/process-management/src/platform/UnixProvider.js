/**
 * Unix Process Management Provider
 *
 * Unix/Linux/macOS-specific process management with enterprise capabilities:
 * - Signal-based termination with proper escalation (SIGTERM → SIGKILL)
 * - Process group management for comprehensive child cleanup
 * - Daemon and background process handling
 * - cgroup integration where available
 * - Cross-shell compatibility (bash, zsh, fish)
 * - Advanced process tree management
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { exec, spawn } = require('child_process')
const { promisify } = require('util')
const os = require('os')

const execAsync = promisify(exec)

/**
 * Unix-specific process management provider
 */
class UnixProvider {
  constructor(config = {}) {
    this.config = {
      defaultTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      signalEscalationDelay: 2000,
      forceKillDelay: 5000,
      batchSize: 100,
      enableCgroups: true,
      enableSystemd: true,
      ...config
    }
    
    this.capabilities = {
      killByPid: true,
      killByName: true,
      killProcessTree: true,
      killByService: false, // Depends on systemctl availability
      queryProcesses: true,
      queryServices: false, // Depends on systemctl availability
      signalSupport: true,
      privilegedOperations: process.getuid ? process.getuid() === 0 : false,
      processMonitoring: true,
      processGroups: true,
      cgroupSupport: false // Detected during initialization
    }
    
    this.signals = {
      SIGTERM: 15,  // Polite termination
      SIGKILL: 9,   // Force kill
      SIGINT: 2,    // Interrupt
      SIGQUIT: 3,   // Quit
      SIGSTOP: 19,  // Stop (pause)
      SIGCONT: 18,  // Continue
      SIGUSR1: 10,  // User signal 1
      SIGUSR2: 12   // User signal 2
    }
    
    this.processCache = new Map()
    this.lastCacheUpdate = 0
  }

  /**
   * Initialize the Unix provider
   * @returns {Promise<void>}
   */
  async initialize() {
    // Detect available tools and capabilities
    await this._detectCapabilities()
    
    // Validate required tools
    await this._validateRequiredTools()
    
    // Setup optimization strategies
    this._setupOptimizations()
    
    // Test process group capabilities
    await this._testProcessGroupCapabilities()
  }

  /**
   * Detect Unix-specific capabilities
   * @returns {Promise<void>}
   * @private
   */
  async _detectCapabilities() {
    const detectedCapabilities = {
      ps: false,
      kill: false,
      killall: false,
      pkill: false,
      pgrep: false,
      lsof: false,
      netstat: false,
      ss: false,
      systemctl: false,
      service: false,
      cgget: false,
      cgset: false,
      top: false,
      htop: false
    }
    
    // Test each tool
    for (const tool of Object.keys(detectedCapabilities)) {
      try {
        if (tool === 'systemctl') {
          await execAsync('systemctl --version', { timeout: 3000 })
        } else if (tool === 'service') {
          await execAsync('service --version 2>/dev/null || which service', { timeout: 3000 })
        } else {
          await execAsync(`which ${tool}`, { timeout: 3000 })
        }
        detectedCapabilities[tool] = true
      } catch (error) {
        detectedCapabilities[tool] = false
      }
    }
    
    this.detectedTools = detectedCapabilities
    
    // Update capabilities based on available tools
    this.capabilities.killByService = detectedCapabilities.systemctl || detectedCapabilities.service
    this.capabilities.queryServices = detectedCapabilities.systemctl
    this.capabilities.cgroupSupport = detectedCapabilities.cgget && detectedCapabilities.cgset
    this.capabilities.advancedNetworking = detectedCapabilities.lsof || detectedCapabilities.ss
    this.capabilities.advancedProcessControl = detectedCapabilities.pkill && detectedCapabilities.pgrep
  }

  /**
   * Validate required tools are available
   * @returns {Promise<void>}
   * @private
   */
  async _validateRequiredTools() {
    const required = ['ps', 'kill']
    const missing = required.filter(tool => !this.detectedTools[tool])
    
    if (missing.length > 0) {
      throw new Error(`Required Unix tools not available: ${missing.join(', ')}`)
    }
    
    // Warn about missing useful tools
    const recommended = ['pkill', 'pgrep', 'lsof']
    const missingRecommended = recommended.filter(tool => !this.detectedTools[tool])
    
    if (missingRecommended.length > 0) {
      console.warn(`Recommended Unix tools not available: ${missingRecommended.join(', ')}`)
    }
  }

  /**
   * Setup platform-specific optimizations
   * @private
   */
  _setupOptimizations() {
    // Use pkill/pgrep for faster pattern-based operations
    this.usePkill = this.detectedTools.pkill && this.detectedTools.pgrep
    
    // Use lsof for network monitoring when available
    this.useLsof = this.detectedTools.lsof
    
    // Use ss instead of netstat for better performance
    this.useSS = this.detectedTools.ss
    
    // Enable systemd integration
    this.useSystemd = this.detectedTools.systemctl
    
    // Setup caching strategy
    this.cacheTimeout = this.config.defaultTimeout / 2
    
    // Determine best ps format
    this.psFormat = this._determineBestPsFormat()
  }

  /**
   * Test process group capabilities
   * @returns {Promise<void>}
   * @private
   */
  async _testProcessGroupCapabilities() {
    try {
      // Test if we can create and manage process groups
      const testCommand = 'sleep 0.1'
      const child = spawn('sh', ['-c', testCommand], {
        detached: true,
        stdio: 'ignore'
      })
      
      // Try to get the process group ID
      const pgid = process.getpgid ? process.getpgid(child.pid) : child.pid
      
      // Try to kill the process group
      try {
        process.kill(-pgid, 'SIGTERM')
        this.capabilities.processGroupKill = true
      } catch (error) {
        this.capabilities.processGroupKill = false
      }
      
      child.unref()
    } catch (error) {
      this.capabilities.processGroupKill = false
    }
  }

  /**
   * Kill process by PID
   * @param {number} pid - Process ID to kill
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killByPid(pid, options = {}) {
    const killOptions = {
      signal: 'SIGTERM',
      force: false,
      timeout: this.config.defaultTimeout,
      includeChildren: true,
      escalate: true,
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
      
      // Kill children first if requested
      if (killOptions.includeChildren) {
        await this._killProcessChildren(pid, killOptions)
      }
      
      // Kill the main process
      if (killOptions.force) {
        result = await this._forceKill(pid)
      } else if (killOptions.escalate) {
        result = await this._escalatedKill(pid, killOptions)
      } else {
        result = await this._signalKill(pid, killOptions.signal)
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
      signal: 'SIGTERM',
      force: false,
      timeout: this.config.defaultTimeout,
      includeChildren: true,
      exactMatch: false,
      maxProcesses: 20,
      excludeParent: true,
      ...options
    }
    
    const startTime = Date.now()
    
    try {
      let matchingProcesses = []
      
      // Use pkill/pgrep if available for better performance
      if (this.usePkill) {
        matchingProcesses = await this._findProcessesPkill(namePattern, killOptions)
      } else {
        matchingProcesses = await this._findProcessesByName(namePattern, killOptions)
      }
      
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
      
      // Exclude current process and parent if requested
      if (killOptions.excludeParent) {
        const currentPid = process.pid
        const parentPid = process.ppid
        matchingProcesses = matchingProcesses.filter(p => 
          p.pid !== currentPid && p.pid !== parentPid
        )
      }
      
      // Kill processes using batch operations when possible
      const results = await this._batchKillProcesses(matchingProcesses, killOptions)
      
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
      signal: 'SIGTERM',
      force: false,
      timeout: this.config.defaultTimeout,
      useProcessGroups: true,
      ...options
    }
    
    const startTime = Date.now()
    
    try {
      // Try process group kill first if available and enabled
      if (killOptions.useProcessGroups && this.capabilities.processGroupKill) {
        const pgResult = await this._killProcessGroup(rootPid, killOptions)
        if (pgResult.success) {
          return {
            ...pgResult,
            duration: Date.now() - startTime
          }
        }
      }
      
      // Fall back to tree traversal method
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
          const killResult = await this.killByPid(process.pid, {
            ...killOptions,
            includeChildren: false // Already handling tree structure
          })
          
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
        method: 'tree_traversal',
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
      maxResults: 2000,
      includeThreads: false,
      ...options
    }
    
    // Check cache first
    if (queryOptions.useCache && this._isCacheValid('processes')) {
      const cached = this.processCache.get('processes')
      return this._filterAndSortProcesses(cached, queryOptions)
    }
    
    try {
      const processes = await this._getProcessesPS(queryOptions)
      
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
   * Kill system service (systemd/init.d)
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
    
    const startTime = Date.now()
    
    try {
      if (this.useSystemd) {
        return await this._killSystemdService(serviceName, killOptions, startTime)
      } else if (this.detectedTools.service) {
        return await this._killInitdService(serviceName, killOptions, startTime)
      } else {
        throw new Error('No service management tools available')
      }
    } catch (error) {
      throw new Error(`Failed to kill service ${serviceName}: ${error.message}`)
    }
  }

  /**
   * Send signal to process
   * @param {number} pid - Process ID
   * @param {string|number} signal - Signal to send
   * @returns {Promise<Object>} Signal result
   */
  async sendSignal(pid, signal) {
    if (!this._isValidPid(pid)) {
      throw new Error(`Invalid PID: ${pid}`)
    }
    
    const signalNum = this._normalizeSignal(signal)
    if (signalNum === null) {
      throw new Error(`Invalid signal: ${signal}`)
    }
    
    try {
      const exists = await this._processExists(pid)
      if (!exists) {
        return {
          success: false,
          pid: pid,
          signal: signal,
          message: 'Process does not exist'
        }
      }
      
      process.kill(pid, signalNum)
      
      return {
        success: true,
        pid: pid,
        signal: signal,
        signalNumber: signalNum,
        method: 'process.kill'
      }
    } catch (error) {
      return {
        success: false,
        pid: pid,
        signal: signal,
        error: error.message
      }
    }
  }

  /**
   * Kill process using signal escalation
   * @param {number} pid - Process ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   * @private
   */
  async _escalatedKill(pid, options) {
    const signals = ['SIGTERM', 'SIGINT', 'SIGKILL']
    const delays = [options.signalEscalationDelay || 2000, options.signalEscalationDelay || 2000]
    
    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i]
      
      try {
        // Send signal
        const result = await this._signalKill(pid, signal)
        
        // For SIGKILL, don't wait - it's guaranteed to work
        if (signal === 'SIGKILL') {
          return result
        }
        
        // Wait for process to terminate
        if (i < delays.length) {
          await new Promise(resolve => setTimeout(resolve, delays[i]))
        }
        
        // Check if process is gone
        const stillExists = await this._processExists(pid)
        if (!stillExists) {
          return {
            success: true,
            pid: pid,
            method: 'escalated',
            finalSignal: signal,
            attempts: i + 1
          }
        }
      } catch (error) {
        if (i === signals.length - 1) {
          throw error
        }
        // Continue to next signal
      }
    }
    
    return {
      success: false,
      pid: pid,
      method: 'escalated',
      message: 'All escalation attempts failed'
    }
  }

  /**
   * Force kill process with SIGKILL
   * @param {number} pid - Process ID
   * @returns {Promise<Object>} Result
   * @private
   */
  async _forceKill(pid) {
    return await this._signalKill(pid, 'SIGKILL')
  }

  /**
   * Kill process with specific signal
   * @param {number} pid - Process ID
   * @param {string|number} signal - Signal
   * @returns {Promise<Object>} Result
   * @private
   */
  async _signalKill(pid, signal) {
    try {
      const signalResult = await this.sendSignal(pid, signal)
      
      if (signalResult.success) {
        // Wait a moment for signal processing
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify termination for kill signals
        if (signal === 'SIGKILL' || signal === 9) {
          const stillExists = await this._processExists(pid)
          return {
            success: !stillExists,
            pid: pid,
            signal: signal,
            method: 'signal',
            verified: !stillExists
          }
        }
        
        return {
          success: true,
          pid: pid,
          signal: signal,
          method: 'signal'
        }
      }
      
      return signalResult
    } catch (error) {
      return {
        success: false,
        pid: pid,
        signal: signal,
        method: 'signal',
        error: error.message
      }
    }
  }

  /**
   * Kill process children
   * @param {number} parentPid - Parent process ID
   * @param {Object} options - Options
   * @returns {Promise<Array>} Results
   * @private
   */
  async _killProcessChildren(parentPid, options) {
    try {
      const children = await this._getChildProcesses(parentPid)
      const results = []
      
      for (const child of children) {
        try {
          const killResult = await this.killByPid(child.pid, {
            ...options,
            includeChildren: false // Prevent infinite recursion
          })
          results.push(killResult)
        } catch (error) {
          results.push({
            success: false,
            pid: child.pid,
            error: error.message
          })
        }
      }
      
      return results
    } catch (error) {
      return []
    }
  }

  /**
   * Kill process group
   * @param {number} pid - Process ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   * @private
   */
  async _killProcessGroup(pid, options) {
    try {
      // Get process group ID
      const pgid = process.getpgid ? process.getpgid(pid) : pid
      
      // Kill the entire process group
      const signal = options.force ? 'SIGKILL' : (options.signal || 'SIGTERM')
      process.kill(-pgid, signal)
      
      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 1000))
      const stillExists = await this._processExists(pid)
      
      return {
        success: !stillExists,
        pid: pid,
        pgid: pgid,
        signal: signal,
        method: 'process_group',
        verified: !stillExists
      }
    } catch (error) {
      return {
        success: false,
        pid: pid,
        method: 'process_group',
        error: error.message
      }
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
      const allProcesses = await this.listProcesses({ 
        useCache: true,
        includeDetails: true
      })
      
      const tree = []
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
   * Get child processes
   * @param {number} parentPid - Parent process ID
   * @returns {Promise<Array>} Child processes
   * @private
   */
  async _getChildProcesses(parentPid) {
    try {
      if (this.usePkill) {
        // Use pgrep to find children
        const command = `pgrep -P ${parentPid}`
        const { stdout } = await execAsync(command, { timeout: 5000 })
        
        const childPids = stdout.split('\n')
          .filter(line => line.trim())
          .map(pid => parseInt(pid))
          .filter(pid => !isNaN(pid))
        
        const children = []
        for (const pid of childPids) {
          const info = await this._getProcessInfo(pid)
          if (info) {
            children.push(info)
          }
        }
        
        return children
      } else {
        // Use ps to find children
        const allProcesses = await this.listProcesses({ useCache: true })
        return allProcesses.filter(p => p.parentPid === parentPid)
      }
    } catch (error) {
      return []
    }
  }

  /**
   * Get processes using ps command
   * @param {Object} options - Options
   * @returns {Promise<Array>} Processes
   * @private
   */
  async _getProcessesPS(options) {
    try {
      const format = options.includeDetails 
        ? 'pid,ppid,uid,gid,comm,args,etime,pcpu,pmem,vsz,rss,tty,stat'
        : 'pid,ppid,comm'
      
      const command = `ps -eo ${format} --no-headers`
      const { stdout } = await execAsync(command, {
        timeout: this.config.defaultTimeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large process lists
      })
      
      const lines = stdout.split('\n').filter(line => line.trim())
      const processes = []
      
      for (const line of lines) {
        try {
          const process = this._parseProcessLine(line, options.includeDetails)
          if (process && process.pid > 0) {
            processes.push(process)
          }
        } catch (error) {
          // Skip malformed lines
          continue
        }
      }
      
      return processes
    } catch (error) {
      throw new Error(`Failed to get processes with ps: ${error.message}`)
    }
  }

  /**
   * Parse process line from ps output
   * @param {string} line - Process line
   * @param {boolean} detailed - Include detailed info
   * @returns {Object|null} Process info
   * @private
   */
  _parseProcessLine(line, detailed = false) {
    const parts = line.trim().split(/\s+/)
    
    if (parts.length < 3) return null
    
    const pid = parseInt(parts[0])
    const parentPid = parseInt(parts[1])
    
    if (isNaN(pid) || pid <= 0) return null
    
    if (!detailed) {
      return {
        pid: pid,
        parentPid: isNaN(parentPid) ? null : parentPid,
        name: parts[2] || 'unknown'
      }
    }
    
    // Detailed parsing
    if (parts.length < 8) return null
    
    return {
      pid: pid,
      parentPid: isNaN(parentPid) ? null : parentPid,
      uid: parseInt(parts[2]) || 0,
      gid: parseInt(parts[3]) || 0,
      name: parts[4] || 'unknown',
      command: parts.slice(5).join(' ') || '',
      elapsed: parts[6] || '0',
      cpuPercent: parseFloat(parts[7]) || 0,
      memoryPercent: parseFloat(parts[8]) || 0,
      virtualSize: parseInt(parts[9]) || 0,
      residentSize: parseInt(parts[10]) || 0,
      tty: parts[11] || '?',
      state: parts[12] || 'unknown'
    }
  }

  /**
   * Find processes using pkill/pgrep
   * @param {string} pattern - Pattern
   * @param {Object} options - Options
   * @returns {Promise<Array>} Matching processes
   * @private
   */
  async _findProcessesPkill(pattern, options) {
    try {
      let command = 'pgrep'
      
      if (options.exactMatch) {
        command += ' -x'
      }
      
      command += ` "${pattern}"`
      
      const { stdout } = await execAsync(command, { timeout: 5000 })
      const pids = stdout.split('\n')
        .filter(line => line.trim())
        .map(pid => parseInt(pid))
        .filter(pid => !isNaN(pid))
      
      const processes = []
      for (const pid of pids) {
        const info = await this._getProcessInfo(pid)
        if (info) {
          processes.push(info)
        }
      }
      
      return processes
    } catch (error) {
      return []
    }
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
      return processes.filter(p => regex.test(p.name) || regex.test(p.command || ''))
    }
  }

  /**
   * Batch kill processes
   * @param {Array} processes - Processes to kill
   * @param {Object} options - Options
   * @returns {Promise<Array>} Results
   * @private
   */
  async _batchKillProcesses(processes, options) {
    const results = []
    
    // Process in batches to avoid overwhelming the system
    const batchSize = Math.min(this.config.batchSize, processes.length)
    
    for (let i = 0; i < processes.length; i += batchSize) {
      const batch = processes.slice(i, i + batchSize)
      const batchPromises = batch.map(async (process) => {
        try {
          const result = await this.killByPid(process.pid, {
            ...options,
            includeChildren: false // Already handled at higher level
          })
          return {
            pid: process.pid,
            name: process.name,
            success: result.success,
            method: result.method
          }
        } catch (error) {
          return {
            pid: process.pid,
            name: process.name,
            success: false,
            error: error.message
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Small delay between batches
      if (i + batchSize < processes.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }

  /**
   * Kill systemd service
   * @param {string} serviceName - Service name
   * @param {Object} options - Options
   * @param {number} startTime - Start time
   * @returns {Promise<Object>} Result
   * @private
   */
  async _killSystemdService(serviceName, options, startTime) {
    try {
      // Get service status first
      const statusResult = await execAsync(`systemctl is-active ${serviceName}`, {
        timeout: 5000
      }).catch(() => ({ stdout: 'inactive' }))
      
      if (statusResult.stdout.trim() === 'inactive') {
        return {
          success: true,
          serviceName: serviceName,
          message: 'Service already inactive',
          duration: Date.now() - startTime
        }
      }
      
      // Stop service
      let command = `systemctl stop ${serviceName}`
      if (options.force) {
        command = `systemctl kill --signal=SIGKILL ${serviceName}`
      }
      
      await execAsync(command, { timeout: options.timeout })
      
      // Verify service stopped
      const newStatus = await execAsync(`systemctl is-active ${serviceName}`, {
        timeout: 5000
      }).catch(() => ({ stdout: 'inactive' }))
      
      return {
        success: newStatus.stdout.trim() === 'inactive',
        serviceName: serviceName,
        method: 'systemctl',
        previousState: statusResult.stdout.trim(),
        currentState: newStatus.stdout.trim(),
        duration: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Systemctl operation failed: ${error.message}`)
    }
  }

  /**
   * Kill init.d service
   * @param {string} serviceName - Service name
   * @param {Object} options - Options
   * @param {number} startTime - Start time
   * @returns {Promise<Object>} Result
   * @private
   */
  async _killInitdService(serviceName, options, startTime) {
    try {
      const command = `service ${serviceName} stop`
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout
      })
      
      return {
        success: !stderr.includes('error') && !stderr.includes('failed'),
        serviceName: serviceName,
        method: 'service',
        output: stdout,
        duration: Date.now() - startTime
      }
    } catch (error) {
      throw new Error(`Service command failed: ${error.message}`)
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
      const command = `ps -p ${pid} -o pid,ppid,uid,gid,comm,args,etime,pcpu,pmem,vsz,rss,tty,stat --no-headers`
      const { stdout } = await execAsync(command, { timeout: 3000 })
      
      const line = stdout.trim()
      if (!line) return null
      
      return this._parseProcessLine(line, true)
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
      // Use kill -0 for fastest existence check
      process.kill(pid, 0)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Sort process tree for safe killing
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
   * Normalize signal to number
   * @param {string|number} signal - Signal
   * @returns {number|null} Signal number
   * @private
   */
  _normalizeSignal(signal) {
    if (typeof signal === 'number') {
      return signal > 0 && signal <= 31 ? signal : null
    }
    
    if (typeof signal === 'string') {
      const upperSignal = signal.toUpperCase()
      if (upperSignal.startsWith('SIG')) {
        return this.signals[upperSignal] || null
      } else {
        return this.signals[`SIG${upperSignal}`] || null
      }
    }
    
    return null
  }

  /**
   * Determine best ps format for platform
   * @returns {string} PS format string
   * @private
   */
  _determineBestPsFormat() {
    const platform = os.platform()
    
    // Different Unix variants have different ps options
    if (platform === 'darwin') {
      return 'pid,ppid,uid,gid,comm,command,etime,%cpu,%mem,vsz,rss,tty,stat'
    } else if (platform === 'linux') {
      return 'pid,ppid,uid,gid,comm,args,etime,pcpu,pmem,vsz,rss,tty,stat'
    } else {
      // Generic Unix format
      return 'pid,ppid,comm,args'
    }
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
      filtered = filtered.filter(p => 
        regex.test(p.name) || regex.test(p.command || '')
      )
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
   * Validate PID
   * @param {number} pid - Process ID
   * @returns {boolean} Valid PID
   * @private
   */
  _isValidPid(pid) {
    return Number.isInteger(pid) && pid > 0 && pid <= 4194304 // Linux max PID
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
      capabilities: this.capabilities,
      supportedSignals: Object.keys(this.signals)
    }
  }

  /**
   * Clear provider cache
   */
  clearCache() {
    this.processCache.clear()
    this.lastCacheUpdate = 0
  }
}

module.exports = UnixProvider