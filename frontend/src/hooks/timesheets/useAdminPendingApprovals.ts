import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TimesheetService } from '../../services/timesheets';
import type { TimesheetPage, ApiErrorResponse } from '../../types/api';

interface PendingApprovalsState {
  data: TimesheetPage | null;
  loading: boolean;
  error: string | null;
}

export interface UseAdminPendingApprovalsResult extends PendingApprovalsState {
  refetch: () => Promise<void>;
  timesheets: TimesheetPage['timesheets'];
  pageInfo: TimesheetPage['pageInfo'] | null;
  isEmpty: boolean;
}

const NOT_AUTHENTICATED_ERROR = 'Not authenticated';

const createInitialState = (): PendingApprovalsState => ({
  data: null,
  loading: false,
  error: null,
});

const createAuthErrorState = (): PendingApprovalsState => ({
  data: null,
  loading: false,
  error: NOT_AUTHENTICATED_ERROR,
});

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: string; name?: string };
    return candidate.name === 'AbortError' || candidate.code === 'ERR_CANCELED';
  }
  return false;
};

const isApiErrorResponse = (error: unknown): error is ApiErrorResponse => {
  return typeof error === 'object' && error !== null && (error as ApiErrorResponse).success === false;
};

const resolveErrorMessage = (error: unknown): string => {
  if (isApiErrorResponse(error)) {
    return error.message || error.error.message || 'Failed to fetch pending approvals';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Failed to fetch pending approvals';
};

export const useAdminPendingApprovals = (): UseAdminPendingApprovalsResult => {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<PendingApprovalsState>(createInitialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPending = useCallback(async () => {
    if (!isAuthenticated) {
      setState(createAuthErrorState());
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await TimesheetService.getPendingApprovals(controller.signal);
      setState({ data, loading: false, error: null });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setState((previous) => ({ ...previous, loading: false, error: resolveErrorMessage(error) }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setState(createAuthErrorState());
      return;
    }
    fetchPending().catch(() => {});
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPending, isAuthenticated]);

  const timesheets = state.data?.timesheets ?? [];
  const pageInfo = state.data?.pageInfo ?? null;

  return {
    ...state,
    refetch: fetchPending,
    timesheets,
    pageInfo,
    isEmpty: !state.loading && timesheets.length === 0,
  };
};

