import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  useTimesheetQuery,
  useTimesheetDashboardSummary,
  useApprovalAction,
  useTimesheetStats,
} from '../../../../hooks/timesheets';
import { useSession } from '../../../../auth/SessionProvider';
import { useUserProfile } from '../../../../auth/UserProfileProvider';
import { useAccessControl } from '../../../../auth/access-control';
import { secureLogger } from '../../../../utils/secure-logger';
import type {
  ApprovalAction,
  Timesheet,
  TimesheetQuery,
} from '../../../../types/api';
import type {
  ActionState,
  AdminSummaryMetrics,
  AdminTabId,
  AdminTabSpec,
} from '../../../../types/dashboard/admin-dashboard';
import type { TimesheetStatistics } from '../../../../hooks/timesheets';
import type { SessionStatus } from '../../../../types/auth';

interface RejectionModalState {
  open: boolean;
  timesheetId: number | null;
}

export interface UseAdminDashboardDataResult {
  sessionStatus: SessionStatus;
  welcomeMessage: string;
  pageLoading: boolean;
  pageErrors: Array<{
    source: 'timesheets' | 'dashboard';
    message: string;
  }>;
  searchQuery: string;
  handleSearch: (query: string) => void;
  tabs: AdminTabSpec[];
  currentTab: AdminTabId;
  handleTabChange: (tab: AdminTabId) => void;
  canManageUsers: boolean;
  metrics: AdminSummaryMetrics;
  urgentCount: number;
  allTimesheets: Timesheet[];
  filteredTimesheets: Timesheet[];
  isEmpty: boolean;
  selectedTimesheets: number[];
  setSelectedTimesheets: Dispatch<SetStateAction<number[]>>;
  actionState: ActionState;
  loading: {
    timesheets: boolean;
    dashboard: boolean;
    approval: boolean;
  };
  errors: {
    timesheets: string | null;
    dashboard: string | null;
    approval: string | null;
    hasErrors: boolean;
  };
  handleApprovalAction: (timesheetId: number, action: ApprovalAction) => Promise<void>;
  handleRejectionSubmit: () => Promise<void>;
  handleRejectionCancel: () => void;
  rejectionModal: RejectionModalState;
  rejectionTargetTimesheet: Timesheet | null;
  rejectionComment: string;
  setRejectionComment: (value: string) => void;
  rejectionValidationError: string | null;
  refreshTimesheets: () => Promise<void>;
  refetchDashboard: () => Promise<void>;
  resetApproval: () => void;
  adminStats: TimesheetStatistics;
  setFilterQuery: (update: Partial<TimesheetQuery>) => void;
}

function arraysEqual(lhs: number[], rhs: number[]): boolean {
  if (lhs === rhs) {
    return true;
  }
  if (lhs.length !== rhs.length) {
    return false;
  }
  for (let index = 0; index < lhs.length; index += 1) {
    if (lhs[index] !== rhs[index]) {
      return false;
    }
  }
  return true;
}

export function useAdminDashboardData(): UseAdminDashboardDataResult {
  const { status: sessionStatus, isAuthenticated } = useSession();
  const { profile } = useUserProfile();
  const { role, canViewAdminDashboard } = useAccessControl();

  const welcomeMessage = useMemo(() => {
    if (profile?.firstName) {
      return `Welcome back, ${profile.firstName}`;
    }

    if (profile?.name) {
      return `Welcome back, ${profile.name}`;
    }

    if (role) {
      const formattedRole = role.charAt(0) + role.slice(1).toLowerCase();
      return `Welcome back, ${formattedRole}`;
    }

    return 'Welcome back, Administrator';
  }, [profile?.firstName, profile?.name, role]);

  const [selectedTimesheets, setSelectedTimesheetsState] = useState<number[]>([]);
  const [currentTab, setCurrentTab] = useState<AdminTabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionModal, setRejectionModal] = useState<RejectionModalState>({
    open: false,
    timesheetId: null,
  });
  const [rejectionComment, setRejectionComment] = useState('');
  const [rejectionValidationError, setRejectionValidationError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const actionLockRef = useRef(false);

  const setSelectedTimesheets = useCallback<Dispatch<SetStateAction<number[]>>>((nextValue) => {
    setSelectedTimesheetsState((previous) => {
      const next = typeof nextValue === 'function'
        ? (nextValue as (prev: number[]) => number[])(previous)
        : nextValue;

      return arraysEqual(previous, next) ? previous : next;
    });
  }, []);

  const {
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    updateQuery,
    refresh: refreshTimesheets,
  } = useTimesheetQuery({ size: 50 });

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useTimesheetDashboardSummary({ scope: 'admin' });

  const {
    loading: approvalLoading,
    error: approvalError,
    approveTimesheet,
    reset: resetApproval,
  } = useApprovalAction();

  const adminStats = useTimesheetStats(allTimesheets);
  const isEmpty = !timesheetsLoading && allTimesheets.length === 0;

  const filteredTimesheets = useMemo(() => {
    let filtered = allTimesheets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((timesheet) =>
        timesheet.tutorName?.toLowerCase().includes(query) ||
        timesheet.courseName?.toLowerCase().includes(query),
      );
    }

    if (currentTab === 'pending') {
      filtered = filtered.filter((timesheet) => timesheet.status === 'LECTURER_CONFIRMED');
    }

    return filtered;
  }, [allTimesheets, currentTab, searchQuery]);

  const isTimesheetUrgent = useCallback((timesheet: Timesheet) => {
    const priority = (timesheet as Timesheet & { priority?: string }).priority;
    if (priority) {
      const normalizedPriority = priority.toUpperCase();
      if (normalizedPriority === 'HIGH' || normalizedPriority === 'CRITICAL' || normalizedPriority === 'P1') {
        return true;
      }
    }

    const createdAt = new Date(timesheet.createdAt);
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > 3;
  }, []);

  const urgentPendingItems = useMemo(() => {
    const pendingItems = (dashboardData as { pendingItems?: Array<{ priority?: string | null }> } | null)?.pendingItems ?? [];
    return pendingItems.filter((item) => {
      const priority = item?.priority;
      if (!priority) {
        return false;
      }
      const normalizedPriority = priority.toUpperCase();
      return normalizedPriority === 'HIGH' || normalizedPriority === 'CRITICAL' || normalizedPriority === 'P1';
    });
  }, [dashboardData]);

  const urgentTimesheets = useMemo(
    () => allTimesheets.filter(isTimesheetUrgent),
    [allTimesheets, isTimesheetUrgent],
  );

  const urgentCount = useMemo(() => {
    if (urgentPendingItems.length > 0) {
      return urgentPendingItems.length;
    }
    return urgentTimesheets.length;
  }, [urgentPendingItems, urgentTimesheets]);

  const rejectionTargetTimesheet = useMemo(() => {
    if (!rejectionModal.open || !rejectionModal.timesheetId) {
      return null;
    }

    return allTimesheets.find((timesheet) => timesheet.id === rejectionModal.timesheetId) ?? null;
  }, [allTimesheets, rejectionModal]);

  const handleTabChange = useCallback((tab: AdminTabId) => {
    setCurrentTab((previous) => (previous === tab ? previous : tab));
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleRejectionCancel = useCallback(() => {
    setRejectionModal({ open: false, timesheetId: null });
    setRejectionComment('');
    setRejectionValidationError(null);
    resetApproval();
  }, [resetApproval]);

  const handleRejectionSubmit = useCallback(async () => {
    if (!rejectionModal.open || !rejectionModal.timesheetId) {
      return;
    }

    if (actionLockRef.current || approvalLoading || actionLoadingId !== null) {
      return;
    }

    const trimmedComment = rejectionComment.trim();
    if (trimmedComment.length < 3) {
      setRejectionValidationError('Please provide a short justification before rejecting the timesheet.');
      return;
    }

    setRejectionValidationError(null);
    actionLockRef.current = true;
    setActionLoadingId(rejectionModal.timesheetId);

    try {
      await approveTimesheet({
        timesheetId: rejectionModal.timesheetId,
        action: 'REJECT',
        comment: trimmedComment,
      });
      setSelectedTimesheets((previous) => previous.filter((id) => id !== rejectionModal.timesheetId));
      await Promise.all([refreshTimesheets(), refetchDashboard()]);
      setRejectionModal({ open: false, timesheetId: null });
      setRejectionComment('');
    } catch (error) {
      secureLogger.error('Admin dashboard rejection action failed', error);
    } finally {
      actionLockRef.current = false;
      setActionLoadingId(null);
    }
  }, [actionLoadingId, approvalLoading, approveTimesheet, refreshTimesheets, refetchDashboard, rejectionComment, rejectionModal, setSelectedTimesheets]);

  const handleApprovalAction = useCallback(async (timesheetId: number, action: ApprovalAction) => {
    if (actionLockRef.current || approvalLoading || actionLoadingId !== null) {
      return;
    }

    if (action === 'REJECT') {
      setRejectionModal({ open: true, timesheetId });
      return;
    }

    actionLockRef.current = true;
    setActionLoadingId(timesheetId);

    try {
      await approveTimesheet({
        timesheetId,
        action,
        comment: action === 'HR_CONFIRM' ? 'Approved timesheet' : undefined,
      });
      await Promise.all([refreshTimesheets(), refetchDashboard()]);
      setSelectedTimesheets((previous) => previous.filter((id) => id !== timesheetId));
    } catch (error) {
      secureLogger.error('Admin dashboard approval action failed', error);
    } finally {
      actionLockRef.current = false;
      setActionLoadingId(null);
    }
  }, [actionLoadingId, approvalLoading, approveTimesheet, refreshTimesheets, refetchDashboard, setSelectedTimesheets]);

  const tabs = useMemo<AdminTabSpec[]>(() => {
    const baseTabs: AdminTabSpec[] = [
      { id: 'overview', label: 'System Overview' },
      { id: 'pending', label: 'Pending Review' },
    ];

    if (canViewAdminDashboard) {
      baseTabs.push(
        { id: 'users', label: 'User Management' },
        { id: 'analytics', label: 'Reports & Analytics' },
        { id: 'settings', label: 'System Settings' },
      );
    }

    return baseTabs;
  }, [canViewAdminDashboard]);

  const metrics: AdminSummaryMetrics = useMemo(() => ({
    totalTimesheets: dashboardData?.totalTimesheets ?? 0,
    pendingApprovals: dashboardData?.pendingApprovals ?? 0,
    totalHours: dashboardData?.totalHours ?? 0,
    totalPayroll: dashboardData?.totalPayroll ?? 0,
    tutorCount: dashboardData?.tutorCount ?? 0,
  }), [dashboardData]);

  const errors = useMemo(() => {
    const timesheetErrorMessage = timesheetsError;
    const dashboardErrorMessage = dashboardError;
    const approvalErrorMessage = approvalError;

    return {
      timesheets: timesheetErrorMessage,
      dashboard: dashboardErrorMessage,
      approval: approvalErrorMessage,
      hasErrors: Boolean(timesheetErrorMessage || dashboardErrorMessage || approvalErrorMessage),
    };
  }, [approvalError, dashboardError, timesheetsError]);

  const pageLoading = timesheetsLoading || dashboardLoading;

  const pageErrors = useMemo(() => {
    const entries: Array<{ source: 'timesheets' | 'dashboard'; message: string }> = [];
    if (errors.timesheets) {
      entries.push({ source: 'timesheets', message: errors.timesheets });
    }
    if (errors.dashboard) {
      entries.push({ source: 'dashboard', message: errors.dashboard });
    }
    return entries;
  }, [errors.dashboard, errors.timesheets]);

  const actionState: ActionState = useMemo(() => ({
    loadingId: actionLoadingId,
    isSubmitting: approvalLoading,
  }), [actionLoadingId, approvalLoading]);

  // Expose an E2E-only event hook to open the rejection modal programmatically
  useEffect(() => {
    if (import.meta.env.MODE !== 'e2e') {
      return;
    }
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ timesheetId?: number }>).detail;
      if (detail && typeof detail.timesheetId === 'number') {
        setRejectionModal({ open: true, timesheetId: detail.timesheetId });
      }
    };
    window.addEventListener('catams-open-admin-rejection-modal', handler);
    return () => window.removeEventListener('catams-open-admin-rejection-modal', handler);
  }, [setRejectionModal]);

  return {
    sessionStatus,
    welcomeMessage,
    pageLoading,
    pageErrors,
    searchQuery,
    handleSearch,
    tabs,
    currentTab,
    handleTabChange,
    canManageUsers: isAuthenticated && canViewAdminDashboard,
    metrics,
    urgentCount,
    allTimesheets,
    filteredTimesheets,
    isEmpty,
    selectedTimesheets,
    setSelectedTimesheets,
    actionState,
    loading: {
      timesheets: timesheetsLoading,
      dashboard: dashboardLoading,
      approval: approvalLoading,
    },
    errors,
    handleApprovalAction,
    handleRejectionSubmit,
    handleRejectionCancel,
    rejectionModal,
    rejectionTargetTimesheet,
    rejectionComment,
    setRejectionComment,
    rejectionValidationError,
    refreshTimesheets,
    refetchDashboard,
    resetApproval,
    adminStats,
    setFilterQuery: updateQuery,
  };
}
