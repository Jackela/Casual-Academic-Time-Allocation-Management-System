/**
 * AuthManager Unit Tests
 * 
 * Comprehensive tests for centralized authentication manager singleton behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthManager } from '../../services/auth-manager';
import { STORAGE_KEYS } from '../../utils/storage-keys';
import { secureLogger } from '../../utils/secure-logger';
import type { User, AuthState } from '../../types/auth';
import type { AuthSession } from '../../types/api';

// Mock localStorage
type MockFn<TArgs extends unknown[], TResult> = ReturnType<typeof vi.fn<TArgs, TResult>>;
type MockStorage = {
  store: Record<string, string>;
  getItem: MockFn<[string], string | null>;
  setItem: MockFn<[string, string], void>;
  removeItem: MockFn<[string], void>;
  clear: MockFn<[], void>;
};

const mockLocalStorage: MockStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  })
};

// Setup global localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

const resetAuthManagerSingleton = () => {
  (AuthManager as unknown as { instance?: AuthManager }).instance = undefined;
};

describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockApiClientTokenSetter: ReturnType<typeof vi.fn>;

  const mockUser: User = {
    id: 123,
    email: 'test@example.com',
    name: 'Test User',
    role: 'TUTOR'
  };

  const mockToken = 'mock-jwt-token-123';

  beforeEach(() => {
    // Clear localStorage mock
    mockLocalStorage.clear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();

    // Reset singleton for testing
    resetAuthManagerSingleton();
    authManager = AuthManager.getInstance();

    // Mock API client token setter
    mockApiClientTokenSetter = vi.fn();
    authManager.registerApiClientTokenSetter(mockApiClientTokenSetter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = AuthManager.getInstance();
      const instance2 = AuthManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = AuthManager.getInstance();
      instance1.setAuth(mockToken, mockUser);
      
      const instance2 = AuthManager.getInstance();
      expect(instance2.getToken()).toBe(mockToken);
      expect(instance2.getUser()).toEqual(mockUser);
    });
  });

  describe('Authentication State Management', () => {
    it('should initialize with empty state when no stored data', () => {
      const state = authManager.getAuthState();
      
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should initialize from localStorage when valid data exists', () => {
      // Pre-populate localStorage
      mockLocalStorage.store[STORAGE_KEYS.TOKEN] = mockToken;
      mockLocalStorage.store[STORAGE_KEYS.USER] = JSON.stringify(mockUser);

      // Create new instance to test initialization
      resetAuthManagerSingleton();
      const newAuthManager = AuthManager.getInstance();
      
      const state = newAuthManager.getAuthState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.store[STORAGE_KEYS.TOKEN] = mockToken;
      mockLocalStorage.store[STORAGE_KEYS.USER] = 'invalid-json{';

      const loggerSpy = vi.spyOn(secureLogger, 'error').mockImplementation(() => {});

      resetAuthManagerSingleton();
      const newAuthManager = AuthManager.getInstance();

      const state = newAuthManager.getAuthState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error parsing stored authentication data',
        expect.any(Error),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('setAuth', () => {
    it('should update internal state correctly', () => {
      authManager.setAuth(mockToken, mockUser);
      
      expect(authManager.getToken()).toBe(mockToken);
      expect(authManager.getUser()).toEqual(mockUser);
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getRefreshToken()).toBeNull();
      expect(authManager.getTokenExpiry()).toBeNull();
    });

    it('should persist to localStorage using STORAGE_KEYS', () => {
      authManager.setAuth(mockToken, mockUser);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN, mockToken);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN_EXPIRY);
    });

    it('should persist refresh token metadata when provided', () => {
      const session: AuthSession = {
        token: mockToken,
        user: mockUser,
        refreshToken: 'refresh-token',
        expiresAt: 1699999999,
      };

      authManager.setAuth(session);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN, mockToken);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.TOKEN_EXPIRY,
        String(session.expiresAt),
      );
      expect(authManager.getRefreshToken()).toBe('refresh-token');
      expect(authManager.getTokenExpiry()).toBe(session.expiresAt);
    });

    it('should sync with API client', () => {
      authManager.setAuth(mockToken, mockUser);
      
      expect(mockApiClientTokenSetter).toHaveBeenCalledWith(mockToken);
    });

    it('should notify all listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      authManager.subscribe(listener1);
      authManager.subscribe(listener2);
      
      authManager.setAuth(mockToken, mockUser);
      
      const expectedState: AuthState = {
        user: mockUser,
        token: mockToken,
        isAuthenticated: true
      };
      
      expect(listener1).toHaveBeenCalledWith(expectedState);
      expect(listener2).toHaveBeenCalledWith(expectedState);
    });
  });

  describe('clearAuth', () => {
    beforeEach(() => {
      // Set up authenticated state first
      authManager.setAuth(mockToken, mockUser);
      vi.clearAllMocks();
    });

    it('should clear internal state', () => {
      authManager.clearAuth();
      
      expect(authManager.getToken()).toBeNull();
      expect(authManager.getUser()).toBeNull();
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getRefreshToken()).toBeNull();
      expect(authManager.getTokenExpiry()).toBeNull();
    });

    it('should clear localStorage', () => {
      authManager.clearAuth();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN_EXPIRY);
    });

    it('should sync with API client', () => {
      authManager.clearAuth();
      
      expect(mockApiClientTokenSetter).toHaveBeenCalledWith(null);
    });

    it('should notify all listeners', () => {
      const listener = vi.fn();
      authManager.subscribe(listener);
      
      authManager.clearAuth();
      
      const expectedState: AuthState = {
        user: null,
        token: null,
        isAuthenticated: false
      };
      
      expect(listener).toHaveBeenCalledWith(expectedState);
    });
  });

  describe('Subscription Management', () => {
    it('should allow subscribing to state changes', () => {
      const listener = vi.fn();
      const unsubscribe = authManager.subscribe(listener);
      
      authManager.setAuth(mockToken, mockUser);
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow unsubscribing from state changes', () => {
      const listener = vi.fn();
      const unsubscribe = authManager.subscribe(listener);
      
      authManager.setAuth(mockToken, mockUser);
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      authManager.clearAuth();
      
      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const loggerSpy = vi.spyOn(secureLogger, 'error').mockImplementation(() => {});
      const faultyListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();
      
      authManager.subscribe(faultyListener);
      authManager.subscribe(goodListener);
      
      authManager.setAuth(mockToken, mockUser);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error in auth state listener',
        expect.any(Error),
      );
      expect(goodListener).toHaveBeenCalledTimes(1);

      loggerSpy.mockRestore();
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();
      
      authManager.subscribe(listener1);
      authManager.subscribe(listener2);
      authManager.subscribe(listener3);
      
      authManager.setAuth(mockToken, mockUser);
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });
  });

  describe('API Client Integration', () => {
    it('should sync current token when API client registers', () => {
      authManager.setAuth(mockToken, mockUser);
      vi.clearAllMocks();
      
      const newApiClientSetter = vi.fn();
      authManager.registerApiClientTokenSetter(newApiClientSetter);
      
      expect(newApiClientSetter).toHaveBeenCalledWith(mockToken);
    });

    it('should sync null token when API client registers and no auth', () => {
      const newApiClientSetter = vi.fn();
      authManager.registerApiClientTokenSetter(newApiClientSetter);
      
      expect(newApiClientSetter).toHaveBeenCalledWith(null);
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = authManager.getSessionId();
      const sessionId2 = authManager.getSessionId();
      
      expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(sessionId2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should return correct authentication status', () => {
      expect(authManager.isAuthenticated()).toBe(false);
      
      authManager.setAuth(mockToken, mockUser);
      expect(authManager.isAuthenticated()).toBe(true);
      
      authManager.clearAuth();
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getRefreshToken()).toBeNull();
      expect(authManager.getTokenExpiry()).toBeNull();
    });

    it('should return current auth state snapshot', () => {
      authManager.setAuth(mockToken, mockUser);
      const state = authManager.getAuthState();
      
      expect(state).toEqual({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true
      });
    });
  });
});

