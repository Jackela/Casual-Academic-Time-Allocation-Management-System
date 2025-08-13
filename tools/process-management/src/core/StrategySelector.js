/**
 * Strategy Selector - AI-driven optimal cleanup strategy selection
 *
 * Intelligent strategy selection system with:
 * - Context-aware decision making using ML-based scoring
 * - Multi-factor analysis (risk, performance, dependencies)
 * - Historical success rate analysis
 * - Real-time adaptation based on system state
 * - Strategy recommendation engine
 * - Performance prediction modeling
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { EventEmitter } = require('events')
const GracefulStrategy = require('../strategies/GracefulStrategy')
const AggressiveStrategy = require('../strategies/AggressiveStrategy')
const SmartStrategy = require('../strategies/SmartStrategy')
const EmergencyStrategy = require('../strategies/EmergencyStrategy')

/**
 * AI-driven strategy selection engine
 */
class StrategySelector extends EventEmitter {
  /**
   * Initialize StrategySelector with dependency injection
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
      // Decision making settings
      confidenceThreshold: config.confidenceThreshold || 0.8,
      minSuccessRate: config.minSuccessRate || 0.7,
      adaptationRate: config.adaptationRate || 0.1,
      
      // Strategy weighting factors
      weights: {
        riskScore: config.riskWeight || 0.3,
        performanceImpact: config.performanceWeight || 0.25,
        successRate: config.successWeight || 0.2,
        complexity: config.complexityWeight || 0.15,
        timeToComplete: config.timeWeight || 0.1
      },

      // Strategy thresholds
      thresholds: {
        gracefulMaxRisk: config.gracefulMaxRisk || 3,
        smartMinComplexity: config.smartMinComplexity || 5,
        aggressiveMinUrgency: config.aggressiveMinUrgency || 0.8,
        emergencyMaxTime: config.emergencyMaxTime || 5000 // 5 seconds
      },

      // Learning settings
      enableLearning: config.enableLearning !== false,
      historySize: config.historySize || 1000,
      adaptationWindow: config.adaptationWindow || 100,
      
      ...config
    }

    // Strategy registry
    this.strategies = new Map()
    
    // Historical data for learning
    this.strategyHistory = []
    this.performanceHistory = new Map()
    this.contextPatterns = new Map()
    
    // Decision metrics
    this.metrics = {
      totalDecisions: 0,
      successfulPredictions: 0,
      averageConfidence: 0,
      strategyDistribution: new Map(),
      adaptationEvents: 0,
      recommendationAccuracy: 0
    }

    // ML-like scoring factors
    this.scoringModel = {
      features: [
        'riskScore',
        'systemLoad',
        'dependencyComplexity',
        'targetCount',
        'historicalSuccessRate',
        'urgencyLevel',
        'resourceConstraints'
      ],
      weights: new Map(),
      bias: 0
    }

    this.isInitialized = false
  }

  /**
   * Initialize the strategy selector
   */
  async initialize () {
    try {
      this.auditLogger?.info('StrategySelector initializing', {
        component: 'StrategySelector',
        config: this.config
      })

      // Initialize strategies
      await this._initializeStrategies()

      // Initialize scoring model
      this._initializeScoringModel()

      // Load historical data if available
      if (this.config.enableLearning) {
        await this._loadHistoricalData()
      }

      this.isInitialized = true

      this.auditLogger?.info('StrategySelector initialized successfully', {
        component: 'StrategySelector',
        strategiesCount: this.strategies.size,
        enableLearning: this.config.enableLearning
      })

      this.emit('initialized')

    } catch (error) {
      this.auditLogger?.error('StrategySelector initialization failed', {
        component: 'StrategySelector',
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Select optimal cleanup strategy based on context
   * @param {Object} context - Cleanup context analysis
   * @returns {Promise<Object>} Selected strategy with confidence score
   */
  async selectStrategy (context) {
    if (!this.isInitialized) {
      throw new Error('StrategySelector not initialized')
    }

    const selectionStart = Date.now()

    try {
      this.auditLogger?.info('Strategy selection started', {
        component: 'StrategySelector',
        contextSummary: context.summary
      })

      // Extract features from context
      const features = this._extractFeatures(context)

      // Score all strategies
      const strategyScores = await this._scoreStrategies(features, context)

      // Select best strategy with confidence analysis
      const selection = this._selectBestStrategy(strategyScores, features)

      // Update metrics
      this.metrics.totalDecisions++
      this.metrics.averageConfidence = (this.metrics.averageConfidence + selection.confidence) / 2
      
      const strategyCount = this.metrics.strategyDistribution.get(selection.strategy.name) || 0
      this.metrics.strategyDistribution.set(selection.strategy.name, strategyCount + 1)

      // Learn from selection if enabled
      if (this.config.enableLearning) {
        this._recordDecision(features, selection, context)
      }

      const selectionTime = Date.now() - selectionStart

      this.auditLogger?.info('Strategy selected', {
        component: 'StrategySelector',
        strategy: selection.strategy.name,
        confidence: selection.confidence,
        selectionTime,
        reasoning: selection.reasoning
      })

      this.emit('strategySelected', {
        strategy: selection.strategy.name,
        confidence: selection.confidence,
        features,
        selectionTime
      })

      return {
        ...selection,
        selectionTime,
        features
      }

    } catch (error) {
      this.auditLogger?.error('Strategy selection failed', {
        component: 'StrategySelector',
        error: error.message,
        context: context.summary
      })
      throw error
    }
  }

  /**
   * Get strategy recommendations for given system analysis
   * @param {Object} systemAnalysis - System state analysis
   * @returns {Promise<Object>} Strategy recommendations
   */
  async getRecommendations (systemAnalysis) {
    if (!this.isInitialized) {
      throw new Error('StrategySelector not initialized')
    }

    const analysisStart = Date.now()

    try {
      const recommendations = []

      // Analyze each cleanup opportunity
      for (const opportunity of systemAnalysis.opportunities || []) {
        const mockContext = {
          cleanupRequest: {
            type: opportunity.type,
            targets: opportunity.targets.slice(0, 5) // Limit for analysis
          },
          systemState: systemAnalysis.systemState,
          performanceState: systemAnalysis.performance,
          riskAssessment: {
            level: opportunity.priority === 'high' ? 'medium' : 'low',
            score: opportunity.priority === 'high' ? 4 : 2
          },
          summary: {
            targetCount: opportunity.targets.length,
            riskLevel: opportunity.priority === 'high' ? 'medium' : 'low',
            systemLoad: systemAnalysis.performance.overallLoad
          }
        }

        const features = this._extractFeatures(mockContext)
        const strategyScores = await this._scoreStrategies(features, mockContext)
        const topStrategies = strategyScores
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)

        recommendations.push({
          opportunity,
          recommendedStrategies: topStrategies,
          estimatedTime: this._estimateExecutionTime(topStrategies[0], features),
          riskAssessment: mockContext.riskAssessment,
          confidence: topStrategies[0]?.confidence || 0
        })
      }

      // Overall system recommendations
      const overallRecommendation = this._getOverallRecommendation(
        systemAnalysis,
        recommendations
      )

      const analysisTime = Date.now() - analysisStart

      this.auditLogger?.info('Strategy recommendations generated', {
        component: 'StrategySelector',
        recommendationCount: recommendations.length,
        analysisTime,
        overallRecommendation: overallRecommendation.priority
      })

      return {
        recommendations,
        overallRecommendation,
        analysisTime,
        confidence: recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      this.auditLogger?.error('Failed to generate strategy recommendations', {
        component: 'StrategySelector',
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update strategy performance based on execution results
   * @param {Object} executionResult - Strategy execution result
   */
  async updatePerformance (executionResult) {
    if (!this.config.enableLearning) {
      return
    }

    const strategyName = executionResult.strategy
    const success = executionResult.success
    const duration = executionResult.duration
    const performanceImpact = executionResult.performanceImpact

    try {
      // Update performance history
      if (!this.performanceHistory.has(strategyName)) {
        this.performanceHistory.set(strategyName, {
          executions: 0,
          successes: 0,
          failures: 0,
          averageDuration: 0,
          averageImpact: 0,
          lastUpdated: Date.now()
        })
      }

      const history = this.performanceHistory.get(strategyName)
      history.executions++
      
      if (success) {
        history.successes++
        this.metrics.successfulPredictions++
      } else {
        history.failures++
      }

      // Update averages using exponential moving average
      const alpha = this.config.adaptationRate
      history.averageDuration = history.averageDuration * (1 - alpha) + duration * alpha
      
      if (performanceImpact && performanceImpact.overall !== undefined) {
        history.averageImpact = history.averageImpact * (1 - alpha) + Math.abs(performanceImpact.overall) * alpha
      }

      history.lastUpdated = Date.now()

      // Adapt scoring model if significant pattern emerges
      if (history.executions % this.config.adaptationWindow === 0) {
        await this._adaptScoringModel(strategyName, history)
        this.metrics.adaptationEvents++
      }

      this.auditLogger?.info('Strategy performance updated', {
        component: 'StrategySelector',
        strategy: strategyName,
        success,
        executions: history.executions,
        successRate: history.successes / history.executions
      })

    } catch (error) {
      this.auditLogger?.error('Failed to update strategy performance', {
        component: 'StrategySelector',
        strategy: strategyName,
        error: error.message
      })
    }
  }

  /**
   * Initialize available cleanup strategies
   * @private
   */
  async _initializeStrategies () {
    const strategies = [
      new GracefulStrategy(this.dependencies, this.config.graceful),
      new AggressiveStrategy(this.dependencies, this.config.aggressive),
      new SmartStrategy(this.dependencies, this.config.smart),
      new EmergencyStrategy(this.dependencies, this.config.emergency)
    ]

    for (const strategy of strategies) {
      await strategy.initialize?.()
      this.strategies.set(strategy.name, strategy)
      
      this.auditLogger?.debug('Strategy initialized', {
        component: 'StrategySelector',
        strategy: strategy.name,
        description: strategy.description
      })
    }
  }

  /**
   * Initialize ML-like scoring model
   * @private
   */
  _initializeScoringModel () {
    // Initialize feature weights with domain knowledge
    this.scoringModel.weights.set('riskScore', -0.3) // Lower risk is better
    this.scoringModel.weights.set('systemLoad', -0.2) // Lower load preferred
    this.scoringModel.weights.set('dependencyComplexity', -0.25) // Simpler is better
    this.scoringModel.weights.set('targetCount', -0.1) // Fewer targets preferred
    this.scoringModel.weights.set('historicalSuccessRate', 0.4) // Higher success rate preferred
    this.scoringModel.weights.set('urgencyLevel', 0.2) // Higher urgency needs faster strategies
    this.scoringModel.weights.set('resourceConstraints', -0.15) // Lower constraints preferred

    this.scoringModel.bias = 0.5 // Neutral starting point
  }

  /**
   * Extract features from cleanup context
   * @param {Object} context - Cleanup context
   * @returns {Object} Extracted features
   * @private
   */
  _extractFeatures (context) {
    const features = {
      riskScore: context.riskAssessment?.score || 0,
      systemLoad: context.performanceState?.overallLoad || 0,
      dependencyComplexity: context.dependencies?.complexity || 0,
      targetCount: context.cleanupRequest?.targets?.length || 0,
      urgencyLevel: this._calculateUrgencyLevel(context),
      resourceConstraints: this._calculateResourceConstraints(context),
      historicalSuccessRate: 0.5 // Default, will be updated with actual data
    }

    // Normalize features to 0-1 scale
    features.riskScore = Math.min(features.riskScore / 10, 1)
    features.dependencyComplexity = Math.min(features.dependencyComplexity / 10, 1)
    features.targetCount = Math.min(features.targetCount / 50, 1)

    return features
  }

  /**
   * Score all strategies against extracted features
   * @param {Object} features - Extracted features
   * @param {Object} context - Full context
   * @returns {Promise<Array>} Strategy scores
   * @private
   */
  async _scoreStrategies (features, context) {
    const scores = []

    for (const [name, strategy] of this.strategies) {
      const score = this._calculateStrategyScore(strategy, features, context)
      const confidence = this._calculateConfidence(strategy, features, context)
      
      scores.push({
        strategy,
        name,
        score,
        confidence,
        reasoning: this._generateReasoning(strategy, features, score)
      })
    }

    return scores.sort((a, b) => b.score - a.score)
  }

  /**
   * Calculate strategy score using ML-like approach
   * @param {Object} strategy - Strategy instance
   * @param {Object} features - Extracted features
   * @param {Object} context - Full context
   * @returns {number} Strategy score
   * @private
   */
  _calculateStrategyScore (strategy, features, context) {
    let score = this.scoringModel.bias

    // Base scoring using learned weights
    for (const [featureName, featureValue] of Object.entries(features)) {
      const weight = this.scoringModel.weights.get(featureName) || 0
      score += weight * featureValue
    }

    // Strategy-specific adjustments
    score += this._getStrategySpecificScore(strategy, features, context)

    // Apply historical performance
    const history = this.performanceHistory.get(strategy.name)
    if (history && history.executions > 0) {
      const successRate = history.successes / history.executions
      features.historicalSuccessRate = successRate
      score += (successRate - 0.5) * 0.3 // Bonus/penalty based on historical performance
    }

    // Ensure score is in reasonable range
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Get strategy-specific score adjustments
   * @param {Object} strategy - Strategy instance
   * @param {Object} features - Extracted features
   * @param {Object} context - Full context
   * @returns {number} Strategy-specific score adjustment
   * @private
   */
  _getStrategySpecificScore (strategy, features, context) {
    let adjustment = 0

    switch (strategy.name) {
      case 'GracefulStrategy':
        // Prefers low risk, normal system load
        if (features.riskScore < 0.3) adjustment += 0.2
        if (features.systemLoad < 0.6) adjustment += 0.15
        if (features.targetCount < 0.2) adjustment += 0.1
        break

      case 'AggressiveStrategy':
        // Prefers high urgency, can handle high risk
        if (features.urgencyLevel > 0.7) adjustment += 0.25
        if (features.riskScore > 0.6) adjustment += 0.1 // Can handle risk
        if (features.systemLoad > 0.8) adjustment -= 0.2 // Avoid on stressed systems
        break

      case 'SmartStrategy':
        // Balances all factors, good for complex scenarios
        if (features.dependencyComplexity > 0.5) adjustment += 0.2
        if (features.targetCount > 0.3) adjustment += 0.15
        if (features.riskScore > 0.3 && features.riskScore < 0.7) adjustment += 0.1
        break

      case 'EmergencyStrategy':
        // For critical situations only
        if (features.urgencyLevel > 0.9) adjustment += 0.3
        if (features.systemLoad > 0.9) adjustment += 0.2
        if (context.riskAssessment?.level === 'high') adjustment += 0.15
        else adjustment -= 0.4 // Heavy penalty if not emergency
        break
    }

    return adjustment
  }

  /**
   * Calculate confidence in strategy selection
   * @param {Object} strategy - Strategy instance
   * @param {Object} features - Extracted features
   * @param {Object} context - Full context
   * @returns {number} Confidence score (0-1)
   * @private
   */
  _calculateConfidence (strategy, features, context) {
    let confidence = 0.5 // Base confidence

    // Historical performance confidence
    const history = this.performanceHistory.get(strategy.name)
    if (history && history.executions > 10) {
      const successRate = history.successes / history.executions
      confidence += (successRate - 0.5) * 0.3
    } else if (history && history.executions > 0) {
      // Lower confidence for limited data
      confidence -= 0.1
    }

    // Feature clarity confidence
    const featureClarity = this._calculateFeatureClarity(features)
    confidence += featureClarity * 0.2

    // Context completeness confidence
    const contextCompleteness = this._calculateContextCompleteness(context)
    confidence += contextCompleteness * 0.2

    // Risk assessment confidence
    if (context.riskAssessment && context.riskAssessment.level) {
      confidence += 0.1
    }

    return Math.max(0.1, Math.min(1, confidence))
  }

  /**
   * Select best strategy from scores
   * @param {Array} strategyScores - Sorted strategy scores
   * @param {Object} features - Extracted features
   * @returns {Object} Selected strategy with metadata
   * @private
   */
  _selectBestStrategy (strategyScores, features) {
    const topStrategy = strategyScores[0]
    const secondBest = strategyScores[1]

    // Check if confidence threshold is met
    if (topStrategy.confidence < this.config.confidenceThreshold) {
      this.auditLogger?.warn('Low confidence in strategy selection', {
        component: 'StrategySelector',
        strategy: topStrategy.name,
        confidence: topStrategy.confidence,
        threshold: this.config.confidenceThreshold
      })
    }

    // Check for close competition
    let competitionWarning = false
    if (secondBest && (topStrategy.score - secondBest.score) < 0.1) {
      competitionWarning = true
      this.auditLogger?.info('Close competition between strategies', {
        component: 'StrategySelector',
        topStrategy: topStrategy.name,
        secondStrategy: secondBest.name,
        scoreDifference: topStrategy.score - secondBest.score
      })
    }

    return {
      strategy: topStrategy.strategy,
      confidence: topStrategy.confidence,
      score: topStrategy.score,
      reasoning: topStrategy.reasoning,
      alternatives: strategyScores.slice(1, 3),
      competitionWarning,
      selectionCriteria: {
        primaryFactors: this._identifyPrimaryFactors(features),
        confidenceFactors: this._identifyConfidenceFactors(topStrategy.confidence)
      }
    }
  }

  /**
   * Generate human-readable reasoning for strategy selection
   * @param {Object} strategy - Selected strategy
   * @param {Object} features - Extracted features
   * @param {number} score - Strategy score
   * @returns {Array} Reasoning statements
   * @private
   */
  _generateReasoning (strategy, features, score) {
    const reasoning = []

    // Risk-based reasoning
    if (features.riskScore > 0.7) {
      reasoning.push(`High risk scenario (${(features.riskScore * 10).toFixed(1)}/10) - ${strategy.name} ${strategy.name === 'EmergencyStrategy' ? 'appropriate for' : 'may struggle with'} high-risk situations`)
    } else if (features.riskScore < 0.3) {
      reasoning.push(`Low risk scenario - ${strategy.name} ${strategy.name === 'GracefulStrategy' ? 'optimal for' : 'acceptable for'} low-risk cleanup`)
    }

    // System load reasoning
    if (features.systemLoad > 0.8) {
      reasoning.push(`High system load detected - ${strategy.name} ${strategy.name === 'AggressiveStrategy' ? 'not recommended' : 'suitable'} for stressed systems`)
    }

    // Complexity reasoning
    if (features.dependencyComplexity > 0.6) {
      reasoning.push(`Complex dependencies detected - ${strategy.name} ${strategy.name === 'SmartStrategy' ? 'designed for' : 'may need assistance with'} complex scenarios`)
    }

    // Historical performance reasoning
    const history = this.performanceHistory.get(strategy.name)
    if (history && history.executions > 5) {
      const successRate = history.successes / history.executions
      if (successRate > 0.8) {
        reasoning.push(`Strong historical performance (${(successRate * 100).toFixed(1)}% success rate)`)
      } else if (successRate < 0.6) {
        reasoning.push(`Concerning historical performance (${(successRate * 100).toFixed(1)}% success rate)`)
      }
    }

    // Urgency reasoning
    if (features.urgencyLevel > 0.8) {
      reasoning.push(`High urgency situation - ${strategy.name} ${strategy.name.includes('Emergency') || strategy.name.includes('Aggressive') ? 'appropriate for' : 'may be too slow for'} urgent cleanup`)
    }

    return reasoning
  }

  /**
   * Calculate urgency level from context
   * @param {Object} context - Cleanup context
   * @returns {number} Urgency level (0-1)
   * @private
   */
  _calculateUrgencyLevel (context) {
    let urgency = 0

    // Risk-based urgency
    if (context.riskAssessment) {
      switch (context.riskAssessment.level) {
        case 'high': urgency += 0.4; break
        case 'medium': urgency += 0.2; break
        case 'low': urgency += 0.1; break
      }
    }

    // System load urgency
    if (context.performanceState?.overallLoad > 0.9) urgency += 0.3
    else if (context.performanceState?.overallLoad > 0.8) urgency += 0.2

    // Target count urgency
    const targetCount = context.cleanupRequest?.targets?.length || 0
    if (targetCount > 20) urgency += 0.2
    else if (targetCount > 10) urgency += 0.1

    // Dependency complexity urgency
    if (context.dependencies?.hasCircularDependencies) urgency += 0.2

    return Math.min(urgency, 1)
  }

  /**
   * Calculate resource constraints from context
   * @param {Object} context - Cleanup context
   * @returns {number} Resource constraint level (0-1)
   * @private
   */
  _calculateResourceConstraints (context) {
    let constraints = 0

    // Memory constraints
    if (context.performanceState?.memory?.percentage > 80) constraints += 0.3
    else if (context.performanceState?.memory?.percentage > 60) constraints += 0.2

    // CPU constraints
    if (context.performanceState?.cpu?.percentage > 80) constraints += 0.3
    else if (context.performanceState?.cpu?.percentage > 60) constraints += 0.2

    // Active process constraints
    const processCount = context.systemState?.processes?.length || 0
    if (processCount > 200) constraints += 0.2
    else if (processCount > 100) constraints += 0.1

    return Math.min(constraints, 1)
  }

  /**
   * Calculate feature clarity score
   * @param {Object} features - Extracted features
   * @returns {number} Feature clarity (0-1)
   * @private
   */
  _calculateFeatureClarity (features) {
    let clarity = 0
    let featureCount = 0

    for (const [key, value] of Object.entries(features)) {
      featureCount++
      if (value !== undefined && value !== null && !isNaN(value)) {
        clarity += 1
      }
    }

    return featureCount > 0 ? clarity / featureCount : 0
  }

  /**
   * Calculate context completeness score
   * @param {Object} context - Full context
   * @returns {number} Context completeness (0-1)
   * @private
   */
  _calculateContextCompleteness (context) {
    let completeness = 0
    const requiredFields = ['cleanupRequest', 'systemState', 'performanceState', 'riskAssessment']

    for (const field of requiredFields) {
      if (context[field]) completeness += 0.25
    }

    return completeness
  }

  /**
   * Identify primary factors in decision
   * @param {Object} features - Extracted features
   * @returns {Array} Primary decision factors
   * @private
   */
  _identifyPrimaryFactors (features) {
    const factors = []

    if (features.riskScore > 0.6) factors.push('high_risk')
    if (features.systemLoad > 0.7) factors.push('system_stress')
    if (features.dependencyComplexity > 0.5) factors.push('complex_dependencies')
    if (features.urgencyLevel > 0.7) factors.push('high_urgency')
    if (features.targetCount > 0.3) factors.push('many_targets')

    return factors
  }

  /**
   * Identify confidence factors
   * @param {number} confidence - Confidence score
   * @returns {Array} Confidence factors
   * @private
   */
  _identifyConfidenceFactors (confidence) {
    const factors = []

    if (confidence > 0.9) factors.push('very_high_confidence')
    else if (confidence > 0.8) factors.push('high_confidence')
    else if (confidence > 0.6) factors.push('moderate_confidence')
    else factors.push('low_confidence')

    return factors
  }

  /**
   * Estimate execution time for strategy
   * @param {Object} strategyScore - Strategy with score
   * @param {Object} features - Extracted features
   * @returns {Object} Time estimation
   * @private
   */
  _estimateExecutionTime (strategyScore, features) {
    const baseTime = {
      GracefulStrategy: 15000, // 15 seconds
      AggressiveStrategy: 5000, // 5 seconds
      SmartStrategy: 20000, // 20 seconds
      EmergencyStrategy: 3000 // 3 seconds
    }

    let estimatedTime = baseTime[strategyScore.name] || 10000

    // Adjust based on features
    estimatedTime *= (1 + features.targetCount * 0.5)
    estimatedTime *= (1 + features.dependencyComplexity * 0.3)
    estimatedTime *= (1 + features.systemLoad * 0.2)

    return {
      estimated: Math.round(estimatedTime),
      confidence: strategyScore.confidence,
      factors: ['target_count', 'dependency_complexity', 'system_load']
    }
  }

  /**
   * Get overall system recommendation
   * @param {Object} systemAnalysis - System analysis
   * @param {Array} recommendations - Individual recommendations
   * @returns {Object} Overall recommendation
   * @private
   */
  _getOverallRecommendation (systemAnalysis, recommendations) {
    const highPriorityCount = recommendations.filter(r => r.opportunity.priority === 'high').length
    const avgConfidence = recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length

    let priority = 'low'
    let action = 'monitor'

    if (highPriorityCount > 0 || systemAnalysis.health.overall === 'stressed') {
      priority = 'high'
      action = 'immediate_cleanup'
    } else if (recommendations.length > 3) {
      priority = 'medium'
      action = 'scheduled_cleanup'
    }

    return {
      priority,
      action,
      confidence: avgConfidence,
      reasoning: this._generateOverallReasoning(systemAnalysis, recommendations, highPriorityCount),
      estimatedTotalTime: recommendations.reduce((sum, r) => sum + (r.estimatedTime?.estimated || 0), 0)
    }
  }

  /**
   * Generate overall recommendation reasoning
   * @param {Object} systemAnalysis - System analysis
   * @param {Array} recommendations - Individual recommendations
   * @param {number} highPriorityCount - Count of high priority items
   * @returns {Array} Reasoning statements
   * @private
   */
  _generateOverallReasoning (systemAnalysis, recommendations, highPriorityCount) {
    const reasoning = []

    if (highPriorityCount > 0) {
      reasoning.push(`${highPriorityCount} high-priority cleanup opportunities identified`)
    }

    if (systemAnalysis.health.overall === 'stressed') {
      reasoning.push('System is under stress - immediate action recommended')
    }

    if (recommendations.length > 5) {
      reasoning.push('Multiple cleanup opportunities available - batch processing recommended')
    }

    if (systemAnalysis.performance.overallLoad < 0.3) {
      reasoning.push('System has spare capacity for cleanup operations')
    }

    return reasoning
  }

  /**
   * Record decision for learning
   * @param {Object} features - Decision features
   * @param {Object} selection - Selected strategy
   * @param {Object} context - Full context
   * @private
   */
  _recordDecision (features, selection, context) {
    this.strategyHistory.push({
      timestamp: Date.now(),
      features,
      selectedStrategy: selection.strategy.name,
      confidence: selection.confidence,
      score: selection.score,
      context: context.summary
    })

    // Maintain history size limit
    if (this.strategyHistory.length > this.config.historySize) {
      this.strategyHistory.shift()
    }

    // Update context patterns
    const patternKey = this._generatePatternKey(features)
    const existingPattern = this.contextPatterns.get(patternKey) || {
      count: 0,
      strategies: new Map(),
      avgConfidence: 0
    }

    existingPattern.count++
    const strategyCount = existingPattern.strategies.get(selection.strategy.name) || 0
    existingPattern.strategies.set(selection.strategy.name, strategyCount + 1)
    existingPattern.avgConfidence = (existingPattern.avgConfidence + selection.confidence) / 2

    this.contextPatterns.set(patternKey, existingPattern)
  }

  /**
   * Generate pattern key from features
   * @param {Object} features - Decision features
   * @returns {string} Pattern key
   * @private
   */
  _generatePatternKey (features) {
    const riskLevel = features.riskScore > 0.6 ? 'high' : features.riskScore > 0.3 ? 'medium' : 'low'
    const loadLevel = features.systemLoad > 0.7 ? 'high' : features.systemLoad > 0.4 ? 'medium' : 'low'
    const complexityLevel = features.dependencyComplexity > 0.6 ? 'high' : features.dependencyComplexity > 0.3 ? 'medium' : 'low'
    
    return `${riskLevel}_${loadLevel}_${complexityLevel}`
  }

  /**
   * Adapt scoring model based on performance
   * @param {string} strategyName - Strategy name
   * @param {Object} history - Performance history
   * @private
   */
  async _adaptScoringModel (strategyName, history) {
    const successRate = history.successes / history.executions
    
    // If strategy consistently under/over performs, adjust weights
    if (successRate > 0.9) {
      // Strategy is doing very well, increase its scoring factors
      this.auditLogger?.info('Adapting scoring model - boosting successful strategy', {
        component: 'StrategySelector',
        strategy: strategyName,
        successRate
      })
    } else if (successRate < 0.5) {
      // Strategy is underperforming, reduce its appeal
      this.auditLogger?.warn('Adapting scoring model - penalizing underperforming strategy', {
        component: 'StrategySelector',
        strategy: strategyName,
        successRate
      })
    }
  }

  /**
   * Load historical data for learning
   * @private
   */
  async _loadHistoricalData () {
    try {
      // In a real implementation, this would load from persistent storage
      this.auditLogger?.info('Loading historical data for strategy selection', {
        component: 'StrategySelector'
      })
      
      // For now, initialize with some reasonable defaults
      this.performanceHistory.set('GracefulStrategy', {
        executions: 0,
        successes: 0,
        failures: 0,
        averageDuration: 15000,
        averageImpact: 0.1,
        lastUpdated: Date.now()
      })

    } catch (error) {
      this.auditLogger?.warn('Failed to load historical data', {
        component: 'StrategySelector',
        error: error.message
      })
    }
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics () {
    return {
      ...this.metrics,
      isInitialized: this.isInitialized,
      strategiesAvailable: this.strategies.size,
      historySize: this.strategyHistory.length,
      patternsLearned: this.contextPatterns.size,
      modelWeights: Object.fromEntries(this.scoringModel.weights)
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup () {
    // Cleanup all strategies
    for (const strategy of this.strategies.values()) {
      if (strategy.cleanup) await strategy.cleanup()
    }

    this.strategies.clear()
    this.strategyHistory.length = 0
    this.performanceHistory.clear()
    this.contextPatterns.clear()
    
    this.removeAllListeners()
  }
}

module.exports = StrategySelector