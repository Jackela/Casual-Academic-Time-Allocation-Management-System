import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setAuthData,
  getAuthToken,
  getUser,
  isAuthenticated,
  clearAuthData,
  hasRole,
  hasAnyRole,
  getAuthHeader,
  isTokenExpired,
  getUserDisplayName,
  getUserRoleDisplay,
  type User
} from './auth';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
});

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'LECTURER'
};

const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkxFQ1RVUkVSIiwiZXhwIjoxNzU0MzYwMDAwfQ.mock-signature';

describe('auth utilities', () => {
  describe('setAuthData', () => {
    it('should store token and user data in localStorage', () => {
      setAuthData(mockToken, mockUser);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      expect(() => setAuthData(mockToken, mockUser)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store auth data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getAuthToken', () => {
    it('should return token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(mockToken);
      
      const result = getAuthToken();
      expect(result).toBe(mockToken);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('token');
    });

    it('should return null if no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getAuthToken();
      expect(result).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = getAuthToken();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getUser', () => {
    it('should return user data from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      const result = getUser();
      expect(result).toEqual(mockUser);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user');
    });

    it('should return null if no user data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getUser();
      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      const result = getUser();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when both token and user exist', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(mockToken) // token
        .mockReturnValueOnce(JSON.stringify(mockUser)); // user
      
      const result = isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when token is missing', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(null) // token
        .mockReturnValueOnce(JSON.stringify(mockUser)); // user
      
      const result = isAuthenticated();
      expect(result).toBe(false);
    });

    it('should return false when user is missing', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(mockToken) // token
        .mockReturnValueOnce(null); // user
      
      const result = isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('clearAuthData', () => {
    it('should remove token and user from localStorage', () => {
      clearAuthData();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => clearAuthData()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      const result = hasRole('LECTURER');
      expect(result).toBe(true);
    });

    it('should return false when user has different role', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      const result = hasRole('ADMIN');
      expect(result).toBe(false);
    });

    it('should return false when no user exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = hasRole('LECTURER');
      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has one of the specified roles', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      const result = hasAnyRole(['LECTURER', 'ADMIN']);
      expect(result).toBe(true);
    });

    it('should return false when user has none of the specified roles', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      const result = hasAnyRole(['TUTOR', 'ADMIN']);
      expect(result).toBe(false);
    });

    it('should return false when no user exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = hasAnyRole(['LECTURER']);
      expect(result).toBe(false);
    });
  });

  describe('getAuthHeader', () => {
    it('should return Bearer token header', () => {
      localStorageMock.getItem.mockReturnValue(mockToken);
      
      const result = getAuthHeader();
      expect(result).toBe(`Bearer ${mockToken}`);
    });

    it('should return null when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getAuthHeader();
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = isTokenExpired();
      expect(result).toBe(true);
    });

    it('should return true for invalid token format', () => {
      localStorageMock.getItem.mockReturnValue('invalid.token');
      
      const result = isTokenExpired();
      expect(result).toBe(true);
    });

    it('should return false for token without expiration', () => {
      const tokenWithoutExp = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
        btoa(JSON.stringify({ sub: 'test' })) + 
        '.signature';
      localStorageMock.getItem.mockReturnValue(tokenWithoutExp);
      
      const result = isTokenExpired();
      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 3600 }; // 1 hour ago
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
        btoa(JSON.stringify(expiredPayload)) + 
        '.signature';
      localStorageMock.getItem.mockReturnValue(expiredToken);
      
      const result = isTokenExpired();
      expect(result).toBe(true);
    });

    it('should return false for valid token', () => {
      const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1 hour from now
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
        btoa(JSON.stringify(validPayload)) + 
        '.signature';
      localStorageMock.getItem.mockReturnValue(validToken);
      
      const result = isTokenExpired();
      expect(result).toBe(false);
    });
  });

  describe('getUserDisplayName', () => {
    it('should return user name when user exists', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      
      const result = getUserDisplayName();
      expect(result).toBe('Test User');
    });

    it('should return default when no user exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getUserDisplayName();
      expect(result).toBe('Unknown User');
    });
  });

  describe('getUserRoleDisplay', () => {
    it('should return formatted role names', () => {
      const testCases = [
        { role: 'LECTURER', expected: 'Lecturer' },
        { role: 'TUTOR', expected: 'Tutor' },
        { role: 'ADMIN', expected: 'Administrator' }
      ] as const;

      testCases.forEach(({ role, expected }) => {
        const userWithRole = { ...mockUser, role };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(userWithRole));
        
        const result = getUserRoleDisplay();
        expect(result).toBe(expected);
      });
    });

    it('should return empty string when no user exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getUserRoleDisplay();
      expect(result).toBe('');
    });
  });
});