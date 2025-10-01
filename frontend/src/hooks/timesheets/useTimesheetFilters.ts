import { useMemo } from "react";
import { TimesheetService } from "../../services/timesheets";
import type { Timesheet } from "../../types/api";

export interface UseTimesheetFiltersOptions {
  role?: string;
}

export interface UseTimesheetFiltersResult {
  actionableTimesheets: Timesheet[];
}

export const useTimesheetFilters = (
  timesheets: Timesheet[],
  options: UseTimesheetFiltersOptions = {},
): UseTimesheetFiltersResult => {
  const { role } = options;

  return useMemo(() => {
    if (!role) {
      return { actionableTimesheets: [] };
    }

    return {
      actionableTimesheets: TimesheetService.getActionableTimesheets(
        timesheets,
        role,
      ),
    };
  }, [role, timesheets]);
};

export const useActionableTimesheets = (
  timesheets: Timesheet[],
  userRole?: string,
): Timesheet[] =>
  useTimesheetFilters(timesheets, { role: userRole }).actionableTimesheets;
