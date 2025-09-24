/**
 * TimesheetService Tests
 * 
 * Comprehensive test suite for TimesheetService class and all its methods.
 * Tests API integration, data transformation, validation, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimesheetService } from './timesheets';
import { secureApiClient } from './api-secure';
import { 
  createMockTimesheet, 
  createMockTimesheetPage, 
  createMockDashboardSummary,
  createMockApiResponse
} from '../test/utils/test-utils';
import type { 
  TimesheetQuery, 
  TimesheetCreateRequest, 
  TimesheetUpdateRequest,
  ApprovalRequest 
} from '../types/api';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock API client
vi.mock('./api-secure', () => ({
  secureApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    createQueryString: vi.fn()
  }
}));

const mockApiClient = secureApiClient as any;

// Test data
const mockTimesheet = createMockTimesheet();
const mockTimesheetPage = createMockTimesheetPage(5);
const mockDashboardSummary = createMockDashboardSummary();

// =============================================================================
// TimesheetService CRUD Tests
// =============================================================================

describe('TimesheetService CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.createQueryString.mockReturnValue('page=0&size=20&sortBy=createdAt&sortDirection=desc');
  });

  describe('getTimesheets', () => {
    it('should fetch timesheets with default parameters', async () => {
      mockApiClient.get.mockResolvedValue(createMockApiResponse(mockTimesheetPage));

      const result = await TimesheetService.getTimesheets();

      expect(mockApiClient.createQueryString).toHaveBeenCalledWith({
        page: 0,
        size: 20,
        status: undefined,
        tutorId: undefined,
        courseId: undefined,
        weekStartDate: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets?page=0&size=20&sortBy=createdAt&sortDirection=desc');
      expect(result).toEqual(mockTimesheetPage);
    });

    it('should fetch timesheets with custom query parameters', async () => {
      mockApiClient.get.mockResolvedValue(createMockApiResponse(mockTimesheetPage));

      const query: TimesheetQuery = {
        status: 'PENDING_TUTOR_CONFIRMATION',
        tutorId: 1,
        page: 1,
        size: 50,
        sortBy: 'hours',
        sortDirection: 'asc'
      };

      await TimesheetService.getTimesheets(query);

      expect(mockApiClient.createQueryString).toHaveBeenCalledWith({
        page: 1,
        size: 50,
        status: 'PENDING_TUTOR_CONFIRMATION',
        tutorId: 1,
        courseId: undefined,
        weekStartDate: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: 'hours',
        sortDirection: 'asc'
      });
    });

    it('should normalize different response formats', async () => {
      // Test with 'content' format (Spring Boot pagination)
      const springBootResponse = {
        content: mockTimesheetPage.timesheets,
        page: {
          currentPage: 0,
          pageSize: 20,
          totalElements: 100,
          totalPages: 5,
          first: true,
          last: false,
          numberOfElements: 20,
          empty: false
        }
      };

      mockApiClient.get.mockResolvedValue(createMockApiResponse(springBootResponse));

      const result = await TimesheetService.getTimesheets();

      expect(result.timesheets).toEqual(mockTimesheetPage.timesheets);
      expect(result.pageInfo).toEqual(springBootResponse.page);
    });

    it('should handle missing pageInfo', async () => {
      const responseWithoutPageInfo = {
        timesheets: mockTimesheetPage.timesheets
      };

      mockApiClient.get.mockResolvedValue(createMockApiResponse(responseWithoutPageInfo));

      const result = await TimesheetService.getTimesheets();

      expect(result.pageInfo).toEqual({
        currentPage: 0,
        pageSize: mockTimesheetPage.timesheets.length,
        totalElements: mockTimesheetPage.timesheets.length,
        totalPages: 1,
        first: true,
        last: true,
        numberOfElements: mockTimesheetPage.timesheets.length,
        empty: false
      });
    });
  });

  describe('getPendingTimesheets', () => {
    it('should fetch pending timesheets for lecturer approval', async () => {
      mockApiClient.get.mockResolvedValue(createMockApiResponse(mockTimesheetPage));

      const result = await TimesheetService.getPendingTimesheets();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/pending-final-approval');
      expect(result).toEqual(mockTimesheetPage);
    });
  });

  describe('getTimesheetsByTutor', () => {
    it('should fetch timesheets by tutor ID', async () => {
      mockApiClient.get.mockResolvedValue(createMockApiResponse(mockTimesheetPage));

      const tutorId = 1;
      const query = { status: 'TUTOR_CONFIRMED' as const };

      await TimesheetService.getTimesheetsByTutor(tutorId, query);

      expect(mockApiClient.createQueryString).toHaveBeenCalledWith({
        page: 0,
        size: 20,
        status: 'TUTOR_CONFIRMED',
        courseId: undefined,
        weekStartDate: undefined,
        startDate: undefined,
        endDate: undefined,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(`/api/timesheets/tutor/${tutorId}?page=0&size=20&sortBy=createdAt&sortDirection=desc`);
    });
  });

  describe('getTimesheet', () => {
    it('should fetch single timesheet by ID', async () => {
      mockApiClient.get.mockResolvedValue(createMockApiResponse(mockTimesheet));

      const result = await TimesheetService.getTimesheet(1);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/1');
      expect(result).toEqual(mockTimesheet);
    });
  });

  describe('createTimesheet', () => {
    it('should create new timesheet', async () => {
      const createRequest: TimesheetCreateRequest = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 35.50,
        description: 'New timesheet'
      };

      mockApiClient.post.mockResolvedValue(createMockApiResponse(mockTimesheet));

      const result = await TimesheetService.createTimesheet(createRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/timesheets', createRequest);
      expect(result).toEqual(mockTimesheet);
    });
  });

  describe('updateTimesheet', () => {
    it('should update existing timesheet', async () => {
      const updateRequest: TimesheetUpdateRequest = {
        hours: 15,
        description: 'Updated description'
      };

      mockApiClient.put.mockResolvedValue(createMockApiResponse(mockTimesheet));

      const result = await TimesheetService.updateTimesheet(1, updateRequest);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/timesheets/1', updateRequest);
      expect(result).toEqual(mockTimesheet);
    });
  });

  describe('deleteTimesheet', () => {
    it('should delete timesheet', async () => {
      mockApiClient.delete.mockResolvedValue(createMockApiResponse(undefined));

      await TimesheetService.deleteTimesheet(1);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/timesheets/1');
    });
  });
});

// =============================================================================
// Approval Operations Tests
// =============================================================================

describe('TimesheetService Approval Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('approveTimesheet', () => {
    it('should approve timesheet with comments', async () => {
      const approvalRequest: ApprovalRequest = {
        timesheetId: 1,
        action: 'FINAL_APPROVAL',
        comment: 'Approved with excellent work'
      };

      const approvalResponse = {
        success: true,
        message: 'Timesheet approved successfully',
        timesheetId: 1
      };

      mockApiClient.post.mockResolvedValue(createMockApiResponse(approvalResponse));

      const result = await TimesheetService.approveTimesheet(approvalRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/approvals', {
        ...approvalRequest,
        action: 'HR_CONFIRM'
      });
      expect(result).toEqual(approvalResponse);
    });

    it('should reject timesheet with reason', async () => {
      const rejectionRequest: ApprovalRequest = {
        timesheetId: 1,
        action: 'REJECT',
        comment: 'Hours seem excessive for the work described'
      };

      const rejectionResponse = {
        success: true,
        message: 'Timesheet rejected',
        timesheetId: 1
      };

      mockApiClient.post.mockResolvedValue(createMockApiResponse(rejectionResponse));

      const result = await TimesheetService.approveTimesheet(rejectionRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/approvals', rejectionRequest);
      expect(result).toEqual(rejectionResponse);
    });
  });

  describe('batchApproveTimesheets', () => {
    it('should batch approve multiple timesheets', async () => {
      const approvalRequests: ApprovalRequest[] = [
        { timesheetId: 1, action: 'FINAL_APPROVAL' },
        { timesheetId: 2, action: 'FINAL_APPROVAL' },
        { timesheetId: 3, action: 'FINAL_APPROVAL' }
      ];

      const approvalResponse = {
        success: true,
        message: 'Timesheet approved successfully'
      };

      mockApiClient.post.mockResolvedValue(createMockApiResponse(approvalResponse));

      const results = await TimesheetService.batchApproveTimesheets(approvalRequests);

      expect(mockApiClient.post).toHaveBeenCalledTimes(3);
      const approvalPayloads = mockApiClient.post.mock.calls.map(([, payload]: [unknown, ApprovalRequest]) => payload);
      approvalPayloads.forEach((payload: ApprovalRequest) => expect(payload.action).toBe('HR_CONFIRM'));
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(approvalResponse);
    });

    it('should handle partial failures in batch approval', async () => {
      const approvalRequests: ApprovalRequest[] = [
        { timesheetId: 1, action: 'FINAL_APPROVAL' },
        { timesheetId: 2, action: 'FINAL_APPROVAL' }
      ];

      mockApiClient.post
        .mockResolvedValueOnce(createMockApiResponse({ success: true, message: 'Approved' }))
        .mockRejectedValueOnce(new Error('Approval failed'));

      await expect(TimesheetService.batchApproveTimesheets(approvalRequests)).rejects.toThrow('Approval failed');
    });
  });
});

// =============================================================================
// Dashboard Operations Tests
// =============================================================================

describe('TimesheetService Dashboard Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardSummary', () => {
    it('should fetch user dashboard summary', async () => {
      mockApiClient.get.mockResolvedValue(createMockApiResponse(mockDashboardSummary));

      const result = await TimesheetService.getDashboardSummary();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/dashboard/summary');
      expect(result).toEqual(mockDashboardSummary);
    });
  });

  describe('getAdminDashboardSummary', () => {
    it('should fetch admin dashboard summary', async () => {
      mockApiClient.get.mockResolvedValue(createMockApiResponse(mockDashboardSummary));

      const result = await TimesheetService.getAdminDashboardSummary();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/dashboard/summary');
      expect(result).toEqual(mockDashboardSummary);
    });
  });
});

// =============================================================================
// Utility Methods Tests
// =============================================================================

describe('TimesheetService Utility Methods', () => {
  const timesheets = [
    createMockTimesheet({ hours: 10, hourlyRate: 25, status: 'PENDING_TUTOR_CONFIRMATION' }),
    createMockTimesheet({ hours: 15, hourlyRate: 30, status: 'LECTURER_CONFIRMED' }),
    createMockTimesheet({ hours: 8, hourlyRate: 35, status: 'PENDING_TUTOR_CONFIRMATION' })
  ];

  describe('calculateTotalHours', () => {
    it('should calculate total hours correctly', () => {
      const result = TimesheetService.calculateTotalHours(timesheets);
      expect(result).toBe(33); // 10 + 15 + 8
    });

    it('should handle empty array', () => {
      const result = TimesheetService.calculateTotalHours([]);
      expect(result).toBe(0);
    });
  });

  describe('calculateTotalPay', () => {
    it('should calculate total pay correctly', () => {
      const result = TimesheetService.calculateTotalPay(timesheets);
      expect(result).toBe(980); // (10*25) + (15*30) + (8*35) = 250 + 450 + 280
    });

    it('should handle empty array', () => {
      const result = TimesheetService.calculateTotalPay([]);
      expect(result).toBe(0);
    });
  });

  describe('groupByStatus', () => {
    it('should group timesheets by status', () => {
      const result = TimesheetService.groupByStatus(timesheets);

      expect(result).toEqual({
        PENDING_TUTOR_CONFIRMATION: [timesheets[0], timesheets[2]],
        LECTURER_CONFIRMED: [timesheets[1]]
      });
    });

    it('should handle empty array', () => {
      const result = TimesheetService.groupByStatus([]);
      expect(result).toEqual({});
    });
  });

  describe('filterByDateRange', () => {
    it('should filter timesheets by date range', () => {
      const testTimesheets = [
        createMockTimesheet({ weekStartDate: '2024-01-01' }),
        createMockTimesheet({ weekStartDate: '2024-01-15' }),
        createMockTimesheet({ weekStartDate: '2024-02-01' })
      ];

      const result = TimesheetService.filterByDateRange(
        testTimesheets, 
        '2024-01-01', 
        '2024-01-31'
      );

      expect(result).toHaveLength(2);
      expect(result[0].weekStartDate).toBe('2024-01-01');
      expect(result[1].weekStartDate).toBe('2024-01-15');
    });

    it('should handle inclusive date range', () => {
      const testTimesheets = [
        createMockTimesheet({ weekStartDate: '2024-01-01' }),
        createMockTimesheet({ weekStartDate: '2024-01-31' })
      ];

      const result = TimesheetService.filterByDateRange(
        testTimesheets, 
        '2024-01-01', 
        '2024-01-31'
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('getActionableTimesheets', () => {
    const testTimesheets = [
      createMockTimesheet({ id: 1, status: 'DRAFT' }),
      createMockTimesheet({ id: 2, status: 'TUTOR_CONFIRMED' }),
      createMockTimesheet({ id: 3, status: 'LECTURER_CONFIRMED' }),
      createMockTimesheet({ id: 4, status: 'REJECTED' }),
      createMockTimesheet({ id: 5, status: 'MODIFICATION_REQUESTED' }),
      createMockTimesheet({ id: 6, status: 'FINAL_CONFIRMED' })
    ];

    it('should return actionable timesheets for LECTURER', () => {
      const result = TimesheetService.getActionableTimesheets(testTimesheets, 'LECTURER');

      expect(result.map(ts => ts.status)).toEqual(['TUTOR_CONFIRMED', 'MODIFICATION_REQUESTED']);
    });

    it('should return actionable timesheets for ADMIN', () => {
      const result = TimesheetService.getActionableTimesheets(testTimesheets, 'ADMIN');

      expect(result.map(ts => ts.status)).toEqual(['LECTURER_CONFIRMED']);
    });

    it('should return actionable timesheets for TUTOR', () => {
      const result = TimesheetService.getActionableTimesheets(testTimesheets, 'TUTOR');

      expect(result.map(ts => ts.status)).toEqual(['DRAFT', 'MODIFICATION_REQUESTED']);
    });

    it('should return empty array for unknown role', () => {
      const result = TimesheetService.getActionableTimesheets(testTimesheets, 'UNKNOWN');
      expect(result).toEqual([]);
    });
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('TimesheetService Validation', () => {
  describe('validateTimesheet', () => {
    it('should pass validation for valid timesheet', () => {
      const validTimesheet = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 35.50,
        description: 'Valid timesheet description'
      };

      const errors = TimesheetService.validateTimesheet(validTimesheet);
      expect(errors).toEqual([]);
    });

    it('should validate tutorId', () => {
      const invalidTimesheet = {
        tutorId: 0,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 35.50,
        description: 'Valid description'
      };

      const errors = TimesheetService.validateTimesheet(invalidTimesheet);
      expect(errors).toContain('Valid tutor ID is required');
    });

    it('should validate courseId', () => {
      const invalidTimesheet = {
        tutorId: 1,
        courseId: -1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 35.50,
        description: 'Valid description'
      };

      const errors = TimesheetService.validateTimesheet(invalidTimesheet);
      expect(errors).toContain('Valid course ID is required');
    });

    it('should validate weekStartDate', () => {
      const invalidTimesheet = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '',
        hours: 10,
        hourlyRate: 35.50,
        description: 'Valid description'
      };

      const errors = TimesheetService.validateTimesheet(invalidTimesheet);
      expect(errors).toContain('Week start date is required');
    });

    it('should validate hours range', () => {
      const invalidTimesheet1 = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 0,
        hourlyRate: 35.50,
        description: 'Valid description'
      };

      const invalidTimesheet2 = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 100,
        hourlyRate: 35.50,
        description: 'Valid description'
      };

      const errors1 = TimesheetService.validateTimesheet(invalidTimesheet1);
      const errors2 = TimesheetService.validateTimesheet(invalidTimesheet2);

      expect(errors1).toContain('Hours must be between 0.1 and 60');
      expect(errors2).toContain('Hours must be between 0.1 and 60');
    });

    it('should validate hourlyRate range', () => {
      const invalidTimesheet1 = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 0,
        description: 'Valid description'
      };

      const invalidTimesheet2 = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 300,
        description: 'Valid description'
      };

      const errors1 = TimesheetService.validateTimesheet(invalidTimesheet1);
      const errors2 = TimesheetService.validateTimesheet(invalidTimesheet2);

      expect(errors1).toContain('Hourly rate must be between 0.01 and 200');
      expect(errors2).toContain('Hourly rate must be between 0.01 and 200');
    });

    it('should validate description', () => {
      const invalidTimesheet1 = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 35.50,
        description: ''
      };

      const invalidTimesheet2 = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        hours: 10,
        hourlyRate: 35.50,
        description: 'a'.repeat(1001)
      };

      const errors1 = TimesheetService.validateTimesheet(invalidTimesheet1);
      const errors2 = TimesheetService.validateTimesheet(invalidTimesheet2);

      expect(errors1).toContain('Description is required');
      expect(errors2).toContain('Description must be less than 1000 characters');
    });

    it('should return multiple validation errors', () => {
      const invalidTimesheet = {
        tutorId: 0,
        courseId: 0,
        weekStartDate: '',
        hours: 0,
        hourlyRate: 0,
        description: ''
      };

      const errors = TimesheetService.validateTimesheet(invalidTimesheet);
      expect(errors).toHaveLength(6);
    });
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('TimesheetService Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should propagate API errors', async () => {
    const apiError = new Error('Network error');
    mockApiClient.get.mockRejectedValue(apiError);

    await expect(TimesheetService.getTimesheets()).rejects.toThrow('Network error');
  });

  it('should handle malformed API responses', async () => {
    mockApiClient.get.mockResolvedValue({ data: null });

    const result = await TimesheetService.getTimesheets();

    // Should still return normalized structure
    expect(result.success).toBe(true);
    expect(result.timesheets).toEqual([]);
  });

  it('should handle undefined responses gracefully', async () => {
    mockApiClient.get.mockResolvedValue(createMockApiResponse(undefined));

    const result = await TimesheetService.getTimesheets();

    expect(result.timesheets).toEqual([]);
    expect(result.pageInfo.empty).toBe(true);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('TimesheetService Integration', () => {
  it('should handle real-world workflow', async () => {
    // Create timesheet
    const createRequest: TimesheetCreateRequest = {
      tutorId: 1,
      courseId: 1,
      weekStartDate: '2024-01-01',
      hours: 10,
      hourlyRate: 35.50,
      description: 'Weekly tutoring session'
    };

    mockApiClient.post.mockResolvedValue(createMockApiResponse(mockTimesheet));
    
    const createdTimesheet = await TimesheetService.createTimesheet(createRequest);
    expect(createdTimesheet).toEqual(mockTimesheet);

    // Update timesheet
    const updateRequest: TimesheetUpdateRequest = {
      hours: 12,
      description: 'Updated description'
    };

    mockApiClient.put.mockResolvedValue(createMockApiResponse({ ...mockTimesheet, ...updateRequest }));
    
    const updatedTimesheet = await TimesheetService.updateTimesheet(createdTimesheet.id, updateRequest);
    expect(updatedTimesheet.hours).toBe(12);

    // Approve timesheet
    const approvalRequest: ApprovalRequest = {
      timesheetId: createdTimesheet.id,
      action: 'FINAL_APPROVAL',
      comment: 'Approved'
    };

    mockApiClient.post.mockResolvedValue(createMockApiResponse({ 
      success: true, 
      message: 'Approved successfully' 
    }));
    
    const approvalResult = await TimesheetService.approveTimesheet(approvalRequest);
    expect(approvalResult.success).toBe(true);
  });
});




