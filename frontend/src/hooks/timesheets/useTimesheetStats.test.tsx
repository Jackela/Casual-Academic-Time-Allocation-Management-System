import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTimesheetStats } from "./useTimesheetStats";
import { TimesheetService } from "../../services/timesheets";
import { createMockTimesheetPage } from "../../test/utils/test-utils";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    calculateTotalHours: vi.fn(),
    calculateTotalPay: vi.fn(),
    groupByStatus: vi.fn(),
  },
}));

const mockService = TimesheetService as unknown as {
  calculateTotalHours: ReturnType<typeof vi.fn>;
  calculateTotalPay: ReturnType<typeof vi.fn>;
  groupByStatus: ReturnType<typeof vi.fn>;
};

const mockTimesheets = createMockTimesheetPage(2).timesheets;

describe("useTimesheetStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.calculateTotalHours.mockReturnValue(25);
    mockService.calculateTotalPay.mockReturnValue(500);
    mockService.groupByStatus.mockReturnValue({
      SUBMITTED: mockTimesheets,
    });
  });

  it("derives statistics from the provided timesheets", () => {
    const { result } = renderHook(() => useTimesheetStats(mockTimesheets));

    expect(result.current.totalHours).toBe(25);
    expect(result.current.totalPay).toBe(500);
    expect(result.current.totalCount).toBe(mockTimesheets.length);
    expect(result.current.statusCounts).toEqual({ SUBMITTED: mockTimesheets.length });
  });

  it("returns zeroed stats for empty collections", () => {
    const { result } = renderHook(() => useTimesheetStats([]));

    expect(result.current.totalCount).toBe(0);
    expect(result.current.averagePayPerTimesheet).toBe(0);
  });
});
