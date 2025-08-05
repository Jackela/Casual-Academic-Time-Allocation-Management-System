/**
 * Shared API configuration for both production and test environments
 */

export const API_CONFIG = {
  // Default backend configuration
  BACKEND: {
    DEFAULT_URL: 'http://localhost:8080',
    E2E_URL: 'http://localhost:8084',
    ENDPOINTS: {
      HEALTH: '/actuator/health',
      AUTH_LOGIN: '/api/auth/login',
      TIMESHEETS_PENDING: '/api/timesheets/pending-approval',
      APPROVALS: '/api/approvals'
    },
    TIMEOUTS: {
      API_REQUEST: 10000,    // 10 seconds for API requests
      HEALTH_CHECK: 5000     // 5 seconds for health checks
    }
  }
} as const;

/**
 * Get API base URL based on environment
 */
export const getApiBaseUrl = (): string => {
  // Check for test environment (Vitest or E2E)
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return API_CONFIG.BACKEND.E2E_URL;
  }
  
  // Check for E2E mode in browser environment
  try {
    if (import.meta?.env?.MODE === 'e2e') {
      return API_CONFIG.BACKEND.E2E_URL;
    }
    // Production/development environment  
    if (import.meta?.env?.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch {
    // import.meta not available in Node.js environment
  }
  
  return API_CONFIG.BACKEND.DEFAULT_URL;
};