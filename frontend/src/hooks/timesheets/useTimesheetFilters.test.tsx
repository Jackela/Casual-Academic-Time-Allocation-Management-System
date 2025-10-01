import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useTimesheetFilters,
  useActionableTimesheets,
} from "./useTimesheetFilters";
import { TimesheetService } from "../../services/timesheets";
import { createMockTimesheetPage } from "../../test/utils/test-utils";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    getActionableTimesheets: vi.fn(),
  },
}));

const mockService = TimesheetService as unknown as {
  getActionableTimesheets: ReturnType<typeof vi.fn>;
};

const mockTimesheets = createMockTimesheetPage(2).timesheets;


describe("useTimesheetFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.getActionableTimesheets.mockReturnValue(mockTimesheets);
  });

  it("returns actionable timesheets for the supplied role", () => {
    const { result } = renderHook(() =>
      useTimesheetFilters(mockTimesheets, { role: "ADMIN" }),
    );

    expect(mockService.getActionableTimesheets).toHaveBeenCalledWith(
      mockTimesheets,
      "ADMIN",
    );
    expect(result.current.actionableTimesheets).toEqual(mockTimesheets);
  });

  it("returns an empty list when no role is provided", () => {
    const { result } = renderHook(() => useTimesheetFilters(mockTimesheets));

    expect(result.current.actionableTimesheets).toEqual([]);
    expect(mockService.getActionableTimesheets).not.toHaveBeenCalled();
  });

  it("exposes the legacy actionable hook", () => {
    const { result } = renderHook(() =>
      useActionableTimesheets(mockTimesheets, "LECTURER"),
    );

    expect(result.current).toEqual(mockTimesheets);
  });

  it("memoizes results when dependencies remain stable", () => {
    const { result, rerender } = renderHook(
      ({ items, role }) => useTimesheetFilters(items, { role }),
      { initialProps: { items: mockTimesheets, role: "ADMIN" } },
    );

    const first = result.current;
    rerender({ items: mockTimesheets, role: "ADMIN" });
    expect(result.current).toBe(first);
  });
});

