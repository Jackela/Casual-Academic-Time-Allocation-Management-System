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
