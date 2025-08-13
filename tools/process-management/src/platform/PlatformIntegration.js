/**
 * Platform Integration Layer
 *
 * Seamless integration between the new platform abstraction layer
 * and existing process management components:
 * - ProcessOrchestrator integration
 * - ProcessRegistry enhancement
 * - Backward compatibility maintenance
 * - Performance optimization coordination
 * - Monitoring and audit integration
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const ProcessProvider = require('./ProcessProvider')
const OptimizationEngine = require('./OptimizationEngine')

/**
 * Integration layer for platform-aware process management
 */
class PlatformIntegration {
  constructor(orchestrator, config = {}) {
    this.orchestrator = orchestrator
    this.config = {
      enableOptimization: true,
      enableAuditLogging: true,
      enablePerformanceMonitoring: true,
      enableFallbackSupport: true,
      ...config
    }
    
    // Core components
    this.processProvider = null
    this.optimizationEngine = null
    
    // Integration state
    this.initialized = false
    this.platformInfo = null
    this.capabilities = null
    
    // Performance tracking
    this.integrationMetrics = {
      operationsHandled: 0,
      optimizationsApplied: 0,
      fallbacksUsed: 0,
      averageLatency: 0,
      errorRate: 0
    }
    
    // Audit logging
    this.auditLogger = orchestrator.auditLogger
  }

  /**
   * Initialize platform integration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return
    }
    
    const initStartTime = Date.now()
    
    try {
      // Initialize process provider
      this.processProvider = new ProcessProvider({
        autoInitialize: false,
        caching: this.config.enableOptimization,
        optimization: this.config.enableOptimization,
        auditLogging: this.config.enableAuditLogging
      })
      
      await this.processProvider.initialize()
      
      // Get platform information and capabilities
      this.platformInfo = this.processProvider.getPlatformInfo()
      this.capabilities = this.processProvider.getCapabilities()
      
      // Initialize optimization engine
      if (this.config.enableOptimization) {
        this.optimizationEngine = new OptimizationEngine(this.platformInfo, {
          enableCaching: true,
          enableBatching: true,
          enableProfiling: this.config.enablePerformanceMonitoring
        })
      }
      
      // Integrate with orchestrator
      await this._integrateWithOrchestrator()
      
      // Enhance registry with platform capabilities
      await this._enhanceProcessRegistry()
      
      // Setup monitoring
      this._setupMonitoring()
      
      const initDuration = Date.now() - initStartTime
      this.initialized = true
      
      if (this.auditLogger) {
        this.auditLogger.info('Platform integration initialized', {
          platform: this.platformInfo.platform,
          provider: this.capabilities.provider,
          capabilities: Object.keys(this.capabilities).filter(k => this.capabilities[k]),
          optimizationEnabled: !!this.optimizationEngine,
          initDuration: initDuration
        })
      }
    } catch (error) {
      throw new Error(`Platform integration initialization failed: ${error.message}`)
    }
  }

  /**
   * Execute process operation with platform optimization
   * @param {Object} operation - Operation to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Operation result
   */
  async executeOperation(operation, options = {}) {
    if (!this.initialized) {
      await this.initialize()
    }
    
    const operationStartTime = Date.now()
    let optimizedParams = options
    let appliedOptimizations = []
    
    try {
      this.integrationMetrics.operationsHandled++
      
      // Apply optimizations if enabled
      if (this.optimizationEngine && operation.type) {
        const optimizationResult = this.optimizationEngine.optimize(operation.type, options)
        
        // Handle cached results
        if (optimizationResult.cached && optimizationResult.result) {
          return {
            ...optimizationResult.result,
            cached: true,
            appliedOptimizations: optimizationResult.appliedOptimizations,
            executionTime: Date.now() - operationStartTime,
            source: 'cache'
          }
        }
        
        optimizedParams = optimizationResult.params
        appliedOptimizations = optimizationResult.appliedOptimizations
        this.integrationMetrics.optimizationsApplied += appliedOptimizations.length
      }
      
      // Execute operation based on type
      let result = null
      
      switch (operation.type) {
        case 'killByPid':
          result = await this._executeKillByPid(operation, optimizedParams)
          break
          
        case 'killByName':
          result = await this._executeKillByName(operation, optimizedParams)
          break
          
        case 'killProcessTree':
          result = await this._executeKillProcessTree(operation, optimizedParams)
          break
          
        case 'listProcesses':
          result = await this._executeListProcesses(operation, optimizedParams)
          break
          
        case 'getProcessInfo':
          result = await this._executeGetProcessInfo(operation, optimizedParams)
          break
          
        case 'killService':
          result = await this._executeKillService(operation, optimizedParams)
          break
          
        default:
          // Fall back to original orchestrator execution
          result = await this._executeFallbackOperation(operation, optimizedParams)
          this.integrationMetrics.fallbacksUsed++
      }
      
      const executionTime = Date.now() - operationStartTime
      
      // Record operation for optimization learning
      if (this.optimizationEngine) {
        this.optimizationEngine.recordOperation(
          operation.type, 
          optimizedParams, 
          result, 
          executionTime
        )
      }
      
      // Update integration metrics
      this._updateIntegrationMetrics(true, executionTime)
      
      // Audit logging
      if (this.auditLogger) {
        this.auditLogger.info('Platform operation executed', {
          operationType: operation.type,
          success: result.success,
          executionTime: executionTime,
          appliedOptimizations: appliedOptimizations,
          platform: this.platformInfo.platform,
          provider: this.capabilities.provider
        })
      }
      
      return {
        ...result,
        appliedOptimizations: appliedOptimizations,
        executionTime: executionTime,
        platform: this.platformInfo.platform,
        provider: this.capabilities.provider
      }
      
    } catch (error) {
      const executionTime = Date.now() - operationStartTime
      this._updateIntegrationMetrics(false, executionTime)
      
      if (this.auditLogger) {
        this.auditLogger.error('Platform operation failed', {
          operationType: operation.type,
          error: error.message,
          executionTime: executionTime,
          appliedOptimizations: appliedOptimizations,
          platform: this.platformInfo.platform
        })
      }
      
      throw error
    }
  }

  /**
   * Get enhanced process list with platform-specific information
   * @param {Object} options - List options
   * @returns {Promise<Array>} Enhanced process list
   */
  async getEnhancedProcessList(options = {}) {
    if (!this.initialized) {
      await this.initialize()
    }
    
    try {
      const processes = await this.processProvider.listProcesses(options)
      
      // Enhance with registry information
      const enhancedProcesses = []
      
      for (const process of processes) {
        const registryInfo = await this._getRegistryInfo(process.pid)
        const enhanced = {
          ...process,
          tracked: !!registryInfo,
          sessionId: registryInfo?.sessionId || null,
          registeredAt: registryInfo?.registeredAt || null,
          platformCapabilities: this._getProcessCapabilities(process)
        }
        
        enhancedProcesses.push(enhanced)
      }
      
      return enhancedProcesses
    } catch (error) {
      throw new Error(`Failed to get enhanced process list: ${error.message}`)
    }
  }

  /**
   * Get comprehensive system information
   * @returns {Promise<Object>} System information
   */
  async getSystemInfo() {
    if (!this.initialized) {
      await this.initialize()
    }
    
    const systemInfo = {
      platform: this.platformInfo,
      capabilities: this.capabilities,
      performance: this.processProvider.getStatistics(),
      registry: this.orchestrator.registry ? this.orchestrator.registry.getStatistics() : null,
      integration: this.getIntegrationMetrics(),
      optimization: this.optimizationEngine ? this.optimizationEngine.getMetrics() : null,
      timestamp: new Date().toISOString()
    }
    
    // Add health status
    systemInfo.health = await this.performHealthCheck()
    
    return systemInfo
  }

  /**
   * Perform comprehensive health check
   * @returns {Promise<Object>} Health status
   */
  async performHealthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: true,
      components: {},
      issues: [],
      recommendations: []
    }
    
    try {
      // Check process provider health
      if (this.processProvider) {
        healthStatus.components.processProvider = await this.processProvider.performHealthCheck()
        if (!healthStatus.components.processProvider.healthy) {
          healthStatus.overall = false
          healthStatus.issues.push(...healthStatus.components.processProvider.issues)
        }
      }
      
      // Check optimization engine health
      if (this.optimizationEngine) {
        const optimizationMetrics = this.optimizationEngine.getMetrics()
        const recommendations = this.optimizationEngine.getRecommendations()
        
        healthStatus.components.optimization = {
          healthy: recommendations.filter(r => r.priority === 'high').length === 0,
          metrics: optimizationMetrics,
          recommendations: recommendations
        }
        
        if (!healthStatus.components.optimization.healthy) {
          healthStatus.issues.push('Performance optimization issues detected')
        }
        
        healthStatus.recommendations.push(...recommendations)
      }
      
      // Check integration metrics
      const errorRate = this.integrationMetrics.operationsHandled > 0 
        ? (this.integrationMetrics.operationsHandled - this._getSuccessfulOperations()) / this.integrationMetrics.operationsHandled
        : 0
      
      healthStatus.components.integration = {
        healthy: errorRate < 0.1, // Less than 10% error rate
        errorRate: errorRate,
        metrics: this.getIntegrationMetrics()
      }
      
      if (!healthStatus.components.integration.healthy) {
        healthStatus.overall = false
        healthStatus.issues.push(`High integration error rate: ${(errorRate * 100).toFixed(2)}%`)
      }
      
    } catch (error) {
      healthStatus.overall = false
      healthStatus.issues.push(`Health check failed: ${error.message}`)
    }
    
    return healthStatus
  }

  /**
   * Get integration performance metrics
   * @returns {Object} Integration metrics
   */
  getIntegrationMetrics() {
    return {
      ...this.integrationMetrics,
      optimizationEngine: this.optimizationEngine ? this.optimizationEngine.getMetrics() : null,
      processProvider: this.processProvider ? this.processProvider.getStatistics() : null,
      uptime: this.initialized ? Date.now() - this.initTime : 0
    }
  }

  // Private methods

  /**
   * Integrate with ProcessOrchestrator
   * @returns {Promise<void>}
   * @private
   */
  async _integrateWithOrchestrator() {
    // Replace or enhance orchestrator's process management methods
    const originalExecuteOperation = this.orchestrator.executeOperation.bind(this.orchestrator)
    
    this.orchestrator.executeOperation = async (operation, options) => {
      // Check if this is a process management operation that can be enhanced
      if (this._isProcessManagementOperation(operation)) {
        return await this.executeOperation(operation, options)
      } else {
        // Use original orchestrator for non-process operations
        return await originalExecuteOperation(operation, options)
      }
    }
    
    // Add platform-specific methods
    this.orchestrator.getPlatformInfo = () => this.platformInfo
    this.orchestrator.getPlatformCapabilities = () => this.capabilities
    this.orchestrator.getSystemInfo = () => this.getSystemInfo()
  }

  /**
   * Enhance ProcessRegistry with platform capabilities
   * @returns {Promise<void>}
   * @private
   */
  async _enhanceProcessRegistry() {
    if (!this.orchestrator.registry) {
      return
    }
    
    const registry = this.orchestrator.registry
    
    // Enhance process registration with platform info
    const originalRegisterProcess = registry.registerProcess.bind(registry)
    registry.registerProcess = (sessionId, processInfo) => {
      const enhancedProcessInfo = {
        ...processInfo,
        platform: this.platformInfo.platform,
        capabilities: this._getProcessCapabilities(processInfo),
        registrationMethod: 'platform-enhanced'
      }
      
      return originalRegisterProcess(sessionId, enhancedProcessInfo)
    }
    
    // Add platform-specific query methods
    registry.getProcessesByPlatform = (platform) => {
      const allProcesses = []
      for (const [sessionId, processIds] of registry.sessionProcesses) {
        for (const processId of processIds) {
          const process = registry.trackedProcesses.get(processId)
          if (process && process.platform === platform) {
            allProcesses.push(process)
          }
        }
      }
      return allProcesses
    }
    
    registry.getPlatformStatistics = () => {
      const stats = { platforms: {}, capabilities: {} }
      
      for (const process of registry.trackedProcesses.values()) {
        if (process.platform) {
          stats.platforms[process.platform] = (stats.platforms[process.platform] || 0) + 1
        }
        
        if (process.capabilities) {
          for (const cap of Object.keys(process.capabilities)) {
            if (process.capabilities[cap]) {
              stats.capabilities[cap] = (stats.capabilities[cap] || 0) + 1
            }
          }
        }
      }
      
      return stats
    }
  }

  /**
   * Setup monitoring and metrics collection
   * @private
   */
  _setupMonitoring() {
    if (!this.config.enablePerformanceMonitoring) {
      return
    }
    
    // Set up periodic metrics collection
    this.metricsInterval = setInterval(() => {
      this._collectMetrics()
    }, 60000) // Every minute
    
    // Set up health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.warn('Integration health check failed:', error.message)
      }
    }, 300000) // Every 5 minutes
  }

  /**
   * Execute kill by PID operation
   * @param {Object} operation - Operation details
   * @param {Object} params - Optimized parameters
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _executeKillByPid(operation, params) {
    const { pid } = operation
    const result = await this.processProvider.killByPid(pid, params)
    
    // Update registry if process was tracked
    if (result.success && this.orchestrator.registry) {
      this.orchestrator.registry.updateProcessStatus(pid, 'terminated', {
        terminatedBy: 'platform-integration',
        terminationMethod: result.method
      })
    }
    
    return result
  }

  /**
   * Execute kill by name operation
   * @param {Object} operation - Operation details
   * @param {Object} params - Optimized parameters
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _executeKillByName(operation, params) {
    const { namePattern } = operation
    return await this.processProvider.killByName(namePattern, params)
  }

  /**
   * Execute kill process tree operation
   * @param {Object} operation - Operation details
   * @param {Object} params - Optimized parameters
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _executeKillProcessTree(operation, params) {
    const { rootPid } = operation
    return await this.processProvider.killProcessTree(rootPid, params)
  }

  /**
   * Execute list processes operation
   * @param {Object} operation - Operation details
   * @param {Object} params - Optimized parameters
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _executeListProcesses(operation, params) {
    const processes = await this.processProvider.listProcesses(params)
    return { success: true, processes: processes, count: processes.length }
  }

  /**
   * Execute get process info operation
   * @param {Object} operation - Operation details
   * @param {Object} params - Optimized parameters
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _executeGetProcessInfo(operation, params) {
    const { pid } = operation
    const processInfo = await this.processProvider.getProcessInfo(pid)
    return { 
      success: !!processInfo, 
      processInfo: processInfo,
      exists: !!processInfo
    }
  }

  /**
   * Execute kill service operation
   * @param {Object} operation - Operation details
   * @param {Object} params - Optimized parameters
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _executeKillService(operation, params) {
    const { serviceName } = operation
    return await this.processProvider.killService(serviceName, params)
  }

  /**
   * Execute fallback operation using original orchestrator
   * @param {Object} operation - Operation details
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} Operation result
   * @private
   */
  async _executeFallbackOperation(operation, params) {
    // Use the original orchestrator lifecycle manager
    return await this.orchestrator.lifecycleManager.executeOperation(operation, params)
  }

  /**
   * Check if operation is process management related
   * @param {Object} operation - Operation to check
   * @returns {boolean} Is process management operation
   * @private
   */
  _isProcessManagementOperation(operation) {
    const processOperations = [
      'killByPid', 
      'killByName', 
      'killProcessTree', 
      'listProcesses', 
      'getProcessInfo',
      'killService'
    ]
    
    return processOperations.includes(operation.type)
  }

  /**
   * Get registry information for a process
   * @param {number} pid - Process ID
   * @returns {Promise<Object|null>} Registry information
   * @private
   */
  async _getRegistryInfo(pid) {
    if (!this.orchestrator.registry) {
      return null
    }
    
    for (const [trackingId, process] of this.orchestrator.registry.trackedProcesses) {
      if (process.pid === pid) {
        return process
      }
    }
    
    return null
  }

  /**
   * Get process-specific capabilities
   * @param {Object} processInfo - Process information
   * @returns {Object} Process capabilities
   * @private
   */
  _getProcessCapabilities(processInfo) {
    const capabilities = {}
    
    if (this.capabilities.signalSupport && this.platformInfo.family === 'Unix') {
      capabilities.signalTermination = true
      capabilities.gracefulShutdown = true
    }
    
    if (this.capabilities.killProcessTree) {
      capabilities.treeTermination = true
    }
    
    if (this.capabilities.privilegedOperations) {
      capabilities.privilegedAccess = true
    }
    
    return capabilities
  }

  /**
   * Update integration metrics
   * @param {boolean} success - Operation success
   * @param {number} executionTime - Execution time
   * @private
   */
  _updateIntegrationMetrics(success, executionTime) {
    // Update average latency
    this.integrationMetrics.averageLatency = 
      (this.integrationMetrics.averageLatency * 0.9) + (executionTime * 0.1)
    
    // Update error rate
    this.integrationMetrics.errorRate = 
      (this.integrationMetrics.errorRate * 0.9) + (success ? 0 : 0.1)
  }

  /**
   * Get successful operations count
   * @returns {number} Successful operations
   * @private
   */
  _getSuccessfulOperations() {
    return Math.floor(this.integrationMetrics.operationsHandled * (1 - this.integrationMetrics.errorRate))
  }

  /**
   * Collect performance metrics
   * @private
   */
  _collectMetrics() {
    // This would collect and aggregate metrics from all components
    // For now, we just update the timestamp
    this.lastMetricsUpdate = Date.now()
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    if (this.processProvider) {
      this.processProvider.destroy()
    }
    
    this.initialized = false
  }
}

module.exports = PlatformIntegration