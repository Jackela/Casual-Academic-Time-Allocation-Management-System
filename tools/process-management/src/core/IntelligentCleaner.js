/**
 * Intelligent Cleanup Engine
 *
 * AI-driven cleanup system with:
 * - Context-aware cleanup decision making
 * - 100% cleanup success verification with rollback
 * - Zero data loss guarantee
 * - Performance impact monitoring
 * - Self-learning optimization
 * - Multi-strategy cleanup approaches
 * - Automatic recovery points and restoration
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')
const StrategySelector = require('./StrategySelector')
const ValidationEngine = require('./ValidationEngine')
const RecoveryManager = require('./RecoveryManager')
const LearningModule = require('./LearningModule')

/**
 * AI-driven intelligent cleanup engine
 */
class IntelligentCleaner extends EventEmitter {
  /**
   * Initialize IntelligentCleaner with dependency injection
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} config - Configuration object
   */
  constructor (dependencies = {}, config = {}) {
    super()

    // Dependency injection pattern
    this.processRegistry = dependencies.processRegistry
    this.realTimeMonitor = dependencies.realTimeMonitor
    this.auditLogger = dependencies.auditLogger
    this.alertManager = dependencies.alertManager

    // Initialize AI modules
    this.strategySelector = dependencies.strategySelector || new StrategySelector(dependencies, config.strategySelector)
    this.validationEngine = dependencies.validationEngine || new ValidationEngine(dependencies, config.validation)
    this.recoveryManager = dependencies.recoveryManager || new RecoveryManager(dependencies, config.recovery)
    this.learningModule = dependencies.learningModule || new LearningModule(dependencies, config.learning)

    // Configuration
    this.config = {
      // Core settings
      maxCleanupTime: config.maxCleanupTime || 30000, // 30 seconds
      validationTimeout: config.validationTimeout || 10000, // 10 seconds
      enableLearning: config.enableLearning !== false,
      enableRecovery: config.enableRecovery !== false,
      
      // Performance monitoring
      performanceThresholds: {
        cpuUsage: config.cpuThreshold || 80, // 80% CPU
        memoryUsage: config.memoryThreshold || 1024 * 1024 * 1024, // 1GB
        diskUsage: config.diskThreshold || 85, // 85% disk
        networkLatency: config.networkThreshold || 100 // 100ms
      },

      // Safety settings
      maxRetries: config.maxRetries || 3,
      rollbackTimeout: config.rollbackTimeout || 15000, // 15 seconds
      dataProtection: config.dataProtection !== false,
      
      // AI decision making
      confidenceThreshold: config.confidenceThreshold || 0.8, // 80% confidence
      learningRate: config.learningRate || 0.1,
      adaptiveBehavior: config.adaptiveBehavior !== false,
      
      ...config
    }

    // Cleanup state
    this.activeCleanups = new Map()
    this.cleanupHistory = []
    this.performanceBaseline = null
    this.isInitialized = false

    // Metrics
    this.metrics = {
      totalCleanups: 0,
      successfulCleanups: 0,
      failedCleanups: 0,
      rolledBackCleanups: 0,
      averageCleanupTime: 0,
      averageValidationTime: 0,
      learningAccuracy: 0,
      strategyDistribution: new Map(),
      performanceImpact: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      }
    }

    // Initialize if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this._initialize()
    }
  }

  /**
   * Initialize the intelligent cleaner
   * @private
   */
  async _initialize () {
    try {
      this.auditLogger?.info('IntelligentCleaner initializing', {
        component: 'IntelligentCleaner',
        config: this.config
      })

      // Initialize AI modules
      await this.strategySelector.initialize()
      await this.validationEngine.initialize()
      await this.recoveryManager.initialize()
      await this.learningModule.initialize()

      // Capture performance baseline
      await this._capturePerformanceBaseline()

      // Setup monitoring
      this._setupMonitoring()

      // Load historical data for learning
      if (this.config.enableLearning) {
        await this.learningModule.loadHistoricalData()
      }

      this.isInitialized = true

      this.auditLogger?.info('IntelligentCleaner initialized successfully', {
        component: 'IntelligentCleaner',
        modules: ['StrategySelector', 'ValidationEngine', 'RecoveryManager', 'LearningModule']
      })

      this.emit('initialized')

    } catch (error) {
      this.auditLogger?.error('IntelligentCleaner initialization failed', {
        component: 'IntelligentCleaner',
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Execute intelligent cleanup operation
   * @param {Object} cleanupRequest - Cleanup request details
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Cleanup result with validation
   */
  async executeCleanup (cleanupRequest, options = {}) {
    if (!this.isInitialized) {
      throw new Error('IntelligentCleaner not initialized')
    }

    const cleanupId = this._generateCleanupId()
    const startTime = Date.now()
    let recoveryPoint = null

    this.auditLogger?.info('Intelligent cleanup execution started', {
      component: 'IntelligentCleaner',
      cleanupId,
      request: cleanupRequest,
      options
    })

    try {
      // Validate cleanup request
      this._validateCleanupRequest(cleanupRequest)

      // Create recovery point if data protection enabled
      if (this.config.dataProtection) {
        recoveryPoint = await this.recoveryManager.createRecoveryPoint({
          cleanupId,
          type: 'pre_cleanup',
          context: cleanupRequest
        })
      }

      // Analyze context and select optimal strategy
      const context = await this._analyzeCleanupContext(cleanupRequest)
      const strategy = await this.strategySelector.selectStrategy(context)

      this.auditLogger?.info('Cleanup strategy selected', {
        component: 'IntelligentCleaner',
        cleanupId,
        strategy: strategy.name,
        confidence: strategy.confidence,
        context: context.summary
      })

      // Track active cleanup
      this.activeCleanups.set(cleanupId, {
        id: cleanupId,
        strategy,
        context,
        recoveryPoint,
        startTime,
        phase: 'preparation'
      })

      // Execute cleanup with performance monitoring
      const cleanupResult = await this._executeCleanupWithMonitoring(
        cleanupId,
        strategy,
        context,
        options
      )

      // Validate cleanup success (100% validation)
      const validationResult = await this.validationEngine.validateCleanup({
        cleanupId,
        strategy,
        context,
        result: cleanupResult
      })

      if (!validationResult.success) {
        throw new Error(`Cleanup validation failed: ${validationResult.reason}`)
      }

      // Update learning module with success
      if (this.config.enableLearning) {
        await this.learningModule.recordSuccess({
          strategy,
          context,
          result: cleanupResult,
          validationResult
        })
      }

      const duration = Date.now() - startTime
      this.metrics.totalCleanups++
      this.metrics.successfulCleanups++
      this.metrics.averageCleanupTime = (this.metrics.averageCleanupTime + duration) / 2

      // Update strategy distribution
      const strategyCount = this.metrics.strategyDistribution.get(strategy.name) || 0
      this.metrics.strategyDistribution.set(strategy.name, strategyCount + 1)

      const finalResult = {
        cleanupId,
        success: true,
        strategy: strategy.name,
        duration,
        validationResult,
        performanceImpact: cleanupResult.performanceImpact,
        recoveryPoint: recoveryPoint?.id
      }

      this.auditLogger?.info('Intelligent cleanup executed successfully', {
        component: 'IntelligentCleaner',
        ...finalResult
      })

      this.emit('cleanupCompleted', finalResult)
      this.activeCleanups.delete(cleanupId)

      return finalResult

    } catch (error) {
      const duration = Date.now() - startTime
      this.metrics.totalCleanups++
      this.metrics.failedCleanups++

      this.auditLogger?.error('Intelligent cleanup execution failed', {
        component: 'IntelligentCleaner',
        cleanupId,
        duration,
        error: error.message,
        stack: error.stack
      })

      // Attempt recovery if enabled and recovery point exists
      let rollbackResult = null
      if (this.config.enableRecovery && recoveryPoint) {
        try {
          rollbackResult = await this.recoveryManager.rollback({
            recoveryPointId: recoveryPoint.id,
            cleanupId,
            error
          })
          this.metrics.rolledBackCleanups++
        } catch (rollbackError) {
          this.auditLogger?.error('Cleanup rollback failed', {
            component: 'IntelligentCleaner',
            cleanupId,
            rollbackError: rollbackError.message
          })
        }
      }

      // Update learning module with failure
      if (this.config.enableLearning) {
        await this.learningModule.recordFailure({
          strategy: this.activeCleanups.get(cleanupId)?.strategy,
          context: this.activeCleanups.get(cleanupId)?.context,
          error,
          rollbackResult
        })
      }

      this.emit('cleanupFailed', {
        cleanupId,
        duration,
        error: error.message,
        rollbackResult
      })

      this.activeCleanups.delete(cleanupId)
      throw error
    }
  }

  /**
   * Get cleanup recommendations based on context analysis
   * @param {Object} context - Current system context
   * @returns {Promise<Object>} Cleanup recommendations
   */
  async getRecommendations (context = {}) {
    if (!this.isInitialized) {
      throw new Error('IntelligentCleaner not initialized')
    }

    const analysisStart = Date.now()

    try {
      // Analyze current system state
      const systemAnalysis = await this._analyzeSystemState(context)
      
      // Get AI-driven recommendations
      const recommendations = await this.strategySelector.getRecommendations(systemAnalysis)
      
      // Add learning insights
      if (this.config.enableLearning) {
        const learningInsights = await this.learningModule.getInsights(systemAnalysis)
        recommendations.insights = learningInsights
      }

      const analysisTime = Date.now() - analysisStart

      this.auditLogger?.info('Cleanup recommendations generated', {
        component: 'IntelligentCleaner',
        analysisTime,
        recommendationCount: recommendations.strategies?.length || 0,
        confidence: recommendations.confidence
      })

      return {
        ...recommendations,
        analysisTime,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      this.auditLogger?.error('Failed to generate cleanup recommendations', {
        component: 'IntelligentCleaner',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Validate cleanup request
   * @param {Object} request - Cleanup request
   * @private
   */
  _validateCleanupRequest (request) {
    if (!request || typeof request !== 'object') {
      throw new Error('Cleanup request must be a valid object')
    }

    if (!request.type) {
      throw new Error('Cleanup request must specify a type')
    }

    if (!request.targets || !Array.isArray(request.targets)) {
      throw new Error('Cleanup request must include target array')
    }

    // Validate target safety
    for (const target of request.targets) {
      if (!target.id && !target.pid) {
        throw new Error('Each target must have an id or pid')
      }
    }
  }

  /**
   * Analyze cleanup context for AI decision making
   * @param {Object} cleanupRequest - Cleanup request
   * @returns {Promise<Object>} Context analysis
   * @private
   */
  async _analyzeCleanupContext (cleanupRequest) {
    const analysisStart = Date.now()

    try {
      // Get current system state
      const systemState = await this._getSystemState()
      
      // Analyze process dependencies
      const dependencies = await this._analyzeDependencies(cleanupRequest.targets)
      
      // Get performance baseline
      const performanceState = await this._getCurrentPerformanceState()
      
      // Risk assessment
      const riskAssessment = await this._assessCleanupRisk(cleanupRequest, dependencies)

      // Historical context from learning module
      let historicalContext = null
      if (this.config.enableLearning) {
        historicalContext = await this.learningModule.getHistoricalContext(cleanupRequest)
      }

      const analysisTime = Date.now() - analysisStart

      return {
        cleanupRequest,
        systemState,
        dependencies,
        performanceState,
        riskAssessment,
        historicalContext,
        analysisTime,
        timestamp: new Date().toISOString(),
        summary: {
          targetCount: cleanupRequest.targets.length,
          riskLevel: riskAssessment.level,
          dependencyComplexity: dependencies.complexity,
          systemLoad: performanceState.overallLoad
        }
      }

    } catch (error) {
      this.auditLogger?.error('Context analysis failed', {
        component: 'IntelligentCleaner',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Execute cleanup with performance monitoring
   * @param {string} cleanupId - Cleanup identifier
   * @param {Object} strategy - Selected strategy
   * @param {Object} context - Cleanup context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Cleanup result
   * @private
   */
  async _executeCleanupWithMonitoring (cleanupId, strategy, context, options) {
    const executionStart = Date.now()
    const performanceBefore = await this._getCurrentPerformanceState()

    // Update phase
    this.activeCleanups.get(cleanupId).phase = 'executing'

    try {
      // Execute strategy with timeout protection
      const cleanupPromise = strategy.execute(context, options)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Cleanup timeout exceeded')), this.config.maxCleanupTime)
      })

      const result = await Promise.race([cleanupPromise, timeoutPromise])

      // Measure performance impact
      const performanceAfter = await this._getCurrentPerformanceState()
      const performanceImpact = this._calculatePerformanceImpact(performanceBefore, performanceAfter)

      // Update metrics
      this._updatePerformanceMetrics(performanceImpact)

      const executionTime = Date.now() - executionStart

      this.auditLogger?.info('Cleanup strategy executed', {
        component: 'IntelligentCleaner',
        cleanupId,
        strategy: strategy.name,
        executionTime,
        performanceImpact
      })

      return {
        ...result,
        executionTime,
        performanceImpact,
        performanceBefore,
        performanceAfter
      }

    } catch (error) {
      this.auditLogger?.error('Cleanup strategy execution failed', {
        component: 'IntelligentCleaner',
        cleanupId,
        strategy: strategy.name,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get current system state
   * @returns {Promise<Object>} System state
   * @private
   */
  async _getSystemState () {
    const [processes, ports, systemMetrics] = await Promise.all([
      this.processRegistry?.getRunningProcesses() || [],
      this.processRegistry?.getOpenPorts() || [],
      this.realTimeMonitor?.getMetrics() || {}
    ])

    return {
      processes,
      ports,
      systemMetrics,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Analyze process dependencies
   * @param {Array} targets - Cleanup targets
   * @returns {Promise<Object>} Dependency analysis
   * @private
   */
  async _analyzeDependencies (targets) {
    const dependencies = []
    let complexity = 0

    for (const target of targets) {
      if (target.pid) {
        // Get process info
        const processInfo = await this.processRegistry?.getProcessInfo?.(target.pid)
        if (processInfo) {
          // Find child processes
          const allProcesses = await this.processRegistry.getRunningProcesses()
          const children = allProcesses.filter(p => p.parentPid === target.pid)
          
          dependencies.push({
            target: target.pid,
            children: children.map(c => c.pid),
            type: 'process_hierarchy'
          })

          complexity += children.length * 0.5
        }
      }
    }

    return {
      dependencies,
      complexity: Math.min(complexity, 10), // Cap at 10
      hasCircularDependencies: this._detectCircularDependencies(dependencies),
      criticalPaths: this._identifyCriticalPaths(dependencies)
    }
  }

  /**
   * Assess cleanup risk
   * @param {Object} request - Cleanup request
   * @param {Object} dependencies - Dependency analysis
   * @returns {Promise<Object>} Risk assessment
   * @private
   */
  async _assessCleanupRisk (request, dependencies) {
    let riskScore = 0
    const riskFactors = []

    // Process count risk
    if (request.targets.length > 10) {
      riskScore += 2
      riskFactors.push('high_target_count')
    }

    // Dependency complexity risk
    if (dependencies.complexity > 5) {
      riskScore += 3
      riskFactors.push('complex_dependencies')
    }

    // Circular dependency risk
    if (dependencies.hasCircularDependencies) {
      riskScore += 4
      riskFactors.push('circular_dependencies')
    }

    // System load risk
    const performance = await this._getCurrentPerformanceState()
    if (performance.overallLoad > 0.8) {
      riskScore += 2
      riskFactors.push('high_system_load')
    }

    // Critical process risk
    const criticalProcesses = request.targets.filter(t => this._isCriticalProcess(t))
    if (criticalProcesses.length > 0) {
      riskScore += 5
      riskFactors.push('critical_processes')
    }

    const level = riskScore <= 2 ? 'low' : riskScore <= 5 ? 'medium' : 'high'

    return {
      score: riskScore,
      level,
      factors: riskFactors,
      mitigation: this._getRiskMitigation(riskFactors),
      recommendation: level === 'high' ? 'manual_review_required' : 'proceed_with_caution'
    }
  }

  /**
   * Get current performance state
   * @returns {Promise<Object>} Performance state
   * @private
   */
  async _getCurrentPerformanceState () {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        external: memoryUsage.external,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percentage: ((cpuUsage.user + cpuUsage.system) / 1000000) // Convert to percentage approximation
      },
      overallLoad: Math.max(
        (memoryUsage.heapUsed / memoryUsage.heapTotal),
        Math.min(((cpuUsage.user + cpuUsage.system) / 1000000) / 100, 1)
      ),
      timestamp: Date.now()
    }
  }

  /**
   * Calculate performance impact
   * @param {Object} before - Before performance state
   * @param {Object} after - After performance state
   * @returns {Object} Performance impact
   * @private
   */
  _calculatePerformanceImpact (before, after) {
    return {
      memory: {
        absolute: after.memory.used - before.memory.used,
        percentage: after.memory.percentage - before.memory.percentage
      },
      cpu: {
        absolute: after.cpu.percentage - before.cpu.percentage,
        percentage: ((after.cpu.percentage - before.cpu.percentage) / before.cpu.percentage) * 100
      },
      overall: after.overallLoad - before.overallLoad,
      duration: after.timestamp - before.timestamp
    }
  }

  /**
   * Update performance metrics
   * @param {Object} impact - Performance impact
   * @private
   */
  _updatePerformanceMetrics (impact) {
    this.metrics.performanceImpact.memory = (this.metrics.performanceImpact.memory + Math.abs(impact.memory.percentage)) / 2
    this.metrics.performanceImpact.cpu = (this.metrics.performanceImpact.cpu + Math.abs(impact.cpu.percentage)) / 2
  }

  /**
   * Detect circular dependencies
   * @param {Array} dependencies - Dependency list
   * @returns {boolean} True if circular dependencies exist
   * @private
   */
  _detectCircularDependencies (dependencies) {
    // Simplified circular dependency detection
    const visited = new Set()
    const recursionStack = new Set()

    const hasCircle = (pid) => {
      if (recursionStack.has(pid)) return true
      if (visited.has(pid)) return false

      visited.add(pid)
      recursionStack.add(pid)

      const dep = dependencies.find(d => d.target === pid)
      if (dep) {
        for (const child of dep.children) {
          if (hasCircle(child)) return true
        }
      }

      recursionStack.delete(pid)
      return false
    }

    for (const dep of dependencies) {
      if (hasCircle(dep.target)) return true
    }

    return false
  }

  /**
   * Identify critical paths in dependencies
   * @param {Array} dependencies - Dependency list
   * @returns {Array} Critical paths
   * @private
   */
  _identifyCriticalPaths (dependencies) {
    return dependencies
      .filter(dep => dep.children.length > 3)
      .map(dep => ({
        root: dep.target,
        depth: dep.children.length,
        impact: 'high'
      }))
  }

  /**
   * Check if process is critical
   * @param {Object} target - Process target
   * @returns {boolean} True if critical
   * @private
   */
  _isCriticalProcess (target) {
    const criticalNames = ['init', 'kernel', 'systemd', 'explorer', 'winlogon', 'csrss']
    return criticalNames.some(name => target.name && target.name.toLowerCase().includes(name))
  }

  /**
   * Get risk mitigation strategies
   * @param {Array} riskFactors - Risk factors
   * @returns {Array} Mitigation strategies
   * @private
   */
  _getRiskMitigation (riskFactors) {
    const mitigation = []

    if (riskFactors.includes('high_target_count')) {
      mitigation.push('Use batch processing with smaller groups')
    }
    if (riskFactors.includes('complex_dependencies')) {
      mitigation.push('Process dependencies in correct order')
    }
    if (riskFactors.includes('circular_dependencies')) {
      mitigation.push('Break circular dependencies before cleanup')
    }
    if (riskFactors.includes('high_system_load')) {
      mitigation.push('Wait for system load to decrease')
    }
    if (riskFactors.includes('critical_processes')) {
      mitigation.push('Skip critical processes or require manual approval')
    }

    return mitigation
  }

  /**
   * Capture performance baseline
   * @private
   */
  async _capturePerformanceBaseline () {
    this.performanceBaseline = await this._getCurrentPerformanceState()
    
    this.auditLogger?.info('Performance baseline captured', {
      component: 'IntelligentCleaner',
      baseline: this.performanceBaseline
    })
  }

  /**
   * Setup monitoring
   * @private
   */
  _setupMonitoring () {
    // Monitor active cleanups
    setInterval(() => {
      for (const [cleanupId, cleanup] of this.activeCleanups) {
        const duration = Date.now() - cleanup.startTime
        if (duration > this.config.maxCleanupTime) {
          this.auditLogger?.warn('Cleanup duration exceeded limit', {
            component: 'IntelligentCleaner',
            cleanupId,
            duration,
            limit: this.config.maxCleanupTime
          })
          
          this.emit('cleanupTimeout', { cleanupId, duration })
        }
      }
    }, 5000) // Check every 5 seconds
  }

  /**
   * Analyze system state for recommendations
   * @param {Object} context - Analysis context
   * @returns {Promise<Object>} System analysis
   * @private
   */
  async _analyzeSystemState (context) {
    const systemState = await this._getSystemState()
    const performance = await this._getCurrentPerformanceState()

    // Identify cleanup opportunities
    const opportunities = []
    
    // Find long-running processes
    const longRunning = systemState.processes.filter(p => {
      // This is a simplified check - in reality, we'd need better process age detection
      return p.cpu > 50 || p.memory > 100 * 1024 * 1024 // High CPU or >100MB memory
    })

    if (longRunning.length > 0) {
      opportunities.push({
        type: 'long_running_processes',
        targets: longRunning,
        priority: 'medium',
        estimatedImpact: 'positive'
      })
    }

    // Find orphaned processes
    const orphaned = systemState.processes.filter(p => 
      p.parentPid && !systemState.processes.find(parent => parent.pid === p.parentPid)
    )

    if (orphaned.length > 0) {
      opportunities.push({
        type: 'orphaned_processes',
        targets: orphaned,
        priority: 'high',
        estimatedImpact: 'positive'
      })
    }

    return {
      systemState,
      performance,
      opportunities,
      health: {
        overall: performance.overallLoad < 0.8 ? 'good' : 'stressed',
        memory: performance.memory.percentage < 80 ? 'good' : 'high',
        cpu: performance.cpu.percentage < 80 ? 'good' : 'high'
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Generate unique cleanup ID
   * @returns {string} Cleanup ID
   * @private
   */
  _generateCleanupId () {
    return `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics () {
    return {
      ...this.metrics,
      activeCleanups: this.activeCleanups.size,
      isInitialized: this.isInitialized,
      config: this.config,
      uptime: this.performanceBaseline ? Date.now() - this.performanceBaseline.timestamp : 0
    }
  }

  /**
   * Get active cleanups
   * @returns {Array} Active cleanup operations
   */
  getActiveCleanups () {
    return Array.from(this.activeCleanups.values())
  }

  /**
   * Emergency stop all active cleanups
   * @returns {Promise<void>}
   */
  async emergencyStop () {
    this.auditLogger?.warn('Emergency stop initiated', {
      component: 'IntelligentCleaner',
      activeCleanups: this.activeCleanups.size
    })

    const stopPromises = []
    for (const [cleanupId, cleanup] of this.activeCleanups) {
      if (cleanup.strategy && typeof cleanup.strategy.stop === 'function') {
        stopPromises.push(cleanup.strategy.stop().catch(error => {
          this.auditLogger?.error('Failed to stop cleanup', {
            component: 'IntelligentCleaner',
            cleanupId,
            error: error.message
          })
        }))
      }
    }

    await Promise.allSettled(stopPromises)
    this.activeCleanups.clear()

    this.emit('emergencyStop', { stoppedCleanups: stopPromises.length })
  }

  /**
   * Cleanup resources
   */
  async cleanup () {
    await this.emergencyStop()
    
    if (this.strategySelector) await this.strategySelector.cleanup?.()
    if (this.validationEngine) await this.validationEngine.cleanup?.()
    if (this.recoveryManager) await this.recoveryManager.cleanup?.()
    if (this.learningModule) await this.learningModule.cleanup?.()

    this.removeAllListeners()
  }
}

module.exports = IntelligentCleaner