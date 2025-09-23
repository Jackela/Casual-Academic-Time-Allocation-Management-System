/**
 * Centralized E2E Test Configuration
 * Provides environment-specific settings for consistent test execution
 */

const env = (name: string, fallback?: string) =>
  (process.env[name] && String(process.env[name])) ||
  (fallback !== undefined ? fallback : undefined);

const resolveBackendUrl = () => {
  const explicitUrl = env('E2E_BACKEND_URL');
  if (explicitUrl) return explicitUrl;
  const port = env('E2E_BACKEND_PORT', '8084');
  return `http://127.0.0.1:${port}`;
};

const resolveFrontendUrl = () => {
  const explicitUrl = env('E2E_FRONTEND_URL');
  if (explicitUrl) return explicitUrl;
  const port = env('E2E_FRONTEND_PORT', '5174');
  return `http://localhost:${port}`;
};

const resolveTestUsers = () => ({
  lecturer: {
    email: env('E2E_LECTURER_EMAIL', 'lecturer@example.com'),
    password: env('E2E_LECTURER_PASSWORD', 'Lecturer123!')
  },
  tutor: {
    email: env('E2E_TUTOR_EMAIL', 'tutor@example.com'),
    password: env('E2E_TUTOR_PASSWORD', 'Tutor123!')
  },
  admin: {
    email: env('E2E_ADMIN_EMAIL', 'admin@example.com'),
    password: env('E2E_ADMIN_PASSWORD', 'Admin123!')
  }
});

export const E2E_CONFIG = {
  // Backend configuration
  BACKEND: {
    URL: resolveBackendUrl(),
    ENDPOINTS: {
      HEALTH: '/actuator/health',
      AUTH_LOGIN: '/api/auth/login',
      TIMESHEETS_PENDING: '/api/timesheets/pending-final-approval',
      TIMESHEETS_ME: '/api/timesheets',
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
    URL: resolveFrontendUrl(),
    TIMEOUTS: {
      STARTUP: 30000,       // 30 seconds for frontend startup
      PAGE_LOAD: 15000,     // 15 seconds for page load
      NAVIGATION: 10000     // 10 seconds for navigation
    }
  },
  
  USERS: resolveTestUsers(),

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


