/**
 * Secure Logger Security Tests
 * 
 * Tests for production security, sensitive data filtering, and environment-aware logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock ENV_CONFIG before imports
vi.mock('../../utils/environment', () => ({
  ENV_CONFIG: {
    isProduction: vi.fn(() => false),
    isDevelopment: vi.fn(() => true),
    isE2E: vi.fn(() => false),
    getMode: vi.fn(() => 'development'),
    features: {
      enableDetailedLogging: vi.fn(() => true),
      enableDebugMode: vi.fn(() => true)
    },
    e2e: {
      getDebugInfo: vi.fn(() => ({
        mode: 'development',
        isE2E: false,
        bypassRole: undefined,
        hasAuthBypass: false,
        shouldUseMSW: false,
        testFlag: false
      }))
    }
  }
}));

import { secureLogger, safeConsole } from '../../utils/secure-logger';
import { ENV_CONFIG } from '../../utils/environment';

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn()
};

describe('Secure Logger Security Tests', () => {
  beforeEach(() => {
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true
    });
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset environment to development defaults
    vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(false);
    vi.mocked(ENV_CONFIG.isDevelopment).mockReturnValue(true);
    vi.mocked(ENV_CONFIG.isE2E).mockReturnValue(false);
    vi.mocked(ENV_CONFIG.getMode).mockReturnValue('development');
    vi.mocked(ENV_CONFIG.features.enableDetailedLogging).mockReturnValue(true);
    vi.mocked(ENV_CONFIG.features.enableDebugMode).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sensitive Data Protection', () => {
    beforeEach(() => {
      // Set production mode for sensitive data tests
      vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(true);
      vi.mocked(ENV_CONFIG.isDevelopment).mockReturnValue(false);
      vi.mocked(ENV_CONFIG.features.enableDetailedLogging).mockReturnValue(false);
    });

    it('should redact sensitive strings in production', () => {
      const sensitiveData = {
        token: 'jwt-token-123',
        password: 'secret123',
        apiKey: 'api-key-456',
        secretValue: 'top-secret',
        normalData: 'this is fine'
      };

      secureLogger.info('Test message', sensitiveData);

      const logCall = mockConsole.info.mock.calls[0];
      expect(logCall).toBeDefined();
      
      const loggedData = logCall[1];
      expect(loggedData.token).toBe('[REDACTED]');
      expect(loggedData.password).toBe('[REDACTED]');
      expect(loggedData.apiKey).toBe('[REDACTED]');
      expect(loggedData.secretValue).toBe('[REDACTED]');
      expect(loggedData.normalData).toBe('this is fine');
    });

    it('should redact sensitive URL parameters', () => {
      secureLogger.api('GET', '/api/data?token=secret123&user=john&password=hidden');

      // API logging goes to console.log when detailed logging is enabled
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall).toBeDefined();
      const loggedData = logCall[1];
      expect(loggedData.url).toContain('[REDACTED]');
      expect(loggedData.url).not.toContain('secret123');
      expect(loggedData.url).not.toContain('hidden');
      expect(loggedData.url).toContain('user=john'); // Non-sensitive parameter should remain
    });

    it('should redact sensitive messages in production', () => {
      secureLogger.error('Authentication token expired for user', { userId: 123 });

      const logCall = mockConsole.error.mock.calls[0];
      expect(logCall[0]).toContain('[REDACTED]'); // Message should be redacted
    });

    it('should handle nested sensitive data', () => {
      const nestedData = {
        user: {
          id: 123,
          credentials: {
            token: 'jwt-123',
            refreshToken: 'refresh-456'
          }
        },
        metadata: {
          apiKey: 'key-789',
          publicInfo: 'safe data'
        }
      };

      secureLogger.info('Nested data test', nestedData);

      const logCall = mockConsole.info.mock.calls[0];
      const loggedData = logCall[1];
      
      expect(loggedData).toBeDefined();
      expect(loggedData.user.id).toBe(123);
      expect(loggedData.user.credentials.token).toBe('[REDACTED]');
      expect(loggedData.user.credentials.refreshToken).toBe('[REDACTED]');
      expect(loggedData.metadata.apiKey).toBe('[REDACTED]');
      expect(loggedData.metadata.publicInfo).toBe('safe data');
    });

    it('should handle arrays with sensitive data', () => {
      const arrayData = [
        { id: 1, token: 'token1' },
        { id: 2, password: 'pass2' },
        { id: 3, name: 'safe' }
      ];

      secureLogger.info('Array test', arrayData);

      const logCall = mockConsole.info.mock.calls[0];
      const loggedData = logCall[1];
      
      expect(Array.isArray(loggedData)).toBe(true);
      expect(loggedData[0].id).toBe(1);
      expect(loggedData[0].token).toBe('[REDACTED]');
      expect(loggedData[1].password).toBe('[REDACTED]');
      expect(loggedData[2].name).toBe('safe');
    });

    it('should handle Error objects securely', () => {
      const sensitiveError = new Error('Authentication failed with token jwt-123');
      sensitiveError.stack = 'Error: Authentication failed with token jwt-123\n    at Function.login';

      secureLogger.info('Login error', sensitiveError);

      const logCall = mockConsole.info.mock.calls[0];
      const loggedData = logCall[1];
      
      expect(loggedData).toBeDefined();
      expect(loggedData.name).toBe('Error');
      expect(loggedData.message).toBe('[REDACTED ERROR]');
      expect(loggedData.stack).toBe('[REDACTED]');
    });
  });

  describe('Environment-Based Logging Control', () => {
    it('should enable debug logging in development', () => {
      vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(false);
      vi.mocked(ENV_CONFIG.features.enableDetailedLogging).mockReturnValue(true);

      secureLogger.debug('Debug message', { data: 'test' });

      expect(mockConsole.debug).toHaveBeenCalled();
    });

    it('should disable debug logging in production', () => {
      vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(true);
      vi.mocked(ENV_CONFIG.features.enableDetailedLogging).mockReturnValue(false);

      secureLogger.debug('Debug message', { data: 'test' });

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should always show errors but sanitize in production', () => {
      vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(true);
      
      const error = new Error('Test error with token abc123');
      secureLogger.error('Error occurred', error);

      expect(mockConsole.error).toHaveBeenCalled();
      const logCall = mockConsole.error.mock.calls[0];
      expect(logCall[1]).toHaveProperty('timestamp');
      expect(logCall[1]).toHaveProperty('context');
    });

    it('should show detailed errors in development', () => {
      vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(false);
      
      const error = new Error('Test error with details');
      secureLogger.error('Error occurred', error);

      expect(mockConsole.error).toHaveBeenCalled();
      const logCall = mockConsole.error.mock.calls[0];
      expect(logCall[1]).toBe(error); // Full error object in development
    });
  });

  describe('E2E Logging Control', () => {
    it('should log E2E messages only in E2E mode', () => {
      vi.mocked(ENV_CONFIG.isE2E).mockReturnValue(true);
      
      secureLogger.e2e('E2E test message', { testData: 'value' });
      
      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[0]).toBe('[E2E]');
    });

    it('should not log E2E messages outside E2E mode', () => {
      vi.mocked(ENV_CONFIG.isE2E).mockReturnValue(false);
      
      secureLogger.e2e('E2E test message', { testData: 'value' });
      
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('Security Logging', () => {
    it('should format security events consistently', () => {
      secureLogger.security('user_login', { userId: 123, ip: '192.168.1.1' });

      expect(mockConsole.info).toHaveBeenCalled();
      const logCall = mockConsole.info.mock.calls[0];
      expect(logCall[0]).toBe('[SECURITY]');
      expect(logCall[1]).toHaveProperty('event', 'user_login');
      expect(logCall[1]).toHaveProperty('timestamp');
      expect(logCall[1]).toHaveProperty('environment');
      expect(logCall[1]).toHaveProperty('context');
    });

    it('should sanitize security context in production', () => {
      vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(true);
      
      secureLogger.security('auth_failure', { 
        token: 'jwt-123',
        user: 'john',
        reason: 'invalid_credentials'
      });

      const logCall = mockConsole.info.mock.calls[0];
      const context = logCall[1].context;
      
      expect(context.token).toBe('[REDACTED]');
      expect(context.user).toBe('john');
      expect(context.reason).toBe('invalid_credentials');
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics with context', () => {
      secureLogger.performance('api_call', 150, 'ms', { endpoint: '/api/users' });

      expect(mockConsole.info).toHaveBeenCalled();
      const logCall = mockConsole.info.mock.calls[0];
      expect(logCall[0]).toContain('api_call: 150ms');
      expect(logCall[1]).toHaveProperty('metric', 'api_call');
      expect(logCall[1]).toHaveProperty('value', 150);
      expect(logCall[1]).toHaveProperty('unit', 'ms');
    });

    it('should sanitize performance context in production', () => {
      vi.mocked(ENV_CONFIG.isProduction).mockReturnValue(true);
      
      secureLogger.performance('request', 200, 'ms', { 
        token: 'jwt-123',
        endpoint: '/api/secure' 
      });

      const logCall = mockConsole.info.mock.calls[0];
      const context = logCall[1].context;
      
      expect(context.token).toBe('[REDACTED]');
      expect(context.endpoint).toBe('/api/secure');
    });
  });

  describe('API Logging', () => {
    it('should log API requests without sensitive data', () => {
      secureLogger.api('POST', '/api/login?redirect=/dashboard', 200, 150);

      expect(mockConsole.log).toHaveBeenCalled();
      const logCall = mockConsole.log.mock.calls[0];
      expect(logCall[1]).toHaveProperty('method', 'POST');
      expect(logCall[1]).toHaveProperty('status', 200);
      expect(logCall[1]).toHaveProperty('duration', '150ms');
    });

    it('should sanitize API URLs with sensitive parameters', () => {
      secureLogger.api('GET', '/api/data?token=secret&user=john&key=private', 200);

      const logCall = mockConsole.log.mock.calls[0];
      const url = logCall[1].url;
      
      expect(url).toContain('[REDACTED]');
      expect(url).not.toContain('secret');
      expect(url).not.toContain('private');
      expect(url).toContain('user=john');
    });

    it('should handle API errors securely', () => {
      const apiError = new Error('API Error: Invalid token jwt-123');
      secureLogger.api('POST', '/api/secure', 401, 100, apiError);

      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Conditional Logging', () => {
    it('should log when condition is true', () => {
      secureLogger.conditional(true, 'info', 'Conditional message', { data: 'test' });
      
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should not log when condition is false', () => {
      secureLogger.conditional(false, 'info', 'Conditional message', { data: 'test' });
      
      expect(mockConsole.info).not.toHaveBeenCalled();
    });
  });

  describe('Configuration and Utility Methods', () => {
    it('should provide current logging configuration', () => {
      const config = secureLogger.getConfig();
      
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('productionMode');
      expect(config).toHaveProperty('developmentMode');
      expect(config).toHaveProperty('e2eMode');
      expect(config).toHaveProperty('detailedLogging');
      expect(config).toHaveProperty('debugMode');
    });
  });

  describe('Legacy Console Compatibility', () => {
    it('should provide safe console replacement methods', () => {
      expect(typeof safeConsole.log).toBe('function');
      expect(typeof safeConsole.debug).toBe('function');
      expect(typeof safeConsole.info).toBe('function');
      expect(typeof safeConsole.warn).toBe('function');
      expect(typeof safeConsole.error).toBe('function');
    });

    it('should route legacy console calls to secure logger', () => {
      safeConsole.log('Test message', { data: 'test' });
      
      // Should call secureLogger.info (which safeConsole.log maps to)
      expect(mockConsole.info).toHaveBeenCalled();
    });
  });

  describe('Recursion and Edge Cases', () => {
    it('should handle circular references gracefully', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => {
        secureLogger.info('Circular test', circular);
      }).not.toThrow();
    });

    it('should handle null and undefined values', () => {
      secureLogger.info('Null test', null);
      secureLogger.info('Undefined test', undefined);
      secureLogger.info('Mixed test', { 
        nullVal: null, 
        undefinedVal: undefined,
        normalVal: 'ok' 
      });
      
      expect(mockConsole.info).toHaveBeenCalledTimes(3);
    });

    it('should prevent deep recursion', () => {
      const deepObject: any = {};
      let current = deepObject;
      
      // Create very deep object (more than 10 levels)
      for (let i = 0; i < 15; i++) {
        current.next = { level: i };
        current = current.next;
      }
      
      expect(() => {
        secureLogger.info('Deep object test', deepObject);
      }).not.toThrow();
    });
  });
});