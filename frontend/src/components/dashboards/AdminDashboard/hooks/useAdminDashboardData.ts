import { useCallback, useMemo, useRef, useState } from 'react';
import {
  useTimesheetQuery,
  useTimesheetDashboardSummary,
  useApprovalAction,
  useTimesheetStats,
} from '../../../../hooks/timesheets';
import { useSession } from '../../../../auth/SessionProvider';
import { useUserProfile } from '../../../../auth/UserProfileProvider';
import { useAccessControl } from '../../../../auth/access-control';
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
  setSelectedTimesheets: (ids: number[]) => void;
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
  const [filterQuery, setFilterQuery] = useState<TimesheetQuery>({});
  const [rejectionModal, setRejectionModal] = useState<RejectionModalState>({
    open: false,
    timesheetId: null,
  });
  const [rejectionComment, setRejectionComment] = useState('');
  const [rejectionValidationError, setRejectionValidationError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const lastSelectedRef = useRef<number[]>(selectedTimesheets);

  const setSelectedTimesheets = useCallback((ids: number[]) => {    setSelectedTimesheetsState((previous) => {
      if (arraysEqual(previous, ids)) {
        return previous;
      }
      lastSelectedRef.current = ids;
      return ids;
    });
  }, []);

  const handleTabChange = useCallback((tab: AdminTabId) => {
    setCurrentTab((previous) => (previous === tab ? previous : tab));
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const {
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    isEmpty,
    updateQuery,
    refresh: refreshTimesheets,
  } = useTimesheetQuery({
    ...filterQuery,
    size: 50,
  });

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

  const refreshTimesheetsMemo = useCallback(async () => {
    await refreshTimesheets();
  }, [refreshTimesheets]);

  const setFilterQueryMemo = useCallback((update: Partial<TimesheetQuery>) => {
    setFilterQuery((previous) => ({
      ...previous,
      ...update,
    }));
  }, []);

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useTimesheetDashboardSummary({ scope: 'admin' });

  const refetchDashboardMemo = useCallback(async () => {
    await refetchDashboard();
  }, [refetchDashboard]);

  const {
    loading: approvalLoading,
    error: approvalError,
    approveTimesheet,
    reset: resetApproval,
  } = useApprovalAction();

  const adminStats = useTimesheetStats(allTimesheets);

  const rejectionTargetTimesheet = useMemo(() => {
    if (!rejectionModal.open || !rejectionModal.timesheetId) {
      return null;
    }

    return allTimesheets.find((timesheet) => timesheet.id === rejectionModal.timesheetId) ?? null;
  }, [allTimesheets, rejectionModal]);

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

    const trimmedComment = rejectionComment.trim();
    if (trimmedComment.length < 3) {
      setRejectionValidationError('Please provide a short justification before rejecting the timesheet.');
      return;
    }

    setRejectionValidationError(null);
    setActionLoadingId(rejectionModal.timesheetId);

    try {
      await approveTimesheet({
        timesheetId: rejectionModal.timesheetId,
        action: 'REJECT',
        comment: trimmedComment,
      });
      setSelectedTimesheets((previous) => previous.filter((id) => id !== rejectionModal.timesheetId));
      await refreshTimesheetsMemo();
      await refetchDashboardMemo();
      setRejectionModal({ open: false, timesheetId: null });
      setRejectionComment('');
    } catch (error) {
      // surfaced via approvalError state
    } finally {
      setActionLoadingId(null);
    }
  }, [approveTimesheet, refreshTimesheetsMemo, refetchDashboardMemo, rejectionComment, rejectionModal, setSelectedTimesheets]);

  const handleApprovalAction = useCallback(async (timesheetId: number, action: ApprovalAction) => {
    if (action === 'REJECT') {
      setRejectionModal({ open: true, timesheetId });
      return;
    }

    if (action === 'RESET') {
      setSelectedTimesheets([]);
      return;
    }

    setActionLoadingId(timesheetId);

    try {
      await approveTimesheet({
        timesheetId,
        action,
        comment: action === 'APPROVE' ? 'Approved timesheet' : undefined,
      });
      await refreshTimesheetsMemo();
      await refetchDashboardMemo();
      setSelectedTimesheets((previous) => previous.filter((id) => id !== timesheetId));
    } catch (error) {
      // errors handled via approvalError state
    } finally {
      setActionLoadingId(null);
    }
  }, [approveTimesheet, refreshTimesheetsMemo, refetchDashboardMemo, setSelectedTimesheets]);

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

  const actionState: ActionState = useMemo(() => ({
    loadingId: actionLoadingId,
    isSubmitting: approvalLoading,
  }), [actionLoadingId, approvalLoading]);

  const handleSearchMemo = handleSearch;

  return {
    sessionStatus,
    welcomeMessage,
    searchQuery,
    handleSearch: handleSearchMemo,
    tabs,
    currentTab,
    handleTabChange,
    canManageUsers: isAuthenticated && canViewAdminDashboard,
    metrics,
    urgentCount: metrics.pendingApprovals,
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
    refreshTimesheets: refreshTimesheetsMemo,
    refetchDashboard: refetchDashboardMemo,
    resetApproval,
    adminStats,
    setFilterQuery: updateQuery,
  };
}


