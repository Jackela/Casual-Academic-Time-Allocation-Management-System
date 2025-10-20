/**
 * Unified Environment Detection Utility
 * 
 * Centralized environment detection logic for consistent behavior across all components.
 * Provides unified interface for checking runtime environment and feature flags.
 */

import type { EnvironmentDebugInfo } from '../types/logging';

type GlobalProcessEnv = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const getProcessEnv = (): Record<string, string | undefined> | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }

  return (globalThis as GlobalProcessEnv).process?.env;
};

/**
 * Centralized environment configuration and detection utilities
 */
export const ENV_CONFIG = {
  /**
   * Check if running in E2E testing mode
   */
  isE2E: (): boolean => {
    try {
      return import.meta?.env?.MODE === 'e2e';
    } catch {
      return false;
    }
  },

  /**
   * Check if running in development mode
   */
  isDevelopment: (): boolean => {
    try {
      return import.meta?.env?.DEV === true;
    } catch {
      return false;
    }
  },

  /**
   * Check if running in production mode
   */
  isProduction: (): boolean => {
    try {
      return import.meta?.env?.PROD === true;
    } catch {
      return false;
    }
  },

  /**
   * Check if running in test mode (unit/integration tests)
   */
  isTest: (): boolean => {
    try {
      return import.meta?.env?.MODE === 'test' || process?.env?.NODE_ENV === 'test';
    } catch {
      return false;
    }
  },

  /**
   * Get current runtime mode
   */
  getMode: (): string => {
    try {
      return import.meta?.env?.MODE || process?.env?.NODE_ENV || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  /**
   * E2E-specific configuration and utilities
   */
  e2e: {
    /**
     * Check if E2E test flag is explicitly enabled (legacy support)
     */
    hasTestFlag: (): boolean => {
      try {
        return import.meta?.env?.VITE_E2E_TEST === 'true';
      } catch {
        return false;
      }
    },

    /**
     * Get E2E environment variables for debugging
     */
    getDebugInfo: (): EnvironmentDebugInfo => ({
      mode: ENV_CONFIG.getMode(),
      isE2E: ENV_CONFIG.isE2E(),
      testFlag: ENV_CONFIG.e2e.hasTestFlag(),
    }),
  },
  /**
   * Feature flags and configuration
   */
  features: {
    /**
     * Check if detailed logging should be enabled
     */
    enableDetailedLogging: (): boolean => {
      return ENV_CONFIG.isDevelopment() || ENV_CONFIG.isE2E();
    },

    /**
     * Check if debug mode is enabled
     */
    enableDebugMode: (): boolean => {
      try {
        return import.meta?.env?.VITE_DEBUG === 'true' || ENV_CONFIG.isDevelopment();
      } catch {
        return false;
      }
    },

    /**
     * Check if hot reload is available
     */
    hasHotReload: (): boolean => {
      return ENV_CONFIG.isDevelopment();
    }
  },

  /**
   * Validation utilities
   */
  validation: {
    /**
     * Check if environment configuration is consistent
     */
    isConsistentConfig: (): boolean => {
      try {
        const isDev = ENV_CONFIG.isDevelopment();
        const isProd = ENV_CONFIG.isProduction();
        const isE2E = ENV_CONFIG.isE2E();
        const isTest = ENV_CONFIG.isTest();

        // Only one primary mode should be true
        const primaryModes = [isDev, isProd, isE2E, isTest];
        const activeModes = primaryModes.filter(Boolean);
        
        return activeModes.length <= 1;
      } catch {
        return false;
      }
    }
  }
} as const;

/**
 * Legacy compatibility functions for gradual migration
 */
export const legacyCompat = {
  /**
   * @deprecated Use ENV_CONFIG.isE2E() instead
   */
  isE2EMode: () => ENV_CONFIG.isE2E(),

  /**
   * @deprecated Use ENV_CONFIG.isProduction() instead
   */
  isProductionMode: () => ENV_CONFIG.isProduction()
};

/**
 * Environment-specific error handler
 */
export const envErrorHandler = (error: Error, context: string): void => {
  const baseMessage = `[Environment detection error] ${context}`;
  const loadLogger = () => import('./secure-logger').then(({ secureLogger }) => secureLogger);

  if (ENV_CONFIG.isDevelopment()) {
    void loadLogger()
      .then((secureLogger) => {
        secureLogger.error(baseMessage, error);
      })
      .catch(() => {
        console.error(baseMessage, error);
      });
    return;
  }

  if (ENV_CONFIG.isE2E()) {
    const e2eMessage = `E2E environment issue in ${context}`;

    void loadLogger()
      .then((secureLogger) => {
        secureLogger.warn(e2eMessage, error.message);
      })
      .catch(() => {
        console.warn(e2eMessage, error.message);
      });
    return;
  }

  void loadLogger()
    .then((secureLogger) => {
      secureLogger.error(baseMessage, error);
    })
    .catch(() => {
      console.error(baseMessage, error);
    });
};
