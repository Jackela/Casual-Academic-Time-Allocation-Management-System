import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { STORAGE_KEYS } from '../utils/storage-keys';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize from localStorage synchronously to avoid redirect flicker in ProtectedRoute
  const getInitialAuth = (): { user: User | null; token: string | null } => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedToken && storedUser) {
        return { token: storedToken, user: JSON.parse(storedUser) as User };
      }
    } catch (error) {
      console.error('Error parsing stored user data (initial):', error);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
    return { user: null, token: null };
  };

  const initial = getInitialAuth();
  const [user, setUser] = useState<User | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  const [isLoading, setIsLoading] = useState(false);

  // Keep effect to normalize any late-arriving storage changes injected before hydration
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        if (storedToken !== token) setToken(storedToken);
        if (!user || user.id !== parsedUser.id || user.role !== parsedUser.role) setUser(parsedUser);
      } else {
        // E2E auth bypass for test runs only
        try {
          // @ts-ignore
          const isE2E = typeof import.meta !== 'undefined' && import.meta?.env?.MODE === 'e2e';
          // @ts-ignore
          const bypassRole = import.meta?.env?.VITE_E2E_AUTH_BYPASS_ROLE as string | undefined;
          if (isE2E && bypassRole) {
            const fallbackUser: User = {
              id: 201,
              email: `${bypassRole.toLowerCase()}@example.com`,
              name: bypassRole === 'TUTOR' ? 'John Doe' : (bypassRole === 'LECTURER' ? 'Dr. Jane Smith' : 'Admin User'),
              role: bypassRole
            };
            const fallbackToken = `${bypassRole.toLowerCase()}-e2e-bypass-token`;
            localStorage.setItem(STORAGE_KEYS.TOKEN, fallbackToken);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(fallbackUser));
            setToken(fallbackToken);
            setUser(fallbackUser);
          }
        } catch {}
      }
    } catch (error) {
      console.error('Error parsing stored user data (effect):', error);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
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