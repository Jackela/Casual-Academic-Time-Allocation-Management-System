import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTimesheetApproval } from "./useTimesheetApproval";
import { TimesheetService } from "../../services/timesheets";
import type { ApprovalRequest, ApprovalResponse } from "../../types/api";

vi.mock("../../services/timesheets", () => ({
  TimesheetService: {
    approveTimesheet: vi.fn(),
    batchApproveTimesheets: vi.fn(),
  },
}));

const mockService = TimesheetService as unknown as {
  approveTimesheet: ReturnType<typeof vi.fn>;
  batchApproveTimesheets: ReturnType<typeof vi.fn>;
};

const buildApprovalRequest = (
  overrides: Partial<ApprovalRequest> = {},
): ApprovalRequest => ({
  timesheetId: 1,
  action: "APPROVE",
  comment: "Looks good",
  ...overrides,
});

const mockResponse: ApprovalResponse = {
  timesheetId: 1,
  status: "APPROVED",
  approvedBy: 42,
  approvedAt: "2024-03-12T00:00:00Z",
  message: "approved",
};

describe("useTimesheetApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.approveTimesheet.mockResolvedValue(mockResponse);
    mockService.batchApproveTimesheets.mockResolvedValue([mockResponse]);
  });

  it("initializes with idle state", () => {
    const { result } = renderHook(() => useTimesheetApproval());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it("approves a single timesheet", async () => {
    const { result } = renderHook(() => useTimesheetApproval());

    await act(async () => {
      const response = await result.current.approveTimesheet(
        buildApprovalRequest(),
      );
      expect(response).toEqual(mockResponse);
    });

    expect(mockService.approveTimesheet).toHaveBeenCalledWith(
      buildApprovalRequest(),
    );
    expect(result.current.error).toBeNull();
  });

  it("surfaces approval failures", async () => {
    mockService.approveTimesheet.mockRejectedValueOnce(
      new Error("approval failed"),
    );

    const { result } = renderHook(() => useTimesheetApproval());

    await expect(
      act(async () => {
        await result.current.approveTimesheet(buildApprovalRequest());
      }),
    ).rejects.toThrow("approval failed");

    expect(result.current.error).toBe("approval failed");
  });

  it("batch approves multiple requests", async () => {
    const { result } = renderHook(() => useTimesheetApproval());

    await act(async () => {
      const responses = await result.current.batchApprove([
        buildApprovalRequest({ timesheetId: 1 }),
        buildApprovalRequest({ timesheetId: 2 }),
      ]);
      expect(responses).toHaveLength(1);
    });

    expect(mockService.batchApproveTimesheets).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("handles batch approval failures", async () => {
    mockService.batchApproveTimesheets.mockRejectedValueOnce(
      new Error("batch failed"),
    );

    const { result } = renderHook(() => useTimesheetApproval());

    await expect(
      act(async () => {
        await result.current.batchApprove([buildApprovalRequest()]);
      }),
    ).rejects.toThrow("batch failed");

    expect(result.current.error).toBe("batch failed");
  });
});
