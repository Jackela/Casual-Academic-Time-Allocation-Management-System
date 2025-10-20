/**
 * Environment Detection Utility Tests
 * 
 * Basic tests for centralized environment detection and configuration
 * Note: These tests focus on the validation and legacy compatibility functions
 * that can be tested independently of import.meta.env mocking complexities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ENV_CONFIG, legacyCompat, envErrorHandler } from '../../utils/environment';

// Mock console for testing
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('ENV_CONFIG', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock console
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Environment Detection', () => {
    it('should have consistent API structure', () => {
      // Test that all expected methods exist
      expect(typeof ENV_CONFIG.isE2E).toBe('function');
      expect(typeof ENV_CONFIG.isDevelopment).toBe('function');
      expect(typeof ENV_CONFIG.isProduction).toBe('function');
      expect(typeof ENV_CONFIG.isTest).toBe('function');
      expect(typeof ENV_CONFIG.getMode).toBe('function');
    });

    it('should have E2E configuration methods', () => {
      expect(typeof ENV_CONFIG.e2e.hasTestFlag).toBe('function');
      expect(typeof ENV_CONFIG.e2e.getDebugInfo).toBe('function');
    });

    it('should have feature flag methods', () => {
      expect(typeof ENV_CONFIG.features.enableDetailedLogging).toBe('function');
      expect(typeof ENV_CONFIG.features.enableDebugMode).toBe('function');
      expect(typeof ENV_CONFIG.features.hasHotReload).toBe('function');
    });

    it('should have validation methods', () => {
      expect(typeof ENV_CONFIG.validation.isConsistentConfig).toBe('function');
    });

    it('should return boolean values for environment checks', () => {
      // These should always return booleans, regardless of environment
      expect(typeof ENV_CONFIG.isE2E()).toBe('boolean');
      expect(typeof ENV_CONFIG.isDevelopment()).toBe('boolean');
      expect(typeof ENV_CONFIG.isProduction()).toBe('boolean');
      expect(typeof ENV_CONFIG.isTest()).toBe('boolean');
    });

    it('should return string for getMode', () => {
      expect(typeof ENV_CONFIG.getMode()).toBe('string');
    });

    it('should return object for debug info', () => {
      const debugInfo = ENV_CONFIG.e2e.getDebugInfo();
      expect(typeof debugInfo).toBe('object');
      expect(debugInfo).not.toBeNull();
    });
  });

  describe('Validation Utilities', () => {
    it('should check configuration consistency', () => {
      // This method should always return a boolean
      const result = ENV_CONFIG.validation.isConsistentConfig();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should provide legacy compatibility functions', () => {
      // Ensure legacy functions exist and return correct types
      expect(typeof legacyCompat.isE2EMode).toBe('function');
      expect(typeof legacyCompat.isProductionMode).toBe('function');
      
      // Should return boolean values
      expect(typeof legacyCompat.isE2EMode()).toBe('boolean');
      expect(typeof legacyCompat.isProductionMode()).toBe('boolean');
    });
  });

  describe('Error Handler', () => {
    it('should handle errors without throwing', () => {
      const error = new Error('Test error');
      
      // Should not throw regardless of environment
      expect(() => {
        envErrorHandler(error, 'test-context');
      }).not.toThrow();
    });

    it('should be a function', () => {
      expect(typeof envErrorHandler).toBe('function');
    });
  });

  describe('API Stability', () => {
    it('should have stable public API', () => {
      // Test that the main API surface is stable
      const expectedMethods = [
        'isE2E', 'isDevelopment', 'isProduction', 'isTest', 'getMode',
        'e2e', 'features', 'validation'
      ];
      
      expectedMethods.forEach(method => {
        expect(ENV_CONFIG).toHaveProperty(method);
      });
    });

    it('should have E2E namespace with expected methods', () => {
      type E2EMethod = keyof typeof ENV_CONFIG['e2e'];
      const expectedE2EMethods: E2EMethod[] = ['hasTestFlag', 'getDebugInfo'];

      expectedE2EMethods.forEach((method) => {
        expect(ENV_CONFIG.e2e).toHaveProperty(method);
        expect(typeof ENV_CONFIG.e2e[method]).toBe('function');
      });
    });

    it('should have features namespace with expected methods', () => {
      type FeatureMethod = keyof typeof ENV_CONFIG['features'];
      const expectedFeatureMethods: FeatureMethod[] = [
        'enableDetailedLogging',
        'enableDebugMode',
        'hasHotReload'
      ];

      expectedFeatureMethods.forEach((method) => {
        expect(ENV_CONFIG.features).toHaveProperty(method);
        expect(typeof ENV_CONFIG.features[method]).toBe('function');
      });
    });

  });
  describe('Type Safety', () => {
    it('should return appropriate types for E2E methods', () => {
      expect(typeof ENV_CONFIG.e2e.hasTestFlag()).toBe('boolean');
      const info = ENV_CONFIG.e2e.getDebugInfo();
      expect(info === undefined || typeof info === 'object').toBe(true);
    });

    it('should return appropriate types for feature methods', () => {
      expect(typeof ENV_CONFIG.features.enableDetailedLogging()).toBe('boolean');
      expect(typeof ENV_CONFIG.features.enableDebugMode()).toBe('boolean');
      expect(typeof ENV_CONFIG.features.hasHotReload()).toBe('boolean');
    });
  });
});



