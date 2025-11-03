import { useCallback, useState } from "react";
import { TimesheetService } from "../../services/timesheets";
import type { Timesheet, TimesheetCreateRequest } from "../../types/api";
import {
  createInitialMutationState,
  safeSetMutationState,
} from "./mutationState";
import type { MutationState } from "./mutationState";

export interface UseTimesheetCreateResult extends MutationState<Timesheet> {
  createTimesheet: (input: TimesheetCreateRequest) => Promise<Timesheet>;
  reset: () => void;
}

export const useTimesheetCreate = (): UseTimesheetCreateResult => {
  const [state, setState] = useState<MutationState<Timesheet>>(
    createInitialMutationState(),
  );

  const createTimesheet = useCallback(async (input: TimesheetCreateRequest) => {
    const validationErrors = TimesheetService.validateTimesheet(input);
    if (validationErrors.length > 0) {
      const message = validationErrors.join(", ");
      safeSetMutationState(setState, {
        data: null,
        loading: false,
        error: message,
      });
      throw new Error(message);
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const timesheet = await TimesheetService.createTimesheet(input);
      safeSetMutationState(setState, {
        data: timesheet,
        loading: false,
        error: null,
      });
      return timesheet;
    } catch (error) {
      // Map secureApiClient ApiErrorResponse to friendly messages
      let message = "Failed to create timesheet";
      const errObj = error as any;
      const status = errObj?.status;
      const code = errObj?.error?.code ?? errObj?.code;
      const payloadMessage = typeof errObj?.message === 'string' ? errObj.message : undefined;
      // Normalize duplicate-week across environments that might return 400 with duplicate phrasing
      const duplicateHint = /already exists/i.test(String(payloadMessage ?? ''));
      if (status === 409 || code === 'RESOURCE_CONFLICT' || duplicateHint) {
        message = "A timesheet already exists for this tutor, course, and week. Please choose a different week or edit the existing one.";
      } else if (status === 403 || code === 'AUTHORIZATION_FAILED') {
        message = "Creation failed: you are not assigned to this course or tutor.";
      } else if (status === 400 && (code === 'VALIDATION_FAILED' || payloadMessage)) {
        message = payloadMessage ?? message;
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }
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
    createTimesheet,
    reset,
  };
};

export { useTimesheetCreate as useCreateTimesheet };


