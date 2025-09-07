/**
 * Authentication type definitions
 * 
 * Centralized type definitions for authentication-related data structures
 */

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type AuthStateListener = (state: AuthState) => void;

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  timestamp: string;
  environment: string;
  apiEndpoint?: string;
  httpStatus?: number;
  userAgent: string;
  sessionId: string;
}

export type UserRole = 'TUTOR' | 'LECTURER' | 'ADMIN';