/**
 * Unified Configuration System
 * 
 * Single source of truth for all application configuration.
 * Consolidates environment detection, API config, security settings,
 * and runtime configuration into a cohesive system.
 */

import { ENV_CONFIG } from '../utils/environment';
import { secureLogger } from '../utils/secure-logger';

type GlobalWithProcessEnv = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const getProcessEnv = (): Record<string, string | undefined> => {
  return ((globalThis as GlobalWithProcessEnv).process?.env) ?? {};
};

// =============================================================================
// Configuration Types
// =============================================================================

export interface ApiConfiguration {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  endpoints: {
    health: string;
    auth: {
      login: string;
      logout: string;
      refresh: string;
    };
    timesheets: {
      base: string;
      pending: string;
      byTutor: string;
    };
    approvals: string;
    dashboard: {
      summary: string;
      admin: string;
    };
    users: {
      me: string;
      all: string;
    };
    courses: string;
  };
}

export interface SecurityConfiguration {
  tokenStorageKey: string;
  userStorageKey: string;
  enableLogging: boolean;
  enableDebugMode: boolean;
  sensitiveDataPatterns: RegExp[];
  sessionTimeoutMs: number;
  maxLoginAttempts: number;
  lockoutDurationMs: number;
}

export interface PerformanceConfiguration {
  enableCaching: boolean;
  cacheTimeoutMs: number;
  enableServiceWorker: boolean;
  maxConcurrentRequests: number;
  debounceDelayMs: number;
  throttleDelayMs: number;
}

export interface FeatureFlags {
  enableNewDashboard: boolean;
  enableBulkOperations: boolean;
  enableRealtimeUpdates: boolean;
  enableAdvancedFiltering: boolean;
  enableExportFeatures: boolean;
  enableNotifications: boolean;
}

export interface UnifiedConfiguration {
  environment: typeof ENV_CONFIG;
  api: ApiConfiguration;
  security: SecurityConfiguration;
  performance: PerformanceConfiguration;
  features: FeatureFlags;
  app: {
    name: string;
    version: string;
    buildTime: string;
    supportEmail: string;
  };
}

// =============================================================================
// Configuration Builder
// =============================================================================

class ConfigurationBuilder {

  /**
   * Build API configuration based on environment
   */
  private buildApiConfig(): ApiConfiguration {
    const baseUrl = this.getApiBaseUrl();
    
    return {
      baseUrl,
      timeout: this.getTimeoutConfig(),
      retryAttempts: ENV_CONFIG.isProduction() ? 3 : 1,
      retryDelay: 1000,
      endpoints: {
        health: '/actuator/health',
        auth: {
          login: '/api/auth/login',
          logout: '/api/auth/logout',
          refresh: '/api/auth/refresh'
        },
        timesheets: {
          base: '/api/timesheets',
          pending: '/api/timesheets/pending-final-approval',
          byTutor: '/api/timesheets/tutor'
        },
        approvals: '/api/approvals',
        dashboard: {
          summary: '/api/dashboard/summary',
          admin: '/api/dashboard/summary'
        },
        users: {
          me: '/api/users/me',
          all: '/api/users'
        },
        courses: '/api/courses'
      }
    };
  }

  /**
   * Get API base URL with environment-specific logic
   */
  private getApiBaseUrl(): string {
    // Prefer explicit E2E env when in E2E or test modes
    const tryEnvBackend = () => {
      // Node envs (Playwright/global setup)
      const env = getProcessEnv();
      const url = env.E2E_BACKEND_URL;
      const port = env.E2E_BACKEND_PORT;
      if (url && url.length > 0) return url;
      if (port && port.length > 0) return `http://127.0.0.1:${port}`;
      return undefined;
    };

    if (ENV_CONFIG.isE2E() || ENV_CONFIG.getMode() === 'test') {
      const envUrl = tryEnvBackend();
      if (envUrl) return envUrl;
    }

    // Vite env for browser runtime
    try {
      if (typeof window !== 'undefined') {
        const { VITE_API_BASE_URL } = import.meta.env;
        if (typeof VITE_API_BASE_URL === 'string' && VITE_API_BASE_URL.length > 0) {
          return VITE_API_BASE_URL;
        }
      }
    } catch {
      // ignore
    }

    // Production/development defaults
    if (ENV_CONFIG.isProduction()) {
      return 'https://api.catams.example.com'; // TODO: set real prod URL
    }

    // Dev fallback
    const fallbackPort = getProcessEnv().E2E_BACKEND_PORT ?? '8084';
    return `http://127.0.0.1:${fallbackPort}`;
  }

  /**
   * Get timeout configuration based on environment
   */
  private getTimeoutConfig(): number {
    if (ENV_CONFIG.isE2E()) {
      return 15000; // Longer timeout for E2E tests
    }
    
    if (ENV_CONFIG.isProduction()) {
      return 30000; // Production timeout
    }
    
    return 10000; // Development timeout
  }

  /**
   * Build security configuration
   */
  private buildSecurityConfig(): SecurityConfiguration {
    return {
      tokenStorageKey: 'catams_auth_token',
      userStorageKey: 'catams_user_data',
      enableLogging: ENV_CONFIG.features.enableDetailedLogging(),
      enableDebugMode: ENV_CONFIG.features.enableDebugMode(),
      sensitiveDataPatterns: [
        /token/i,
        /password/i,
        /secret/i,
        /key/i,
        /auth/i,
        /bearer/i,
        /jwt/i,
        /session/i,
        /credential/i,
        /api[_-]?key/i,
        /access[_-]?token/i,
        /refresh[_-]?token/i,
        /client[_-]?secret/i,
        /private[_-]?key/i,
      ],
      sessionTimeoutMs: ENV_CONFIG.isProduction() ? 3600000 : 14400000, // 1h prod, 4h dev
      maxLoginAttempts: 5,
      lockoutDurationMs: 300000 // 5 minutes
    };
  }

  /**
   * Build performance configuration
   */
  private buildPerformanceConfig(): PerformanceConfiguration {
    return {
      enableCaching: ENV_CONFIG.isProduction(),
      cacheTimeoutMs: 300000, // 5 minutes
      enableServiceWorker: ENV_CONFIG.isProduction(),
      maxConcurrentRequests: ENV_CONFIG.isProduction() ? 10 : 5,
      debounceDelayMs: 300,
      throttleDelayMs: 1000
    };
  }

  /**
   * Build feature flags based on environment
   */
  private buildFeatureFlags(): FeatureFlags {
    const baseFeatures = {
      enableNewDashboard: false,
      enableBulkOperations: true,
      enableRealtimeUpdates: false,
      enableAdvancedFiltering: true,
      enableExportFeatures: true,
      enableNotifications: false
    };

    // Development environment - enable all features
    if (ENV_CONFIG.isDevelopment()) {
      return Object.keys(baseFeatures).reduce((acc, key) => {
        acc[key as keyof FeatureFlags] = true;
        return acc;
      }, {} as FeatureFlags);
    }

    // E2E environment - stable features only
    if (ENV_CONFIG.isE2E()) {
      return {
        ...baseFeatures,
        enableBulkOperations: false, // Disable for E2E stability
        enableRealtimeUpdates: false,
        enableNotifications: false
      };
    }

    return baseFeatures;
  }

  /**
   * Build application metadata
   */
  private buildAppConfig() {
    return {
      name: 'CATAMS',
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      supportEmail: 'support@catams.example.com'
    };
  }

  /**
   * Build complete configuration
   */
  build(): UnifiedConfiguration {
    const config: UnifiedConfiguration = {
      environment: ENV_CONFIG,
      api: this.buildApiConfig(),
      security: this.buildSecurityConfig(),
      performance: this.buildPerformanceConfig(),
      features: this.buildFeatureFlags(),
      app: this.buildAppConfig()
    };

    // Log configuration in development
    if (ENV_CONFIG.isDevelopment()) {
      secureLogger.debug('Unified configuration built', {
        environment: ENV_CONFIG.getMode(),
        apiBaseUrl: config.api.baseUrl,
        features: Object.entries(config.features)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name)
      });
    }

    return config;
  }
}

// =============================================================================
// Configuration Instance
// =============================================================================

/**
 * Main configuration instance - singleton pattern
 */
let configInstance: UnifiedConfiguration | null = null;

/**
 * Get unified configuration instance
 */
export function getConfig(): UnifiedConfiguration {
  if (!configInstance) {
    configInstance = new ConfigurationBuilder().build();
  }
  return configInstance;
}

/**
 * Reset configuration - useful for testing
 */
export function resetConfig(): void {
  configInstance = null;
}

// =============================================================================
// Configuration Helpers
// =============================================================================

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getConfig().features[feature];
}

/**
 * Get API endpoint URL
 */
export function getApiEndpoint(path: string): string {
  const config = getConfig();
  return `${config.api.baseUrl}${path}`;
}

type EndpointMap = ApiConfiguration['endpoints'];
type NestedEndpointKey<K extends keyof EndpointMap> =
  EndpointMap[K] extends string ? never : keyof EndpointMap[K];

/**
 * Get API endpoint with nested path support
 */
export function getEndpoint<K extends keyof EndpointMap>(
  category: K,
  endpoint?: NestedEndpointKey<K>
): string {
  const config = getConfig();
  const categoryConfig = config.api.endpoints[category];

  if (typeof categoryConfig === 'string') {
    if (endpoint) {
      throw new Error(`Invalid endpoint configuration: ${String(category)}.${String(endpoint)}`);
    }
    return getApiEndpoint(categoryConfig);
  }

  if (!endpoint) {
    throw new Error(`Invalid endpoint configuration: ${String(category)}`);
  }

  const nestedConfig = categoryConfig[endpoint];
  if (!nestedConfig) {
    throw new Error(`Invalid endpoint configuration: ${String(category)}.${String(endpoint)}`);
  }

  if (typeof nestedConfig !== 'string') {
    throw new Error(`Invalid endpoint configuration: ${String(category)}.${String(endpoint)}`);
  }

  return getApiEndpoint(nestedConfig);
}

/**
 * Validate configuration at startup
 */
export function validateConfiguration(): boolean {
  try {
    const config = getConfig();
    
    // Basic validation checks
    if (!config.api.baseUrl) {
      throw new Error('API base URL is required');
    }
    
    if (config.api.timeout <= 0) {
      throw new Error('API timeout must be positive');
    }
    
    if (!config.security.tokenStorageKey) {
      throw new Error('Token storage key is required');
    }
    
    secureLogger.debug('Configuration validation passed');
    return true;
    
  } catch (error) {
    secureLogger.error('Configuration validation failed', error);
    return false;
  }
}

// =============================================================================
// Type Exports
// =============================================================================

// =============================================================================
// Default Export
// =============================================================================

export default getConfig;



