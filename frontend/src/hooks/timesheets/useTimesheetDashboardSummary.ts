import { useCallback, useEffect, useState } from "react";
import { TimesheetService } from "../../services/timesheets";
import type { DashboardSummary } from "../../types/api";

export interface UseTimesheetDashboardSummaryOptions {
  scope?: "tutor" | "lecturer" | "admin";
  lazy?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number; // ms, active only when document visible
}

interface DashboardSummaryState {
  data: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
}

export const useTimesheetDashboardSummary = (
  options: UseTimesheetDashboardSummaryOptions = {},
) => {
  const {
    scope = "tutor",
    lazy = false,
    refetchOnWindowFocus = true,
    refetchInterval = 30000,
  } = options;
  const [state, setState] = useState<DashboardSummaryState>({
    data: null,
    loading: !lazy,
    error: null,
    lastUpdatedAt: null,
  });

  const fetchSummary = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const summary =
        scope === "admin"
          ? await TimesheetService.getAdminDashboardSummary()
          : await TimesheetService.getDashboardSummary();
      const now = Date.now();
      setState({ data: summary, loading: false, error: null, lastUpdatedAt: now });
      if (import.meta.env.DEV) {
        const key = `__dashboard_fetch_count_${scope}`;
        const devWindow = window as typeof window & Record<string, number | undefined>;
        devWindow[key] = (devWindow[key] ?? 0) + 1;
        // Minimal budget diagnostic; manual check in devtools
        console.info(`[dashboard] fetched summary (scope=${scope}) count=${devWindow[key]} at ${new Date(now).toISOString()}`);
      }
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
        /* no-op */
      });
    }
  }, [fetchSummary, lazy]);

  // Focus-based refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;
    const handler = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSummary().catch(() => {});
        if (import.meta.env.DEV) {
          // Minimal dev diagnostic
          console.info('[dashboard] refetch on focus');
        }
      }
    };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [fetchSummary, refetchOnWindowFocus]);

  // Interval refetch only when visible
  useEffect(() => {
    if (!refetchInterval || refetchInterval <= 0) return;
    let timer: number | undefined;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSummary().catch(() => {});
        if (import.meta.env.DEV) {
          console.info('[dashboard] interval refetch');
        }
      }
      timer = window.setTimeout(tick, refetchInterval);
    };
    timer = window.setTimeout(tick, refetchInterval);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [fetchSummary, refetchInterval]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastUpdatedAt: state.lastUpdatedAt,
    refetch: fetchSummary,
  };
};
