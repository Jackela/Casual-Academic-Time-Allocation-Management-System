export type AdminTabId = 'overview' | 'pending' | 'users' | 'analytics' | 'settings';

export interface AdminSummaryMetrics {
  totalTimesheets: number;
  pendingApprovals: number;
  totalHours: number;
  totalPay: number;
  tutorCount: number | null;
}

export interface AdminTabSpec {
  id: AdminTabId;
  label: string;
}

export interface ActionState {
  loadingId: number | null;
  isSubmitting: boolean;
}
