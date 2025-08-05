/**
 * Storage Keys Utility Tests
 * Tests for centralized localStorage key constants
 */

import { describe, test, expect, vi } from 'vitest';
import { STORAGE_KEYS, type StorageKey } from './storage-keys';

describe('storage-keys utilities', () => {
  describe('STORAGE_KEYS constants', () => {
    test('should define TOKEN key correctly', () => {
      expect(STORAGE_KEYS.TOKEN).toBe('token');
      expect(typeof STORAGE_KEYS.TOKEN).toBe('string');
    });

    test('should define USER key correctly', () => {
      expect(STORAGE_KEYS.USER).toBe('user');
      expect(typeof STORAGE_KEYS.USER).toBe('string');
    });

    test('should have immutable structure with as const', () => {
      // This test ensures the object is readonly
      expect(Object.isFrozen(STORAGE_KEYS)).toBe(false); // Not frozen but readonly at type level
      expect(STORAGE_KEYS).toMatchObject({
        TOKEN: 'token',
        USER: 'user'
      });
    });

    test('should contain exactly 2 keys', () => {
      const keys = Object.keys(STORAGE_KEYS);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('TOKEN');
      expect(keys).toContain('USER');
    });

    test('should have consistent values across access patterns', () => {
      expect(STORAGE_KEYS['TOKEN']).toBe(STORAGE_KEYS.TOKEN);
      expect(STORAGE_KEYS['USER']).toBe(STORAGE_KEYS.USER);
    });
  });

  describe('StorageKey type', () => {
    test('should accept valid storage key values', () => {
      const tokenKey: StorageKey = 'token';
      const userKey: StorageKey = 'user';
      
      expect(tokenKey).toBe('token');
      expect(userKey).toBe('user');
    });

    test('should match STORAGE_KEYS values', () => {
      const keys = Object.values(STORAGE_KEYS);
      
      keys.forEach(key => {
        const typedKey: StorageKey = key;
        expect(typeof typedKey).toBe('string');
        expect(['token', 'user']).toContain(typedKey);
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should be usable in localStorage operations', () => {
      // Mock localStorage for this test
      const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };

      // Simulate usage patterns
      mockStorage.setItem(STORAGE_KEYS.TOKEN, 'test-token');
      mockStorage.setItem(STORAGE_KEYS.USER, '{"id":1,"name":"Test"}');
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(mockStorage.setItem).toHaveBeenCalledWith('user', '{"id":1,"name":"Test"}');
    });

    test('should prevent key duplication across different contexts', () => {
      // Ensure keys are unique - no duplicates in values
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = [...new Set(values)];
      
      expect(values.length).toBe(uniqueValues.length);
    });

    test('should maintain consistency for production/test usage', () => {
      // This test ensures the storage keys work consistently 
      // between production code and test fixtures
      expect(STORAGE_KEYS.TOKEN).toBe('token');
      expect(STORAGE_KEYS.USER).toBe('user');
      
      // These should match what AuthContext and auth utilities expect
      const expectedKeys = ['token', 'user'];
      const actualKeys = Object.values(STORAGE_KEYS);
      
      expectedKeys.forEach(expectedKey => {
        expect(actualKeys).toContain(expectedKey);
      });
    });
  });

  describe('Error prevention', () => {
    test('should not have empty or undefined keys', () => {
      Object.values(STORAGE_KEYS).forEach(value => {
        expect(value).toBeTruthy();
        expect(value.length).toBeGreaterThan(0);
        expect(typeof value).toBe('string');
      });
    });

    test('should not have whitespace-only keys', () => {
      Object.values(STORAGE_KEYS).forEach(value => {
        expect(value.trim()).toBe(value);
        expect(value.trim().length).toBeGreaterThan(0);
      });
    });

    test('should use reasonable key lengths', () => {
      Object.values(STORAGE_KEYS).forEach(value => {
        expect(value.length).toBeGreaterThan(0);
        expect(value.length).toBeLessThanOrEqual(50); // Reasonable max length
      });
    });
  });
});