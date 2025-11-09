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
import { STORAGE_KEYS } from '../utils/storage-keys';
import { authStorage } from './storage';
import { authManager } from '../services/auth-manager';
import { secureLogger } from '../utils/secure-logger';
import type { AuthSession } from '../types/api';
import type { LoginCredentials, SessionContextValue, SessionState } from '../types/auth';

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const buildSessionState = (): SessionState => {
  const authState = authManager.getAuthState();
  const storedSession = authStorage.getSession();
  const token = authState.token ?? storedSession.token ?? null;

  const status: SessionState['status'] =
    authState.isAuthenticated
      ? 'authenticated'
      : token
        ? 'authenticating'
        : 'unauthenticated';

  return {
    status,
    isAuthenticated: authState.isAuthenticated,
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
  const [state, setState] = useState<SessionState>(() => buildSessionState());

  const syncFromAuthManager = useCallback(() => {
    const next = buildSessionState();

    if (next.isAuthenticated && next.token) {
      authStorage.setSession({
        token: next.token,
        refreshToken: next.refreshToken ?? null,
        expiresAt: next.expiresAt ?? null,
      });
    } else if (!next.isAuthenticated) {
      authStorage.clearSession();
    }

    setState(next);
  }, []);

  const applyInjectedSession = useCallback((session: AuthSession) => {
    authStorage.setSession({
      token: session.token,
      refreshToken: session.refreshToken ?? null,
      expiresAt: session.expiresAt ?? null,
    });

    authManager.setAuth(session);
    syncFromAuthManager();
  }, [syncFromAuthManager]);

  useEffect(() => {
    const unsubscribe = authManager.subscribe(() => {
      syncFromAuthManager();
    });

    syncFromAuthManager();
    return unsubscribe;
  }, [syncFromAuthManager]);

  useEffect(() => {
    const global = window as typeof window & {
      __E2E_SESSION_STATE__?: () => SessionState;
      __E2E_APPLY_SESSION__?: (session: AuthSession) => void;
      __E2E_PENDING_SESSION__?: AuthSession | null;
      __E2E_GET_AUTH__?: () => { isAuthenticated: boolean; user: any };
      __E2E_SET_AUTH__?: (session: AuthSession) => void;
      __E2E_AUTH_MANAGER_STATE__?: () => { isAuthenticated: boolean; token: string | null; user: any };
    };

    global.__E2E_SESSION_STATE__ = () => state;
    global.__E2E_APPLY_SESSION__ = (session: AuthSession) => { applyInjectedSession(session); };
    global.__E2E_SET_AUTH__ = (session: AuthSession) => { applyInjectedSession(session); };

    // Expose a minimal auth snapshot for E2E diagnostics and optional checks
    global.__E2E_GET_AUTH__ = () => {
      const authState = authManager.getAuthState();
      return { isAuthenticated: authState.isAuthenticated, user: authState.user, token: authState.token };
    };

    if (global.__E2E_PENDING_SESSION__) {
      applyInjectedSession(global.__E2E_PENDING_SESSION__);
      global.__E2E_PENDING_SESSION__ = null;
    }

    global.__E2E_AUTH_MANAGER_STATE__ = () => {
      const state = authManager.getAuthState();
      return { isAuthenticated: state.isAuthenticated, token: state.token, user: state.user } as const;
    };

    return () => {
      delete global.__E2E_SESSION_STATE__;
      delete global.__E2E_APPLY_SESSION__;
      delete global.__E2E_GET_AUTH__;
      delete global.__E2E_SET_AUTH__;
      delete global.__E2E_AUTH_MANAGER_STATE__;
    };
  }, [state, applyInjectedSession, syncFromAuthManager]);

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
  []);

  const signOut = useCallback<SessionContextValue['signOut']>(async () => {
    const logoutTask = authApi.logout().catch((error) => {
      secureLogger.warn('Session sign-out encountered an error', error);
    });

    // Clear all persisted auth and set an E2E guard to avoid re-seeding on new documents
    authStorage.clearSession();
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEYS.USER);
        // Signal to any test init scripts to skip re-injecting auth on navigation
        window.localStorage.setItem('__E2E_DISABLE_AUTH_SEED__', '1');
      }
    } catch {}
    authManager.clearAuth();
    setState({
      status: 'unauthenticated',
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      expiresAt: null,
      error: null,
    });

    await Promise.race([
      logoutTask,
      new Promise((resolve) => setTimeout(resolve, 300)),
    ]);
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

// eslint-disable-next-line react-refresh/only-export-components
export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

