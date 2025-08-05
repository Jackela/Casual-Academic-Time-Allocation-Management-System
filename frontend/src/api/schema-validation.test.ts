/**
 * OpenAPI Schema Validation Tests
 * 
 * Tests to ensure mock data compliance with OpenAPI schema definitions
 * and validate boundary conditions defined in the API specification.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { 
  OpenAPIMockGenerator,
  TimesheetCreateRequestSchema,
  TimesheetResponseSchema,
  TimesheetPageResponseSchema,
  AuthResultSchema,
  ApprovalActionResponseSchema,
  ErrorResponseSchema,
  MockScenarios
} from './openapi-mock-generator';

describe('OpenAPI Schema Validation', () => {
  describe('TimesheetCreateRequest Schema Compliance', () => {
    test('should validate correct timesheet creation requests', () => {
      const { valid } = OpenAPIMockGenerator.generateTimesheetCreateBoundaryValues();
      
      valid.forEach((request, index) => {
        expect(() => {
          TimesheetCreateRequestSchema.parse(request);
        }).not.toThrow(`Valid request ${index} should pass validation`);
      });
    });

    test('should reject invalid timesheet creation requests', () => {
      const { invalid } = OpenAPIMockGenerator.generateTimesheetCreateBoundaryValues();
      
      invalid.forEach((request, index) => {
        expect(() => {
          TimesheetCreateRequestSchema.parse(request);
        }).toThrow(); // Just check that it throws, don't check specific message
      });
    });

    test('should enforce OpenAPI boundary constraints', () => {
      // Test hours boundary (0.1 to 60.0)
      expect(() => {
        TimesheetCreateRequestSchema.parse({
          tutorId: 1,
          courseId: 1,
          weekStartDate: '2025-01-27',
          hours: 0.05, // Below minimum
          hourlyRate: 45.0,
          description: 'Test'
        });
      }).toThrow();

      expect(() => {
        TimesheetCreateRequestSchema.parse({
          tutorId: 1,
          courseId: 1,
          weekStartDate: '2025-01-27',
          hours: 60.5, // Above maximum
          hourlyRate: 45.0,
          description: 'Test'
        });
      }).toThrow();

      // Test hourlyRate boundary (0.01 to 200.00)
      expect(() => {
        TimesheetCreateRequestSchema.parse({
          tutorId: 1,
          courseId: 1,
          weekStartDate: '2025-01-27',
          hours: 10.0,
          hourlyRate: 0.005, // Below minimum
          description: 'Test'
        });
      }).toThrow();

      expect(() => {
        TimesheetCreateRequestSchema.parse({
          tutorId: 1,
          courseId: 1,
          weekStartDate: '2025-01-27',
          hours: 10.0,
          hourlyRate: 200.5, // Above maximum
          description: 'Test'
        });
      }).toThrow();

      // Test description length (max 1000 characters)
      expect(() => {
        TimesheetCreateRequestSchema.parse({
          tutorId: 1,
          courseId: 1,
          weekStartDate: '2025-01-27',
          hours: 10.0,
          hourlyRate: 45.0,
          description: 'A'.repeat(1001) // Exceeds maximum
        });
      }).toThrow();
    });

    test('should validate date format (YYYY-MM-DD)', () => {
      // Test clearly invalid formats that should definitely fail
      const invalidDates = [
        '25-01-27',       // Two digit year
        '2025/01/27',     // Wrong separator
        'invalid-date',   // Completely invalid
        '',               // Empty string
      ];

      invalidDates.forEach(date => {
        expect(() => {
          TimesheetCreateRequestSchema.parse({
            tutorId: 1,
            courseId: 1,
            weekStartDate: date,
            hours: 10.0,
            hourlyRate: 45.0,
            description: 'Test'
          });
        }).toThrow(); // Just check that it throws
      });

      // Test valid format
      expect(() => {
        TimesheetCreateRequestSchema.parse({
          tutorId: 1,
          courseId: 1,
          weekStartDate: '2025-01-27',
          hours: 10.0,
          hourlyRate: 45.0,
          description: 'Test'
        });
      }).not.toThrow();
    });
  });

  describe('TimesheetResponse Schema Compliance', () => {
    test('should validate generated timesheet responses', () => {
      const timesheet = OpenAPIMockGenerator.generateTimesheetResponse();
      
      expect(() => {
        TimesheetResponseSchema.parse(timesheet);
      }).not.toThrow();
      
      // Validate specific fields
      expect(timesheet.id).toBeGreaterThan(0);
      expect(timesheet.hours).toBeGreaterThanOrEqual(0);
      expect(timesheet.hourlyRate).toBeGreaterThanOrEqual(0);
      expect(['DRAFT', 'PENDING_TUTOR_REVIEW', 'TUTOR_APPROVED', 'PENDING_HR_REVIEW', 'HR_APPROVED', 'FINAL_APPROVED', 'REJECTED', 'MODIFICATION_REQUESTED']).toContain(timesheet.status);
    });

    test('should validate status enum values', () => {
      const validStatuses = ['DRAFT', 'PENDING_TUTOR_REVIEW', 'TUTOR_APPROVED', 'PENDING_HR_REVIEW', 'HR_APPROVED', 'FINAL_APPROVED', 'REJECTED', 'MODIFICATION_REQUESTED'];
      
      validStatuses.forEach(status => {
        const timesheet = OpenAPIMockGenerator.generateTimesheetResponse({ 
          status: status as any 
        });
        
        expect(() => {
          TimesheetResponseSchema.parse(timesheet);
        }).not.toThrow(`Status ${status} should be valid`);
      });

      // Invalid status
      expect(() => {
        const timesheet = OpenAPIMockGenerator.generateTimesheetResponse();
        TimesheetResponseSchema.parse({ ...timesheet, status: 'INVALID_STATUS' });
      }).toThrow();
    });
  });

  describe('Pagination Schema Compliance', () => {
    test('should validate paginated responses', () => {
      const paginatedResponse = OpenAPIMockGenerator.generateTimesheetPageResponse(10, 5, 1);
      
      expect(() => {
        TimesheetPageResponseSchema.parse(paginatedResponse);
      }).not.toThrow();

      // Validate pagination logic
      expect(paginatedResponse.pageInfo.totalElements).toBe(10);
      expect(paginatedResponse.pageInfo.totalPages).toBe(2); // ceil(10/5)
      expect(paginatedResponse.pageInfo.currentPage).toBe(1);
      expect(paginatedResponse.pageInfo.pageSize).toBe(5);
      expect(paginatedResponse.pageInfo.first).toBe(false);
      expect(paginatedResponse.pageInfo.last).toBe(true);
      expect(paginatedResponse.timesheets).toHaveLength(10);
    });

    test('should handle empty pagination correctly', () => {
      const emptyResponse = OpenAPIMockGenerator.generateTimesheetPageResponse(0);
      
      expect(() => {
        TimesheetPageResponseSchema.parse(emptyResponse);
      }).not.toThrow();

      expect(emptyResponse.pageInfo.empty).toBe(true);
      expect(emptyResponse.pageInfo.totalElements).toBe(0);
      expect(emptyResponse.pageInfo.totalPages).toBe(0);
      expect(emptyResponse.timesheets).toHaveLength(0);
    });
  });

  describe('Authentication Schema Compliance', () => {
    test('should validate successful authentication responses', () => {
      const roles = ['LECTURER', 'TUTOR', 'ADMIN'] as const;
      
      roles.forEach(role => {
        const authResult = OpenAPIMockGenerator.generateAuthResponse(role);
        
        expect(() => {
          AuthResultSchema.parse(authResult);
        }).not.toThrow();

        expect(authResult.success).toBe(true);
        expect(authResult.token).toBeDefined();
        expect(authResult.user?.role).toBe(role);
        expect(authResult.user?.email).toContain('@');
      });
    });

    test('should validate failed authentication responses', () => {
      const authResult = OpenAPIMockGenerator.generateAuthResponse('LECTURER', false);
      
      expect(() => {
        AuthResultSchema.parse(authResult);
      }).not.toThrow();

      expect(authResult.success).toBe(false);
      expect(authResult.token).toBeUndefined();
      expect(authResult.user).toBeUndefined();
      expect(authResult.errorMessage).toBeDefined();
    });
  });

  describe('Approval Response Schema Compliance', () => {
    test('should validate approval actions', () => {
      const actions = ['APPROVE', 'REJECT'] as const;
      
      actions.forEach(action => {
        const response = OpenAPIMockGenerator.generateApprovalResponse(action, 123);
        
        expect(() => {
          ApprovalActionResponseSchema.parse(response);
        }).not.toThrow();

        expect(response.success).toBe(true);
        expect(response.timesheetId).toBe(123);
        expect(response.newStatus).toBe(action === 'APPROVE' ? 'APPROVED' : 'REJECTED');
      });
    });
  });

  describe('Error Response Schema Compliance', () => {
    test('should validate error responses for different HTTP codes', () => {
      const errorCodes = [400, 401, 403, 404, 422, 500];
      
      errorCodes.forEach(code => {
        const error = OpenAPIMockGenerator.generateErrorResponse(
          code,
          'Test Error',
          'Test error message'
        );
        
        expect(() => {
          ErrorResponseSchema.parse(error);
        }).not.toThrow();

        expect(error.status).toBe(code);
        expect(error.timestamp).toBeDefined();
        expect(new Date(error.timestamp)).toBeInstanceOf(Date);
      });
    });
  });

  describe('Mock Scenarios Data Integrity', () => {
    test('should have consistent data across all scenarios', () => {
      // Validate auth scenarios
      expect(() => {
        AuthResultSchema.parse(MockScenarios.auth.lecturerLogin);
        AuthResultSchema.parse(MockScenarios.auth.tutorLogin);
        AuthResultSchema.parse(MockScenarios.auth.adminLogin);
        AuthResultSchema.parse(MockScenarios.auth.loginFailure);
      }).not.toThrow();

      // Validate timesheet scenarios
      MockScenarios.timesheets.pending.forEach(timesheet => {
        expect(() => {
          TimesheetResponseSchema.parse(timesheet);
        }).not.toThrow();
        expect(timesheet.status).toBe('PENDING_TUTOR_REVIEW');
      });

      MockScenarios.timesheets.approved.forEach(timesheet => {
        expect(() => {
          TimesheetResponseSchema.parse(timesheet);
        }).not.toThrow();
        expect(timesheet.status).toBe('FINAL_APPROVED');
      });
    });

    test('should validate all error scenarios', () => {
      Object.values(MockScenarios.errors).forEach(error => {
        expect(() => {
          ErrorResponseSchema.parse(error);
        }).not.toThrow();
      });
    });
  });

  describe('Data Generation Consistency', () => {
    test('should generate unique IDs for timesheets', () => {
      const timesheets = Array.from({ length: 10 }, () =>
        OpenAPIMockGenerator.generateTimesheetResponse()
      );
      
      const ids = timesheets.map(t => t.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });

    test('should generate consistent Monday dates', () => {
      const timesheet = OpenAPIMockGenerator.generateTimesheetResponse({
        weekStartDate: '2025-01-27' // Known Monday
      });
      
      const date = new Date(timesheet.weekStartDate);
      expect(date.getDay()).toBe(1); // Monday = 1
    });

    test('should maintain referential integrity', () => {
      const pageResponse = OpenAPIMockGenerator.generateTimesheetPageResponse(5, 3, 0);
      
      // Check that page info matches actual data
      expect(pageResponse.timesheets).toHaveLength(5);
      expect(pageResponse.pageInfo.numberOfElements).toBe(5);
      expect(pageResponse.pageInfo.totalElements).toBe(5);
      expect(pageResponse.pageInfo.currentPage).toBe(0);
      expect(pageResponse.pageInfo.pageSize).toBe(3);
    });
  });
});