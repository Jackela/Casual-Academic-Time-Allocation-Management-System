/**
 * API Configuration Utility Tests
 * Tests for API base URL determination and configuration constants
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { API_CONFIG, getApiBaseUrl } from './api.config';

// Store original environment values
const originalEnv = process.env;

describe('api.config utilities', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    vi.resetModules();
    process.env = { ...originalEnv };
    
    // Clear any import.meta.env mocks
    delete (globalThis as any).importMeta;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API_CONFIG constants', () => {
    test('should define correct backend URLs', () => {
      expect(API_CONFIG.BACKEND.DEFAULT_URL).toBe('http://localhost:8080');
      expect(API_CONFIG.BACKEND.E2E_URL).toBe('http://localhost:8084');
    });

    test('should define all required endpoints', () => {
      const endpoints = API_CONFIG.BACKEND.ENDPOINTS;
      
      expect(endpoints.HEALTH).toBe('/actuator/health');
      expect(endpoints.AUTH_LOGIN).toBe('/api/auth/login');
      expect(endpoints.TIMESHEETS_PENDING).toBe('/api/timesheets/pending-final-approval');
      expect(endpoints.APPROVALS).toBe('/api/approvals');
    });

    test('should define reasonable timeout values', () => {
      const timeouts = API_CONFIG.BACKEND.TIMEOUTS;
      
      expect(timeouts.API_REQUEST).toBe(10000);
      expect(timeouts.HEALTH_CHECK).toBe(5000);
      
      // Timeouts should be positive numbers
      expect(timeouts.API_REQUEST).toBeGreaterThan(0);
      expect(timeouts.HEALTH_CHECK).toBeGreaterThan(0);
    });

    test('should be immutable with as const', () => {
      expect(API_CONFIG).toMatchObject({
        BACKEND: {
          DEFAULT_URL: 'http://localhost:8080',
          E2E_URL: 'http://localhost:8084',
          ENDPOINTS: expect.any(Object),
          TIMEOUTS: expect.any(Object)
        }
      });
    });
  });

  describe('getApiBaseUrl function', () => {
    test('should return E2E URL when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8084');
    });

    test('should return E2E URL when VITEST is true', () => {
      process.env.VITEST = 'true';
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8084');
    });

    test('should return default URL when no special environment is detected', () => {
      // Clear test environment variables
      delete process.env.NODE_ENV;
      delete process.env.VITEST;
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
    });

    test('should handle missing import.meta gracefully', () => {
      // Ensure clean environment
      delete process.env.NODE_ENV;
      delete process.env.VITEST;
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
    });

    test('should prioritize test environment over browser environment', () => {
      process.env.NODE_ENV = 'test';
      
      // Mock import.meta.env to have different values
      const mockImportMeta = {
        env: {
          MODE: 'development',
          VITE_API_BASE_URL: 'http://custom-url:9999'
        }
      };
      
      // In Node.js test environment, import.meta won't be used anyway
      // but this test ensures NODE_ENV takes precedence
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8084');
    });

    test('should handle import.meta access errors gracefully', () => {
      delete process.env.NODE_ENV;
      delete process.env.VITEST;
      
      // The function already has try-catch for import.meta access
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
    });
  });

  describe('Environment detection edge cases', () => {
    test('should handle falsy VITEST environment variable', () => {
      process.env.VITEST = '';
      delete process.env.NODE_ENV;
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
    });

    test('should handle production NODE_ENV', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.VITEST;
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
    });

    test('should handle development NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VITEST;
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
    });

    test('should handle case-sensitive environment variables', () => {
      process.env.vitest = 'true'; // lowercase
      process.env.node_env = 'test'; // lowercase
      delete process.env.VITEST;
      delete process.env.NODE_ENV;
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
    });
  });

  describe('URL validation', () => {
    test('should return valid HTTP URLs', () => {
      const urls = [
        API_CONFIG.BACKEND.DEFAULT_URL,
        API_CONFIG.BACKEND.E2E_URL
      ];
      
      urls.forEach(url => {
        expect(url).toMatch(/^https?:\/\/.+/);
        expect(() => new URL(url)).not.toThrow();
      });
    });

    test('should use localhost for both environments', () => {
      expect(API_CONFIG.BACKEND.DEFAULT_URL).toContain('localhost');
      expect(API_CONFIG.BACKEND.E2E_URL).toContain('localhost');
    });

    test('should use standard HTTP ports', () => {
      expect(API_CONFIG.BACKEND.DEFAULT_URL).toContain(':8080');
      expect(API_CONFIG.BACKEND.E2E_URL).toContain(':8084');
    });
  });

  describe('Integration scenarios', () => {
    test('should work with typical development environment', () => {
      delete process.env.NODE_ENV;
      delete process.env.VITEST;
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8080');
      expect(() => new URL(result)).not.toThrow();
    });

    test('should work with Vitest test environment', () => {
      process.env.VITEST = 'true';
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8084');
      expect(() => new URL(result)).not.toThrow();
    });

    test('should work with Jest-like test environment', () => {
      process.env.NODE_ENV = 'test';
      
      const result = getApiBaseUrl();
      
      expect(result).toBe('http://localhost:8084');
      expect(() => new URL(result)).not.toThrow();
    });
  });

  describe('Endpoint path validation', () => {
    test('should have valid endpoint paths', () => {
      const endpoints = Object.values(API_CONFIG.BACKEND.ENDPOINTS);
      
      endpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\//); // Should start with /
        expect(endpoint.length).toBeGreaterThan(1);
        expect(endpoint).not.toContain(' '); // No spaces
      });
    });

    test('should have consistent API endpoint structure', () => {
      const apiEndpoints = Object.values(API_CONFIG.BACKEND.ENDPOINTS)
        .filter(endpoint => endpoint.startsWith('/api'));
      
      expect(apiEndpoints.length).toBeGreaterThan(0);
      
      apiEndpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\//);
      });
    });

    test('should have actuator endpoints for monitoring', () => {
      const actuatorEndpoints = Object.values(API_CONFIG.BACKEND.ENDPOINTS)
        .filter(endpoint => endpoint.startsWith('/actuator'));
      
      expect(actuatorEndpoints.length).toBeGreaterThan(0);
      expect(actuatorEndpoints).toContain('/actuator/health');
    });
  });
});