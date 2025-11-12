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
  firstName?: string;
  lastName?: string;
  displayName?: string;
  qualification?: TutorQualification;
  defaultQualification?: TutorQualification;
  isActive?: boolean;
  active?: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  user: User;
}

export interface AuthResult extends AuthSession {
  success: boolean;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type LoginResponse = AuthSession;

// =============================================================================
// Timesheet Types
// =============================================================================

export type TimesheetTaskType =
  | 'LECTURE'
  | 'TUTORIAL'
  | 'ORAA'
  | 'DEMO'
  | 'MARKING'
  | 'OTHER';

export type TutorQualification = 'PHD' | 'COORDINATOR' | 'STANDARD';

export interface Timesheet {
  id: number;
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  sessionDate?: string;
  hours: number;
  hourlyRate: number;
  deliveryHours?: number;
  associatedHours?: number;
  totalPay?: number;
  /**
   * Derived on the backend to indicate if the current user can edit the timesheet.
   * Falls back to client-side capability rules when undefined.
   */
  isEditable?: boolean;
  description: string;
  status: TimesheetStatus;
  taskType?: TimesheetTaskType;
  isRepeat?: boolean;
  qualification?: TutorQualification;
  rateCode?: string;
  calculationFormula?: string;
  clauseReference?: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields from backend joins
  tutorName?: string;
  courseName?: string;
  courseCode?: string;
  submitterName?: string;
  lecturerName?: string;
  rejectionReason?: string;
}

export type TimesheetStatus =
  | 'DRAFT'
  | 'PENDING_TUTOR_CONFIRMATION'
  | 'TUTOR_CONFIRMED'
  | 'LECTURER_CONFIRMED'
  | 'FINAL_CONFIRMED'
  | 'REJECTED'
  | 'MODIFICATION_REQUESTED';

export interface TimesheetQuoteRequest {
  tutorId: number;
  courseId: number;
  sessionDate: string;
  taskType: TimesheetTaskType;
  qualification: TutorQualification;
  isRepeat: boolean;
  deliveryHours: number;
}

export interface TimesheetQuoteResponse {
  taskType: TimesheetTaskType;
  rateCode: string;
  qualification: TutorQualification;
  isRepeat: boolean;
  deliveryHours: number;
  associatedHours: number;
  payableHours: number;
  hourlyRate: number;
  amount: number;
  formula: string;
  clauseReference: string | null;
  sessionDate: string;
}

export interface TimesheetCreateRequest {
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  sessionDate: string;
  deliveryHours: number;
  description: string;
  taskType: TimesheetTaskType;
  qualification: TutorQualification;
  isRepeat: boolean;
}

export interface TimesheetUpdateRequest extends Partial<Omit<TimesheetCreateRequest, 'tutorId' | 'courseId'>> {
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

// =============================================================================
// Dashboard & Summary Types  
// =============================================================================

export interface DashboardActivity {
  id: number | string;
  type?: string;
  description: string;
  timestamp: string;
  timesheetId?: number;
  userId?: number;
  userName?: string;
}

export interface DashboardSystemMetrics {
  systemLoad: number;
  activeUsers: number;
  averageApprovalTime: number;
  activeCourses?: number;
  alerts?: string[];
}

export interface DashboardDeadline {
  id?: number | string;
  courseId?: number;
  courseName?: string;
  title?: string;
  dueDate?: string;
  deadline?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DashboardSupportResource {
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon?: string;
}

export interface DashboardSummary {
  totalTimesheets?: number;
  pendingApprovals?: number;
  pendingApproval?: number;
  pendingConfirmations?: number;
  approvedTimesheets?: number;
  rejectedTimesheets?: number;
  totalHours?: number;
  totalPayroll?: number;
  totalPay?: number;
  thisWeekHours?: number;
  thisWeekPay?: number;
  statusBreakdown?: Record<string, number>;
  recentActivity?: DashboardActivity[];
  upcomingDeadlines?: DashboardDeadline[];
  deadlines?: DashboardDeadline[];
  systemMetrics?: DashboardSystemMetrics;
  lecturerCount?: number;
  tutorCount?: number;
  courseCount?: number;
  activeUsers?: number;
  systemHealth?: 'HEALTHY' | 'WARNING' | 'ERROR';
  supportResources?: DashboardSupportResource[];
  nextPaymentDate?: string | null;
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
  | 'FINAL_APPROVAL'
  | 'REJECT'
  | 'REQUEST_MODIFICATION'
  | 'EDIT'
  | 'SUBMIT_DRAFT';

export interface ApprovalResponse {
  success: boolean;
  message: string;
  timesheetId: number;
  newStatus: TimesheetStatus;
}

// =============================================================================
// API Response & Error Types
// =============================================================================

export interface ErrorDetail {
  field?: string;
  code?: string;
  message: string;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  details?: ErrorDetail[];
  meta?: Record<string, unknown>;
}

export interface ApiResponseMeta {
  timestamp: string;
  status?: number;
  path?: string;
}

export interface ApiSuccessResponse<T> extends ApiResponseMeta {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse extends ApiResponseMeta {
  success: false;
  message: string;
  error: ErrorEnvelope;
}

export type ApiResponse<T> = ApiSuccessResponse<T>;

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
  tutorName?: string;
  courseName?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
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
  password: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: User['role'];
  password?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  active?: boolean;
}

export interface TutorAssignmentPayload {
  tutorId: number;
  courseIds: number[];
}

export interface TutorDefaultsPayload {
  tutorId: number;
  defaultQualification: TutorQualification;
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
  return [
    'SUBMIT_FOR_APPROVAL',
    'TUTOR_CONFIRM',
    'LECTURER_CONFIRM',
    'HR_CONFIRM',
    'REJECT',
    'REQUEST_MODIFICATION',
    'EDIT',
    'SUBMIT_DRAFT'
  ].includes(action as ApprovalAction);
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
    ME: '/api/timesheets/me',
    PENDING_APPROVAL: '/api/timesheets/pending-approval',
    QUOTE: '/api/timesheets/quote',
    BY_TUTOR: (tutorId: number) => `/api/timesheets/tutor/${tutorId}`,
    BY_COURSE: (courseId: number) => `/api/timesheets/course/${courseId}`,
    APPROVE: '/api/approvals'
  },
  USERS: {
    BASE: '/api/users',
    BY_ROLE: (role: string) => `/api/users/role/${role}`,
    PROFILE: '/api/users/profile',
    ADMIN: {
      TUTOR_ASSIGNMENTS: '/api/admin/tutors/assignments',
      TUTOR_DEFAULTS: '/api/admin/tutors/defaults'
    }
  },
  COURSES: {
    BASE: '/api/courses',
    ACTIVE: '/api/courses/active'
  },
  DASHBOARD: {
    SUMMARY: '/api/dashboard/summary',
    ADMIN_SUMMARY: '/api/dashboard/summary'
  },
  APPROVALS: {
    PENDING: '/api/approvals/pending',
    HISTORY: (timesheetId: number) => `/api/approvals/history/${timesheetId}`,
  },
  HEALTH: '/api/health'
} as const;

