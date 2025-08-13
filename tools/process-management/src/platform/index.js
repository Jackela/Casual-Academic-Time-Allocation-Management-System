/**
 * Cross-Platform Process Management System
 *
 * Unified export point for the complete platform abstraction layer:
 * - Automatic platform detection and capability analysis
 * - Cross-platform process management providers
 * - Performance optimization engine
 * - Seamless integration with existing systems
 * - Comprehensive monitoring and analytics
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

// Core platform detection and providers
const PlatformDetector = require('./PlatformDetector')
const ProcessProvider = require('./ProcessProvider')
const WindowsProvider = require('./WindowsProvider')
const UnixProvider = require('./UnixProvider')

// Optimization and integration layers
const OptimizationEngine = require('./OptimizationEngine')
const PlatformIntegration = require('./PlatformIntegration')

// Enhanced orchestrator
const EnhancedProcessOrchestrator = require('../core/EnhancedProcessOrchestrator')

/**
 * Platform Management Factory
 * 
 * Provides simplified access to platform-specific functionality
 * with automatic detection and configuration
 */
class PlatformManager {
  constructor(config = {}) {
    this.config = {
      autoDetect: true,
      enableOptimization: true,
      enableIntegration: true,
      enableMonitoring: true,
      fallbackToLegacy: true,
      ...config
    }
    
    this.detector = null
    this.provider = null
    this.integration = null
    this.initialized = false
  }

  /**
   * Initialize platform management with automatic detection
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    if (this.initialized) {
      return this.getStatus()
    }

    try {
      // Step 1: Platform detection
      this.detector = new PlatformDetector()
      const platformInfo = await this.detector.detectPlatform()

      // Step 2: Provider initialization
      this.provider = new ProcessProvider({
        autoInitialize: false,
        caching: this.config.enableOptimization,
        optimization: this.config.enableOptimization,
        monitoring: this.config.enableMonitoring,
        fallbackEnabled: this.config.fallbackToLegacy
      })
      
      await this.provider.initialize()

      // Step 3: Integration setup (if orchestrator provided)
      if (this.config.orchestrator && this.config.enableIntegration) {
        this.integration = new PlatformIntegration(this.config.orchestrator, {
          enableOptimization: this.config.enableOptimization,
          enablePerformanceMonitoring: this.config.enableMonitoring
        })
        
        await this.integration.initialize()
      }

      this.initialized = true

      return {
        success: true,
        platform: platformInfo.platform,
        provider: this.provider.getCapabilities().provider,
        capabilities: this.provider.getCapabilities(),
        optimizationEnabled: this.config.enableOptimization,
        integrationEnabled: !!this.integration,
        initTime: Date.now()
      }

    } catch (error) {
      throw new Error(`Platform management initialization failed: ${error.message}`)
    }
  }

  /**
   * Get current platform status
   * @returns {Object} Platform status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      platform: this.detector ? this.detector.getCachedDetection()?.platform : null,
      provider: this.provider ? this.provider.getCapabilities() : null,
      integration: this.integration ? this.integration.getIntegrationMetrics() : null
    }
  }

  /**
   * Get process provider instance
   * @returns {ProcessProvider} Process provider
   */
  getProvider() {
    if (!this.initialized) {
      throw new Error('Platform manager not initialized')
    }
    return this.provider
  }

  /**
   * Get platform integration instance
   * @returns {PlatformIntegration|null} Platform integration
   */
  getIntegration() {
    return this.integration
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.provider) {
      this.provider.destroy()
    }
    
    if (this.integration) {
      this.integration.destroy()
    }
    
    this.initialized = false
  }
}

/**
 * Create platform manager with automatic configuration
 * @param {Object} config - Configuration options
 * @returns {PlatformManager} Platform manager instance
 */
function createPlatformManager(config = {}) {
  return new PlatformManager(config)
}

/**
 * Create enhanced process orchestrator with platform integration
 * @param {Object} dependencies - Dependencies
 * @param {Object} config - Configuration
 * @returns {EnhancedProcessOrchestrator} Enhanced orchestrator
 */
function createEnhancedOrchestrator(dependencies = {}, config = {}) {
  return new EnhancedProcessOrchestrator(dependencies, {
    enablePlatformIntegration: true,
    enableCrossPlatformOptimization: true,
    enableAdvancedMonitoring: true,
    ...config
  })
}

/**
 * Get platform-specific provider directly
 * @param {string} platform - Platform name (optional, auto-detected if not provided)
 * @returns {Promise<Object>} Platform provider
 */
async function getPlatformProvider(platform = null) {
  const detector = new PlatformDetector()
  const platformInfo = platform ? { platform } : await detector.detectPlatform()
  
  if (platformInfo.platform === 'win32') {
    const provider = new WindowsProvider()
    await provider.initialize()
    return provider
  } else if (['darwin', 'linux', 'freebsd', 'openbsd'].includes(platformInfo.platform)) {
    const provider = new UnixProvider()
    await provider.initialize()
    return provider
  } else {
    throw new Error(`Unsupported platform: ${platformInfo.platform}`)
  }
}

/**
 * Perform platform detection
 * @param {boolean} forceRefresh - Force fresh detection
 * @returns {Promise<Object>} Platform information
 */
async function detectPlatform(forceRefresh = false) {
  const detector = new PlatformDetector()
  return await detector.detectPlatform(forceRefresh)
}

/**
 * Quick platform compatibility check
 * @returns {Promise<Object>} Compatibility status
 */
async function checkPlatformCompatibility() {
  try {
    const detector = new PlatformDetector()
    const platformInfo = await detector.detectPlatform()
    
    const compatibility = {
      platform: platformInfo.platform,
      supported: true,
      capabilities: platformInfo.capabilities,
      tools: {
        available: platformInfo.tools.available,
        missing: platformInfo.tools.missing,
        critical: []
      },
      performance: platformInfo.performance,
      recommendations: []
    }

    // Check for critical missing tools
    if (platformInfo.platform === 'win32') {
      if (!platformInfo.tools.available.includes('taskkill')) {
        compatibility.supported = false
        compatibility.tools.critical.push('taskkill')
      }
    } else {
      if (!platformInfo.tools.available.includes('ps') || !platformInfo.tools.available.includes('kill')) {
        compatibility.supported = false
        compatibility.tools.critical.push('ps', 'kill')
      }
    }

    // Add performance recommendations
    if (platformInfo.performance) {
      const avgQueryTime = platformInfo.performance.operations.processQuery.averageTime
      if (avgQueryTime > 2000) {
        compatibility.recommendations.push('Consider enabling aggressive caching for slow process queries')
      }
    }

    return compatibility

  } catch (error) {
    return {
      platform: process.platform,
      supported: false,
      error: error.message,
      recommendations: ['Check system permissions and required tools availability']
    }
  }
}

module.exports = {
  // Core classes
  PlatformDetector,
  ProcessProvider,
  WindowsProvider,
  UnixProvider,
  OptimizationEngine,
  PlatformIntegration,
  EnhancedProcessOrchestrator,
  
  // Management classes
  PlatformManager,
  
  // Factory functions
  createPlatformManager,
  createEnhancedOrchestrator,
  getPlatformProvider,
  
  // Utility functions
  detectPlatform,
  checkPlatformCompatibility,
  
  // Constants
  SUPPORTED_PLATFORMS: ['win32', 'darwin', 'linux', 'freebsd', 'openbsd'],
  
  // Version info
  VERSION: '1.0.0',
  
  // Default configurations
  DEFAULT_CONFIG: {
    autoDetect: true,
    enableOptimization: true,
    enableIntegration: true,
    enableMonitoring: true,
    fallbackToLegacy: true,
    operationTimeout: 30000,
    cacheTimeout: 60000,
    batchSize: 50,
    maxRetries: 3
  }
}