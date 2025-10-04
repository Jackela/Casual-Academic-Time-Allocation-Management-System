import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from './api';
import { authStorage } from './storage';
import { authManager } from '../services/auth-manager';
import { secureLogger } from '../utils/secure-logger';
import { ENV_CONFIG } from '../utils/environment';
import type {
  LoginCredentials,
  SessionContextValue,
  SessionState,
} from '../types/auth';

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const createInitialState = (): SessionState => {
  const storedSession = authStorage.getSession();
  const authState = authManager.getAuthState();
  const token = storedSession.token ?? authState.token ?? null;

  return {
    status: token ? 'authenticated' : 'unauthenticated',
    isAuthenticated: Boolean(token && authState.user),
    token,
    refreshToken: storedSession.refreshToken ?? null,
    expiresAt: storedSession.expiresAt ?? null,
    error: null,
  };
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [state, setState] = useState<SessionState>(createInitialState);

  const syncFromAuthManager = useCallback(() => {
    const authState = authManager.getAuthState();
    setState((previous) => {
      const next: SessionState = {
        ...previous,
        status: authState.isAuthenticated ? 'authenticated' : 'unauthenticated',
        isAuthenticated: authState.isAuthenticated,
        token: authState.token,
        error: null,
      };

      if (authState.isAuthenticated && authState.token) {
        authStorage.setSession({
          token: authState.token,
          refreshToken: previous.refreshToken ?? null,
          expiresAt: previous.expiresAt ?? null,
        });
      } else {
        authStorage.clearSession();
      }

      return next;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = authManager.subscribe(() => {
      syncFromAuthManager();
    });

    const handleE2EBypass = () => {
      try {
        if (!ENV_CONFIG.e2e.hasAuthBypass()) {
          return;
        }

        const currentState = authManager.getAuthState();
        if (currentState.isAuthenticated) {
          return;
        }

        const bypassRole = ENV_CONFIG.e2e.getBypassRole();
        if (bypassRole && ENV_CONFIG.validation.isValidBypassRole(bypassRole)) {
          const fallbackUser = {
            id: 201,
            email: `test-${bypassRole.toLowerCase()}@test.local`,
            name: `Test ${bypassRole}`,
            role: bypassRole,
          };
          const bypassToken = `bypass-token-${Date.now()}`;
          authManager.setAuth(bypassToken, fallbackUser);
        }
      } catch (error) {
        secureLogger.error('SessionProvider bypass failure', error);
      }
    };

    handleE2EBypass();
    syncFromAuthManager();
    return unsubscribe;
  }, [syncFromAuthManager]);

  const signIn = useCallback<SessionContextValue['signIn']>(
    async (credentials: LoginCredentials, options) => {
      setState((previous) => ({
        ...previous,
        status: 'authenticating',
        error: null,
      }));

      try {
        const response = await authApi.login(credentials);
        const remember = options?.remember ?? true;

        if (remember) {
          authStorage.setSession({
            token: response.token,
            refreshToken: response.refreshToken ?? null,
            expiresAt: response.expiresAt ?? null,
          });
        } else {
          authStorage.clearSession();
        }

        authManager.setAuth(response.token, response.user);

        setState({
          status: 'authenticated',
          isAuthenticated: true,
          token: response.token,
          refreshToken: response.refreshToken ?? null,
          expiresAt: response.expiresAt ?? null,
          error: null,
        });
      } catch (error) {
        secureLogger.error('Session sign-in failed', error);
        setState({
          status: 'error',
          isAuthenticated: false,
          token: null,
          refreshToken: null,
          expiresAt: null,
          error: error as Error,
        });
        throw error;
      }
    },
  );

  const signOut = useCallback<SessionContextValue['signOut']>(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      secureLogger.warn('Session sign-out encountered an error', error);
    } finally {
      authStorage.clearSession();
      authManager.clearAuth();
      setState({
        status: 'unauthenticated',
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        expiresAt: null,
        error: null,
      });
    }
  }, []);

  const refresh = useCallback<SessionContextValue['refresh']>(async () => {
    const refreshToken = state.refreshToken;
    if (!refreshToken) {
      secureLogger.warn('Refresh token not available; skipping refresh');
      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'refreshing',
      error: null,
    }));

    try {
      const response = await authApi.refresh(refreshToken);
      authStorage.setSession({
        token: response.token,
        refreshToken: response.refreshToken ?? refreshToken,
        expiresAt: response.expiresAt ?? null,
      });
      authManager.setAuth(response.token, response.user);
      setState({
        status: 'authenticated',
        isAuthenticated: true,
        token: response.token,
        refreshToken: response.refreshToken ?? refreshToken,
        expiresAt: response.expiresAt ?? null,
        error: null,
      });
    } catch (error) {
      secureLogger.error('Session refresh failed', error);
      setState((previous) => ({
        status: 'error',
        isAuthenticated: previous.isAuthenticated,
        token: previous.token,
        refreshToken: previous.refreshToken,
        expiresAt: previous.expiresAt,
        error: error as Error,
      }));
    }
  }, [state.refreshToken]);

  const value: SessionContextValue = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      refresh,
    }),
    [state, signIn, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
