import { useCallback, useState } from "react";
import { TimesheetService } from "../../services/timesheets";
import type { ApprovalRequest, ApprovalResponse } from "../../types/api";
import {
  createInitialMutationState,
  safeSetMutationState,
} from "./mutationState";
import type { MutationState } from "./mutationState";
export interface UseTimesheetApprovalResult
  extends MutationState<ApprovalResponse> {
  approveTimesheet: (request: ApprovalRequest) => Promise<ApprovalResponse>;
  batchApprove: (requests: ApprovalRequest[]) => Promise<ApprovalResponse[]>;
  reset: () => void;
}

export const useTimesheetApproval = (): UseTimesheetApprovalResult => {
  const [state, setState] = useState<MutationState<ApprovalResponse>>(
    createInitialMutationState(),
  );

  const approveTimesheet = useCallback(async (request: ApprovalRequest) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await TimesheetService.approveTimesheet(request);
      safeSetMutationState(setState, { data, loading: false, error: null });
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process approval";
      safeSetMutationState(setState, {
        data: null,
        loading: false,
        error: message,
      });
      throw new Error(message);
    }
  }, []);

  const batchApprove = useCallback(async (requests: ApprovalRequest[]) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const responses = await TimesheetService.batchApproveTimesheets(requests);
      const data = responses[0] ?? null;
      safeSetMutationState(setState, { data, loading: false, error: null });
      return responses;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to process batch approval";
      safeSetMutationState(setState, {
        data: null,
        loading: false,
        error: message,
      });
      throw new Error(message);
    }
  }, []);

  const reset = useCallback(() => {
    safeSetMutationState(setState, createInitialMutationState());
  }, []);

  return {
    ...state,
    approveTimesheet,
    batchApprove,
    reset,
  };
};

export { useTimesheetApproval as useApprovalAction };




