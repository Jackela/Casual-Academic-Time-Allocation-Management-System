import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTimesheetUpdate } from "./useTimesheetUpdate";
import { TimesheetService } from "../../services/timesheets";
import { createMockTimesheet } from "../../test/utils/test-utils";
import type { TimesheetUpdateRequest } from "../../types/api";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    updateTimesheet: vi.fn(),
  },
}));

const mockService = TimesheetService as unknown as {
  updateTimesheet: ReturnType<typeof vi.fn>;
};

const mockTimesheet = createMockTimesheet({ id: 123, hours: 7 });
const updateRequest: TimesheetUpdateRequest = {
  hours: 7,
  description: "Updated hours",
};

describe("useTimesheetUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.updateTimesheet.mockResolvedValue(mockTimesheet);
  });

  it("updates a timesheet", async () => {
    const { result } = renderHook(() => useTimesheetUpdate());

    await act(async () => {
      const updated = await result.current.updateTimesheet(123, updateRequest);
      expect(updated).toEqual(mockTimesheet);
    });

    expect(mockService.updateTimesheet).toHaveBeenCalledWith(123, updateRequest);
    expect(result.current.error).toBeNull();
  });

  it("handles update failures", async () => {
    mockService.updateTimesheet.mockRejectedValueOnce(new Error("update failed"));

    const { result } = renderHook(() => useTimesheetUpdate());

    await expect(
      act(async () => {
        await result.current.updateTimesheet(123, updateRequest);
      }),
    ).rejects.toThrow("update failed");

    expect(result.current.error).toBe("update failed");
  });

  it("resets mutation state", async () => {
    mockService.updateTimesheet.mockRejectedValueOnce(new Error("update failed"));

    const { result } = renderHook(() => useTimesheetUpdate());

    await expect(
      act(async () => {
        await result.current.updateTimesheet(123, updateRequest);
      }),
    ).rejects.toThrow("update failed");

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });
});
