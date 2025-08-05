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
 * Get authorization header for API requests
 */
export const getAuthHeader = (): string | null => {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : null;
};

/**
 * Check if token is expired (basic check - in reality you'd decode JWT)
 */
export const isTokenExpired = (): boolean => {
  const token = getAuthToken();
  if (!token) return true;
  
  try {
    // Basic JWT structure check
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode payload (basic check - in production you'd use a proper JWT library)
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return false; // No expiration claim
    
    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    return exp < now;
  } catch (error) {
    console.error('Failed to check token expiration:', error);
    return true; // Assume expired if we can't parse
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