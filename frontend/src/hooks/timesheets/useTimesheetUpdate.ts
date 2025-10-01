import { useCallback, useState } from "react";
import { TimesheetService } from "../../services/timesheets";
import type { Timesheet, TimesheetUpdateRequest } from "../../types/api";
import {
  createInitialMutationState,
  safeSetMutationState,
} from "./mutationState";
import type { MutationState } from "./mutationState";

export interface UseTimesheetUpdateResult extends MutationState<Timesheet> {
  updateTimesheet: (
    id: number,
    input: TimesheetUpdateRequest,
  ) => Promise<Timesheet>;
  reset: () => void;
}

export const useTimesheetUpdate = (): UseTimesheetUpdateResult => {
  const [state, setState] = useState<MutationState<Timesheet>>(
    createInitialMutationState(),
  );

  const updateTimesheet = useCallback(
    async (id: number, input: TimesheetUpdateRequest) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const timesheet = await TimesheetService.updateTimesheet(id, input);
        safeSetMutationState(setState, {
          data: timesheet,
          loading: false,
          error: null,
        });
        return timesheet;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update timesheet";
        safeSetMutationState(setState, {
          data: null,
          loading: false,
          error: message,
        });
        throw new Error(message);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    safeSetMutationState(setState, createInitialMutationState());
  }, []);

  return {
    ...state,
    updateTimesheet,
    reset,
  };
};

export { useTimesheetUpdate as useUpdateTimesheet };


