import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authManager } from '../services/auth-manager';
import { secureApiClient } from '../services/api-secure';
import { ENV_CONFIG } from '../utils/environment';
import type { User, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize state from AuthManager
  const initialState = authManager.getAuthState();
  const [user, setUser] = useState<User | null>(initialState.user);
  const [token, setToken] = useState<string | null>(initialState.token);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize secure API client with existing token
  if (initialState.token) {
    secureApiClient.setAuthToken(initialState.token);
  }

  useEffect(() => {
    // Subscribe to AuthManager state changes and sync with secure API client
    const unsubscribe = authManager.subscribe((state) => {
      setUser(state.user);
      setToken(state.token);
      
      // Keep secure API client in sync with auth state
      secureApiClient.setAuthToken(state.token);
    });

    // Handle E2E auth bypass - preserve existing logic but use AuthManager
    const handleE2EBypass = () => {
      try {
        // E2E auth bypass ONLY for automated testing environment
        if (ENV_CONFIG.e2e.hasAuthBypass()) {
          const currentState = authManager.getAuthState();
          if (!currentState.isAuthenticated) {
            const bypassRole = ENV_CONFIG.e2e.getBypassRole();
            if (bypassRole && ENV_CONFIG.validation.isValidBypassRole(bypassRole)) {
              const fallbackUser: User = {
                id: 201,
                email: `test-${bypassRole.toLowerCase()}@test.local`,
                name: `Test ${bypassRole}`,
                role: bypassRole
              };
              const fallbackToken = `bypass-token-${Date.now()}`;

              
              // Use AuthManager for E2E bypass
              authManager.setAuth(fallbackToken, fallbackUser);
            }
          }
        }
      } catch (error) {
        console.error('Error in E2E auth bypass:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Run E2E bypass check
    handleE2EBypass();

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const login = (newToken: string, newUser: User) => {
    authManager.setAuth(newToken, newUser);
  };

  const logout = () => {
    authManager.clearAuth();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: authManager.isAuthenticated(),
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-export types for backward compatibility
export type { User } from '../types/auth';
