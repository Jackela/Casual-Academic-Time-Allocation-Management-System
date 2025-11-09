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

const mockApiClient = vi.mocked(secureApiClient);

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
    mockApiClient.createQueryString.mockImplementation((params: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        searchParams.append(key, String(value));
      });
      return searchParams.toString();
    });
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
        sort: 'createdAt,desc'
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/timesheets?page=0&size=20&sort=createdAt%2Cdesc',
        undefined
      );
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
        sort: 'hours,asc'
      });
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

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/pending-final-approval', { signal: undefined });
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
        tutorId,
        courseId: undefined,
        weekStartDate: undefined,
        startDate: undefined,
        endDate: undefined,
        sort: 'createdAt,desc'
      });

      const [url, options] = mockApiClient.get.mock.calls.at(-1)!;
      expect(url).toContain('page=0');
      expect(url).toContain('size=20');
      expect(url).toContain(`tutorId=${tutorId}`);
      expect(url).toContain('status=TUTOR_CONFIRMED');
      expect(url).toContain('sort=createdAt%2Cdesc');
      expect(options).toBeUndefined();
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

  describe('quoteTimesheet', () => {
    const quoteResponse = {
      taskType: 'TUTORIAL',
      rateCode: 'TU1',
      qualification: 'STANDARD',
      isRepeat: false,
      deliveryHours: 1,
      associatedHours: 2,
      payableHours: 3,
      hourlyRate: 70,
      amount: 210,
      formula: '1h delivery + 2h associated',
      clauseReference: 'Schedule 1',
      sessionDate: '2025-03-03',
    };

    it('should fetch quote with provided payload', async () => {
      const quoteRequest = {
        tutorId: 10,
        courseId: 20,
        sessionDate: '2025-03-03',
        taskType: 'TUTORIAL',
        qualification: 'STANDARD',
        isRepeat: false,
        deliveryHours: 1.2,
      } as const;

      mockApiClient.post.mockResolvedValue(createMockApiResponse(quoteResponse));

      const result = await TimesheetService.quoteTimesheet(quoteRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/timesheets/quote', quoteRequest, undefined);
      expect(result).toEqual(quoteResponse);
    });

    it('should forward abort signal to API client', async () => {
      const quoteRequest = {
        tutorId: 11,
        courseId: 21,
        sessionDate: '2025-03-10',
        taskType: 'TUTORIAL',
        qualification: 'STANDARD',
        isRepeat: false,
        deliveryHours: 1.0,
      } as const;
      const controller = new AbortController();

      mockApiClient.post.mockResolvedValue(createMockApiResponse(quoteResponse));

      await TimesheetService.quoteTimesheet(quoteRequest, controller.signal);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/timesheets/quote',
        quoteRequest,
        { signal: controller.signal },
      );
    });
  });

  describe('createTimesheet', () => {
    it('should create new timesheet', async () => {
      const createRequest: TimesheetCreateRequest = {
        tutorId: 1,
        courseId: 1,
        weekStartDate: '2024-01-01',
        sessionDate: '2024-01-01',
        deliveryHours: 1.5,
        description: 'New timesheet',
        taskType: 'TUTORIAL',
        qualification: 'STANDARD',
        isRepeat: false,
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
        weekStartDate: '2024-01-08',
        sessionDate: '2024-01-08',
        deliveryHours: 1.0,
        description: 'Updated description',
        taskType: 'TUTORIAL',
        qualification: 'STANDARD',
        isRepeat: false,
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
      const approvalPayloads = mockApiClient.post.mock.calls.map(([, payload]) => payload as ApprovalRequest);
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
// EA-compliant Endpoints Tests (New)
// =============================================================================

describe('TimesheetService EA-compliant endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyTimesheets should call /api/timesheets/me and normalize array', async () => {
    const timesheets = [createMockTimesheet(), createMockTimesheet()];
    mockApiClient.get.mockResolvedValue(createMockApiResponse(timesheets));

    const result = await TimesheetService.getMyTimesheets();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/me', { signal: undefined });
    expect(result.timesheets).toHaveLength(2);
    expect(result.success).toBe(true);
  });

  it('getMyPendingTimesheets should use /pending-final-approval for LECTURER role', async () => {
    // Mock JWT token with LECTURER role in localStorage
    const mockToken = 'header.' + btoa(JSON.stringify({ role: 'LECTURER', userId: 2 })) + '.signature';
    const originalGetItem = global.localStorage.getItem;
    global.localStorage.getItem = vi.fn((key) => key === 'token' ? mockToken : null);

    const page = createMockTimesheetPage(2);
    mockApiClient.get.mockResolvedValue(createMockApiResponse(page));

    const result = await TimesheetService.getMyPendingTimesheets();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/pending-final-approval', { signal: undefined });
    expect(result.timesheets).toHaveLength(2);
    
    global.localStorage.getItem = originalGetItem;
  });

  it('getMyPendingTimesheets should use /pending-approval for TUTOR role', async () => {
    const mockToken = 'header.' + btoa(JSON.stringify({ role: 'TUTOR', userId: 4 })) + '.signature';
    const originalGetItem = global.localStorage.getItem;
    global.localStorage.getItem = vi.fn((key) => key === 'token' ? mockToken : null);

    const page = createMockTimesheetPage(3);
    mockApiClient.get.mockResolvedValue(createMockApiResponse(page.timesheets));

    const result = await TimesheetService.getMyPendingTimesheets();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/pending-approval', { signal: undefined });
    expect(Array.isArray(result.timesheets)).toBe(true);
    
    global.localStorage.getItem = originalGetItem;
  });

  it('getMyPendingTimesheets should use /pending-approval for ADMIN role', async () => {
    const mockToken = 'header.' + btoa(JSON.stringify({ role: 'ADMIN', userId: 1 })) + '.signature';
    const originalGetItem = global.localStorage.getItem;
    global.localStorage.getItem = vi.fn((key) => key === 'token' ? mockToken : null);

    const page = createMockTimesheetPage(1);
    mockApiClient.get.mockResolvedValue(createMockApiResponse(page));

    const result = await TimesheetService.getMyPendingTimesheets();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/pending-approval', { signal: undefined });
    expect(result.success).toBe(true);
    
    global.localStorage.getItem = originalGetItem;
  });

  it('getMyPendingTimesheets should default to /pending-approval when no token', async () => {
    const originalGetItem = global.localStorage.getItem;
    global.localStorage.getItem = vi.fn((key) => null);

    const page = createMockTimesheetPage(0);
    mockApiClient.get.mockResolvedValue(createMockApiResponse(page));

    const result = await TimesheetService.getMyPendingTimesheets();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/pending-approval', { signal: undefined });
    expect(result.timesheets).toEqual([]);
    
    global.localStorage.getItem = originalGetItem;
  });

  it('confirmTimesheet should POST to /api/approvals with TUTOR_CONFIRM and then GET', async () => {
    const ts = createMockTimesheet();
    ts.id = 42 as any;
    ts.status = 'TUTOR_CONFIRMED' as any;
    mockApiClient.post.mockResolvedValue(createMockApiResponse({ success: true }));
    mockApiClient.get.mockResolvedValue(createMockApiResponse(ts));

    const result = await TimesheetService.confirmTimesheet(42);
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/approvals', {
      timesheetId: 42,
      action: 'TUTOR_CONFIRM',
      comment: null,
    });
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/timesheets/42');
    expect(result).toEqual(ts);
  });

  it('getApprovalHistory should call /api/approvals/history/{id}', async () => {
    const history = [{ actor: 'Tutor', action: 'CONFIRM' }];
    mockApiClient.get.mockResolvedValue(createMockApiResponse(history));

    const result = await TimesheetService.getApprovalHistory(7);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/approvals/history/7');
    expect(result).toEqual(history);
  });

  it('getPendingApprovals should call /api/approvals/pending and normalize payload', async () => {
    const list = [createMockTimesheet(), createMockTimesheet()];
    mockApiClient.get.mockResolvedValue(createMockApiResponse(list));

    const result = await TimesheetService.getPendingApprovals();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/approvals/pending', { signal: undefined });
    expect(result.timesheets.length).toBe(2);
  });

  // Removed: 403 usability-first workaround test (no longer applicable after role-based routing)

  it('getPendingApprovals should treat 403 as empty queue (admin scope)', async () => {
    const err: any = new Error('Forbidden');
    err.response = { status: 403 };
    mockApiClient.get.mockRejectedValue(err);

    const result = await TimesheetService.getPendingApprovals();
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/approvals/pending', { signal: undefined });
    expect(result.success).toBe(true);
    expect(result.timesheets).toEqual([]);
    expect(result.pageInfo.empty).toBe(true);
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
    const validTimesheet: TimesheetCreateRequest = {
      tutorId: 1,
      courseId: 1,
      weekStartDate: '2024-01-01',
      sessionDate: '2024-01-01',
      deliveryHours: 1.5,
      description: 'Valid timesheet description',
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      isRepeat: false,
    };

    it('should pass validation for valid timesheet', () => {
      const errors = TimesheetService.validateTimesheet(validTimesheet);
      expect(errors).toEqual([]);
    });

    it('should validate tutorId', () => {
      const errors = TimesheetService.validateTimesheet({ ...validTimesheet, tutorId: 0 });
      expect(errors).toContain('Valid tutor ID is required');
    });

    it('should validate courseId', () => {
      const errors = TimesheetService.validateTimesheet({ ...validTimesheet, courseId: 0 });
      expect(errors).toContain('Valid course ID is required');
    });

    it('should validate weekStartDate', () => {
      const errors = TimesheetService.validateTimesheet({ ...validTimesheet, weekStartDate: '' });
      expect(errors).toContain('Week start date is required');
    });

    it('should validate sessionDate', () => {
      const errors = TimesheetService.validateTimesheet({ ...validTimesheet, sessionDate: '' });
      expect(errors).toContain('Session date is required');
    });

    it('should validate delivery hours range', () => {
      const low = TimesheetService.validateTimesheet({ ...validTimesheet, deliveryHours: 0 });
      const high = TimesheetService.validateTimesheet({ ...validTimesheet, deliveryHours: 20 });
      expect(low).toContain('Delivery hours must be between 0.1 and 10');
      expect(high).toContain('Delivery hours must be between 0.1 and 10');
    });

    it('should validate task type', () => {
      const errors = TimesheetService.validateTimesheet({ ...validTimesheet, taskType: undefined } as Partial<TimesheetCreateRequest>);
      expect(errors).toContain('Task type is required');
    });

    it('should validate qualification', () => {
      const errors = TimesheetService.validateTimesheet({ ...validTimesheet, qualification: undefined } as Partial<TimesheetCreateRequest>);
      expect(errors).toContain('Qualification is required');
    });

    it('should validate description', () => {
      const empty = TimesheetService.validateTimesheet({ ...validTimesheet, description: '' });
      const long = TimesheetService.validateTimesheet({ ...validTimesheet, description: 'a'.repeat(1001) });
      expect(empty).toContain('Description is required');
      expect(long).toContain('Description must be less than 1000 characters');
    });

    it('should return multiple validation errors', () => {
      const errors = TimesheetService.validateTimesheet({
        tutorId: 0,
        courseId: 0,
        weekStartDate: '',
        sessionDate: '',
        deliveryHours: 0,
        description: '',
        taskType: undefined,
        qualification: undefined,
        isRepeat: false,
      } as Partial<TimesheetCreateRequest>);
      expect(errors).toContain('Valid tutor ID is required');
      expect(errors).toContain('Valid course ID is required');
      expect(errors).toContain('Week start date is required');
      expect(errors).toContain('Session date is required');
      expect(errors).toContain('Delivery hours must be between 0.1 and 10');
      expect(errors).toContain('Description is required');
      expect(errors).toContain('Task type is required');
      expect(errors).toContain('Qualification is required');
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
    mockApiClient.get.mockResolvedValue(createMockApiResponse(null));

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
      sessionDate: '2024-01-01',
      deliveryHours: 2,
      description: 'Weekly tutoring session',
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      isRepeat: false,
    };

    mockApiClient.post.mockResolvedValue(createMockApiResponse(mockTimesheet));
    
    const createdTimesheet = await TimesheetService.createTimesheet(createRequest);
    expect(createdTimesheet).toEqual(mockTimesheet);

    // Update timesheet
    const updateRequest: TimesheetUpdateRequest = {
      weekStartDate: '2024-01-08',
      sessionDate: '2024-01-08',
      deliveryHours: 1.5,
      description: 'Updated description',
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      isRepeat: true,
    };

    mockApiClient.put.mockResolvedValue(createMockApiResponse({ ...mockTimesheet, ...updateRequest }));
    
    const updatedTimesheet = await TimesheetService.updateTimesheet(createdTimesheet.id, updateRequest);
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/timesheets', createRequest);
    expect(mockApiClient.put).toHaveBeenCalledWith(`/api/timesheets/${createdTimesheet.id}`, updateRequest);
    expect(updatedTimesheet).toMatchObject({ ...mockTimesheet, ...updateRequest });

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




