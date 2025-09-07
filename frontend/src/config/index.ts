/**
 * Configuration System Entry Point
 * 
 * Provides organized access to all configuration subsystems
 * and initialization/validation utilities.
 */

// =============================================================================
// Core Configuration Exports
// =============================================================================

export {
  getConfig,
  resetConfig,
  isFeatureEnabled,
  getApiEndpoint,
  getEndpoint,
  validateConfiguration
} from './unified-config';

export type {
  UnifiedConfiguration,
  ApiConfiguration,
  SecurityConfiguration,
  PerformanceConfiguration,
  FeatureFlags
} from './unified-config';

// =============================================================================
// Migration and Compatibility
// =============================================================================

export {
  API_BASE_URL,
  API_CONFIG,
  getApiBaseUrl,
  getMigrationReport
} from './migration';

// =============================================================================
// Configuration Initialization
// =============================================================================

import { getConfig, validateConfiguration } from './unified-config';
import { validateConfigConsistency } from './migration';
import { secureLogger } from '../utils/secure-logger';

/**
 * Initialize configuration system
 * Should be called early in application startup
 */
export function initializeConfiguration(): boolean {
  try {
    secureLogger.debug('Initializing configuration system...');
    
    // Load unified configuration
    const config = getConfig();
    
    // Validate configuration
    if (!validateConfiguration()) {
      throw new Error('Configuration validation failed');
    }
    
    // Validate consistency between legacy and unified configs
    if (!validateConfigConsistency()) {
      secureLogger.warn('Configuration consistency check failed - legacy and unified configs may be out of sync');
    }
    
    secureLogger.info('Configuration system initialized successfully', {
      environment: config.environment.getMode(),
      apiBaseUrl: config.api.baseUrl,
      featuresEnabled: Object.entries(config.features)
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name),
      securityEnabled: config.security.enableLogging,
      performanceOptimized: config.performance.enableCaching
    });
    
    return true;
    
  } catch (error) {
    secureLogger.error('Configuration system initialization failed', error);
    return false;
  }
}

/**
 * Get configuration summary for debugging
 */
export function getConfigurationSummary() {
  const config = getConfig();
  
  return {
    environment: {
      mode: config.environment.getMode(),
      isProduction: config.environment.isProduction(),
      isDevelopment: config.environment.isDevelopment(),
      isE2E: config.environment.isE2E()
    },
    api: {
      baseUrl: config.api.baseUrl,
      timeout: config.api.timeout,
      retryAttempts: config.api.retryAttempts
    },
    security: {
      enableLogging: config.security.enableLogging,
      sessionTimeout: config.security.sessionTimeoutMs,
      maxLoginAttempts: config.security.maxLoginAttempts
    },
    performance: {
      enableCaching: config.performance.enableCaching,
      maxConcurrentRequests: config.performance.maxConcurrentRequests
    },
    features: config.features,
    app: config.app
  };
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  initialize: initializeConfiguration,
  getConfig,
  getSummary: getConfigurationSummary,
  isFeatureEnabled,
  getApiEndpoint,
  getEndpoint
};