import { useMemo } from 'react';
import { useUserProfile } from './UserProfileProvider';
import type { AccessControlState } from '../types/auth';

export const useAccessControl = (): AccessControlState => {
  const { profile } = useUserProfile();
  const role = profile?.role ?? null;

  return useMemo(() => {
    const normalizedRole = role?.toUpperCase() ?? null;
    const isTutor = normalizedRole === 'TUTOR';
    const isLecturer = normalizedRole === 'LECTURER';
    const isAdmin = normalizedRole === 'ADMIN';

    const hasRole = (target: string) => normalizedRole === target.toUpperCase();

    return {
      role: normalizedRole,
      isTutor,
      isLecturer,
      isAdmin,
      canApproveTimesheets: isLecturer || isAdmin,
      canViewAdminDashboard: isAdmin,
      hasRole,
    } satisfies AccessControlState;
  }, [role]);
};
