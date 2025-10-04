import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { TimesheetService } from "../../services/timesheets";
import type { TimesheetPage } from "../../types/api";

interface PendingTimesheetsState {
  data: TimesheetPage | null;
  loading: boolean;
  error: string | null;
}

export interface UsePendingTimesheetsResult extends PendingTimesheetsState {
  refetch: () => Promise<void>;
  timesheets: TimesheetPage["timesheets"];
  pageInfo: TimesheetPage["pageInfo"] | null;
  isEmpty: boolean;
}

const createInitialState = (): PendingTimesheetsState => ({
  data: null,
  loading: false,
  error: null,
});

const createAuthErrorState = (): PendingTimesheetsState => ({
  data: null,
  loading: false,
  error: "Not authenticated",
});

export const usePendingTimesheets = (): UsePendingTimesheetsResult => {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<PendingTimesheetsState>(createInitialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPendingTimesheets = useCallback(async () => {
    if (!isAuthenticated) {
      setState(createAuthErrorState());
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
    }));

    try {
      const data = await TimesheetService.getPendingTimesheets();
      setState({
        data,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      if ((error as any)?.name === "AbortError") {
        return;
      }
      setState((previous) => ({
        ...previous,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending timesheets",
      }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setState(createAuthErrorState());
      return;
    }

    fetchPendingTimesheets().catch(() => {
      /* no-op: error captured in state */
    });

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPendingTimesheets, isAuthenticated]);

  const timesheets = state.data?.timesheets ?? [];
  const pageInfo = state.data?.pageInfo ?? null;

  return {
    ...state,
    refetch: fetchPendingTimesheets,
    timesheets,
    pageInfo,
    isEmpty: !state.loading && timesheets.length === 0,
  };
};
