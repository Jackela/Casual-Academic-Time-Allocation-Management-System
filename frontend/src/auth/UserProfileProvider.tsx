import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authManager } from '../services/auth-manager';
import { secureLogger } from '../utils/secure-logger';
import { secureApiClient } from '../services/api-secure';
import { API_ENDPOINTS } from '../types/api';
import { useSession } from './SessionProvider';
import type { User, UserProfileContextValue, UserProfileState } from '../types/auth';

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

const createInitialState = (): UserProfileState => ({
  profile: authManager.getUser(),
  loading: false,
  error: null,
});

interface UserProfileProviderProps {
  children: ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const session = useSession();
  const [state, setState] = useState<UserProfileState>(createInitialState);

  const syncFromAuthManager = useCallback((user: User | null) => {
    setState((previous) => ({
      ...previous,
      profile: user,
      loading: false,
      error: null,
    }));
  }, []);

  useEffect(() => {
    const unsubscribe = authManager.subscribe((nextState) => {
      syncFromAuthManager(nextState.user);
    });
    return unsubscribe;
  }, [syncFromAuthManager]);

  useEffect(() => {
    if (!session.isAuthenticated) {
      setState({ profile: null, loading: false, error: null });
    }
  }, [session.isAuthenticated]);

  // Async reconciliation: when authenticated and user profile is missing/partial, fetch canonical profile
  useEffect(() => {
    let cancelled = false;
    const shouldReconcile = session.isAuthenticated && (!state.profile || !state.profile.role);
    if (!shouldReconcile) return;

    (async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const res = await secureApiClient.get<User>(API_ENDPOINTS.USERS.PROFILE);
        if (cancelled) return;
        const profile = res.data;
        // Persist into authManager to keep a single source of truth
        const auth = authManager.getAuthState();
        if (auth.token) {
          try {
            authManager.setAuth(auth.token, profile);
          } catch (err) {
            // fallback: just update provider state
            setState({ profile, loading: false, error: null });
            return;
          }
        } else {
          setState({ profile, loading: false, error: null });
        }
        setState({ profile, loading: false, error: null });
      } catch (error) {
        if (cancelled) return;
        secureLogger.warn?.('User profile reconciliation failed', error as Error);
        setState((prev) => ({ ...prev, loading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session.isAuthenticated, state.profile]);

  const reload = useCallback(async () => {
    try {
      setState((previous) => ({ ...previous, loading: true, error: null }));
      const authState = authManager.getAuthState();
      syncFromAuthManager(authState.user);
    } catch (error) {
      secureLogger.error('Failed to reload user profile', error);
      setState((previous) => ({ ...previous, loading: false, error: error as Error }));
    }
  }, [syncFromAuthManager]);

  const setProfile = useCallback<UserProfileContextValue['setProfile']>((profile) => {
    setState({ profile, loading: false, error: null });
  }, []);

  const value: UserProfileContextValue = useMemo(
    () => ({
      ...state,
      reload,
      setProfile,
    }),
    [state, reload, setProfile],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUserProfile = (): UserProfileContextValue => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
