/**
 * Centralized storage keys for localStorage to ensure consistency
 * between production code and test fixtures
 */
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expires_at',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
