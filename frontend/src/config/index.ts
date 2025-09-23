/**
 * Configuration System Entry Point
 *
 * Provides organized access to all configuration subsystems
 * and initialization/validation utilities.
 */

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

import {
  getConfig,
  validateConfiguration,
  isFeatureEnabled,
  getApiEndpoint,
  getEndpoint
} from './unified-config';
import { secureLogger } from '../utils/secure-logger';

/**
 * Initialize configuration system
 * Should be called early in application startup
 */
export function initializeConfiguration(): boolean {
  try {
    secureLogger.debug('Initializing configuration system...');

    const config = getConfig();

    if (!validateConfiguration()) {
      throw new Error('Configuration validation failed');
    }

    secureLogger.info('Configuration system initialized successfully', {
      environment: config.environment.getMode(),
      apiBaseUrl: config.api.baseUrl,
      featuresEnabled: Object.entries(config.features)
        .filter(([, enabled]) => enabled)
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

export default {
  initializeConfiguration,
  getConfigurationSummary,
  getConfig,
  validateConfiguration,
  isFeatureEnabled,
  getApiEndpoint,
  getEndpoint
};
