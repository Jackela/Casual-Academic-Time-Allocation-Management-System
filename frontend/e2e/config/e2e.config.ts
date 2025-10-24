/**
 * Centralized E2E Test Configuration
 * Provides environment-specific settings for consistent test execution
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(frontendRoot, '..');

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!process.env[key] && key.length > 0) {
      process.env[key] = value;
    }
  }
};

[
  path.resolve(projectRoot, '.env'),
  path.resolve(projectRoot, '.env.e2e'),
  path.resolve(frontendRoot, '.env'),
  path.resolve(frontendRoot, '.env.e2e'),
].forEach(loadEnvFile);

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable "${name}" for E2E configuration`);
  }
  return value.trim();
};

const resolveBackendUrl = () => requireEnv('E2E_BACKEND_URL');
const resolveFrontendUrl = () => requireEnv('E2E_FRONTEND_URL');

const resolveTestUsers = () => ({
  lecturer: {
    email: requireEnv('E2E_LECTURER_EMAIL'),
    password: requireEnv('E2E_LECTURER_PASSWORD'),
  },
  tutor: {
    email: requireEnv('E2E_TUTOR_EMAIL'),
    password: requireEnv('E2E_TUTOR_PASSWORD'),
  },
  admin: {
    email: requireEnv('E2E_ADMIN_EMAIL'),
    password: requireEnv('E2E_ADMIN_PASSWORD'),
  },
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


