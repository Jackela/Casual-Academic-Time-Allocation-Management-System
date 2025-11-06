/**
 * Timesheet Service
 * 
 * All timesheet-related API operations with optimized caching,
 * pagination, and filtering capabilities.
 */

import { secureApiClient } from './api-secure';
import type {
  Timesheet,
  TimesheetPage,
  TimesheetQuery,
  TimesheetCreateRequest,
  TimesheetUpdateRequest,
  TimesheetQuoteRequest,
  TimesheetQuoteResponse,
  ApprovalRequest,
  ApprovalResponse,
  DashboardSummary,
} from '../types/api';

type ApiApprovalAction =
  | 'SUBMIT_FOR_APPROVAL'
  | 'TUTOR_CONFIRM'
  | 'LECTURER_CONFIRM'
  | 'HR_CONFIRM'
  | 'REJECT'
  | 'REQUEST_MODIFICATION';

const APPROVAL_ACTION_MAP: Record<string, ApiApprovalAction> = {
  SUBMIT_DRAFT: 'SUBMIT_FOR_APPROVAL',
  FINAL_APPROVAL: 'HR_CONFIRM',
  FINAL_CONFIRMED: 'HR_CONFIRM',
  APPROVE: 'HR_CONFIRM',
  CONFIRM: 'TUTOR_CONFIRM',
  TUTOR_CONFIRM: 'TUTOR_CONFIRM',
  LECTURER_CONFIRM: 'LECTURER_CONFIRM',
  LECTURER_CONFIRMED: 'LECTURER_CONFIRM',
  REJECT: 'REJECT',
  REJECTED: 'REJECT',
  REQUEST_MODIFICATION: 'REQUEST_MODIFICATION'
};

const VALID_API_ACTIONS: readonly ApiApprovalAction[] = [
  'SUBMIT_FOR_APPROVAL',
  'TUTOR_CONFIRM',
  'LECTURER_CONFIRM',
  'HR_CONFIRM',
  'REJECT',
  'REQUEST_MODIFICATION'
];

function normalizeApprovalAction(action: ApprovalRequest['action']): ApiApprovalAction {
  const mapped = APPROVAL_ACTION_MAP[action as string];
  if (mapped) {
    return mapped;
  }
  if ((VALID_API_ACTIONS as readonly string[]).includes(action as string)) {
    return action as ApiApprovalAction;
  }
  throw new Error(`Unsupported approval action: ${action}`);
}
// =============================================================================
// Timesheet CRUD Operations
// =============================================================================

export class TimesheetService {
  
  /**
   * Get paginated timesheets with filtering
   */
  static async getTimesheets(query: TimesheetQuery = {}, signal?: AbortSignal): Promise<TimesheetPage> {
    const sortField = query.sortBy || 'createdAt';
    const sortDir = (query.sortDirection || 'desc').toLowerCase();
    const sort = `${sortField},${sortDir}`;
    const queryString = secureApiClient.createQueryString({
      page: query.page || 0,
      size: query.size || 20,
      status: query.status,
      tutorId: query.tutorId,
      courseId: query.courseId,
      weekStartDate: query.weekStartDate,
      startDate: query.startDate,
      endDate: query.endDate,
      sort,
    });

    const response = await secureApiClient.get<TimesheetPage>(
      `/api/timesheets?${queryString}`,
      signal ? { signal } : undefined,
    );

    return this.ensureTimesheetPage(response.data);
  }

  /**
   * Get pending timesheets for lecturer approval
   */
  static async getPendingTimesheets(signal?: AbortSignal): Promise<TimesheetPage> {
    const response = await secureApiClient.get<TimesheetPage>('/api/timesheets/pending-final-approval', { signal });
    return this.ensureTimesheetPage(response.data);
  }

  /**
   * Get current user's timesheets (EA-compliant endpoint)
   * Maps array or paginated payloads into TimesheetPage
   */
  static async getMyTimesheets(signal?: AbortSignal): Promise<TimesheetPage> {
    const { API_ENDPOINTS } = await import('../types/api');
    const response = await secureApiClient.get<unknown>(API_ENDPOINTS.TIMESHEETS.ME, { signal });
    const data = (response as any)?.data;
    if (Array.isArray(data)) {
      return this.ensureTimesheetPage({ success: true, timesheets: data });
    }
    return this.ensureTimesheetPage(data as TimesheetPage | undefined);
  }

  /**
   * Get timesheets pending for the current approver (Lecturer scope)
   * New EA-compliant endpoint
   */
  static async getMyPendingTimesheets(signal?: AbortSignal): Promise<TimesheetPage> {
    const { API_ENDPOINTS } = await import('../types/api');
    try {
      const response = await secureApiClient.get<unknown>(API_ENDPOINTS.TIMESHEETS.PENDING_APPROVAL, { signal });
      const data = (response as any)?.data;
      if (Array.isArray(data)) {
        return this.ensureTimesheetPage({ success: true, timesheets: data });
      }
      return this.ensureTimesheetPage(data as TimesheetPage | undefined);
    } catch (err: any) {
      // Usability-first: treat 403 as an empty queue for lecturer scope
      const status = err?.response?.status ?? err?.status;
      if (status === 403) {
        return this.ensureTimesheetPage({ success: true, timesheets: [] } as any);
      }
      throw err;
    }
  }

  /**
   * Get timesheets by tutor ID
   */
  static async getTimesheetsByTutor(
    tutorId: number,
    query: Omit<TimesheetQuery, 'tutorId'> = {},
    signal?: AbortSignal,
  ): Promise<TimesheetPage> {
    return this.getTimesheets(
      {
        ...query,
        tutorId,
      },
      signal,
    );
  }

  /**
   * Get single timesheet by ID
   */
  static async getTimesheet(id: number): Promise<Timesheet> {
    const response = await secureApiClient.get<Timesheet>(`/api/timesheets/${id}`);
    return response.data;
  }

  /**
   * Retrieve an EA-compliant quote for a proposed timesheet entry.
   */
  static async quoteTimesheet(request: TimesheetQuoteRequest, signal?: AbortSignal): Promise<TimesheetQuoteResponse> {
    const { API_ENDPOINTS } = await import('../types/api');
    const response = await secureApiClient.post<TimesheetQuoteResponse, TimesheetQuoteRequest>(
      API_ENDPOINTS.TIMESHEETS.QUOTE,
      request,
      signal ? { signal } : undefined,
    );
    return response.data;
  }

  /**
   * Create new timesheet
   */
  static async createTimesheet(data: TimesheetCreateRequest): Promise<Timesheet> {
    const { API_ENDPOINTS } = await import('../types/api');
    const response = await secureApiClient.post<Timesheet>(API_ENDPOINTS.TIMESHEETS.BASE, data);
    return response.data;
  }

  /**
   * Update existing timesheet
   */
  static async updateTimesheet(id: number, data: TimesheetUpdateRequest): Promise<Timesheet> {
    const response = await secureApiClient.put<Timesheet>(`/api/timesheets/${id}`, data);
    return response.data;
  }

  /**
   * Delete timesheet
   */
  static async deleteTimesheet(id: number): Promise<void> {
    await secureApiClient.delete(`/api/timesheets/${id}`);
  }

  // ---------------------------------------------------------------------------
  // Approval Operations
  // ---------------------------------------------------------------------------

  /**
   * Approve or reject timesheet
   */
  static async approveTimesheet(request: ApprovalRequest): Promise<ApprovalResponse> {
    const payload = {
      timesheetId: request.timesheetId,
      action: normalizeApprovalAction(request.action),
      comment: request.comment ?? null,
    };
    const response = await secureApiClient.post<ApprovalResponse>('/api/approvals', payload);
    return response.data;
  }

  /**
   * Explicit Tutor confirmation before approvals (EA-compliant)
   */
  static async confirmTimesheet(id: number): Promise<Timesheet> {
    const { API_ENDPOINTS } = await import('../types/api');
    const response = await secureApiClient.put<Timesheet>(API_ENDPOINTS.TIMESHEETS.CONFIRM(id), {});
    return response.data;
  }

  /**
   * Get approval history entries for a timesheet
   */
  static async getApprovalHistory(timesheetId: number): Promise<readonly unknown[]> {
    const { API_ENDPOINTS } = await import('../types/api');
    const response = await secureApiClient.get<readonly unknown[]>(API_ENDPOINTS.APPROVALS.HISTORY(timesheetId));
    return response.data ?? [];
  }

  /**
   * Admin/HR pending approvals queue
   */
  static async getPendingApprovals(signal?: AbortSignal): Promise<TimesheetPage> {
    const { API_ENDPOINTS } = await import('../types/api');
    try {
      const response = await secureApiClient.get<unknown>(API_ENDPOINTS.APPROVALS.PENDING, { signal });
      const data = (response as any)?.data;
      if (Array.isArray(data)) {
        return this.ensureTimesheetPage({ success: true, timesheets: data });
      }
      return this.ensureTimesheetPage(data as TimesheetPage | undefined);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status === 403) {
        // Admin/lecturer without queue should not break UI
        return this.ensureTimesheetPage({ success: true, timesheets: [] } as any);
      }
      throw err;
    }
  }

  /**
   * Batch approve multiple timesheets
   */
  static async batchApproveTimesheets(requests: ApprovalRequest[]): Promise<ApprovalResponse[]> {
    const promises = requests.map(request => this.approveTimesheet(request));
    return Promise.all(promises);
  }

  // ---------------------------------------------------------------------------
  // Dashboard & Summary Operations
  // ---------------------------------------------------------------------------

  /**
   * Get dashboard summary for current user
   */
  static async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await secureApiClient.get<DashboardSummary>('/api/dashboard/summary');
    return response.data;
  }

  /**
   * Get admin dashboard summary
   */
  static async getAdminDashboardSummary(): Promise<DashboardSummary> {
    const response = await secureApiClient.get<DashboardSummary>('/api/dashboard/summary');
    return response.data;
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Calculate total hours for timesheets
   */
  static calculateTotalHours(timesheets: Timesheet[]): number {
    return timesheets.reduce((total, timesheet) => total + timesheet.hours, 0);
  }

  /**
   * Calculate total pay for timesheets
   */
  static calculateTotalPay(timesheets: Timesheet[]): number {
    return timesheets.reduce((total, timesheet) => {
      return total + (timesheet.hours * timesheet.hourlyRate);
    }, 0);
  }

  /**
   * Group timesheets by status
   */
  static groupByStatus(timesheets: Timesheet[]): Record<string, Timesheet[]> {
    return timesheets.reduce((groups, timesheet) => {
      const status = timesheet.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(timesheet);
      return groups;
    }, {} as Record<string, Timesheet[]>);
  }

  /**
   * Filter timesheets by date range
   */
  static filterByDateRange(
    timesheets: Timesheet[], 
    startDate: string, 
    endDate: string
  ): Timesheet[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return timesheets.filter(timesheet => {
      const timesheetDate = new Date(timesheet.weekStartDate);
      return timesheetDate >= start && timesheetDate <= end;
    });
  }

  /**
   * Get timesheets requiring action by user role
   */
  static getActionableTimesheets(timesheets: Timesheet[], userRole: string): Timesheet[] {
    switch (userRole) {
      case 'LECTURER':
        return timesheets.filter(t => t.status === 'TUTOR_CONFIRMED' || t.status === 'MODIFICATION_REQUESTED');
      case 'ADMIN':
        return timesheets.filter(t => t.status === 'LECTURER_CONFIRMED');
      case 'TUTOR':
        return timesheets.filter(t => ['DRAFT', 'MODIFICATION_REQUESTED', 'PENDING_TUTOR_CONFIRMATION'].includes(t.status));
      default:
        return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helper Methods
  // ---------------------------------------------------------------------------

  /**
   * Ensure we always return a fully populated timesheet page structure
   */
  private static ensureTimesheetPage(payload: TimesheetPage | undefined): TimesheetPage {
    const timesheets = payload?.timesheets ?? [];
    const pageInfo = payload?.pageInfo ?? {
      currentPage: 0,
      pageSize: timesheets.length,
      totalElements: timesheets.length,
      totalPages: 1,
      first: true,
      last: true,
      numberOfElements: timesheets.length,
      empty: timesheets.length === 0,
    };

    return {
      success: payload?.success ?? true,
      timesheets,
      pageInfo,
    };
  }

  /**
   * Validate timesheet data before submission
   */
  static validateTimesheet(timesheet: Partial<TimesheetCreateRequest>): string[] {
    const errors: string[] = [];

    if (!timesheet.tutorId || timesheet.tutorId <= 0) {
      errors.push('Valid tutor ID is required');
    }

    if (!timesheet.courseId || timesheet.courseId <= 0) {
      errors.push('Valid course ID is required');
    }

    if (!timesheet.weekStartDate) {
      errors.push('Week start date is required');
    }

    if (!timesheet.sessionDate) {
      errors.push('Session date is required');
    }

    if (typeof timesheet.deliveryHours !== 'number' || timesheet.deliveryHours <= 0 || timesheet.deliveryHours > 10) {
      errors.push('Delivery hours must be between 0.1 and 10');
    }

    if (!timesheet.taskType) {
      errors.push('Task type is required');
    }

    if (!timesheet.qualification) {
      errors.push('Qualification is required');
    }

    if (!timesheet.description || timesheet.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (timesheet.description && timesheet.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    return errors;
  }
}

// =============================================================================
// Export convenience functions
// =============================================================================

export const {
  getTimesheets,
  getPendingTimesheets,
  getTimesheetsByTutor,
  getTimesheet,
  quoteTimesheet,
  createTimesheet,
  updateTimesheet,
  deleteTimesheet,
  approveTimesheet,
  batchApproveTimesheets,
  getDashboardSummary,
  getAdminDashboardSummary,
  calculateTotalHours,
  calculateTotalPay,
  groupByStatus,
  filterByDateRange,
  getActionableTimesheets,
  validateTimesheet
} = TimesheetService;

