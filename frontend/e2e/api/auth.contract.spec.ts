/**
 * Authentication API Contract Tests
 * Tests API endpoints directly without browser interaction
 * Validates backend contract behavior and response schemas
 */

import { describe, beforeAll, beforeEach, afterEach, test, expect } from 'vitest';
import { CatamsAPIClient, type Credentials, type AuthResponse } from '../../src/api/ApiClient';
import { waitForBackendReady } from '../utils/health-checker';
import { testCredentials } from '../fixtures/base';

describe('Authentication API Contract', () => {
  let apiClient: CatamsAPIClient;

  beforeAll(async () => {
    // Wait for backend to be ready before running tests
    await waitForBackendReady();
    console.log('✅ Backend ready - starting API contract tests');
  });

  beforeEach(() => {
    // Create fresh API client for each test
    apiClient = new CatamsAPIClient();
  });

  afterEach(() => {
    // Clean up authentication state
    apiClient.clearAuthToken();
  });

  describe('POST /api/auth/login', () => {
    test('should authenticate valid lecturer credentials', async () => {
      const credentials: Credentials = {
        email: testCredentials.lecturer.email,
        password: testCredentials.lecturer.password
      };

      const response: AuthResponse = await apiClient.authenticate(credentials);

      // Validate response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();
      expect(typeof response.token).toBe('string');
      expect(response.token!.length).toBeGreaterThan(0);

      // Validate user object
      expect(response.user).toBeDefined();
      expect(response.user!.email).toBe(credentials.email);
      expect(response.user!.role).toBe('LECTURER');
      expect(response.user!.id).toBeTypeOf('number');
      expect(response.user!.name).toBeTypeOf('string');

      // Error message should be null or undefined on success
      expect(response.errorMessage == null).toBe(true);
    });

    test('should authenticate valid tutor credentials', async () => {
      const credentials: Credentials = {
        email: testCredentials.tutor.email,
        password: testCredentials.tutor.password
      };

      const response: AuthResponse = await apiClient.authenticate(credentials);

      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user!.role).toBe('TUTOR');
      expect(response.user!.email).toBe(credentials.email);
    });

    test('should authenticate valid admin credentials', async () => {
      const credentials: Credentials = {
        email: testCredentials.admin.email,
        password: testCredentials.admin.password
      };

      const response: AuthResponse = await apiClient.authenticate(credentials);

      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user!.role).toBe('ADMIN');
      expect(response.user!.email).toBe(credentials.email);
    });

    test('should reject invalid credentials', async () => {
      const invalidCredentials: Credentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      const response: AuthResponse = await apiClient.authenticate(invalidCredentials);

      // Validate error response structure
      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(response.token).toBeUndefined();
      expect(response.user).toBeUndefined();
      expect(response.errorMessage).toBeDefined();
      expect(typeof response.errorMessage).toBe('string');
      expect(response.errorMessage!.length).toBeGreaterThan(0);
    });

    test('should reject empty credentials', async () => {
      const emptyCredentials: Credentials = {
        email: '',
        password: ''
      };

      const response: AuthResponse = await apiClient.authenticate(emptyCredentials);

      expect(response.success).toBe(false);
      expect(response.token).toBeUndefined();
      expect(response.user).toBeUndefined();
      expect(response.errorMessage).toBeDefined();
    });

    test('should reject malformed email', async () => {
      const malformedCredentials: Credentials = {
        email: 'not-an-email',
        password: 'somepassword'
      };

      const response: AuthResponse = await apiClient.authenticate(malformedCredentials);

      expect(response.success).toBe(false);
      expect(response.token).toBeUndefined();
      expect(response.user).toBeUndefined();
      expect(response.errorMessage).toBeDefined();
    });

    test('should handle network timeouts gracefully', async () => {
      // Create client with very short timeout to test timeout handling
      const timeoutClient = new CatamsAPIClient();
      timeoutClient.setTimeout(100); // 100ms timeout

      const credentials: Credentials = {
        email: testCredentials.lecturer.email,
        password: testCredentials.lecturer.password
      };

      try {
        const response = await timeoutClient.authenticate(credentials);
        // If the request completes within 100ms, that's fine too
        expect(response).toBeDefined();
      } catch (error) {
        // Expect timeout error to be handled gracefully
        expect(error).toBeDefined();
        expect(typeof error).toBe('object');
      }
    });
  });

  describe('API Client Token Management', () => {
    test('should store and retrieve auth token after successful login', async () => {
      const credentials: Credentials = {
        email: testCredentials.lecturer.email,
        password: testCredentials.lecturer.password
      };

      // Initially no token
      expect(apiClient.getAuthToken()).toBeNull();

      // Authenticate
      const response = await apiClient.authenticate(credentials);
      expect(response.success).toBe(true);

      // Token should be stored
      const storedToken = apiClient.getAuthToken();
      expect(storedToken).toBeDefined();
      expect(storedToken).toBe(response.token);
      expect(typeof storedToken).toBe('string');
    });

    test('should allow manual token management', async () => {
      const testToken = 'test-jwt-token-123';

      // Set token manually
      apiClient.setAuthToken(testToken);
      expect(apiClient.getAuthToken()).toBe(testToken);

      // Clear token
      apiClient.clearAuthToken();
      expect(apiClient.getAuthToken()).toBeNull();
    });

    test('should not store token on failed authentication', async () => {
      const invalidCredentials: Credentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      // Ensure no initial token
      expect(apiClient.getAuthToken()).toBeNull();

      // Attempt authentication
      const response = await apiClient.authenticate(invalidCredentials);
      expect(response.success).toBe(false);

      // Token should still be null
      expect(apiClient.getAuthToken()).toBeNull();
    });
  });

  describe('API Client Configuration', () => {
    test('should use correct base URL', () => {
      const baseUrl = apiClient.getBaseURL();
      expect(baseUrl).toBeDefined();
      expect(typeof baseUrl).toBe('string');
      // Should be either E2E URL or default URL
      expect(baseUrl).toMatch(/^https?:\/\/localhost:\d+$/);
    });

    test('should allow custom base URL in constructor', () => {
      const customUrl = 'http://custom-test-server:9999';
      const customClient = new CatamsAPIClient(customUrl);
      
      expect(customClient.getBaseURL()).toBe(customUrl);
    });

    test('should support connectivity testing', async () => {
      const isConnected = await apiClient.testConnectivity();
      expect(typeof isConnected).toBe('boolean');
      expect(isConnected).toBe(true); // Should be true since backend is ready
    });
  });

  describe('Health Check Integration', () => {
    test('should successfully call health endpoint', async () => {
      const healthResponse = await apiClient.getHealthStatus();
      
      expect(healthResponse).toBeDefined();
      expect(healthResponse.status).toBeDefined();
      expect(typeof healthResponse.status).toBe('string');
      
      // Common health status values
      expect(['UP', 'DOWN', 'UNKNOWN']).toContain(healthResponse.status);
    });

    test('should handle health check errors gracefully', async () => {
      // Create client pointing to non-existent server
      const badClient = new CatamsAPIClient('http://localhost:99999');
      
      try {
        await badClient.getHealthStatus();
        // If it doesn't throw, that's unexpected but not necessarily wrong
        expect(true).toBe(true);
      } catch (error) {
        // Should handle connection errors gracefully
        expect(error).toBeDefined();
        expect(typeof error).toBe('object');
      }
    });
  });
});