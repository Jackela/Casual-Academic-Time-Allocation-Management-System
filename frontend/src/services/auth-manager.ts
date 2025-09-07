/**
 * Centralized Authentication Manager
 * 
 * Single source of truth for authentication state management across the application.
 * Provides synchronized token management between UI components and API client.
 */

import { STORAGE_KEYS } from '../utils/storage-keys';
import type { User, AuthState, AuthStateListener } from '../types/auth';

/**
 * Centralized authentication manager implementing singleton pattern.
 * Manages authentication state, token persistence, and API client synchronization.
 */
export class AuthManager {
  private static instance: AuthManager;
  private token: string | null = null;
  private user: User | null = null;
  private listeners: Set<AuthStateListener> = new Set();
  private apiClientTokenSetter: ((token: string | null) => void) | null = null;

  private constructor() {
    this.initializeFromStorage();
  }

  /**
   * Get singleton instance of AuthManager
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeFromStorage(): void {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      
      if (storedToken && storedUser) {
        this.user = JSON.parse(storedUser) as User;
        this.token = storedToken;
      }
    } catch (error) {
      console.error('Error parsing stored authentication data:', error);
      this.token = null;
      this.user = null;
      this.clearStorageAndState();
    }
  }

  /**
   * Set authentication state with token and user data
   * Updates internal state, persists to storage, syncs with API client, and notifies listeners
   */
  setAuth(token: string, user: User): void {
    this.token = token;
    this.user = user;
    this.persistToStorage();
    this.syncWithApiClient();
    this.notifyListeners();
  }

  /**
   * Clear authentication state
   * Clears internal state, storage, API client token, and notifies listeners
   */
  clearAuth(): void {
    this.token = null;
    this.user = null;
    this.clearStorageAndState();
    this.syncWithApiClient();
    this.notifyListeners();
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return {
      user: this.user,
      token: this.token,
      isAuthenticated: !!(this.token && this.user)
    };
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.token && this.user);
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Register API client token setter for synchronization
   * Called by API client during initialization
   */
  registerApiClientTokenSetter(setter: (token: string | null) => void): void {
    this.apiClientTokenSetter = setter;
    // Immediately sync current token
    this.syncWithApiClient();
  }

  /**
   * Persist authentication data to localStorage using STORAGE_KEYS
   */
  private persistToStorage(): void {
    if (this.token && this.user) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, this.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
    }
  }

  /**
   * Clear authentication data from localStorage
   */
  private clearStorageAndState(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * Synchronize token with API client
   */
  private syncWithApiClient(): void {
    if (this.apiClientTokenSetter) {
      this.apiClientTokenSetter(this.token);
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const currentState = this.getAuthState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Generate unique session ID for error tracking
   */
  getSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance for convenience
export const authManager = AuthManager.getInstance();