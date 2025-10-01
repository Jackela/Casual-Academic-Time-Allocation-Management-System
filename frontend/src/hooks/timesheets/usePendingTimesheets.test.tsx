import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePendingTimesheets } from "./usePendingTimesheets";
import { TimesheetService } from "../../services/timesheets";
import { useAuth } from "../../contexts/AuthContext";
import {
  createMockTimesheetPage,
  createMockUser,
  waitForAsync,
} from "../../test/utils/test-utils";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    getPendingTimesheets: vi.fn(),
  },
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

const mockTimesheetService = TimesheetService as unknown as {
  getPendingTimesheets: ReturnType<typeof vi.fn>;
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
    mockTimesheetService.getPendingTimesheets.mockResolvedValue(
      mockTimesheetPage,
    );
  });

  it("fetches pending timesheets on mount", async () => {
    const { result } = renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.timesheets).toEqual(mockTimesheetPage.timesheets);
    expect(result.current.pageInfo).toEqual(mockTimesheetPage.pageInfo);
    expect(result.current.isEmpty).toBe(false);
  });

  it("provides a refetch helper", async () => {
    const { result } = renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockTimesheetService.getPendingTimesheets.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockTimesheetService.getPendingTimesheets).toHaveBeenCalled();
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

    await waitForAsync(50);

    expect(mockTimesheetService.getPendingTimesheets).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Not authenticated");
    expect(result.current.isEmpty).toBe(true);
  });
});
