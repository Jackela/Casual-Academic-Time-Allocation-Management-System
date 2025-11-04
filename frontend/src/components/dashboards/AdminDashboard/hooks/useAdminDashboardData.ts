import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Dispatch, SetStateAction } from 'react';
import {
  useAdminPendingApprovals,
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

interface ModificationModalState {
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
  handleModificationSubmit: () => Promise<void>;
  handleModificationCancel: () => void;
  modificationModal: ModificationModalState;
  modificationTargetTimesheet: Timesheet | null;
  modificationComment: string;
  setModificationComment: (value: string) => void;
  modificationValidationError: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionModal, setRejectionModal] = useState<RejectionModalState>({
    open: false,
    timesheetId: null,
  });
  const [rejectionComment, setRejectionComment] = useState('');
  const [rejectionValidationError, setRejectionValidationError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [modificationModal, setModificationModal] = useState<ModificationModalState>({
    open: false,
    timesheetId: null,
  });
  const [modificationComment, setModificationComment] = useState('');
  const [modificationValidationError, setModificationValidationError] = useState<string | null>(null);
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
    refetch: refreshTimesheets,
    optimisticRemove,
  } = useAdminPendingApprovals();

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    lastUpdatedAt,
    refetch: refetchDashboard,
  } = useTimesheetDashboardSummary({ scope: 'admin', refetchOnWindowFocus: true, refetchInterval: 30000 });
  useEffect(() => {
    (window as any).__admin_dashboard_last_updated_at = lastUpdatedAt ?? (window as any).__admin_dashboard_last_updated_at ?? null;
  }, [lastUpdatedAt]);

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

  const modificationTargetTimesheet = useMemo(() => {
    if (!modificationModal.open || !modificationModal.timesheetId) {
      return null;
    }

    return allTimesheets.find((timesheet) => timesheet.id === modificationModal.timesheetId) ?? null;
  }, [allTimesheets, modificationModal]);

  const handleTabChange = useCallback((tab: AdminTabId) => {
    setCurrentTab((previous) => (previous === tab ? previous : tab));
    try {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      setSearchParams(next, { replace: true });
    } catch {}
  }, [searchParams, setSearchParams]);

  // Initialize currentTab from `?tab=` query on mount and when it changes
  useEffect(() => {
    const tabParam = (searchParams.get('tab') || '').toLowerCase();
    if (tabParam === 'pending' && currentTab !== 'pending') {
      setCurrentTab('pending');
      return;
    }
    if (tabParam === 'overview' && currentTab !== 'overview') {
      setCurrentTab('overview');
    }
  }, [searchParams, currentTab]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Backwards-compatible filter setter for callers expecting a TimesheetQuery-style updater
  const setFilterQuery = useCallback((update: Partial<TimesheetQuery>) => {
    if (typeof update?.search === 'string') {
      setSearchQuery(update.search);
    }
    // Other fields (status, tutorId, courseId) are not currently represented
    // in Admin pending view filters; safely ignore without side effects.
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

  const handleModificationCancel = useCallback(() => {
    setModificationModal({ open: false, timesheetId: null });
    setModificationComment('');
    setModificationValidationError(null);
    resetApproval();
  }, [resetApproval]);

  const handleModificationSubmit = useCallback(async () => {
    if (!modificationModal.open || !modificationModal.timesheetId) {
      return;
    }

    if (actionLockRef.current || approvalLoading || actionLoadingId !== null) {
      return;
    }

    const trimmedComment = modificationComment.trim();
    if (trimmedComment.length < 3) {
      setModificationValidationError('Please provide guidance before requesting changes.');
      return;
    }

    setModificationValidationError(null);
    actionLockRef.current = true;
    setActionLoadingId(modificationModal.timesheetId);

    try {
      await approveTimesheet({
        timesheetId: modificationModal.timesheetId,
        action: 'REQUEST_MODIFICATION',
        comment: trimmedComment,
      });
      setSelectedTimesheets((previous) => previous.filter((id) => id !== modificationModal.timesheetId));
      await Promise.all([refreshTimesheets(), refetchDashboard()]);
      setModificationModal({ open: false, timesheetId: null });
      setModificationComment('');
    } catch (error) {
      secureLogger.error('Admin dashboard modification request failed', error);
    } finally {
      actionLockRef.current = false;
      setActionLoadingId(null);
    }
  }, [actionLoadingId, approvalLoading, approveTimesheet, modificationComment, modificationModal, refreshTimesheets, refetchDashboard, setSelectedTimesheets]);

  const handleApprovalAction = useCallback(async (timesheetId: number, action: ApprovalAction) => {
    if (actionLockRef.current || approvalLoading || actionLoadingId !== null) {
      return;
    }

    if (action === 'REJECT') {
      setRejectionModal({ open: true, timesheetId });
      setRejectionComment('');
      setRejectionValidationError(null);
      resetApproval();
      return;
    }

    if (action === 'REQUEST_MODIFICATION') {
      setModificationModal({ open: true, timesheetId });
      setModificationComment('');
      setModificationValidationError(null);
      resetApproval();
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
      // Optimistically remove the approved row from the pending list for immediate UX feedback
      try { optimisticRemove(timesheetId); } catch {}
      await Promise.all([refreshTimesheets(), refetchDashboard()]);
      setSelectedTimesheets((previous) => previous.filter((id) => id !== timesheetId));
    } catch (error) {
      secureLogger.error('Admin dashboard approval action failed', error);
    } finally {
      actionLockRef.current = false;
      setActionLoadingId(null);
    }
  }, [actionLoadingId, approvalLoading, approveTimesheet, refreshTimesheets, refetchDashboard, resetApproval, setModificationComment, setModificationValidationError, setRejectionComment, setRejectionValidationError, setSelectedTimesheets]);

  const tabs = useMemo<AdminTabSpec[]>(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'pending', label: 'Pending Approvals' },
  ], []);

  const metrics: AdminSummaryMetrics = useMemo(() => {
    const summary = dashboardData ?? {};
    const pendingApprovals =
      typeof summary.pendingApprovals === 'number'
        ? summary.pendingApprovals
        : typeof summary.pendingApproval === 'number'
          ? summary.pendingApproval
          : 0;
    const totalPay =
      typeof summary.totalPay === 'number'
        ? summary.totalPay
        : typeof summary.totalPayroll === 'number'
          ? summary.totalPayroll
          : 0;
    const tutorCount = typeof summary.tutorCount === 'number' ? summary.tutorCount : null;

    return {
      totalTimesheets: summary.totalTimesheets ?? 0,
      pendingApprovals,
      totalHours: summary.totalHours ?? 0,
      totalPay,
      tutorCount,
      // propagate optional fields if present (used by Admin metrics tests)
      statusBreakdown: (summary as any)?.statusBreakdown ?? null,
      systemMetrics: (summary as any)?.systemMetrics ?? null,
    };
  }, [dashboardData]);

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
    handleModificationSubmit,
    handleModificationCancel,
    modificationModal,
    modificationTargetTimesheet,
    modificationComment,
    setModificationComment,
    modificationValidationError,
    refreshTimesheets,
    refetchDashboard,
    resetApproval,
    adminStats,
    setFilterQuery,
  };
}
