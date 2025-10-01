import { useMemo } from "react";
import { TimesheetService } from "../../services/timesheets";
import type { Timesheet } from "../../types/api";

export interface TimesheetStatistics {
  totalHours: number;
  totalPay: number;
  totalCount: number;
  groupedByStatus: ReturnType<typeof TimesheetService.groupByStatus>;
  statusCounts: Record<string, number>;
  averageHoursPerTimesheet: number;
  averagePayPerTimesheet: number;
}

export const useTimesheetStatistics = (
  timesheets: Timesheet[],
): TimesheetStatistics =>
  useMemo(() => {
    const totalHours = TimesheetService.calculateTotalHours(timesheets);
    const totalPay = TimesheetService.calculateTotalPay(timesheets);
    const groupedByStatus = TimesheetService.groupByStatus(timesheets);

    const statusCounts = Object.entries(groupedByStatus).reduce(
      (accumulator, [status, sheets]) => {
        accumulator[status] = sheets.length;
        return accumulator;
      },
      {} as Record<string, number>,
    );

    const averageHoursPerTimesheet =
      timesheets.length > 0 ? totalHours / timesheets.length : 0;
    const averagePayPerTimesheet =
      timesheets.length > 0 ? totalPay / timesheets.length : 0;

    return {
      totalHours,
      totalPay,
      totalCount: timesheets.length,
      groupedByStatus,
      statusCounts,
      averageHoursPerTimesheet,
      averagePayPerTimesheet,
    };
  }, [timesheets]);

export const useTimesheetStats = (
  timesheets: Timesheet[],
): TimesheetStatistics => useTimesheetStatistics(timesheets);
