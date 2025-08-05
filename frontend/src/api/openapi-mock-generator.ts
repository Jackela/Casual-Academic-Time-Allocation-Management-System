/**
 * OpenAPI-Based Mock Generator for CATAMS Frontend Testing
 * 
 * This module generates type-safe mock data based on OpenAPI schema definitions,
 * ensuring consistency between frontend tests and backend API contracts.
 * 
 * Features:
 * - Zod-based schema validation
 * - Automated boundary value generation
 * - Type-safe mock data creation
 * - OpenAPI specification compliance
 */

import { z } from 'zod';

// ========================================
// OpenAPI Schema Types (Based on docs/openapi.yaml)
// ========================================

export const TimesheetCreateRequestSchema = z.object({
  tutorId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().min(0.1).max(60.0),
  hourlyRate: z.number().min(0.01).max(200.00),
  description: z.string().min(1).max(1000),
});

export const TimesheetResponseSchema = z.object({
  id: z.number().int().positive(),
  tutorId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  weekStartDate: z.string(),
  hours: z.number().min(0),
  hourlyRate: z.number().min(0),
  description: z.string(),
  status: z.enum(['DRAFT', 'PENDING_TUTOR_REVIEW', 'TUTOR_APPROVED', 'PENDING_HR_REVIEW', 'HR_APPROVED', 'FINAL_APPROVED', 'REJECTED', 'MODIFICATION_REQUESTED']),
  tutorName: z.string(),
  courseName: z.string(),
  courseCode: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PageInfoSchema = z.object({
  totalElements: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  currentPage: z.number().int().min(0),
  pageSize: z.number().int().positive(),
  first: z.boolean(),
  last: z.boolean(),
  numberOfElements: z.number().int().min(0),
  empty: z.boolean(),
});

export const TimesheetPageResponseSchema = z.object({
  success: z.boolean(),
  timesheets: z.array(TimesheetResponseSchema),
  pageInfo: PageInfoSchema,
});

export const AuthResultSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  user: z.object({
    id: z.number().int().positive(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['LECTURER', 'TUTOR', 'ADMIN']),
  }).optional(),
  errorMessage: z.string().optional(),
});

export const ApprovalActionRequestSchema = z.object({
  timesheetId: z.number().int().positive(),
  action: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().optional(),
});

export const ApprovalActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timesheetId: z.number().int().positive().optional(),
  newStatus: z.enum(['APPROVED', 'REJECTED']).optional(),
});

export const ErrorResponseSchema = z.object({
  timestamp: z.string(),
  status: z.number().int(),
  error: z.string(),
  message: z.string(),
  path: z.string(),
});

// ========================================
// Type Definitions
// ========================================

export type TimesheetCreateRequest = z.infer<typeof TimesheetCreateRequestSchema>;
export type TimesheetResponse = z.infer<typeof TimesheetResponseSchema>;
export type TimesheetPageResponse = z.infer<typeof TimesheetPageResponseSchema>;
export type AuthResult = z.infer<typeof AuthResultSchema>;
export type ApprovalActionRequest = z.infer<typeof ApprovalActionRequestSchema>;
export type ApprovalActionResponse = z.infer<typeof ApprovalActionResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ========================================
// Mock Data Generator
// ========================================

export class OpenAPIMockGenerator {
  private static baseDate = new Date('2025-01-27'); // Monday for weekStartDate validation
  private static userId = 1;
  private static timesheetId = 1;

  /**
   * Generate boundary value test cases for TimesheetCreateRequest
   */
  static generateTimesheetCreateBoundaryValues(): {
    valid: TimesheetCreateRequest[];
    invalid: Partial<TimesheetCreateRequest>[];
  } {
    return {
      valid: [
        // Minimum boundary values
        {
          tutorId: 1,
          courseId: 1,
          weekStartDate: '2025-01-27', // Monday
          hours: 0.1, // minimum
          hourlyRate: 0.01, // minimum
          description: 'A', // minimum length
        },
        // Maximum boundary values
        {
          tutorId: 999999,
          courseId: 999999,
          weekStartDate: '2025-12-29', // Monday
          hours: 60.0, // maximum
          hourlyRate: 200.00, // maximum
          description: 'A'.repeat(1000), // maximum length
        },
        // Typical values
        {
          tutorId: 123,
          courseId: 456,
          weekStartDate: '2025-02-03',
          hours: 10.5,
          hourlyRate: 45.00,
          description: 'Tutorial sessions and assignment marking',
        },
      ],
      invalid: [
        // Invalid hours
        { hours: 0.0 }, // below minimum
        { hours: 60.1 }, // above maximum
        { hours: -1 }, // negative
        
        // Invalid hourlyRate
        { hourlyRate: 0.0 }, // below minimum
        { hourlyRate: 200.01 }, // above maximum
        { hourlyRate: -10 }, // negative
        
        // Invalid description
        { description: '' }, // empty
        { description: 'A'.repeat(1001) }, // too long
        
        // Invalid date format
        { weekStartDate: '2025-1-27' }, // wrong format
        { weekStartDate: '2025-01-28' }, // not Monday
        
        // Missing required fields
        { tutorId: undefined },
        { courseId: undefined },
      ],
    };
  }

  /**
   * Generate realistic timesheet responses
   */
  static generateTimesheetResponse(overrides: Partial<TimesheetResponse> = {}): TimesheetResponse {
    const id = this.timesheetId++;
    const defaults: TimesheetResponse = {
      id,
      tutorId: 2,
      courseId: 1,
      weekStartDate: '2025-01-27',
      hours: 10.0,
      hourlyRate: 45.00,
      description: `Tutorial sessions for week ${id}`,
      status: 'PENDING_TUTOR_REVIEW',
      tutorName: 'John Doe',
      courseName: 'Introduction to Programming',
      courseCode: 'COMP1001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Generate paginated timesheet responses
   */
  static generateTimesheetPageResponse(
    timesheetCount: number = 2,
    pageSize: number = 20,
    currentPage: number = 0
  ): TimesheetPageResponse {
    const timesheets = Array.from({ length: timesheetCount }, (_, i) =>
      this.generateTimesheetResponse({
        id: i + 1,
        weekStartDate: this.getMonday(i), // Different weeks
      })
    );

    const totalPages = Math.ceil(timesheetCount / pageSize);

    return {
      success: true,
      timesheets,
      pageInfo: {
        totalElements: timesheetCount,
        totalPages,
        currentPage,
        pageSize,
        first: currentPage === 0,
        last: currentPage === totalPages - 1,
        numberOfElements: timesheets.length,
        empty: timesheetCount === 0,
      },
    };
  }

  /**
   * Generate authentication responses for different roles
   */
  static generateAuthResponse(
    role: 'LECTURER' | 'TUTOR' | 'ADMIN' = 'LECTURER',
    success: boolean = true
  ): AuthResult {
    if (!success) {
      return {
        success: false,
        errorMessage: 'Invalid email or password',
      };
    }

    const userId = this.userId++;
    return {
      success: true,
      token: `mock-jwt-token-${role.toLowerCase()}-${userId}`,
      user: {
        id: userId,
        email: `${role.toLowerCase()}${userId}@example.com`,
        name: `Test ${role}`,
        role,
      },
    };
  }

  /**
   * Generate approval action responses
   */
  static generateApprovalResponse(
    action: 'APPROVE' | 'REJECT',
    timesheetId: number
  ): ApprovalActionResponse {
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    
    return {
      success: true,
      message: action === 'APPROVE' 
        ? 'Timesheet has been approved successfully'
        : 'Timesheet has been rejected successfully',
      timesheetId,
      newStatus,
    };
  }

  /**
   * Generate error responses for different HTTP status codes
   */
  static generateErrorResponse(
    status: number,
    error: string,
    message: string,
    path: string = '/api/test'
  ): ErrorResponse {
    return {
      timestamp: new Date().toISOString(),
      status,
      error,
      message,
      path,
    };
  }

  /**
   * Generate comprehensive test scenarios
   */
  static generateTestScenarios() {
    return {
      // Authentication scenarios
      auth: {
        lecturerLogin: this.generateAuthResponse('LECTURER'),
        tutorLogin: this.generateAuthResponse('TUTOR'),
        adminLogin: this.generateAuthResponse('ADMIN'),
        loginFailure: this.generateAuthResponse('LECTURER', false),
      },

      // Timesheet scenarios
      timesheets: {
        empty: this.generateTimesheetPageResponse(0),
        singlePage: this.generateTimesheetPageResponse(5),
        multiPage: this.generateTimesheetPageResponse(25, 20, 0),
        lastPage: this.generateTimesheetPageResponse(3, 20, 1),
        pending: this.generateTimesheetPageResponse(3).timesheets.map(t => ({
          ...t,
          status: 'PENDING_TUTOR_REVIEW' as const,
        })),
        approved: this.generateTimesheetPageResponse(2).timesheets.map(t => ({
          ...t,
          status: 'FINAL_APPROVED' as const,
        })),
      },

      // Approval scenarios
      approvals: {
        approve: this.generateApprovalResponse('APPROVE', 1),
        reject: this.generateApprovalResponse('REJECT', 2),
      },

      // Error scenarios
      errors: {
        unauthorized: this.generateErrorResponse(401, 'Unauthorized', 'Invalid or expired token'),
        forbidden: this.generateErrorResponse(403, 'Forbidden', 'Access denied'),
        notFound: this.generateErrorResponse(404, 'Not Found', 'Resource not found'),
        validation: this.generateErrorResponse(400, 'Bad Request', 'Validation failed'),
        serverError: this.generateErrorResponse(500, 'Internal Server Error', 'An unexpected error occurred'),
      },
    };
  }

  /**
   * Validate mock data against OpenAPI schemas
   */
  static validateMockData<T>(data: unknown, schema: z.ZodSchema<T>): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(`Mock data validation failed: ${result.error.message}`);
    }
    return result.data;
  }

  // Helper methods
  private static getMonday(weeksFromNow: number = 0): string {
    const monday = new Date(this.baseDate);
    monday.setDate(monday.getDate() + weeksFromNow * 7);
    return monday.toISOString().split('T')[0];
  }
}

// ========================================
// Export for testing
// ========================================

export const MockScenarios = OpenAPIMockGenerator.generateTestScenarios();