import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { SessionProvider, useSession } from '../auth/SessionProvider';
import { UserProfileProvider, useUserProfile } from '../auth/UserProfileProvider';
import { authManager } from '../services/auth-manager';
import type { User, AuthContextType } from '../types/auth';

const LegacyAuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContextBridge: React.FC<{ children: ReactNode }> = ({ children }) => {
  const session = useSession();
  const { profile } = useUserProfile();

  const value: AuthContextType = useMemo(() => ({
    user: profile,
    token: session.token,
    login: (token: string, nextUser: User) => {
      authManager.setAuth(token, nextUser);
    },
    logout: () => {
      authManager.clearAuth();
    },
    isAuthenticated: session.isAuthenticated,
    isLoading: session.status === 'authenticating' || session.status === 'refreshing',
  }), [profile, session.isAuthenticated, session.status, session.token]);

  return (
    <LegacyAuthContext.Provider value={value}>
      {children}
    </LegacyAuthContext.Provider>
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => (
  <SessionProvider>
    <UserProfileProvider>
      <AuthContextBridge>{children}</AuthContextBridge>
    </UserProfileProvider>
  </SessionProvider>
);

export const useAuth = (): AuthContextType => {
  const context = useContext(LegacyAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export type { User } from '../types/auth';
