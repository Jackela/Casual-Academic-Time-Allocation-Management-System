import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTimesheetCreate } from "./useTimesheetCreate";
import { TimesheetService } from "../../services/timesheets";
import type { TimesheetCreateRequest } from "../../types/api";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    createTimesheet: vi.fn(),
    validateTimesheet: vi.fn(() => []),
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
  deliveryHours: 1,
  description: "Tutorial",
  taskType: "TUTORIAL",
  qualification: "STANDARD",
  isRepeat: false,
};

describe("useTimesheetCreate error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps 403/ AUTHORIZATION_FAILED to assignment guidance message", async () => {
    const err: any = new Error("Forbidden");
    err.status = 403;
    err.error = { code: 'AUTHORIZATION_FAILED' };
    mockService.createTimesheet.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useTimesheetCreate());

    await act(async () => {
      await expect(result.current.createTimesheet(baseRequest)).rejects.toThrow(/not assigned/i);
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/not assigned/i);
    });
  });

  it("maps 400 VALIDATION_FAILED to payload message when present", async () => {
    const err: any = {
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Delivery hours must be between 0.25 and 60',
      error: { code: 'VALIDATION_FAILED' },
    };
    mockService.createTimesheet.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useTimesheetCreate());
    await act(async () => {
      await expect(result.current.createTimesheet(baseRequest)).rejects.toThrow(/Delivery hours/i);
    });
    await waitFor(() => {
      expect(result.current.error).toMatch(/Delivery hours/i);
    });
  });
});

