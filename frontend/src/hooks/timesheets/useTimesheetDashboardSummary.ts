import { useCallback, useEffect, useState } from "react";
import { TimesheetService } from "../../services/timesheets";
import type { DashboardSummary } from "../../types/api";

export interface UseTimesheetDashboardSummaryOptions {
  scope?: "tutor" | "lecturer" | "admin";
  lazy?: boolean;
}

interface DashboardSummaryState {
  data: DashboardSummary | null;
  loading: boolean;
  error: string | null;
}

export const useTimesheetDashboardSummary = (
  options: UseTimesheetDashboardSummaryOptions = {},
) => {
  const { scope = "tutor", lazy = false } = options;
  const [state, setState] = useState<DashboardSummaryState>({
    data: null,
    loading: !lazy,
    error: null,
  });

  const fetchSummary = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const summary =
        scope === "admin"
          ? await TimesheetService.getAdminDashboardSummary()
          : await TimesheetService.getDashboardSummary();
      setState({ data: summary, loading: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard summary",
      }));
    }
  }, [scope]);

  useEffect(() => {
    if (!lazy) {
      fetchSummary().catch(() => {
        /* no-op: error stored in state */
      });
    }
  }, [fetchSummary, lazy]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchSummary,
  };
};
