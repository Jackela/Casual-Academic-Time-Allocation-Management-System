/**
 * Authentication utilities for the CATAMS application
 */
import { STORAGE_KEYS } from './storage-keys';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'LECTURER' | 'TUTOR' | 'ADMIN';
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
  errorMessage?: string;
}

/**
 * Store authentication data in localStorage
 */
export const setAuthData = (token: string, user: User): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store auth data:', error);
  }
};

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

/**
 * Get user data from localStorage
 */
export const getUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = getUser();
  return !!(token && user);
};

/**
 * Clear authentication data
 */
export const clearAuthData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
};

/**
 * Check if user has a specific role
 */
export const hasRole = (role: User['role']): boolean => {
  const user = getUser();
  return user?.role === role;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles: User['role'][]): boolean => {
  const user = getUser();
  return !!(user && roles.includes(user.role));
};

/**
 * Get authorization header for API requests with token validation
 */
export const getAuthHeader = (): string | null => {
  const token = getAuthToken();
  if (!token) return null;
  
  // Validate token before using it
  const validation = validateTokenStructure(token);
  if (!validation.valid) {
    console.warn('Invalid token detected, clearing auth data:', validation.reason);
    clearAuthData();
    return null;
  }
  
  // Check expiration
  if (isTokenExpired()) {
    console.warn('Expired token detected, clearing auth data');
    clearAuthData();
    return null;
  }
  
  return `Bearer ${token}`;
};

/**
 * Check if token is expired - SECURE implementation with validation
 */
export const isTokenExpired = (): boolean => {
  const token = getAuthToken();
  if (!token) return true;
  
  try {
    // JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT structure');
      return true;
    }
    
    // Validate base64url encoding
    if (!/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) {
      console.warn('Invalid JWT encoding');
      return true;
    }
    
    // Safe payload parsing with validation
    const payload = JSON.parse(atob(parts[1]));
    
    // Validate payload structure
    if (typeof payload !== 'object' || payload === null) {
      console.warn('Invalid JWT payload structure');
      return true;
    }
    
    // If no exp claim, token is considered non-expiring (return false for not expired)
    if (!payload.exp || typeof payload.exp !== 'number') {
      return false;
    }
    
    // Check expiration with buffer for clock skew
    const now = Math.floor(Date.now() / 1000);
    const CLOCK_SKEW_BUFFER = 30; // 30 seconds buffer
    return payload.exp < (now - CLOCK_SKEW_BUFFER);
    
  } catch (error) {
    console.error('JWT validation failed:', error);
    return true; // Conservative: assume expired on any error
  }
};

/**
 * Validate JWT token structure and basic claims (without signature verification)
 * Note: For production, use a proper JWT library with signature verification
 */
export const validateTokenStructure = (token: string): { valid: boolean; reason?: string } => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid JWT structure' };
    }
    
    // Validate header
    const header = JSON.parse(atob(parts[0]));
    if (!header.alg || !header.typ || header.typ !== 'JWT') {
      return { valid: false, reason: 'Invalid JWT header' };
    }
    
    // Validate payload (only check for sub, exp and iat are optional)
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.sub) {
      return { valid: false, reason: 'Missing required JWT subject claim' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'JWT parsing error' };
  }
};

/**
 * Format user display name
 */
export const getUserDisplayName = (): string => {
  const user = getUser();
  return user?.name || 'Unknown User';
};

/**
 * Get user role display name
 */
export const getUserRoleDisplay = (): string => {
  const user = getUser();
  if (!user) return '';
  
  switch (user.role) {
    case 'LECTURER':
      return 'Lecturer';
    case 'TUTOR':
      return 'Tutor';
    case 'ADMIN':
      return 'Administrator';
    default:
      return user.role;
  }
};