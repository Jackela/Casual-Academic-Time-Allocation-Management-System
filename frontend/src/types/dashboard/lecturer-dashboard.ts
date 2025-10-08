import type { Timesheet } from '../api';

export interface LecturerDashboardMetrics {
  pendingApproval: number;
  totalTimesheets: number;
  thisWeekHours: number;
  thisWeekPay: number;
  statusBreakdown: Partial<Record<string, number>>;
}

export interface LecturerDashboardErrors {
  pending: string | null;
  dashboard: string | null;
  approval: string | null;
  hasErrors: boolean;
}

export interface LecturerDashboardLoading {
  pending: boolean;
  dashboard: boolean;
  approval: boolean;
}

export interface LecturerRejectionModalState {
  open: boolean;
  timesheetId: number | null;
}

export interface LecturerDashboardFilters {
  searchQuery: string;
  showOnlyUrgent: boolean;
  courseId: string;
}

export interface LecturerSelectionState {
  canPerformApprovals: boolean;
  selectedTimesheets: number[];
}

export interface LecturerDashboardContext {
  metrics: LecturerDashboardMetrics;
  timesheets: Timesheet[];
  urgentCount: number;
}

export interface LecturerCourseOption {
  value: string;
  label: string;
}
