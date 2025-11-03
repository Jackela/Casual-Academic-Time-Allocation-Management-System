import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePendingTimesheets } from "./usePendingTimesheets";
import { TimesheetService } from "../../services/timesheets";
import { useAuth } from "../../contexts/AuthContext";
import {
  createMockTimesheetPage,
  createMockUser,
} from "../../test/utils/test-utils";
import type { TimesheetPage } from "../../types/api";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    getMyPendingTimesheets: vi.fn(),
  },
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

type PendingTimesheetMock = ReturnType<typeof vi.fn<[AbortSignal?], Promise<TimesheetPage>>>;

const mockTimesheetService = TimesheetService as unknown as {
  getMyPendingTimesheets: PendingTimesheetMock;
};
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

const mockUser = createMockUser({ id: 42, role: "LECTURER" });
const mockTimesheetPage = createMockTimesheetPage(3);

describe("usePendingTimesheets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });
    mockTimesheetService.getMyPendingTimesheets.mockResolvedValue(
      mockTimesheetPage,
    );
  });

  it("fetches pending timesheets on mount", async () => {
    const { result } = renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockTimesheetService.getMyPendingTimesheets).toHaveBeenCalled();
    expect(mockTimesheetService.getMyPendingTimesheets.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
    expect(result.current.timesheets).toEqual(mockTimesheetPage.timesheets);
    expect(result.current.pageInfo).toEqual(mockTimesheetPage.pageInfo);
    expect(result.current.isEmpty).toBe(false);
  });

  it("provides a refetch helper", async () => {
    const { result } = renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockTimesheetService.getMyPendingTimesheets.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockTimesheetService.getMyPendingTimesheets).toHaveBeenCalled();
    const { calls } = mockTimesheetService.getMyPendingTimesheets.mock;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toBeInstanceOf(AbortSignal);
  });

  it("handles unauthenticated users without issuing requests", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() =>
      expect(mockTimesheetService.getMyPendingTimesheets).not.toHaveBeenCalled(),
    );
    await waitFor(() => expect(result.current.error).toBe("Not authenticated"));
    await waitFor(() => expect(result.current.isEmpty).toBe(true));
  });
});
