/**
 * Authentication type definitions
 *
 * Centralized type definitions for authentication-related data structures
 */

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  displayName?: string;
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
  message?: string | null;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  user: User;
  message?: string | null;
}

export type SessionStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'error';

export interface SessionState {
  status: SessionStatus;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error: Error | null;
}

export interface SessionContextValue extends SessionState {
  signIn: (credentials: LoginCredentials, options?: { remember?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UserProfileState {
  profile: User | null;
  loading: boolean;
  error: Error | null;
}

export interface UserProfileContextValue extends UserProfileState {
  reload: () => Promise<void>;
  setProfile: (profile: User | null) => void;
}

export interface AccessControlState {
  role: string | null;
  isTutor: boolean;
  isLecturer: boolean;
  isAdmin: boolean;
  canApproveTimesheets: boolean;
  canViewAdminDashboard: boolean;
  hasRole: (role: string) => boolean;
}

export interface ErrorContext {
  [key: string]: string | number | undefined;
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
