import { useCallback, useMemo, useRef, useState } from 'react';
import {
  usePendingTimesheets,
  useApprovalAction,
  useTimesheetDashboardSummary,
} from '../../../../hooks/timesheets';
import { useUserProfile } from '../../../../auth/UserProfileProvider';
import { useSession } from '../../../../auth/SessionProvider';
import { useAccessControl } from '../../../../auth/access-control';
import { secureLogger } from '../../../../utils/secure-logger';
import type { ApprovalAction, Timesheet } from '../../../../types/api';
import type { SessionStatus } from '../../../../types/auth';
import type {
  LecturerCourseOption,
  LecturerDashboardErrors,
  LecturerDashboardFilters,
  LecturerDashboardLoading,
  LecturerDashboardMetrics,
  LecturerRejectionModalState,
} from '../../../../types/dashboard/lecturer-dashboard';

export interface UseLecturerDashboardDataResult {
  sessionStatus: SessionStatus;
  welcomeMessage: string;
  canPerformApprovals: boolean;
  metrics: LecturerDashboardMetrics;
  urgentCount: number;
  pendingTimesheets: Timesheet[];
  filteredTimesheets: Timesheet[];
  noPendingTimesheets: boolean;
  selectedTimesheets: number[];
  setSelectedTimesheets: (ids: number[]) => void;
  filters: LecturerDashboardFilters;
  updateFilters: (updates: Partial<LecturerDashboardFilters>) => void;
  clearFilters: () => void;
  courseOptions: LecturerCourseOption[];
  loading: LecturerDashboardLoading;
  errors: LecturerDashboardErrors;
  actionLoadingId: number | null;
  handleApprovalAction: (timesheetId: number, action: ApprovalAction) => Promise<void>;
  handleBatchApproval: () => Promise<void>;
  handleRejectionSubmit: (reason: string) => Promise<void>;
  handleRejectionCancel: () => void;
  rejectionModal: LecturerRejectionModalState;
  refreshPending: () => Promise<void>;
  refetchDashboard: () => Promise<void>;
  resetApproval: () => void;
}

const INITIAL_FILTERS: LecturerDashboardFilters = {
  searchQuery: '',
  showOnlyUrgent: false,
  courseId: 'ALL',
};

const INITIAL_REJECTION_MODAL: LecturerRejectionModalState = {
  open: false,
  timesheetId: null,
};

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

export function useLecturerDashboardData(): UseLecturerDashboardDataResult {
  const { profile } = useUserProfile();
  const { status: sessionStatus } = useSession();
  const { role, canApproveTimesheets } = useAccessControl();
  const canPerformApprovals = canApproveTimesheets;

  const [selectedTimesheetsState, setSelectedTimesheetsState] = useState<number[]>([]);
  const [filters, setFilters] = useState<LecturerDashboardFilters>(INITIAL_FILTERS);
  const [rejectionModal, setRejectionModal] = useState<LecturerRejectionModalState>(
    INITIAL_REJECTION_MODAL,
  );

  const lastSelectedRef = useRef<number[]>(selectedTimesheetsState);

  const setSelectedTimesheets = useCallback((ids: number[]) => {    setSelectedTimesheetsState((previous) => {
      if (arraysEqual(previous, ids)) {
        return previous;
      }
      lastSelectedRef.current = ids;
      return ids;
    });
  }, []);

  const updateFilters = useCallback((updates: Partial<LecturerDashboardFilters>) => {    setFilters((previous) => {
      const next = { ...previous, ...updates };
      if (
        previous.searchQuery === next.searchQuery &&
        previous.showOnlyUrgent === next.showOnlyUrgent &&
        previous.courseId === next.courseId
      ) {
        return previous;
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {    setFilters(INITIAL_FILTERS);
  }, []);

  const {
    loading: pendingLoading,
    error: pendingError,
    timesheets: pendingTimesheets,
    isEmpty: noPendingTimesheets,
    refetch: refetchPending,
  } = usePendingTimesheets();

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useTimesheetDashboardSummary({ scope: 'lecturer' });

  const {
    loading: approvalLoading,
    error: approvalError,
    approveTimesheet,
    batchApprove,
    reset: resetApproval,
  } = useApprovalAction();

  const welcomeMessage = useMemo(() => {
    if (profile) {
      const firstName = profile.firstName || profile.name || 'Lecturer';
      return `Welcome back, ${firstName}`;
    }

    if (role) {
      const formattedRole = role.charAt(0) + role.slice(1).toLowerCase();
      return `Welcome back, ${formattedRole}`;
    }

    return 'Welcome back, Lecturer';
  }, [profile?.firstName, profile?.name, role]);

  const isTimesheetUrgent = useCallback((timesheet: Timesheet) => {
    const submittedDate = new Date(timesheet.createdAt);
    const daysSinceSubmission =
      (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSubmission > 3;
  }, []);

  const urgentCount = useMemo(
    () => pendingTimesheets.filter(isTimesheetUrgent).length,
    [pendingTimesheets, isTimesheetUrgent],
  );

  const metrics = useMemo<LecturerDashboardMetrics>(
    () => ({
      pendingApproval: dashboardData?.pendingApproval ?? 0,
      totalTimesheets: dashboardData?.totalTimesheets ?? 0,
      thisWeekHours: dashboardData?.thisWeekHours ?? 0,
      thisWeekPay: dashboardData?.thisWeekPay ?? 0,
      statusBreakdown: dashboardData?.statusBreakdown ?? {},
    }),
    [dashboardData],
  );

  const courseOptions = useMemo<LecturerCourseOption[]>(() => {
    const seen = new Map<string, string>();
    pendingTimesheets.forEach((timesheet) => {
      const courseValue = timesheet.courseCode ?? String(timesheet.courseId ?? '');
      if (!courseValue) {
        return;
      }
      const courseLabel = timesheet.courseName ?? courseValue;
      if (!seen.has(courseValue)) {
        seen.set(courseValue, courseLabel);
      }
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [pendingTimesheets]);

  const filteredTimesheets = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    return pendingTimesheets.filter((timesheet) => {
      if (filters.showOnlyUrgent && !isTimesheetUrgent(timesheet)) {
        return false;
      }

      if (filters.courseId !== 'ALL') {
        const courseValue = timesheet.courseCode ?? String(timesheet.courseId ?? '');
        if (courseValue !== filters.courseId) {
          return false;
        }
      }

      if (query) {
        const haystack = `${timesheet.tutorName ?? ''} ${timesheet.courseName ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [filters, pendingTimesheets, isTimesheetUrgent]);

  const loading = useMemo<LecturerDashboardLoading>(
    () => ({
      pending: pendingLoading,
      dashboard: dashboardLoading,
      approval: approvalLoading,
    }),
    [pendingLoading, dashboardLoading, approvalLoading],
  );

  const errors = useMemo<LecturerDashboardErrors>(
    () => ({
      pending: pendingError ?? null,
      dashboard: dashboardError ?? null,
      approval: approvalError ?? null,
      hasErrors: Boolean(pendingError || dashboardError || approvalError),
    }),
    [pendingError, dashboardError, approvalError],
  );

  const actionLoadingId = useMemo(() => {
    if (!loading.approval) {
      return null;
    }

    if (rejectionModal.open && rejectionModal.timesheetId) {
      return rejectionModal.timesheetId;
    }

    if (selectedTimesheetsState.length > 0) {
      return selectedTimesheetsState[0];
    }

    return pendingTimesheets[0]?.id ?? null;
  }, [loading.approval, rejectionModal, selectedTimesheetsState, pendingTimesheets]);

  const refreshPendingMemo = useCallback(async () => {
    await refetchPending();
  }, [refetchPending]);

  const refetchDashboardMemo = useCallback(async () => {
    await refetchDashboard();
  }, [refetchDashboard]);

  const handleApprovalAction = useCallback(
    async (timesheetId: number, action: ApprovalAction) => {
      if (!canPerformApprovals) {
        return;
      }

      try {
        if (action === 'REJECT') {
          setRejectionModal({ open: true, timesheetId });
          return;
        }

        if (action !== 'LECTURER_CONFIRM') {
          return;
        }

        await approveTimesheet({
          timesheetId,
          action: 'LECTURER_CONFIRM',
          comment: 'Approved for processing',
        });

        await Promise.all([refreshPendingMemo(), refetchDashboardMemo()]);
        setSelectedTimesheets((previous) => previous.filter((id) => id !== timesheetId));
      } catch (error) {
        secureLogger.error('Failed to process approval', error);
      }
    },
    [approveTimesheet, canPerformApprovals, refreshPendingMemo, refetchDashboardMemo, setSelectedTimesheets],
  );

  const handleBatchApproval = useCallback(async () => {
    if (!canPerformApprovals || selectedTimesheetsState.length === 0) {
      return;
    }

    try {
      const requests = selectedTimesheetsState.map((timesheetId) => ({
        timesheetId,
        action: 'LECTURER_CONFIRM' as const,
      }));

      await batchApprove(requests);
      await Promise.all([refreshPendingMemo(), refetchDashboardMemo()]);
      setSelectedTimesheets([]);
    } catch (error) {
      secureLogger.error('Failed to batch approve', error);
    }
  }, [batchApprove, canPerformApprovals, refreshPendingMemo, refetchDashboardMemo, selectedTimesheetsState, setSelectedTimesheets]);

  const handleRejectionSubmit = useCallback(
    async (reason: string) => {
      if (!canPerformApprovals || !rejectionModal.timesheetId) {
        return;
      }

      try {
        await approveTimesheet({
          timesheetId: rejectionModal.timesheetId,
          action: 'REJECT',
          comment: reason,
        });

        setRejectionModal(INITIAL_REJECTION_MODAL);
        await Promise.all([refreshPendingMemo(), refetchDashboardMemo()]);
        setSelectedTimesheets((previous) =>
          previous.filter((id) => id !== rejectionModal.timesheetId),
        );
      } catch (error) {
        secureLogger.error('Failed to reject timesheet', error);
      }
    },
    [
      approveTimesheet,
      canPerformApprovals,
      refreshPendingMemo,
      refetchDashboardMemo,
      rejectionModal.timesheetId,
      setSelectedTimesheets,
    ],
  );

  const handleRejectionCancel = useCallback(() => {
    setRejectionModal(INITIAL_REJECTION_MODAL);
  }, []);

  return {
    sessionStatus,
    welcomeMessage,
    canPerformApprovals,
    metrics,
    urgentCount,
    pendingTimesheets,
    filteredTimesheets,
    noPendingTimesheets,
    selectedTimesheets: selectedTimesheetsState,
    setSelectedTimesheets,
    filters,
    updateFilters,
    clearFilters,
    courseOptions,
    loading,
    errors,
    actionLoadingId,
    handleApprovalAction,
    handleBatchApproval,
    handleRejectionSubmit,
    handleRejectionCancel,
    rejectionModal,
    refreshPending: refreshPendingMemo,
    refetchDashboard: refetchDashboardMemo,
    resetApproval,
  };
}

