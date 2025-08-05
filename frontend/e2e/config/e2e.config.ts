/**
 * Centralized E2E Test Configuration
 * Provides environment-specific settings for consistent test execution
 */

export const E2E_CONFIG = {
  // Backend configuration
  BACKEND: {
    URL: 'http://localhost:8084',
    ENDPOINTS: {
      HEALTH: '/actuator/health',
      AUTH_LOGIN: '/api/auth/login',
      TIMESHEETS_PENDING: '/api/timesheets/pending-approval',
      TIMESHEETS_ME: '/api/timesheets/me',
      TIMESHEETS: '/api/timesheets',
      APPROVALS: '/api/approvals'
    },
    TIMEOUTS: {
      STARTUP: 60000,      // 60 seconds for backend startup
      HEALTH_CHECK: 5000,   // 5 seconds per health check
      API_REQUEST: 10000    // 10 seconds for API requests
    }
  },
  
  // Frontend configuration
  FRONTEND: {
    URL: 'http://localhost:5174',
    TIMEOUTS: {
      STARTUP: 30000,       // 30 seconds for frontend startup
      PAGE_LOAD: 15000,     // 15 seconds for page load
      NAVIGATION: 10000     // 10 seconds for navigation
    }
  },
  
  // Test execution configuration
  TEST: {
    RETRY_ATTEMPTS: 3,
    HEALTH_CHECK_INTERVAL: 1000,  // 1 second between health checks
    MAX_HEALTH_CHECK_ATTEMPTS: 60 // 60 attempts = 60 seconds max wait
  }
} as const;

// Helper functions for URL construction
export const getBackendUrl = (endpoint: string = ''): string => {
  return `${E2E_CONFIG.BACKEND.URL}${endpoint}`;
};

export const getFrontendUrl = (path: string = ''): string => {
  return `${E2E_CONFIG.FRONTEND.URL}${path}`;
};

// API endpoint helpers
export const API_ENDPOINTS = {
  HEALTH: getBackendUrl(E2E_CONFIG.BACKEND.ENDPOINTS.HEALTH),
  AUTH_LOGIN: getBackendUrl(E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN),
  TIMESHEETS_PENDING: getBackendUrl(E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS_PENDING),
  APPROVALS: getBackendUrl(E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS)
} as const;