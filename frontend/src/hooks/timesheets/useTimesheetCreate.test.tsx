import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTimesheetCreate } from "./useTimesheetCreate";
import { TimesheetService } from "../../services/timesheets";
import { createMockTimesheet } from "../../test/utils/test-utils";
import type { TimesheetCreateRequest } from "../../types/api";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    createTimesheet: vi.fn(),
    validateTimesheet: vi.fn(),
  },
}));

const mockService = TimesheetService as unknown as {
  createTimesheet: ReturnType<typeof vi.fn>;
  validateTimesheet: ReturnType<typeof vi.fn>;
};

const baseRequest: TimesheetCreateRequest = {
  tutorId: 1,
  courseId: 2,
  weekStartDate: "2024-01-01",
  sessionDate: "2024-01-01",
  deliveryHours: 1.5,
  description: "Tutorial",
  taskType: "TUTORIAL",
  qualification: "STANDARD",
  repeat: false,
};

const mockTimesheet = createMockTimesheet({ id: 99 });

describe("useTimesheetCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.validateTimesheet.mockReturnValue([]);
    mockService.createTimesheet.mockResolvedValue(mockTimesheet);
  });

  it("creates a timesheet when validation passes", async () => {
    const { result } = renderHook(() => useTimesheetCreate());

    await act(async () => {
      const created = await result.current.createTimesheet(baseRequest);
      expect(created).toEqual(mockTimesheet);
    });

    expect(mockService.createTimesheet).toHaveBeenCalledWith(baseRequest);
    expect(result.current.error).toBeNull();
  });

  it("raises validation errors", async () => {
    mockService.validateTimesheet.mockReturnValue(["Invalid tutor"]);

    const { result } = renderHook(() => useTimesheetCreate());

    await act(async () => {
      await expect(
        result.current.createTimesheet(baseRequest),
      ).rejects.toThrow("Invalid tutor");
    });

    await waitFor(() =>
      expect(result.current.error).toBe("Invalid tutor"),
    );
    expect(mockService.createTimesheet).not.toHaveBeenCalled();
  });

  it("handles API failures", async () => {
    mockService.createTimesheet.mockRejectedValueOnce(
      new Error("Network down"),
    );

    const { result } = renderHook(() => useTimesheetCreate());

    await act(async () => {
      await expect(
        result.current.createTimesheet(baseRequest),
      ).rejects.toThrow("Network down");
    });

    await waitFor(() =>
      expect(result.current.error).toBe("Network down"),
    );
  });

  it("can reset mutation state", async () => {
    mockService.createTimesheet.mockRejectedValueOnce(
      new Error("Network down"),
    );

    const { result } = renderHook(() => useTimesheetCreate());

    await act(async () => {
      await expect(
        result.current.createTimesheet(baseRequest),
      ).rejects.toThrow("Network down");
    });

    await waitFor(() =>
      expect(result.current.error).toBe("Network down"),
    );

    act(() => {
      result.current.reset();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});
