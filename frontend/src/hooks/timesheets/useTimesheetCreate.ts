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
      const message =
        error instanceof Error ? error.message : "Failed to create timesheet";
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


