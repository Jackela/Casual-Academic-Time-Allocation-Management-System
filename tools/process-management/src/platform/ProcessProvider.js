/**
 * Unified Cross-Platform Process Provider
 *
 * Central abstraction layer providing consistent process management across:
 * - Windows (cmd.exe, PowerShell, Git Bash)
 * - macOS (bash, zsh, fish)
 * - Linux (bash, zsh, fish, systemd)
 * - FreeBSD/OpenBSD
 *
 * Features:
 * - Automatic platform detection and provider selection
 * - Unified API across all platforms
 * - Intelligent fallback mechanisms
 * - Performance optimization per platform
 * - Comprehensive error handling and recovery
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const PlatformDetector = require('./PlatformDetector')
const WindowsProvider = require('./WindowsProvider')
const UnixProvider = require('./UnixProvider')

/**
 * Unified cross-platform process management provider
 */
class ProcessProvider {
  constructor(config = {}) {
    this.config = {
      autoInitialize: true,
      platformDetectionTimeout: 10000,
      fallbackEnabled: true,
      caching: true,
      optimization: true,
      monitoring: true,
      auditLogging: true,
      ...config
    }
    
    // Core components
    this.platformDetector = new PlatformDetector()
    this.platformProvider = null
    this.fallbackProvider = null
    
    // Platform information
    this.platformInfo = null
    this.capabilities = null
    
    // Performance and monitoring
    this.statistics = {
      operationCount: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageOperationTime: 0,
      platformSwitches: 0,
      fallbackUses: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    
    // Operation cache
    this.operationCache = new Map()
    this.performanceProfile = new Map()
    
    // State management
    this.initialized = false
    this.initializing = false
    this.lastHealthCheck = 0
    
    // Auto-initialize if enabled
    if (this.config.autoInitialize) {
      this._scheduleInitialization()
    }
  }

  /**
   * Initialize the process provider
   * @param {boolean} forceReinit - Force reinitialization
   * @returns {Promise<void>}
   */
  async initialize(forceReinit = false) {
    if (this.initialized && !forceReinit) {
      return
    }
    
    if (this.initializing) {
      // Wait for current initialization to complete
      await this._waitForInitialization()
      return
    }
    
    this.initializing = true
    const initStartTime = Date.now()
    
    try {
      // Step 1: Detect platform and capabilities
      await this._detectPlatformAndCapabilities()
      
      // Step 2: Initialize appropriate provider
      await this._initializePlatformProvider()
      
      // Step 3: Setup fallback provider if needed
      await this._setupFallbackProvider()
      
      // Step 4: Validate provider functionality
      await this._validateProviderFunctionality()
      
      // Step 5: Setup optimization strategies
      this._setupOptimizations()
      
      // Step 6: Setup monitoring and health checks
      this._setupMonitoring()
      
      const initDuration = Date.now() - initStartTime
      this.initialized = true
      this.initializing = false
      
      if (this.config.auditLogging) {
        this._logAudit('provider_initialized', {
          platform: this.platformInfo.platform,
          provider: this.platformProvider.constructor.name,
          capabilities: Object.keys(this.capabilities).filter(k => this.capabilities[k]),
          initDuration: initDuration
        })
      }
    } catch (error) {
      this.initializing = false
      throw new Error(`ProcessProvider initialization failed: ${error.message}`)
    }
  }

  /**
   * Kill process by PID with cross-platform support
   * @param {number} pid - Process ID to kill
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killByPid(pid, options = {}) {
    await this._ensureInitialized()
    
    const normalizedOptions = this._normalizeKillOptions(options)
    const operationStartTime = Date.now()
    
    try {
      this.statistics.operationCount++
      
      // Check cache for recent operations
      const cacheKey = `killByPid_${pid}_${JSON.stringify(normalizedOptions)}`
      if (this.config.caching && this.operationCache.has(cacheKey)) {
        const cached = this.operationCache.get(cacheKey)
        if (Date.now() - cached.timestamp < 5000) { // 5 second cache
          this.statistics.cacheHits++
          return cached.result
        }
      }
      
      this.statistics.cacheMisses++
      
      // Execute operation with retry logic
      const result = await this._executeWithFallback(
        () => this.platformProvider.killByPid(pid, normalizedOptions),
        'killByPid',
        [pid, normalizedOptions]
      )
      
      // Cache successful results
      if (this.config.caching && result.success) {
        this.operationCache.set(cacheKey, {
          result: result,
          timestamp: Date.now()
        })
        
        // Cleanup old cache entries
        this._cleanupCache()
      }
      
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(true, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('process_killed', {
          pid: pid,
          success: result.success,
          method: result.method,
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      return {
        ...result,
        operationDuration: operationDuration,
        provider: this.platformProvider.constructor.name,
        platform: this.platformInfo.platform
      }
    } catch (error) {
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(false, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('process_kill_failed', {
          pid: pid,
          error: error.message,
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      throw new Error(`Failed to kill process ${pid}: ${error.message}`)
    }
  }

  /**
   * Kill processes by name/pattern with cross-platform support
   * @param {string} namePattern - Process name or pattern
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killByName(namePattern, options = {}) {
    await this._ensureInitialized()
    
    const normalizedOptions = this._normalizeKillOptions(options)
    const operationStartTime = Date.now()
    
    try {
      this.statistics.operationCount++
      
      const result = await this._executeWithFallback(
        () => this.platformProvider.killByName(namePattern, normalizedOptions),
        'killByName',
        [namePattern, normalizedOptions]
      )
      
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(true, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('processes_killed_by_name', {
          pattern: namePattern,
          killedCount: result.killedCount || 0,
          totalFound: result.totalFound || 0,
          success: result.success,
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      return {
        ...result,
        operationDuration: operationDuration,
        provider: this.platformProvider.constructor.name,
        platform: this.platformInfo.platform
      }
    } catch (error) {
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(false, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('kill_by_name_failed', {
          pattern: namePattern,
          error: error.message,
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      throw new Error(`Failed to kill processes by name ${namePattern}: ${error.message}`)
    }
  }

  /**
   * Kill process tree with cross-platform support
   * @param {number} rootPid - Root process ID
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killProcessTree(rootPid, options = {}) {
    await this._ensureInitialized()
    
    const normalizedOptions = this._normalizeKillOptions(options)
    const operationStartTime = Date.now()
    
    try {
      this.statistics.operationCount++
      
      const result = await this._executeWithFallback(
        () => this.platformProvider.killProcessTree(rootPid, normalizedOptions),
        'killProcessTree',
        [rootPid, normalizedOptions]
      )
      
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(true, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('process_tree_killed', {
          rootPid: rootPid,
          killedCount: result.killedCount || 0,
          totalProcesses: result.totalProcesses || 0,
          success: result.success,
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      return {
        ...result,
        operationDuration: operationDuration,
        provider: this.platformProvider.constructor.name,
        platform: this.platformInfo.platform
      }
    } catch (error) {
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(false, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('kill_process_tree_failed', {
          rootPid: rootPid,
          error: error.message,
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      throw new Error(`Failed to kill process tree ${rootPid}: ${error.message}`)
    }
  }

  /**
   * List running processes with cross-platform support
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of processes
   */
  async listProcesses(options = {}) {
    await this._ensureInitialized()
    
    const normalizedOptions = this._normalizeListOptions(options)
    const operationStartTime = Date.now()
    
    try {
      this.statistics.operationCount++
      
      // Check cache for process list
      const cacheKey = `listProcesses_${JSON.stringify(normalizedOptions)}`
      if (this.config.caching && this.operationCache.has(cacheKey)) {
        const cached = this.operationCache.get(cacheKey)
        const cacheTimeout = normalizedOptions.cacheTimeout || 30000
        if (Date.now() - cached.timestamp < cacheTimeout) {
          this.statistics.cacheHits++
          return cached.result
        }
      }
      
      this.statistics.cacheMisses++
      
      const result = await this._executeWithFallback(
        () => this.platformProvider.listProcesses(normalizedOptions),
        'listProcesses',
        [normalizedOptions]
      )
      
      // Cache results
      if (this.config.caching) {
        this.operationCache.set(cacheKey, {
          result: result,
          timestamp: Date.now()
        })
      }
      
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(true, operationDuration)
      
      return result.map(process => ({
        ...process,
        provider: this.platformProvider.constructor.name,
        platform: this.platformInfo.platform
      }))
    } catch (error) {
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(false, operationDuration)
      
      throw new Error(`Failed to list processes: ${error.message}`)
    }
  }

  /**
   * Get detailed process information with cross-platform support
   * @param {number} pid - Process ID
   * @returns {Promise<Object|null>} Process information
   */
  async getProcessInfo(pid) {
    await this._ensureInitialized()
    
    const operationStartTime = Date.now()
    
    try {
      this.statistics.operationCount++
      
      const result = await this._executeWithFallback(
        () => this.platformProvider.getProcessInfo(pid),
        'getProcessInfo',
        [pid]
      )
      
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(true, operationDuration)
      
      if (result) {
        return {
          ...result,
          provider: this.platformProvider.constructor.name,
          platform: this.platformInfo.platform
        }
      }
      
      return result
    } catch (error) {
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(false, operationDuration)
      
      throw new Error(`Failed to get process info for PID ${pid}: ${error.message}`)
    }
  }

  /**
   * Check if process exists with cross-platform support
   * @param {number} pid - Process ID
   * @returns {Promise<boolean>} Process existence
   */
  async processExists(pid) {
    await this._ensureInitialized()
    
    try {
      this.statistics.operationCount++
      
      const result = await this._executeWithFallback(
        () => this.platformProvider.processExists(pid),
        'processExists',
        [pid]
      )
      
      this._updateStatistics(true, 0)
      return result
    } catch (error) {
      this._updateStatistics(false, 0)
      return false
    }
  }

  /**
   * Kill system service (where supported)
   * @param {string} serviceName - Service name
   * @param {Object} options - Kill options
   * @returns {Promise<Object>} Kill operation result
   */
  async killService(serviceName, options = {}) {
    await this._ensureInitialized()
    
    if (!this.capabilities.killByService) {
      throw new Error('Service management not supported on this platform')
    }
    
    const normalizedOptions = this._normalizeKillOptions(options)
    const operationStartTime = Date.now()
    
    try {
      this.statistics.operationCount++
      
      const result = await this._executeWithFallback(
        () => this.platformProvider.killService(serviceName, normalizedOptions),
        'killService',
        [serviceName, normalizedOptions]
      )
      
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(true, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('service_killed', {
          serviceName: serviceName,
          success: result.success,
          method: result.method || 'unknown',
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      return {
        ...result,
        operationDuration: operationDuration,
        provider: this.platformProvider.constructor.name,
        platform: this.platformInfo.platform
      }
    } catch (error) {
      const operationDuration = Date.now() - operationStartTime
      this._updateStatistics(false, operationDuration)
      
      if (this.config.auditLogging) {
        this._logAudit('kill_service_failed', {
          serviceName: serviceName,
          error: error.message,
          duration: operationDuration,
          platform: this.platformInfo.platform
        })
      }
      
      throw new Error(`Failed to kill service ${serviceName}: ${error.message}`)
    }
  }

  /**
   * Send signal to process (Unix-specific, throws on Windows)
   * @param {number} pid - Process ID
   * @param {string|number} signal - Signal to send
   * @returns {Promise<Object>} Signal result
   */
  async sendSignal(pid, signal) {
    await this._ensureInitialized()
    
    if (!this.capabilities.signalSupport) {
      throw new Error('Signal support not available on this platform')
    }
    
    try {
      this.statistics.operationCount++
      
      const result = await this._executeWithFallback(
        () => this.platformProvider.sendSignal(pid, signal),
        'sendSignal',
        [pid, signal]
      )
      
      this._updateStatistics(true, 0)
      
      if (this.config.auditLogging) {
        this._logAudit('signal_sent', {
          pid: pid,
          signal: signal,
          success: result.success,
          platform: this.platformInfo.platform
        })
      }
      
      return {
        ...result,
        provider: this.platformProvider.constructor.name,
        platform: this.platformInfo.platform
      }
    } catch (error) {
      this._updateStatistics(false, 0)
      
      if (this.config.auditLogging) {
        this._logAudit('send_signal_failed', {
          pid: pid,
          signal: signal,
          error: error.message,
          platform: this.platformInfo.platform
        })
      }
      
      throw new Error(`Failed to send signal ${signal} to process ${pid}: ${error.message}`)
    }
  }

  /**
   * Get provider capabilities
   * @returns {Object} Combined capabilities
   */
  getCapabilities() {
    if (!this.capabilities) {
      return {
        initialized: false,
        message: 'Provider not initialized'
      }
    }
    
    return {
      ...this.capabilities,
      platform: this.platformInfo.platform,
      provider: this.platformProvider ? this.platformProvider.constructor.name : null,
      fallbackAvailable: !!this.fallbackProvider,
      initialized: this.initialized
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Provider statistics
   */
  getStatistics() {
    const baseStats = { ...this.statistics }
    
    // Add platform-specific statistics
    if (this.platformProvider && typeof this.platformProvider.getStatistics === 'function') {
      baseStats.platformProviderStats = this.platformProvider.getStatistics()
    }
    
    // Add performance profile
    baseStats.performanceProfile = Object.fromEntries(this.performanceProfile)
    
    // Add cache statistics
    baseStats.cacheSize = this.operationCache.size
    baseStats.cacheEfficiency = baseStats.cacheHits > 0 
      ? (baseStats.cacheHits / (baseStats.cacheHits + baseStats.cacheMisses)) * 100 
      : 0
    
    return baseStats
  }

  /**
   * Get platform information
   * @returns {Object|null} Platform information
   */
  getPlatformInfo() {
    return this.platformInfo
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.operationCache.clear()
    this.statistics.cacheHits = 0
    this.statistics.cacheMisses = 0
    
    if (this.platformProvider && typeof this.platformProvider.clearCache === 'function') {
      this.platformProvider.clearCache()
    }
    
    if (this.fallbackProvider && typeof this.fallbackProvider.clearCache === 'function') {
      this.fallbackProvider.clearCache()
    }
  }

  /**
   * Perform health check
   * @returns {Promise<Object>} Health status
   */
  async performHealthCheck() {
    const healthCheck = {
      timestamp: Date.now(),
      initialized: this.initialized,
      platform: this.platformInfo ? this.platformInfo.platform : 'unknown',
      provider: this.platformProvider ? this.platformProvider.constructor.name : 'none',
      capabilities: this.capabilities,
      statistics: this.getStatistics(),
      issues: []
    }
    
    try {
      // Test basic functionality
      if (this.initialized) {
        const testProcesses = await this.listProcesses({ maxResults: 5 })
        healthCheck.basicFunctionality = testProcesses.length >= 0
        
        // Test process existence check
        const currentPid = process.pid
        const selfExists = await this.processExists(currentPid)
        healthCheck.selfCheck = selfExists
        
        if (!selfExists) {
          healthCheck.issues.push('Self process existence check failed')
        }
      }
      
      // Check for performance issues
      if (this.statistics.averageOperationTime > 5000) {
        healthCheck.issues.push('Average operation time exceeds 5 seconds')
      }
      
      // Check failure rate
      const failureRate = this.statistics.operationCount > 0 
        ? (this.statistics.failedOperations / this.statistics.operationCount) * 100 
        : 0
      
      if (failureRate > 10) {
        healthCheck.issues.push(`High failure rate: ${failureRate.toFixed(2)}%`)
      }
      
      healthCheck.healthy = healthCheck.issues.length === 0
      this.lastHealthCheck = Date.now()
      
      return healthCheck
    } catch (error) {
      healthCheck.healthy = false
      healthCheck.issues.push(`Health check failed: ${error.message}`)
      return healthCheck
    }
  }

  /**
   * Reinitialize the provider (useful for platform changes or recovery)
   * @returns {Promise<void>}
   */
  async reinitialize() {
    this.initialized = false
    this.initializing = false
    this.platformInfo = null
    this.capabilities = null
    this.platformProvider = null
    this.fallbackProvider = null
    
    this.clearCache()
    
    await this.initialize(true)
  }

  // Private methods

  /**
   * Schedule initialization
   * @private
   */
  _scheduleInitialization() {
    // Use setTimeout to avoid blocking constructor
    setTimeout(async () => {
      try {
        await this.initialize()
      } catch (error) {
        console.error('Auto-initialization failed:', error.message)
      }
    }, 0)
  }

  /**
   * Wait for initialization to complete
   * @returns {Promise<void>}
   * @private
   */
  async _waitForInitialization() {
    const maxWait = this.config.platformDetectionTimeout
    const startTime = Date.now()
    
    while (this.initializing && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    if (this.initializing) {
      throw new Error('Initialization timeout')
    }
  }

  /**
   * Ensure provider is initialized
   * @returns {Promise<void>}
   * @private
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      if (!this.initializing) {
        await this.initialize()
      } else {
        await this._waitForInitialization()
      }
    }
  }

  /**
   * Detect platform and capabilities
   * @returns {Promise<void>}
   * @private
   */
  async _detectPlatformAndCapabilities() {
    this.platformInfo = await this.platformDetector.detectPlatform()
    
    // Basic capability detection
    this.capabilities = {
      killByPid: true,
      killByName: true,
      killProcessTree: true,
      killByService: this.platformInfo.platform === 'win32' || 
                    this.platformInfo.tools.available.includes('systemctl'),
      queryProcesses: true,
      queryServices: this.platformInfo.platform === 'win32' || 
                     this.platformInfo.tools.available.includes('systemctl'),
      signalSupport: this.platformInfo.family === 'Unix',
      privilegedOperations: this.platformInfo.platform === 'win32' || 
                           (process.getuid && process.getuid() === 0),
      processMonitoring: true
    }
  }

  /**
   * Initialize platform-specific provider
   * @returns {Promise<void>}
   * @private
   */
  async _initializePlatformProvider() {
    const recommendedProvider = await this.platformDetector.getRecommendedProvider()
    
    if (recommendedProvider === 'WindowsProvider') {
      this.platformProvider = new WindowsProvider(this.config)
    } else if (recommendedProvider === 'UnixProvider') {
      this.platformProvider = new UnixProvider(this.config)
    } else {
      throw new Error(`Unknown recommended provider: ${recommendedProvider}`)
    }
    
    await this.platformProvider.initialize()
    
    // Update capabilities with provider-specific capabilities
    const providerCapabilities = this.platformProvider.getCapabilities()
    this.capabilities = { ...this.capabilities, ...providerCapabilities }
  }

  /**
   * Setup fallback provider
   * @returns {Promise<void>}
   * @private
   */
  async _setupFallbackProvider() {
    if (!this.config.fallbackEnabled) {
      return
    }
    
    try {
      // Create opposite provider as fallback
      if (this.platformProvider instanceof WindowsProvider) {
        // No fallback for Windows (Unix commands won't work)
        return
      } else if (this.platformProvider instanceof UnixProvider) {
        // No fallback for Unix (Windows commands won't work)
        return
      }
    } catch (error) {
      // Fallback provider initialization failed - this is acceptable
      console.warn('Fallback provider initialization failed:', error.message)
    }
  }

  /**
   * Validate provider functionality
   * @returns {Promise<void>}
   * @private
   */
  async _validateProviderFunctionality() {
    try {
      // Test basic operations
      const testPid = process.pid
      const exists = await this.platformProvider.processExists(testPid)
      
      if (!exists) {
        throw new Error('Provider failed basic functionality test')
      }
      
      // Test process listing
      const processes = await this.platformProvider.listProcesses({ maxResults: 5 })
      
      if (!Array.isArray(processes)) {
        throw new Error('Provider process listing failed')
      }
    } catch (error) {
      throw new Error(`Provider validation failed: ${error.message}`)
    }
  }

  /**
   * Setup optimization strategies
   * @private
   */
  _setupOptimizations() {
    if (!this.config.optimization) {
      return
    }
    
    // Platform-specific optimizations
    const performance = this.platformInfo.performance
    
    if (performance) {
      // Adjust cache timeout based on platform performance
      const cacheTimeout = Math.max(
        15000, // Minimum 15 seconds
        Math.min(60000, performance.operations.processQuery.averageTime * 10) // Maximum 1 minute
      )
      
      this.config.cacheTimeout = cacheTimeout
    }
  }

  /**
   * Setup monitoring and health checks
   * @private
   */
  _setupMonitoring() {
    if (!this.config.monitoring) {
      return
    }
    
    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.warn('Health check failed:', error.message)
      }
    }, 300000) // Every 5 minutes
    
    // Setup performance monitoring
    this.performanceInterval = setInterval(() => {
      this._updatePerformanceProfile()
    }, 60000) // Every minute
  }

  /**
   * Execute operation with fallback support
   * @param {Function} operation - Operation to execute
   * @param {string} operationName - Operation name
   * @param {Array} args - Operation arguments
   * @returns {Promise<*>} Operation result
   * @private
   */
  async _executeWithFallback(operation, operationName, args) {
    try {
      return await operation()
    } catch (error) {
      // Try fallback provider if available
      if (this.fallbackProvider && this.config.fallbackEnabled) {
        try {
          this.statistics.fallbackUses++
          
          const fallbackMethod = this.fallbackProvider[operationName]
          if (typeof fallbackMethod === 'function') {
            return await fallbackMethod.apply(this.fallbackProvider, args)
          }
        } catch (fallbackError) {
          // Both providers failed
          throw new Error(`Primary and fallback providers failed: ${error.message}, ${fallbackError.message}`)
        }
      }
      
      throw error
    }
  }

  /**
   * Normalize kill options across platforms
   * @param {Object} options - Original options
   * @returns {Object} Normalized options
   * @private
   */
  _normalizeKillOptions(options) {
    const normalized = { ...options }
    
    // Normalize timeout
    if (!normalized.timeout) {
      normalized.timeout = this.config.defaultTimeout || 10000
    }
    
    // Platform-specific normalizations
    if (this.platformInfo.platform === 'win32') {
      // Windows doesn't support signals
      if (normalized.signal) {
        normalized.force = normalized.signal === 'SIGKILL' || normalized.signal === 9
        delete normalized.signal
      }
    } else {
      // Unix platforms - normalize signal
      if (normalized.force && !normalized.signal) {
        normalized.signal = 'SIGKILL'
      } else if (!normalized.signal) {
        normalized.signal = 'SIGTERM'
      }
    }
    
    return normalized
  }

  /**
   * Normalize list options
   * @param {Object} options - Original options
   * @returns {Object} Normalized options
   * @private
   */
  _normalizeListOptions(options) {
    const normalized = { ...options }
    
    // Set reasonable defaults
    if (!normalized.maxResults) {
      normalized.maxResults = 1000
    }
    
    if (normalized.useCache === undefined) {
      normalized.useCache = this.config.caching
    }
    
    return normalized
  }

  /**
   * Update operation statistics
   * @param {boolean} success - Operation success
   * @param {number} duration - Operation duration
   * @private
   */
  _updateStatistics(success, duration) {
    if (success) {
      this.statistics.successfulOperations++
    } else {
      this.statistics.failedOperations++
    }
    
    // Update average operation time
    if (duration > 0) {
      const totalOps = this.statistics.successfulOperations + this.statistics.failedOperations
      this.statistics.averageOperationTime = 
        (this.statistics.averageOperationTime * (totalOps - 1) + duration) / totalOps
    }
  }

  /**
   * Update performance profile
   * @private
   */
  _updatePerformanceProfile() {
    const now = Date.now()
    const profileKey = Math.floor(now / 60000) // Per minute
    
    const currentProfile = this.performanceProfile.get(profileKey) || {
      operations: 0,
      averageTime: 0,
      successRate: 0
    }
    
    currentProfile.operations = this.statistics.operationCount
    currentProfile.averageTime = this.statistics.averageOperationTime
    currentProfile.successRate = this.statistics.operationCount > 0 
      ? (this.statistics.successfulOperations / this.statistics.operationCount) * 100 
      : 0
    
    this.performanceProfile.set(profileKey, currentProfile)
    
    // Cleanup old profiles (keep last 60 minutes)
    const cutoff = profileKey - 60
    for (const key of this.performanceProfile.keys()) {
      if (key < cutoff) {
        this.performanceProfile.delete(key)
      }
    }
  }

  /**
   * Cleanup operation cache
   * @private
   */
  _cleanupCache() {
    const now = Date.now()
    const maxAge = 300000 // 5 minutes
    
    for (const [key, value] of this.operationCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.operationCache.delete(key)
      }
    }
  }

  /**
   * Log audit event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  _logAudit(event, data) {
    if (!this.config.auditLogging) {
      return
    }
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      provider: 'ProcessProvider',
      platform: this.platformInfo ? this.platformInfo.platform : 'unknown',
      ...data
    }
    
    // In a real implementation, this would go to a proper logging system
    console.log('[AUDIT]', JSON.stringify(auditEntry))
  }

  /**
   * Cleanup resources on shutdown
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval)
    }
    
    this.clearCache()
    
    if (this.platformProvider && typeof this.platformProvider.destroy === 'function') {
      this.platformProvider.destroy()
    }
    
    if (this.fallbackProvider && typeof this.fallbackProvider.destroy === 'function') {
      this.fallbackProvider.destroy()
    }
    
    this.initialized = false
  }
}

module.exports = ProcessProvider