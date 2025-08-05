/**
 * Centralized storage keys for localStorage to ensure consistency
 * between production code and test fixtures
 */
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];