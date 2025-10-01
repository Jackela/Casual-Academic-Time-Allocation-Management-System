import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTimesheetDashboardSummary } from "./useTimesheetDashboardSummary";
import { TimesheetService } from "../../services/timesheets";
import { createMockDashboardSummary } from "../../test/utils/test-utils";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    getDashboardSummary: vi.fn(),
    getAdminDashboardSummary: vi.fn(),
  },
}));

const mockTimesheetService = TimesheetService as unknown as {
  getDashboardSummary: ReturnType<typeof vi.fn>;
  getAdminDashboardSummary: ReturnType<typeof vi.fn>;
};

const mockSummary = createMockDashboardSummary();

describe("useTimesheetDashboardSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimesheetService.getDashboardSummary.mockResolvedValue(mockSummary);
    mockTimesheetService.getAdminDashboardSummary.mockResolvedValue(
      mockSummary,
    );
  });

  it("fetches tutor summary by default", async () => {
    const { result } = renderHook(() => useTimesheetDashboardSummary());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockTimesheetService.getDashboardSummary).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockSummary);
  });

  it("fetches admin summary when scope is admin", async () => {
    const { result } = renderHook(() =>
      useTimesheetDashboardSummary({ scope: "admin" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockTimesheetService.getAdminDashboardSummary).toHaveBeenCalled();
  });

  it("supports lazy fetching", async () => {
    const { result } = renderHook(() =>
      useTimesheetDashboardSummary({ lazy: true }),
    );

    expect(result.current.loading).toBe(false);
    expect(mockTimesheetService.getDashboardSummary).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockTimesheetService.getDashboardSummary).toHaveBeenCalled();
  });
});
