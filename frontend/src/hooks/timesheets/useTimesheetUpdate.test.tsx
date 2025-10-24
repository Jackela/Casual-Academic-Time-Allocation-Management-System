import { renderHook, act, waitFor } from "@testing-library/react";
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

const mockTimesheet = createMockTimesheet({ id: 123, hours: 7, hourlyRate: 55 });
const updateRequest: TimesheetUpdateRequest = {
  weekStartDate: "2024-01-01",
  sessionDate: "2024-01-01",
  deliveryHours: 1.5,
  description: "Updated hours",
  taskType: "TUTORIAL",
  qualification: "STANDARD",
  repeat: false,
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

    await act(async () => {
      await expect(
        result.current.updateTimesheet(123, updateRequest),
      ).rejects.toThrow("update failed");
    });

    await waitFor(() =>
      expect(result.current.error).toBe("update failed"),
    );
  });

  it("resets mutation state", async () => {
    mockService.updateTimesheet.mockRejectedValueOnce(new Error("update failed"));

    const { result } = renderHook(() => useTimesheetUpdate());

    await act(async () => {
      await expect(
        result.current.updateTimesheet(123, updateRequest),
      ).rejects.toThrow("update failed");
    });

    await waitFor(() =>
      expect(result.current.error).toBe("update failed"),
    );

    act(() => {
      result.current.reset();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});
