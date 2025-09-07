/**
 * Centralized API Type Definitions
 * 
 * This file contains all shared interface definitions used across the application
 * to eliminate duplication and ensure type consistency.
 */

// =============================================================================
// User & Authentication Types
// =============================================================================

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'LECTURER' | 'TUTOR';
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends AuthResult {}

// =============================================================================
// Timesheet Types
// =============================================================================

export interface Timesheet {
  id: number;
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  hours: number;
  hourlyRate: number;
  description: string;
  status: TimesheetStatus;
  createdAt: string;
  updatedAt: string;
  // Extended fields from backend joins
  tutorName?: string;
  courseName?: string;
  courseCode?: string;
  submitterName?: string;
  lecturerName?: string;
}

export type TimesheetStatus = 
  | 'DRAFT' 
  | 'PENDING_TUTOR_CONFIRMATION'
  | 'TUTOR_CONFIRMED' 
  | 'LECTURER_CONFIRMED'
  | 'FINAL_CONFIRMED'
  | 'REJECTED'
  | 'MODIFICATION_REQUESTED';

export interface TimesheetCreateRequest {
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  hours: number;
  hourlyRate: number;
  description: string;
}

export interface TimesheetUpdateRequest extends Partial<TimesheetCreateRequest> {
  status?: TimesheetStatus;
}

// =============================================================================
// Pagination & Response Types
// =============================================================================

export interface PageInfo {
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface TimesheetPage {
  success: boolean;
  timesheets: Timesheet[];
  pageInfo: PageInfo;
}

// Legacy response formats for backward compatibility
export interface TimesheetsResponse extends TimesheetPage {
  // Alias for backward compatibility
  content?: Timesheet[];
  data?: Timesheet[];
  page?: PageInfo;
}

export interface PendingTimesheetsResponse extends TimesheetsResponse {}

// =============================================================================
// Dashboard & Summary Types  
// =============================================================================

export interface DashboardSummary {
  totalTimesheets: number;
  pendingApprovals: number;
  totalHours: number;
  totalPayroll: number;
  // Admin-specific metrics
  activeUsers?: number;
  systemHealth?: 'HEALTHY' | 'WARNING' | 'ERROR';
  // Role-specific counts
  lecturerCount?: number;
  tutorCount?: number;
  courseCount?: number;
}

// =============================================================================
// Approval & Action Types
// =============================================================================

export interface ApprovalRequest {
  timesheetId: number;
  action: ApprovalAction;
  comment?: string;
}

export type ApprovalAction = 
  | 'SUBMIT_FOR_APPROVAL'
  | 'TUTOR_CONFIRM' 
  | 'LECTURER_CONFIRM'
  | 'HR_CONFIRM'
  | 'REJECT'
  | 'REQUEST_MODIFICATION';

export interface ApprovalResponse {
  success: boolean;
  message: string;
  timesheetId: number;
  newStatus: TimesheetStatus;
}

// =============================================================================
// API Response & Error Types
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  status: number;
  details?: Record<string, any>;
}

export interface HealthResponse {
  status: 'UP' | 'DOWN';
  components: {
    db: { status: 'UP' | 'DOWN' };
    [key: string]: { status: 'UP' | 'DOWN' };
  };
  timestamp: string;
}

// =============================================================================
// Query & Filter Types
// =============================================================================

export interface TimesheetQuery {
  page?: number;
  size?: number;
  status?: TimesheetStatus;
  tutorId?: number;
  courseId?: number;
  weekStartDate?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'weekStartDate' | 'hours' | 'status';
  sortDirection?: 'asc' | 'desc';
}

export interface UserQuery {
  page?: number;
  size?: number;
  role?: User['role'];
  active?: boolean;
  searchTerm?: string;
}

// =============================================================================
// Course & User Management Types
// =============================================================================

export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  lecturerId: number;
  lecturerName?: string;
  maxHoursPerWeek?: number;
  hourlyRate?: number;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: User['role'];
  password?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  active?: boolean;
}

// =============================================================================
// Type Guards & Utilities
// =============================================================================

export function isTimesheetStatus(status: string): status is TimesheetStatus {
  return [
    'DRAFT', 'PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 
    'LECTURER_CONFIRMED', 'FINAL_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'
  ].includes(status as TimesheetStatus);
}

export function isUserRole(role: string): role is User['role'] {
  return ['ADMIN', 'LECTURER', 'TUTOR'].includes(role as User['role']);
}

export function isApprovalAction(action: string): action is ApprovalAction {
  return ['SUBMIT_FOR_APPROVAL', 'TUTOR_CONFIRM', 'LECTURER_CONFIRM', 'HR_CONFIRM', 'REJECT', 'REQUEST_MODIFICATION'].includes(action as ApprovalAction);
}

// =============================================================================
// API Endpoint Constants
// =============================================================================

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    VERIFY: '/api/auth/verify'
  },
  TIMESHEETS: {
    BASE: '/api/timesheets',
    PENDING: '/api/timesheets/pending-final-approval',
    BY_TUTOR: (tutorId: number) => `/api/timesheets/tutor/${tutorId}`,
    BY_COURSE: (courseId: number) => `/api/timesheets/course/${courseId}`,
    APPROVE: '/api/approvals'
  },
  USERS: {
    BASE: '/api/users',
    BY_ROLE: (role: string) => `/api/users/role/${role}`,
    PROFILE: '/api/users/profile'
  },
  COURSES: {
    BASE: '/api/courses',
    ACTIVE: '/api/courses/active'
  },
  DASHBOARD: {
    SUMMARY: '/api/dashboard/summary',
    ADMIN_SUMMARY: '/api/dashboard/admin-summary'
  },
  HEALTH: '/api/health'
} as const;