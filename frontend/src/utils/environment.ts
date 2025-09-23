/**
 * Unified Environment Detection Utility
 * 
 * Centralized environment detection logic for consistent behavior across all components.
 * Provides unified interface for checking runtime environment and feature flags.
 */

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
     * Check if E2E authentication bypass is enabled
     */
    hasAuthBypass: (): boolean => {
      return Boolean(ENV_CONFIG.e2e.getBypassRole());
    },

    /**
     * Get E2E authentication bypass role if configured
     */
    getBypassRole: (): string | undefined => {
      try {
        const metaRole = import.meta?.env?.VITE_E2E_AUTH_BYPASS_ROLE as string | undefined;
        if (metaRole) {
          return metaRole;
        }
        try {
          return (globalThis as any)?.process?.env?.VITE_E2E_AUTH_BYPASS_ROLE
            || (globalThis as any)?.process?.env?.E2E_AUTH_BYPASS_ROLE;
        } catch {
          return undefined;
        }
      } catch {
        return undefined;
      }
    },

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
     * Check if MSW (Mock Service Worker) should be enabled
     */
    shouldUseMSW: (): boolean => {
      try {
        return ENV_CONFIG.isE2E() && import.meta?.env?.VITE_E2E_USE_MSW === 'true';
      } catch {
        return false;
      }
    },

    /**
     * Get E2E environment variables for debugging
     */
    getDebugInfo: (): Record<string, any> => {
      try {
        return {
          mode: ENV_CONFIG.getMode(),
          isE2E: ENV_CONFIG.isE2E(),
          bypassRole: ENV_CONFIG.e2e.getBypassRole(),
          hasAuthBypass: ENV_CONFIG.e2e.hasAuthBypass(),
          shouldUseMSW: ENV_CONFIG.e2e.shouldUseMSW(),
          testFlag: ENV_CONFIG.e2e.hasTestFlag()
        };
      } catch {
        return {};
      }
    }
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
     * Validate E2E bypass role against allowed roles
     */
    isValidBypassRole: (role?: string): boolean => {
      if (!role) return false;
      const allowedRoles = ['TUTOR', 'LECTURER', 'ADMIN'];
      return allowedRoles.includes(role);
    },

    /**
     * Check if environment configuration is consistent
     */
    isConsistentConfig: (): boolean => {
      try {
        const mode = ENV_CONFIG.getMode();
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
   * @deprecated Use ENV_CONFIG.e2e.hasAuthBypass() instead
   */
  hasE2EBypass: () => ENV_CONFIG.e2e.hasAuthBypass(),

  /**
   * @deprecated Use ENV_CONFIG.isProduction() instead
   */
  isProductionMode: () => ENV_CONFIG.isProduction()
};

/**
 * Environment-specific error handler
 */
export const envErrorHandler = (error: Error, context: string): void => {
  if (ENV_CONFIG.isDevelopment()) {
    console.error(`[${context}] Environment detection error:`, error);
  } else if (ENV_CONFIG.isE2E()) {
    console.warn(`[E2E] Environment issue in ${context}:`, error.message);
  }
  // In production, fail silently to avoid exposing internal details
};

export default ENV_CONFIG;

