/**
 * Learning Module - Self-learning optimization for cleanup strategies
 *
 * AI-driven learning system with:
 * - Strategy optimization based on historical success/failure patterns
 * - Context pattern recognition and adaptation
 * - Performance prediction modeling
 * - Real-time strategy adjustment
 * - Historical data analysis and insights
 * - Continuous improvement through reinforcement learning
 * - Success/failure correlation analysis
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')
const fs = require('fs').promises
const path = require('path')

/**
 * Machine learning-inspired optimization module
 */
class LearningModule extends EventEmitter {
  /**
   * Initialize LearningModule with dependency injection
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} config - Configuration object
   */
  constructor (dependencies = {}, config = {}) {
    super()

    // Dependency injection
    this.auditLogger = dependencies.auditLogger
    this.processRegistry = dependencies.processRegistry
    this.realTimeMonitor = dependencies.realTimeMonitor

    // Configuration
    this.config = {
      // Learning settings
      learningRate: config.learningRate || 0.1,
      memorySize: config.memorySize || 1000, // Maximum historical records
      minSampleSize: config.minSampleSize || 10, // Minimum samples for learning
      confidenceThreshold: config.confidenceThreshold || 0.8,
      
      // Pattern recognition
      patternWindow: config.patternWindow || 50, // Window size for pattern analysis
      similarityThreshold: config.similarityThreshold || 0.85,
      adaptationRate: config.adaptationRate || 0.05,
      
      // Performance optimization
      performanceWeights: {
        successRate: config.successWeight || 0.4,
        executionTime: config.timeWeight || 0.25,
        resourceImpact: config.resourceWeight || 0.2,
        userSatisfaction: config.satisfactionWeight || 0.15
      },
      
      // Data persistence
      enablePersistence: config.enablePersistence !== false,
      dataFile: config.dataFile || path.join(process.cwd(), 'learning', 'historical_data.json'),
      backupInterval: config.backupInterval || 24 * 60 * 60 * 1000, // 24 hours
      
      // Advanced features
      enablePrediction: config.enablePrediction !== false,
      enableRecommendations: config.enableRecommendations !== false,
      enableContextAnalysis: config.enableContextAnalysis !== false,
      
      ...config
    }

    // Learning state
    this.historicalData = []
    this.patternLibrary = new Map()
    this.strategyPerformance = new Map()
    this.contextPatterns = new Map()
    this.predictionModel = new Map()
    
    // Metrics
    this.metrics = {
      totalLearningEvents: 0,
      patternsRecognized: 0,
      predictionsGenerated: 0,
      correctPredictions: 0,
      adaptationEvents: 0,
      dataPointsAnalyzed: 0,
      averageAccuracy: 0,
      learningVelocity: 0,
      modelConfidence: 0
    }

    // Performance tracking
    this.performanceHistory = new Map()
    this.contextCorrelations = new Map()
    this.successFactors = new Map()
    
    this.isInitialized = false
  }

  /**
   * Initialize the learning module
   */
  async initialize () {
    try {
      this.auditLogger?.info('LearningModule initializing', {
        component: 'LearningModule',
        config: this.config
      })

      // Create data directory if needed
      if (this.config.enablePersistence) {
        const dataDir = path.dirname(this.config.dataFile)
        await fs.mkdir(dataDir, { recursive: true })
      }

      // Load historical data
      await this.loadHistoricalData()

      // Initialize prediction models
      this._initializePredictionModels()

      // Setup performance tracking
      this._setupPerformanceTracking()

      // Initialize pattern recognition
      this._initializePatternRecognition()

      this.isInitialized = true

      this.auditLogger?.info('LearningModule initialized successfully', {
        component: 'LearningModule',
        historicalRecords: this.historicalData.length,
        patterns: this.patternLibrary.size,
        strategies: this.strategyPerformance.size
      })

      this.emit('initialized')

    } catch (error) {
      this.auditLogger?.error('LearningModule initialization failed', {
        component: 'LearningModule',
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Record successful cleanup operation for learning
   * @param {Object} successEvent - Success event data
   */
  async recordSuccess (successEvent) {
    if (!this.isInitialized) {
      throw new Error('LearningModule not initialized')
    }

    const recordStart = Date.now()

    try {
      const learningRecord = {
        id: this._generateRecordId(),
        timestamp: Date.now(),
        type: 'success',
        strategy: successEvent.strategy.name,
        context: this._extractLearningContext(successEvent.context),
        performance: this._calculatePerformanceMetrics(successEvent),
        outcome: {
          success: true,
          executionTime: successEvent.result.executionTime,
          resourceImpact: successEvent.result.performanceImpact,
          validationScore: successEvent.validationResult.score || 1.0
        }
      }

      // Add to historical data
      this.historicalData.push(learningRecord)
      this._maintainMemorySize()

      // Update strategy performance tracking
      await this._updateStrategyPerformance(learningRecord)

      // Pattern recognition and learning
      await this._analyzePatterns(learningRecord)

      // Update prediction models
      if (this.config.enablePrediction) {
        await this._updatePredictionModels(learningRecord)
      }

      // Trigger adaptive learning
      await this._triggerAdaptiveLearning(learningRecord)

      this.metrics.totalLearningEvents++
      this.metrics.dataPointsAnalyzed++

      const recordingTime = Date.now() - recordStart

      this.auditLogger?.info('Success recorded for learning', {
        component: 'LearningModule',
        recordId: learningRecord.id,
        strategy: learningRecord.strategy,
        recordingTime,
        totalRecords: this.historicalData.length
      })

      this.emit('successRecorded', {
        record: learningRecord,
        recordingTime
      })

    } catch (error) {
      this.auditLogger?.error('Failed to record success for learning', {
        component: 'LearningModule',
        error: error.message,
        strategy: successEvent.strategy?.name
      })
      throw error
    }
  }

  /**
   * Record failed cleanup operation for learning
   * @param {Object} failureEvent - Failure event data
   */
  async recordFailure (failureEvent) {
    if (!this.isInitialized) {
      throw new Error('LearningModule not initialized')
    }

    const recordStart = Date.now()

    try {
      const learningRecord = {
        id: this._generateRecordId(),
        timestamp: Date.now(),
        type: 'failure',
        strategy: failureEvent.strategy?.name || 'unknown',
        context: this._extractLearningContext(failureEvent.context),
        error: {
          message: failureEvent.error.message,
          type: failureEvent.error.constructor.name,
          code: failureEvent.error.code || 'UNKNOWN'
        },
        rollbackResult: failureEvent.rollbackResult,
        outcome: {
          success: false,
          recovered: !!failureEvent.rollbackResult?.success,
          impact: this._assessFailureImpact(failureEvent)
        }
      }

      // Add to historical data
      this.historicalData.push(learningRecord)
      this._maintainMemorySize()

      // Update strategy performance tracking
      await this._updateStrategyPerformance(learningRecord)

      // Analyze failure patterns
      await this._analyzeFailurePatterns(learningRecord)

      // Update prediction models with failure data
      if (this.config.enablePrediction) {
        await this._updatePredictionModels(learningRecord)
      }

      // Trigger failure-specific learning
      await this._triggerFailureLearning(learningRecord)

      this.metrics.totalLearningEvents++
      this.metrics.dataPointsAnalyzed++

      const recordingTime = Date.now() - recordStart

      this.auditLogger?.info('Failure recorded for learning', {
        component: 'LearningModule',
        recordId: learningRecord.id,
        strategy: learningRecord.strategy,
        errorType: learningRecord.error.type,
        recordingTime,
        totalRecords: this.historicalData.length
      })

      this.emit('failureRecorded', {
        record: learningRecord,
        recordingTime
      })

    } catch (error) {
      this.auditLogger?.error('Failed to record failure for learning', {
        component: 'LearningModule',
        error: error.message,
        originalError: failureEvent.error?.message
      })
      throw error
    }
  }

  /**
   * Get historical context for decision making
   * @param {Object} cleanupRequest - Cleanup request
   * @returns {Promise<Object>} Historical context
   */
  async getHistoricalContext (cleanupRequest) {
    if (!this.isInitialized) {
      throw new Error('LearningModule not initialized')
    }

    const analysisStart = Date.now()

    try {
      const requestContext = this._extractContextFeatures(cleanupRequest)
      
      // Find similar historical contexts
      const similarContexts = this._findSimilarContexts(requestContext)
      
      // Analyze success patterns
      const successPatterns = this._analyzeSuccessPatterns(similarContexts)
      
      // Get strategy recommendations based on history
      const strategyRecommendations = this._getStrategyRecommendations(requestContext, similarContexts)
      
      // Predict likely outcomes
      const outcomesPrediction = this.config.enablePrediction ? 
        await this._predictOutcomes(requestContext) : null

      const analysisTime = Date.now() - analysisStart

      const historicalContext = {
        similarContexts: similarContexts.length,
        successRate: this._calculateContextSuccessRate(similarContexts),
        commonFailures: this._identifyCommonFailures(similarContexts),
        optimalStrategies: strategyRecommendations,
        riskFactors: this._identifyRiskFactors(requestContext, similarContexts),
        outcomesPrediction,
        confidence: this._calculateContextConfidence(similarContexts),
        analysisTime
      }

      this.auditLogger?.debug('Historical context retrieved', {
        component: 'LearningModule',
        analysisTime,
        similarContexts: similarContexts.length,
        confidence: historicalContext.confidence
      })

      return historicalContext

    } catch (error) {
      this.auditLogger?.error('Failed to get historical context', {
        component: 'LearningModule',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get learning insights for system analysis
   * @param {Object} systemAnalysis - System analysis data
   * @returns {Promise<Object>} Learning insights
   */
  async getInsights (systemAnalysis) {
    if (!this.isInitialized) {
      throw new Error('LearningModule not initialized')
    }

    const insightStart = Date.now()

    try {
      // Performance insights
      const performanceInsights = this._generatePerformanceInsights()
      
      // Pattern insights
      const patternInsights = this._generatePatternInsights()
      
      // Strategy optimization insights
      const strategyInsights = this._generateStrategyInsights()
      
      // Risk assessment insights
      const riskInsights = this._generateRiskInsights(systemAnalysis)
      
      // Predictive insights
      const predictiveInsights = this.config.enablePrediction ? 
        await this._generatePredictiveInsights(systemAnalysis) : null

      const insightTime = Date.now() - insightStart

      const insights = {
        performance: performanceInsights,
        patterns: patternInsights,
        strategies: strategyInsights,
        risks: riskInsights,
        predictions: predictiveInsights,
        recommendations: this._generateRecommendations(systemAnalysis),
        confidence: this._calculateOverallConfidence(),
        learningMetrics: this.getMetrics(),
        insightTime
      }

      this.auditLogger?.info('Learning insights generated', {
        component: 'LearningModule',
        insightTime,
        dataPoints: this.historicalData.length,
        confidence: insights.confidence
      })

      return insights

    } catch (error) {
      this.auditLogger?.error('Failed to generate learning insights', {
        component: 'LearningModule',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Load historical data from storage
   */
  async loadHistoricalData () {
    if (!this.config.enablePersistence) {
      this.auditLogger?.info('Data persistence disabled - starting with empty dataset', {
        component: 'LearningModule'
      })
      return
    }

    try {
      const dataExists = await fs.access(this.config.dataFile)
        .then(() => true)
        .catch(() => false)

      if (dataExists) {
        const data = await fs.readFile(this.config.dataFile, 'utf8')
        const parsedData = JSON.parse(data)
        
        this.historicalData = parsedData.historicalData || []
        this.strategyPerformance = new Map(parsedData.strategyPerformance || [])
        this.patternLibrary = new Map(parsedData.patternLibrary || [])
        this.contextPatterns = new Map(parsedData.contextPatterns || [])
        this.metrics = { ...this.metrics, ...(parsedData.metrics || {}) }

        this.auditLogger?.info('Historical data loaded successfully', {
          component: 'LearningModule',
          records: this.historicalData.length,
          strategies: this.strategyPerformance.size,
          patterns: this.patternLibrary.size
        })
      } else {
        this.auditLogger?.info('No historical data found - starting fresh', {
          component: 'LearningModule'
        })
      }

    } catch (error) {
      this.auditLogger?.error('Failed to load historical data', {
        component: 'LearningModule',
        error: error.message,
        dataFile: this.config.dataFile
      })
      // Continue with empty dataset
    }
  }

  /**
   * Save historical data to storage
   */
  async saveHistoricalData () {
    if (!this.config.enablePersistence) {
      return
    }

    try {
      const dataToSave = {
        historicalData: this.historicalData,
        strategyPerformance: Array.from(this.strategyPerformance.entries()),
        patternLibrary: Array.from(this.patternLibrary.entries()),
        contextPatterns: Array.from(this.contextPatterns.entries()),
        metrics: this.metrics,
        lastSaved: new Date().toISOString(),
        version: '1.0.0'
      }

      await fs.writeFile(
        this.config.dataFile, 
        JSON.stringify(dataToSave, null, 2),
        'utf8'
      )

      this.auditLogger?.info('Historical data saved successfully', {
        component: 'LearningModule',
        records: this.historicalData.length,
        dataFile: this.config.dataFile
      })

    } catch (error) {
      this.auditLogger?.error('Failed to save historical data', {
        component: 'LearningModule',
        error: error.message,
        dataFile: this.config.dataFile
      })
      throw error
    }
  }

  /**
   * Extract learning context from cleanup context
   * @param {Object} context - Cleanup context
   * @returns {Object} Learning context
   * @private
   */
  _extractLearningContext (context) {
    if (!context) return {}

    return {
      targetCount: context.cleanupRequest?.targets?.length || 0,
      cleanupType: context.cleanupRequest?.type || 'unknown',
      systemLoad: context.performanceState?.overallLoad || 0,
      memoryUsage: context.performanceState?.memory?.percentage || 0,
      cpuUsage: context.performanceState?.cpu?.percentage || 0,
      dependencyComplexity: context.dependencies?.complexity || 0,
      riskLevel: context.riskAssessment?.level || 'unknown',
      riskScore: context.riskAssessment?.score || 0,
      hasCircularDependencies: context.dependencies?.hasCircularDependencies || false,
      criticalProcesses: context.riskAssessment?.factors?.includes('critical_processes') || false
    }
  }

  /**
   * Calculate performance metrics from success event
   * @param {Object} successEvent - Success event data
   * @returns {Object} Performance metrics
   * @private
   */
  _calculatePerformanceMetrics (successEvent) {
    const result = successEvent.result || {}
    const performanceImpact = result.performanceImpact || {}

    return {
      executionTime: result.executionTime || 0,
      memoryImpact: Math.abs(performanceImpact.memory?.percentage || 0),
      cpuImpact: Math.abs(performanceImpact.cpu?.percentage || 0),
      overallImpact: Math.abs(performanceImpact.overall || 0),
      validationTime: successEvent.validationResult?.validationTime || 0,
      efficiency: this._calculateEfficiencyScore(result)
    }
  }

  /**
   * Calculate efficiency score
   * @param {Object} result - Execution result
   * @returns {number} Efficiency score (0-1)
   * @private
   */
  _calculateEfficiencyScore (result) {
    const executionTime = result.executionTime || 0
    const performanceImpact = result.performanceImpact?.overall || 0
    
    // Lower execution time and performance impact = higher efficiency
    const timeScore = Math.max(0, 1 - (executionTime / 30000)) // Normalize against 30s max
    const impactScore = Math.max(0, 1 - Math.abs(performanceImpact))
    
    return (timeScore + impactScore) / 2
  }

  /**
   * Assess failure impact
   * @param {Object} failureEvent - Failure event data
   * @returns {string} Impact level
   * @private
   */
  _assessFailureImpact (failureEvent) {
    const rollbackSuccess = failureEvent.rollbackResult?.success || false
    const errorType = failureEvent.error?.constructor?.name || 'Error'
    
    if (!rollbackSuccess) return 'high'
    if (errorType === 'ValidationError') return 'medium'
    return 'low'
  }

  /**
   * Update strategy performance tracking
   * @param {Object} record - Learning record
   * @private
   */
  async _updateStrategyPerformance (record) {
    const strategyName = record.strategy
    
    if (!this.strategyPerformance.has(strategyName)) {
      this.strategyPerformance.set(strategyName, {
        totalExecutions: 0,
        successes: 0,
        failures: 0,
        averageExecutionTime: 0,
        averageEfficiency: 0,
        lastUpdated: Date.now(),
        contextSuccess: new Map(),
        failureReasons: new Map()
      })
    }

    const performance = this.strategyPerformance.get(strategyName)
    performance.totalExecutions++
    performance.lastUpdated = Date.now()

    if (record.type === 'success') {
      performance.successes++
      const execTime = record.performance.executionTime
      const efficiency = record.performance.efficiency
      
      performance.averageExecutionTime = (performance.averageExecutionTime + execTime) / 2
      performance.averageEfficiency = (performance.averageEfficiency + efficiency) / 2
    } else {
      performance.failures++
      const failureReason = record.error.type
      const count = performance.failureReasons.get(failureReason) || 0
      performance.failureReasons.set(failureReason, count + 1)
    }

    // Update context-specific success rates
    const contextKey = this._generateContextKey(record.context)
    const contextStats = performance.contextSuccess.get(contextKey) || { attempts: 0, successes: 0 }
    contextStats.attempts++
    if (record.type === 'success') contextStats.successes++
    performance.contextSuccess.set(contextKey, contextStats)
  }

  /**
   * Analyze patterns in learning records
   * @param {Object} record - Learning record
   * @private
   */
  async _analyzePatterns (record) {
    if (this.historicalData.length < this.config.minSampleSize) {
      return // Not enough data for pattern analysis
    }

    // Context pattern analysis
    const contextKey = this._generateContextKey(record.context)
    const existingPattern = this.contextPatterns.get(contextKey) || {
      occurrences: 0,
      successes: 0,
      commonStrategies: new Map(),
      avgPerformance: 0
    }

    existingPattern.occurrences++
    if (record.type === 'success') {
      existingPattern.successes++
      existingPattern.avgPerformance = (existingPattern.avgPerformance + record.performance.efficiency) / 2
    }

    const strategyCount = existingPattern.commonStrategies.get(record.strategy) || 0
    existingPattern.commonStrategies.set(record.strategy, strategyCount + 1)

    this.contextPatterns.set(contextKey, existingPattern)
    this.metrics.patternsRecognized++
  }

  /**
   * Analyze failure patterns
   * @param {Object} record - Failure record
   * @private
   */
  async _analyzeFailurePatterns (record) {
    const failureKey = `${record.strategy}_${record.error.type}`
    const contextKey = this._generateContextKey(record.context)
    
    // Track failure patterns
    if (!this.patternLibrary.has('failures')) {
      this.patternLibrary.set('failures', new Map())
    }
    
    const failurePatterns = this.patternLibrary.get('failures')
    const patternCount = failurePatterns.get(failureKey) || 0
    failurePatterns.set(failureKey, patternCount + 1)

    // Analyze context correlation with failures
    if (!this.contextCorrelations.has(contextKey)) {
      this.contextCorrelations.set(contextKey, {
        failures: [],
        successRate: 0
      })
    }
    
    this.contextCorrelations.get(contextKey).failures.push(record.error.type)
  }

  /**
   * Update prediction models
   * @param {Object} record - Learning record
   * @private
   */
  async _updatePredictionModels (record) {
    const contextFeatures = this._extractContextFeatures(record.context)
    const outcome = record.type === 'success' ? 1 : 0
    
    // Simple weighted average prediction model
    const modelKey = record.strategy
    if (!this.predictionModel.has(modelKey)) {
      this.predictionModel.set(modelKey, {
        weights: new Map(),
        bias: 0.5,
        samples: 0
      })
    }

    const model = this.predictionModel.get(modelKey)
    model.samples++

    // Update weights using simple gradient descent-like approach
    for (const [feature, value] of Object.entries(contextFeatures)) {
      const currentWeight = model.weights.get(feature) || 0
      const gradient = (outcome - this._predictOutcome(model, contextFeatures)) * value
      model.weights.set(feature, currentWeight + this.config.learningRate * gradient)
    }

    this.metrics.predictionsGenerated++
  }

  /**
   * Predict outcome using model
   * @param {Object} model - Prediction model
   * @param {Object} features - Context features
   * @returns {number} Prediction (0-1)
   * @private
   */
  _predictOutcome (model, features) {
    let prediction = model.bias
    for (const [feature, value] of Object.entries(features)) {
      const weight = model.weights.get(feature) || 0
      prediction += weight * value
    }
    return Math.max(0, Math.min(1, prediction)) // Clamp to [0,1]
  }

  /**
   * Trigger adaptive learning
   * @param {Object} record - Learning record
   * @private
   */
  async _triggerAdaptiveLearning (record) {
    // Adaptive learning based on recent performance
    const recentRecords = this.historicalData.slice(-this.config.patternWindow)
    const recentSuccessRate = recentRecords.filter(r => r.type === 'success').length / recentRecords.length

    // Adjust learning parameters based on performance
    if (recentSuccessRate < 0.7) {
      // Increase learning rate if performance is poor
      this.config.learningRate = Math.min(this.config.learningRate * 1.1, 0.5)
      this.metrics.adaptationEvents++
      
      this.auditLogger?.info('Adaptive learning triggered - increased learning rate', {
        component: 'LearningModule',
        recentSuccessRate,
        newLearningRate: this.config.learningRate
      })
    } else if (recentSuccessRate > 0.9) {
      // Decrease learning rate if performance is excellent
      this.config.learningRate = Math.max(this.config.learningRate * 0.95, 0.01)
    }
  }

  /**
   * Trigger failure-specific learning
   * @param {Object} record - Failure record
   * @private
   */
  async _triggerFailureLearning (record) {
    // Identify patterns in failures to avoid similar mistakes
    const similarFailures = this.historicalData.filter(r => 
      r.type === 'failure' && 
      r.strategy === record.strategy &&
      r.error.type === record.error.type
    )

    if (similarFailures.length >= 3) {
      // Pattern detected - adjust strategy recommendations
      this.auditLogger?.warn('Failure pattern detected', {
        component: 'LearningModule',
        strategy: record.strategy,
        errorType: record.error.type,
        occurrences: similarFailures.length
      })

      // Lower confidence in this strategy for similar contexts
      const contextKey = this._generateContextKey(record.context)
      if (this.contextPatterns.has(contextKey)) {
        const pattern = this.contextPatterns.get(contextKey)
        pattern.confidence = (pattern.confidence || 1.0) * 0.9 // Reduce confidence
      }
    }
  }

  /**
   * Initialize prediction models
   * @private
   */
  _initializePredictionModels () {
    if (!this.config.enablePrediction) return

    // Initialize models for each strategy type
    const strategyTypes = ['GracefulStrategy', 'AggressiveStrategy', 'SmartStrategy', 'EmergencyStrategy']
    
    for (const strategy of strategyTypes) {
      this.predictionModel.set(strategy, {
        weights: new Map([
          ['targetCount', 0.1],
          ['systemLoad', -0.2],
          ['riskScore', -0.3],
          ['dependencyComplexity', -0.15]
        ]),
        bias: 0.7, // Optimistic initial bias
        samples: 0
      })
    }
  }

  /**
   * Setup performance tracking
   * @private
   */
  _setupPerformanceTracking () {
    // Track learning performance over time
    setInterval(() => {
      const recentRecords = this.historicalData.slice(-50)
      if (recentRecords.length > 0) {
        const successRate = recentRecords.filter(r => r.type === 'success').length / recentRecords.length
        this.metrics.averageAccuracy = successRate
        this.metrics.modelConfidence = this._calculateModelConfidence()
      }
    }, 60000) // Update every minute
  }

  /**
   * Initialize pattern recognition
   * @private
   */
  _initializePatternRecognition () {
    // Initialize common pattern categories
    this.patternLibrary.set('success_contexts', new Map())
    this.patternLibrary.set('failure_contexts', new Map())
    this.patternLibrary.set('strategy_preferences', new Map())
    this.patternLibrary.set('performance_correlations', new Map())
  }

  /**
   * Extract context features for learning
   * @param {Object} context - Context object
   * @returns {Object} Extracted features
   * @private
   */
  _extractContextFeatures (context) {
    if (!context) return {}

    return {
      targetCount: Math.min((context.targetCount || 0) / 50, 1), // Normalize
      systemLoad: context.systemLoad || 0,
      memoryUsage: context.memoryUsage || 0,
      cpuUsage: context.cpuUsage || 0,
      riskScore: Math.min((context.riskScore || 0) / 10, 1), // Normalize
      dependencyComplexity: Math.min((context.dependencyComplexity || 0) / 10, 1), // Normalize
      hasCircularDependencies: context.hasCircularDependencies ? 1 : 0,
      criticalProcesses: context.criticalProcesses ? 1 : 0
    }
  }

  /**
   * Find similar contexts in historical data
   * @param {Object} requestContext - Request context
   * @returns {Array} Similar contexts
   * @private
   */
  _findSimilarContexts (requestContext) {
    const similarities = this.historicalData.map(record => ({
      record,
      similarity: this._calculateContextSimilarity(requestContext, record.context)
    }))

    return similarities
      .filter(item => item.similarity >= this.config.similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20) // Top 20 most similar
      .map(item => item.record)
  }

  /**
   * Calculate context similarity
   * @param {Object} context1 - First context
   * @param {Object} context2 - Second context
   * @returns {number} Similarity score (0-1)
   * @private
   */
  _calculateContextSimilarity (context1, context2) {
    const features1 = this._extractContextFeatures(context1)
    const features2 = this._extractContextFeatures(context2)
    
    let similarity = 0
    let featureCount = 0
    
    for (const feature in features1) {
      if (features2[feature] !== undefined) {
        const diff = Math.abs(features1[feature] - features2[feature])
        similarity += 1 - diff
        featureCount++
      }
    }
    
    return featureCount > 0 ? similarity / featureCount : 0
  }

  /**
   * Analyze success patterns
   * @param {Array} similarContexts - Similar contexts
   * @returns {Object} Success patterns
   * @private
   */
  _analyzeSuccessPatterns (similarContexts) {
    const successRecords = similarContexts.filter(record => record.type === 'success')
    
    if (successRecords.length === 0) {
      return { patterns: [], confidence: 0 }
    }

    // Find common success factors
    const successFactors = {}
    successRecords.forEach(record => {
      if (record.performance.efficiency > 0.8) {
        successFactors.highEfficiency = (successFactors.highEfficiency || 0) + 1
      }
      if (record.performance.executionTime < 10000) {
        successFactors.fastExecution = (successFactors.fastExecution || 0) + 1
      }
    })

    return {
      patterns: Object.entries(successFactors).map(([factor, count]) => ({
        factor,
        frequency: count / successRecords.length,
        confidence: count / successRecords.length
      })),
      confidence: successRecords.length / similarContexts.length
    }
  }

  /**
   * Get strategy recommendations based on history
   * @param {Object} requestContext - Request context
   * @param {Array} similarContexts - Similar contexts
   * @returns {Array} Strategy recommendations
   * @private
   */
  _getStrategyRecommendations (requestContext, similarContexts) {
    const strategySuccess = new Map()
    
    similarContexts.forEach(record => {
      if (!strategySuccess.has(record.strategy)) {
        strategySuccess.set(record.strategy, { attempts: 0, successes: 0 })
      }
      
      const stats = strategySuccess.get(record.strategy)
      stats.attempts++
      if (record.type === 'success') stats.successes++
    })

    return Array.from(strategySuccess.entries())
      .map(([strategy, stats]) => ({
        strategy,
        successRate: stats.successes / stats.attempts,
        confidence: Math.min(stats.attempts / 10, 1), // More attempts = higher confidence
        attempts: stats.attempts
      }))
      .filter(item => item.attempts >= 2) // Minimum 2 attempts for recommendation
      .sort((a, b) => b.successRate - a.successRate)
  }

  /**
   * Predict outcomes for context
   * @param {Object} requestContext - Request context
   * @returns {Promise<Object>} Outcome predictions
   * @private
   */
  async _predictOutcomes (requestContext) {
    const features = this._extractContextFeatures(requestContext)
    const predictions = new Map()

    for (const [strategy, model] of this.predictionModel) {
      const prediction = this._predictOutcome(model, features)
      predictions.set(strategy, {
        successProbability: prediction,
        confidence: Math.min(model.samples / 50, 1) // Confidence based on training samples
      })
    }

    return Object.fromEntries(predictions)
  }

  /**
   * Generate context key for pattern matching
   * @param {Object} context - Context object
   * @returns {string} Context key
   * @private
   */
  _generateContextKey (context) {
    const targetRange = context.targetCount > 20 ? 'many' : context.targetCount > 5 ? 'some' : 'few'
    const loadRange = context.systemLoad > 0.8 ? 'high' : context.systemLoad > 0.5 ? 'medium' : 'low'
    const riskRange = context.riskScore > 6 ? 'high' : context.riskScore > 3 ? 'medium' : 'low'
    
    return `${targetRange}_${loadRange}_${riskRange}_${context.cleanupType || 'unknown'}`
  }

  /**
   * Calculate context success rate
   * @param {Array} similarContexts - Similar contexts
   * @returns {number} Success rate
   * @private
   */
  _calculateContextSuccessRate (similarContexts) {
    if (similarContexts.length === 0) return 0
    const successes = similarContexts.filter(record => record.type === 'success').length
    return successes / similarContexts.length
  }

  /**
   * Identify common failures
   * @param {Array} similarContexts - Similar contexts
   * @returns {Array} Common failures
   * @private
   */
  _identifyCommonFailures (similarContexts) {
    const failures = similarContexts.filter(record => record.type === 'failure')
    const failureCounts = new Map()

    failures.forEach(record => {
      const errorType = record.error.type
      failureCounts.set(errorType, (failureCounts.get(errorType) || 0) + 1)
    })

    return Array.from(failureCounts.entries())
      .map(([type, count]) => ({
        type,
        frequency: count / failures.length,
        occurrences: count
      }))
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Identify risk factors
   * @param {Object} requestContext - Request context
   * @param {Array} similarContexts - Similar contexts
   * @returns {Array} Risk factors
   * @private
   */
  _identifyRiskFactors (requestContext, similarContexts) {
    const riskFactors = []
    const failures = similarContexts.filter(record => record.type === 'failure')
    
    if (failures.length > similarContexts.length * 0.3) {
      riskFactors.push({
        factor: 'high_failure_rate',
        probability: failures.length / similarContexts.length,
        mitigation: 'Consider using a more conservative strategy'
      })
    }

    if (requestContext.systemLoad > 0.8) {
      const highLoadFailures = failures.filter(f => f.context.systemLoad > 0.8)
      if (highLoadFailures.length > 0) {
        riskFactors.push({
          factor: 'system_load_risk',
          probability: highLoadFailures.length / failures.length,
          mitigation: 'Wait for system load to decrease before proceeding'
        })
      }
    }

    return riskFactors
  }

  /**
   * Calculate context confidence
   * @param {Array} similarContexts - Similar contexts
   * @returns {number} Confidence score
   * @private
   */
  _calculateContextConfidence (similarContexts) {
    if (similarContexts.length === 0) return 0
    
    // Confidence based on sample size and recency
    const sampleScore = Math.min(similarContexts.length / 20, 1)
    const avgAge = similarContexts.reduce((sum, record) => sum + (Date.now() - record.timestamp), 0) / similarContexts.length
    const recencyScore = Math.max(0, 1 - (avgAge / (7 * 24 * 60 * 60 * 1000))) // Decay over a week
    
    return (sampleScore + recencyScore) / 2
  }

  /**
   * Generate performance insights
   * @returns {Object} Performance insights
   * @private
   */
  _generatePerformanceInsights () {
    const strategyPerf = Array.from(this.strategyPerformance.entries())
      .map(([strategy, perf]) => ({
        strategy,
        successRate: perf.successes / perf.totalExecutions,
        avgExecutionTime: perf.averageExecutionTime,
        avgEfficiency: perf.averageEfficiency,
        totalExecutions: perf.totalExecutions
      }))
      .sort((a, b) => b.successRate - a.successRate)

    return {
      topPerformingStrategies: strategyPerf.slice(0, 3),
      overallTrends: this._calculatePerformanceTrends(),
      recommendations: this._generatePerformanceRecommendations(strategyPerf)
    }
  }

  /**
   * Generate pattern insights
   * @returns {Object} Pattern insights
   * @private
   */
  _generatePatternInsights () {
    const topPatterns = Array.from(this.contextPatterns.entries())
      .map(([pattern, data]) => ({
        pattern,
        successRate: data.successes / data.occurrences,
        frequency: data.occurrences,
        avgPerformance: data.avgPerformance
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)

    return {
      mostCommonPatterns: topPatterns,
      patternRecommendations: this._generatePatternRecommendations(topPatterns)
    }
  }

  /**
   * Generate strategy insights
   * @returns {Object} Strategy insights
   * @private
   */
  _generateStrategyInsights () {
    const insights = []
    
    for (const [strategy, perf] of this.strategyPerformance) {
      const insight = {
        strategy,
        strengths: [],
        weaknesses: [],
        recommendations: []
      }

      const successRate = perf.successes / perf.totalExecutions
      const avgTime = perf.averageExecutionTime

      if (successRate > 0.9) insight.strengths.push('high_success_rate')
      if (avgTime < 5000) insight.strengths.push('fast_execution')
      if (perf.averageEfficiency > 0.8) insight.strengths.push('high_efficiency')

      if (successRate < 0.7) insight.weaknesses.push('low_success_rate')
      if (avgTime > 20000) insight.weaknesses.push('slow_execution')

      insights.push(insight)
    }

    return { strategyAnalysis: insights }
  }

  /**
   * Generate risk insights
   * @param {Object} systemAnalysis - System analysis
   * @returns {Object} Risk insights
   * @private
   */
  _generateRiskInsights (systemAnalysis) {
    const riskInsights = []

    // Analyze current system state against historical failures
    const recentFailures = this.historicalData
      .filter(r => r.type === 'failure' && Date.now() - r.timestamp < 24 * 60 * 60 * 1000)

    if (recentFailures.length > 5) {
      riskInsights.push({
        type: 'elevated_failure_rate',
        severity: 'medium',
        description: 'Higher than normal failure rate in last 24 hours'
      })
    }

    return { currentRisks: riskInsights }
  }

  /**
   * Generate predictive insights
   * @param {Object} systemAnalysis - System analysis
   * @returns {Promise<Object>} Predictive insights
   * @private
   */
  async _generatePredictiveInsights (systemAnalysis) {
    const predictions = {}

    for (const [strategy, model] of this.predictionModel) {
      if (model.samples >= this.config.minSampleSize) {
        const features = this._extractContextFeatures(systemAnalysis.performance)
        predictions[strategy] = {
          successProbability: this._predictOutcome(model, features),
          confidence: Math.min(model.samples / 100, 1)
        }
      }
    }

    return { strategyPredictions: predictions }
  }

  /**
   * Generate recommendations
   * @param {Object} systemAnalysis - System analysis
   * @returns {Array} Recommendations
   * @private
   */
  _generateRecommendations (systemAnalysis) {
    const recommendations = []

    // Based on learning data, suggest optimizations
    if (this.historicalData.length > 50) {
      const recentSuccess = this.historicalData.slice(-20).filter(r => r.type === 'success').length / 20
      
      if (recentSuccess < 0.8) {
        recommendations.push({
          type: 'strategy_adjustment',
          priority: 'high',
          description: 'Recent success rate is below optimal - consider strategy adjustments'
        })
      }
    }

    return recommendations
  }

  /**
   * Calculate overall confidence
   * @returns {number} Overall confidence
   * @private
   */
  _calculateOverallConfidence () {
    if (this.historicalData.length < this.config.minSampleSize) {
      return Math.min(this.historicalData.length / this.config.minSampleSize, 1)
    }

    const recentAccuracy = this.metrics.averageAccuracy
    const dataMaturity = Math.min(this.historicalData.length / 1000, 1)
    
    return (recentAccuracy + dataMaturity) / 2
  }

  /**
   * Calculate performance trends
   * @returns {Object} Performance trends
   * @private
   */
  _calculatePerformanceTrends () {
    const recentRecords = this.historicalData.slice(-50)
    const olderRecords = this.historicalData.slice(-100, -50)

    if (recentRecords.length === 0 || olderRecords.length === 0) {
      return { trend: 'insufficient_data' }
    }

    const recentSuccessRate = recentRecords.filter(r => r.type === 'success').length / recentRecords.length
    const olderSuccessRate = olderRecords.filter(r => r.type === 'success').length / olderRecords.length

    return {
      trend: recentSuccessRate > olderSuccessRate ? 'improving' : 'declining',
      change: Math.abs(recentSuccessRate - olderSuccessRate),
      recentSuccessRate,
      olderSuccessRate
    }
  }

  /**
   * Generate performance recommendations
   * @param {Array} strategyPerf - Strategy performance data
   * @returns {Array} Performance recommendations
   * @private
   */
  _generatePerformanceRecommendations (strategyPerf) {
    const recommendations = []

    const topStrategy = strategyPerf[0]
    const worstStrategy = strategyPerf[strategyPerf.length - 1]

    if (topStrategy && worstStrategy && topStrategy.successRate - worstStrategy.successRate > 0.3) {
      recommendations.push({
        type: 'strategy_preference',
        message: `Consider favoring ${topStrategy.strategy} over ${worstStrategy.strategy}`,
        impact: 'high'
      })
    }

    return recommendations
  }

  /**
   * Generate pattern recommendations
   * @param {Array} patterns - Pattern data
   * @returns {Array} Pattern recommendations
   * @private
   */
  _generatePatternRecommendations (patterns) {
    const recommendations = []

    const highSuccessPatterns = patterns.filter(p => p.successRate > 0.9)
    if (highSuccessPatterns.length > 0) {
      recommendations.push({
        type: 'optimize_for_patterns',
        patterns: highSuccessPatterns.map(p => p.pattern),
        message: 'Focus cleanup efforts on these high-success patterns'
      })
    }

    return recommendations
  }

  /**
   * Calculate model confidence
   * @returns {number} Model confidence
   * @private
   */
  _calculateModelConfidence () {
    let totalSamples = 0
    let weightedConfidence = 0

    for (const model of this.predictionModel.values()) {
      totalSamples += model.samples
      weightedConfidence += Math.min(model.samples / 100, 1) * model.samples
    }

    return totalSamples > 0 ? weightedConfidence / totalSamples : 0
  }

  /**
   * Maintain memory size limit
   * @private
   */
  _maintainMemorySize () {
    if (this.historicalData.length > this.config.memorySize) {
      // Remove oldest records but preserve important learning events
      const keepCount = Math.floor(this.config.memorySize * 0.9)
      const toKeep = this.historicalData.slice(-keepCount)
      
      // Also keep some high-value historical records
      const oldRecords = this.historicalData.slice(0, -keepCount)
      const importantOldRecords = oldRecords.filter(record => 
        record.type === 'failure' || // Keep all failures for learning
        (record.type === 'success' && record.performance.efficiency > 0.9) // Keep high-efficiency successes
      ).slice(-Math.floor(this.config.memorySize * 0.1))

      this.historicalData = [...importantOldRecords, ...toKeep]
    }
  }

  /**
   * Generate unique record ID
   * @returns {string} Record ID
   * @private
   */
  _generateRecordId () {
    return `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics () {
    return {
      ...this.metrics,
      isInitialized: this.isInitialized,
      historicalRecords: this.historicalData.length,
      strategies: this.strategyPerformance.size,
      patterns: this.patternLibrary.size,
      contextPatterns: this.contextPatterns.size,
      predictionModels: this.predictionModel.size,
      dataMaturity: Math.min(this.historicalData.length / 1000, 1),
      config: this.config
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup () {
    // Save data before cleanup
    if (this.config.enablePersistence) {
      try {
        await this.saveHistoricalData()
      } catch (error) {
        this.auditLogger?.error('Failed to save data during cleanup', {
          component: 'LearningModule',
          error: error.message
        })
      }
    }

    // Clear all data structures
    this.historicalData.length = 0
    this.patternLibrary.clear()
    this.strategyPerformance.clear()
    this.contextPatterns.clear()
    this.predictionModel.clear()
    this.performanceHistory.clear()
    this.contextCorrelations.clear()
    this.successFactors.clear()

    this.removeAllListeners()
  }
}

module.exports = LearningModule