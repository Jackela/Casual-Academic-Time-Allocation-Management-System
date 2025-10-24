import { useMemo } from 'react';
import { useSession } from './SessionProvider';
import { useUserProfile } from './UserProfileProvider';
import { authManager } from '../services/auth-manager';
import { STORAGE_KEYS } from '../utils/storage-keys';

export type RoleValue = 'ADMIN' | 'LECTURER' | 'TUTOR' | string | null;

export function useRole(): { role: RoleValue; ready: boolean } {
  const session = useSession();
  const { profile, loading } = useUserProfile();

  return useMemo(() => {
    const hasToken = typeof window !== 'undefined' && !!window.localStorage.getItem(STORAGE_KEYS.TOKEN);
    const seededRole = authManager.getUser()?.role ?? null;
    const role = (profile?.role ?? seededRole ?? null) as RoleValue;
    const ready = !!role || (!loading && (session.isAuthenticated || hasToken));
    return { role, ready };
  }, [profile?.role, loading, session.isAuthenticated]);
}

export default useRole;

