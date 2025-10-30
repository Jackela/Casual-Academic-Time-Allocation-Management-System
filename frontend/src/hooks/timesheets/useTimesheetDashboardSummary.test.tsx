import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimesheetDashboardSummary } from './useTimesheetDashboardSummary';

// Mock TimesheetService at module level used by the hook
vi.mock('../../services/timesheets', async () => {
  const actual = await vi.importActual<object>('../../services/timesheets');
  return {
    ...actual,
    TimesheetService: {
      getDashboardSummary: vi.fn(async () => ({
        totalTimesheets: 10,
        pendingApproval: 2,
        thisWeekHours: 5,
        thisWeekPay: 100,
        statusBreakdown: {},
      })),
      getAdminDashboardSummary: vi.fn(async () => ({
        totalTimesheets: 20,
        pendingApproval: 5,
        thisWeekHours: 8,
        thisWeekPay: 200,
        statusBreakdown: {},
      })),
    },
  };
});

// Helpers to control document.visibilityState in JSDOM
function setDocumentVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

describe('useTimesheetDashboardSummary', () => {
  beforeEach(() => {
    setDocumentVisibility('visible');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches on mount and allows manual refetch', async () => {
    const { result } = renderHook(() => useTimesheetDashboardSummary({ scope: 'tutor', refetchOnWindowFocus: false, refetchInterval: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const firstStamp = result.current.lastUpdatedAt;
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.lastUpdatedAt && result.current.lastUpdatedAt >= (firstStamp ?? 0)).toBe(true));
  });
});
