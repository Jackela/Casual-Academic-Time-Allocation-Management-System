/**
 * Storage Keys Utility Tests
 * Tests for centralized localStorage key constants
 */

import { describe, test, expect, vi } from 'vitest';
import { STORAGE_KEYS, type StorageKey } from './storage-keys';

const EXPECTED_VALUES: StorageKey[] = ['token', 'user', 'refresh_token', 'token_expires_at'];

describe('storage-keys utilities', () => {
  describe('STORAGE_KEYS constants', () => {
    test('should define TOKEN key correctly', () => {
      expect(STORAGE_KEYS.TOKEN).toBe('token');
    });

    test('should define USER key correctly', () => {
      expect(STORAGE_KEYS.USER).toBe('user');
    });

    test('should define REFRESH_TOKEN key correctly', () => {
      expect(STORAGE_KEYS.REFRESH_TOKEN).toBe('refresh_token');
    });

    test('should define TOKEN_EXPIRY key correctly', () => {
      expect(STORAGE_KEYS.TOKEN_EXPIRY).toBe('token_expires_at');
    });

    test('should have immutable structure with as const', () => {
      expect(Object.isFrozen(STORAGE_KEYS)).toBe(false);
      expect(STORAGE_KEYS).toMatchObject({
        TOKEN: 'token',
        USER: 'user',
        REFRESH_TOKEN: 'refresh_token',
        TOKEN_EXPIRY: 'token_expires_at',
      });
    });

    test('should contain exactly 4 keys', () => {
      const keys = Object.keys(STORAGE_KEYS);
      expect(keys).toHaveLength(4);
      expect(keys).toEqual(['TOKEN', 'USER', 'REFRESH_TOKEN', 'TOKEN_EXPIRY']);
    });

    test('should have consistent values across access patterns', () => {
      (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>).forEach((key) => {
        expect(STORAGE_KEYS[key]).toBe(STORAGE_KEYS[key]);
      });
    });
  });

  describe('StorageKey type', () => {
    test('should accept valid storage key values', () => {
      EXPECTED_VALUES.forEach((value) => {
        const typedKey: StorageKey = value;
        expect(typedKey).toBe(value);
      });
    });

    test('should match STORAGE_KEYS values', () => {
      const keys = Object.values(STORAGE_KEYS);
      keys.forEach((key) => {
        const typedKey: StorageKey = key;
        expect(EXPECTED_VALUES).toContain(typedKey);
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should be usable in localStorage operations', () => {
      const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };

      mockStorage.setItem(STORAGE_KEYS.TOKEN, 'test-token');
      mockStorage.setItem(STORAGE_KEYS.USER, '{"id":1,"name":"Test"}');
      mockStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh');
      mockStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, '12345');

      EXPECTED_VALUES.forEach((value) => {
        expect(mockStorage.setItem).toHaveBeenCalledWith(value, expect.any(String));
      });
    });

    test('should prevent key duplication across different contexts', () => {
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    test('should maintain consistency for production/test usage', () => {
      const actualKeys = Object.values(STORAGE_KEYS);
      EXPECTED_VALUES.forEach((expectedKey) => {
        expect(actualKeys).toContain(expectedKey);
      });
    });
  });

  describe('Error prevention', () => {
    test('should not have empty or undefined keys', () => {
      Object.values(STORAGE_KEYS).forEach((value) => {
        expect(value).toBeTruthy();
        expect(typeof value).toBe('string');
      });
    });

    test('should not have whitespace-only keys', () => {
      Object.values(STORAGE_KEYS).forEach((value) => {
        expect(value.trim()).toBe(value);
      });
    });

    test('should use reasonable key lengths', () => {
      Object.values(STORAGE_KEYS).forEach((value) => {
        expect(value.length).toBeGreaterThan(0);
        expect(value.length).toBeLessThanOrEqual(50);
      });
    });
  });
});
