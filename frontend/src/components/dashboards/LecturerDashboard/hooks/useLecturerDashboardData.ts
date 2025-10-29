import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
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
  LecturerModificationModalState,
  LecturerRejectionModalState,
} from '../../../../types/dashboard/lecturer-dashboard';

export interface UseLecturerDashboardDataResult {
  sessionStatus: SessionStatus;
  welcomeMessage: string;
  pageLoading: boolean;
  pageErrors: Array<{
    source: 'pending' | 'dashboard';
    message: string;
  }>;
  canPerformApprovals: boolean;
  metrics: LecturerDashboardMetrics;
  urgentCount: number;
  pendingTimesheets: Timesheet[];
  filteredTimesheets: Timesheet[];
  noPendingTimesheets: boolean;
  selectedTimesheets: number[];
  setSelectedTimesheets: Dispatch<SetStateAction<number[]>>;
  filters: LecturerDashboardFilters;
  updateFilters: (updates: Partial<LecturerDashboardFilters>) => void;
  clearFilters: () => void;
  courseOptions: LecturerCourseOption[];
  loading: LecturerDashboardLoading;
  errors: LecturerDashboardErrors;
  actionLoadingId: number | null;
  handleApprovalAction: (timesheetId: number, action: ApprovalAction) => Promise<void>;
  handleBatchApproval: () => Promise<void>;
  handleBatchRejection: () => Promise<void>;
  handleRejectionSubmit: (reason: string) => Promise<void>;
  handleRejectionCancel: () => void;
  rejectionModal: LecturerRejectionModalState;
  handleModificationSubmit: (reason: string) => Promise<void>;
  handleModificationCancel: () => void;
  modificationModal: LecturerModificationModalState;
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

const INITIAL_MODIFICATION_MODAL: LecturerModificationModalState = {
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
  const [rejectionModal, setRejectionModal] = useState<LecturerRejectionModalState>(INITIAL_REJECTION_MODAL);
  const [modificationModal, setModificationModal] = useState<LecturerModificationModalState>(INITIAL_MODIFICATION_MODAL);
  const actionLockRef = useRef(false);

  const setSelectedTimesheets = useCallback<Dispatch<SetStateAction<number[]>>>((nextValue) => {
    setSelectedTimesheetsState((previous) => {
      const next = typeof nextValue === 'function'
        ? (nextValue as (prev: number[]) => number[])(previous)
        : nextValue;

      return arraysEqual(previous, next) ? previous : next;
    });
  }, []);

  const updateFilters = useCallback((updates: Partial<LecturerDashboardFilters>) => {
    setFilters((previous) => {
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

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const {
    loading: pendingLoading,
    error: pendingError,
    timesheets: pendingTimesheets,
    refetch: refetchPending,
  } = usePendingTimesheets();

  const noPendingTimesheets = !pendingLoading && pendingTimesheets.length === 0;

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
  }, [profile, role]);

  const isTimesheetUrgent = useCallback((timesheet: Timesheet) => {
    const submittedDate = new Date(timesheet.createdAt);
    const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceSubmission > 3;
  }, []);

  const urgentCount = useMemo(() => pendingTimesheets.filter(isTimesheetUrgent).length, [pendingTimesheets, isTimesheetUrgent]);

  const metrics = useMemo<LecturerDashboardMetrics>(() => {
    const pendingApproval =
      typeof dashboardData?.pendingApproval === 'number'
        ? dashboardData.pendingApproval
        : typeof dashboardData?.pendingApprovals === 'number'
          ? dashboardData.pendingApprovals
          : 0;

    const statusBreakdown =
      dashboardData?.statusBreakdown && typeof dashboardData.statusBreakdown === 'object'
        ? dashboardData.statusBreakdown
        : {};

    return {
      pendingApproval,
      totalTimesheets: dashboardData?.totalTimesheets ?? 0,
      thisWeekHours: dashboardData?.thisWeekHours ?? 0,
      thisWeekPay: dashboardData?.thisWeekPay ?? 0,
      statusBreakdown,
    };
  }, [dashboardData]);

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

  const loading: LecturerDashboardLoading = useMemo(() => ({
    pending: pendingLoading,
    dashboard: dashboardLoading,
    approval: approvalLoading,
  }), [pendingLoading, dashboardLoading, approvalLoading]);

  const errors: LecturerDashboardErrors = useMemo(() => ({
    pending: pendingError ?? null,
    dashboard: dashboardError ?? null,
    approval: approvalError ?? null,
    hasErrors: Boolean(pendingError || dashboardError || approvalError),
  }), [pendingError, dashboardError, approvalError]);

  const pageLoading = loading.pending || loading.dashboard;

  const pageErrors = useMemo(() => {
    const entries: Array<{ source: 'pending' | 'dashboard'; message: string }> = [];
    if (errors.pending) {
      entries.push({ source: 'pending', message: errors.pending });
    }
    if (errors.dashboard) {
      entries.push({ source: 'dashboard', message: errors.dashboard });
    }
    return entries;
  }, [errors.dashboard, errors.pending]);

  const actionLoadingId = useMemo(() => {
    if (!loading.approval) {
      return null;
    }

    if (rejectionModal.open && rejectionModal.timesheetId) {
      return rejectionModal.timesheetId;
    }

    if (modificationModal.open && modificationModal.timesheetId) {
      return modificationModal.timesheetId;
    }

    if (selectedTimesheetsState.length > 0) {
      return selectedTimesheetsState[0];
    }

    return pendingTimesheets[0]?.id ?? null;
  }, [loading.approval, modificationModal, rejectionModal, selectedTimesheetsState, pendingTimesheets]);

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
    window.addEventListener('catams-open-lecturer-rejection-modal', handler);
    return () => window.removeEventListener('catams-open-lecturer-rejection-modal', handler);
  }, [setRejectionModal]);

  const handleApprovalAction = useCallback(async (timesheetId: number, action: ApprovalAction) => {
    if (!canPerformApprovals || approvalLoading || actionLockRef.current) {
      return;
    }

    try {
      if (action === 'REJECT') {
        setRejectionModal({ open: true, timesheetId });
        return;
      }

      if (action === 'REQUEST_MODIFICATION') {
        setModificationModal({ open: true, timesheetId });
        return;
      }

      if (action !== 'LECTURER_CONFIRM') {
        return;
      }

      actionLockRef.current = true;
      await approveTimesheet({
        timesheetId,
        action: 'LECTURER_CONFIRM',
        comment: 'Approved for processing',
      });

      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets((previous) => previous.filter((id) => id !== timesheetId));
    } catch (error) {
      secureLogger.error('Failed to process approval', error);
    } finally {
      actionLockRef.current = false;
    }
  }, [approveTimesheet, approvalLoading, canPerformApprovals, refetchDashboard, refetchPending, setSelectedTimesheets]);

  const handleBatchApproval = useCallback(async () => {
    if (!canPerformApprovals || selectedTimesheetsState.length === 0 || approvalLoading || actionLockRef.current) {
      return;
    }

    try {
      const requests = selectedTimesheetsState.map((timesheetId) => ({
        timesheetId,
        action: 'LECTURER_CONFIRM' as const,
      }));

      actionLockRef.current = true;
      await batchApprove(requests);
      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets([]);
    } catch (error) {
      secureLogger.error('Failed to batch approve', error);
    } finally {
      actionLockRef.current = false;
    }
  }, [approvalLoading, batchApprove, canPerformApprovals, refetchDashboard, refetchPending, selectedTimesheetsState, setSelectedTimesheets]);

  const handleBatchRejection = useCallback(async () => {
    if (!canPerformApprovals || selectedTimesheetsState.length === 0 || approvalLoading || actionLockRef.current) {
      return;
    }

    try {
      actionLockRef.current = true;
      await Promise.all(
        selectedTimesheetsState.map((timesheetId) =>
          approveTimesheet({
            timesheetId,
            action: 'REJECT',
            comment: 'Rejected via batch action',
          }),
        ),
      );

      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets([]);
    } catch (error) {
      secureLogger.error('Failed to batch reject', error);
    } finally {
      actionLockRef.current = false;
    }
  }, [
    approvalLoading,
    approveTimesheet,
    canPerformApprovals,
    refetchDashboard,
    refetchPending,
    selectedTimesheetsState,
    setSelectedTimesheets,
  ]);

  const handleRejectionSubmit = useCallback(async (reason: string) => {
    if (!canPerformApprovals || !rejectionModal.timesheetId || approvalLoading || actionLockRef.current) {
      return;
    }

    try {
      actionLockRef.current = true;
      await approveTimesheet({
        timesheetId: rejectionModal.timesheetId,
        action: 'REJECT',
        comment: reason,
      });

      setRejectionModal(INITIAL_REJECTION_MODAL);
      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets((previous) =>
        previous.filter((id) => id !== rejectionModal.timesheetId),
      );
    } catch (error) {
      secureLogger.error('Failed to reject timesheet', error);
    } finally {
      actionLockRef.current = false;
    }
  }, [approvalLoading, approveTimesheet, canPerformApprovals, refetchDashboard, refetchPending, rejectionModal.timesheetId, setSelectedTimesheets]);

  const handleRejectionCancel = useCallback(() => {
    setRejectionModal(INITIAL_REJECTION_MODAL);
  }, []);

  const handleModificationSubmit = useCallback(async (reason: string) => {
    if (!canPerformApprovals || !modificationModal.timesheetId || approvalLoading || actionLockRef.current) {
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return;
    }

    try {
      actionLockRef.current = true;
      await approveTimesheet({
        timesheetId: modificationModal.timesheetId,
        action: 'REQUEST_MODIFICATION',
        comment: trimmedReason,
      });

      setModificationModal(INITIAL_MODIFICATION_MODAL);
      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets((previous) =>
        previous.filter((id) => id !== modificationModal.timesheetId),
      );
    } catch (error) {
      secureLogger.error('Failed to request modification', error);
    } finally {
      actionLockRef.current = false;
    }
  }, [approvalLoading, approveTimesheet, canPerformApprovals, modificationModal.timesheetId, refetchDashboard, refetchPending, setSelectedTimesheets]);

  const handleModificationCancel = useCallback(() => {
    setModificationModal(INITIAL_MODIFICATION_MODAL);
    resetApproval();
  }, [resetApproval]);

  const refreshPending = useCallback(async () => {
    await refetchPending();
  }, [refetchPending]);

  return {
    sessionStatus,
    welcomeMessage,
    pageLoading,
    pageErrors,
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
    handleBatchRejection,
    handleRejectionSubmit,
    handleRejectionCancel,
    rejectionModal,
    handleModificationSubmit,
    handleModificationCancel,
    modificationModal,
    refreshPending,
    refetchDashboard,
    resetApproval,
  };
}
