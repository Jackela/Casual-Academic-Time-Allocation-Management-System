/**
 * Configuration Migration Helper
 * 
 * Provides backward compatibility and migration paths from old
 * configuration systems to the unified configuration.
 */

import { getConfig, getApiEndpoint } from './unified-config';
import { secureLogger } from '../utils/secure-logger';

// =============================================================================
// Legacy API Compatibility
// =============================================================================

/**
 * Legacy API_BASE_URL compatibility
 * @deprecated Use getConfig().api.baseUrl instead
 */
export const API_BASE_URL = getConfig().api.baseUrl;

/**
 * Legacy API_CONFIG compatibility
 * @deprecated Use getConfig().api instead
 */
export const API_CONFIG = {
  BACKEND: {
    DEFAULT_URL: getConfig().api.baseUrl,
    E2E_URL: getConfig().api.baseUrl,
    ENDPOINTS: {
      HEALTH: getConfig().api.endpoints.health,
      AUTH_LOGIN: getConfig().api.endpoints.auth.login,
      TIMESHEETS_PENDING: getConfig().api.endpoints.timesheets.pending,
      APPROVALS: getConfig().api.endpoints.approvals
    },
    TIMEOUTS: {
      API_REQUEST: getConfig().api.timeout,
      HEALTH_CHECK: 5000
    }
  }
};

/**
 * Legacy getApiBaseUrl function
 * @deprecated Use getConfig().api.baseUrl instead
 */
export function getApiBaseUrl(): string {
  secureLogger.warn('getApiBaseUrl() is deprecated. Use getConfig().api.baseUrl instead.');
  return getConfig().api.baseUrl;
}

// =============================================================================
// Migration Utilities
// =============================================================================

/**
 * Check if code is using legacy configuration
 */
export function detectLegacyUsage(): string[] {
  const warnings: string[] = [];
  
  // This would be extended with actual detection logic in a real migration
  // For now, just log that migration is available
  secureLogger.info('Configuration migration utilities loaded', {
    newConfigAvailable: true,
    legacyCompatibilityEnabled: true
  });
  
  return warnings;
}

/**
 * Migration report for developers
 */
export function getMigrationReport() {
  return {
    status: 'compatibility-mode',
    message: 'Legacy configuration compatibility is enabled',
    recommendations: [
      'Replace API_BASE_URL imports with getConfig().api.baseUrl',
      'Replace API_CONFIG usage with getConfig().api',
      'Use getEndpoint() helper for endpoint URLs',
      'Migrate to unified configuration system for new features'
    ],
    benefits: [
      'Type-safe configuration access',
      'Environment-aware feature flags',
      'Centralized security settings',
      'Performance optimization options',
      'Better testing support'
    ]
  };
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate that legacy and new configs are synchronized
 */
export function validateConfigConsistency(): boolean {
  const config = getConfig();
  
  try {
    // Check API base URL consistency
    if (API_BASE_URL !== config.api.baseUrl) {
      secureLogger.warn('Configuration inconsistency detected', {
        legacy: API_BASE_URL,
        unified: config.api.baseUrl
      });
      return false;
    }
    
    // Check endpoint consistency
    const legacyAuth = API_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN;
    const unifiedAuth = config.api.endpoints.auth.login;
    
    if (legacyAuth !== unifiedAuth) {
      secureLogger.warn('Auth endpoint configuration mismatch', {
        legacy: legacyAuth,
        unified: unifiedAuth
      });
      return false;
    }
    
    secureLogger.debug('Configuration consistency validated');
    return true;
    
  } catch (error) {
    secureLogger.error('Configuration consistency validation failed', error);
    return false;
  }
}

// =============================================================================
// Exports for backward compatibility
// =============================================================================

export default {
  API_BASE_URL,
  API_CONFIG,
  getApiBaseUrl,
  detectLegacyUsage,
  getMigrationReport,
  validateConfigConsistency
};