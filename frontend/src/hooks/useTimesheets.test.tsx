/**
 * useTimesheets Hook Tests
 * 
 * Comprehensive test suite for useTimesheets hook and related custom hooks.
 * Tests caching, error handling, performance, and integration with services.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  useTimesheets, 
  usePendingTimesheets, 
  useDashboardSummary,
  useApprovalAction,
  useCreateTimesheet,
  useUpdateTimesheet,
  useTimesheetStats,
  useActionableTimesheets
} from './useTimesheets';
import { TimesheetService } from '../services/timesheets';
import { 
  createMockTimesheetPage, 
  createMockTimesheet, 
  createMockDashboardSummary,
  createMockUser,
  MockAuthProvider,
  waitForAsync
} from '../test/utils/test-utils';
import type { TimesheetQuery, ApprovalRequest } from '../types/api';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock TimesheetService
vi.mock('../services/timesheets', () => ({
  TimesheetService: {
    getTimesheets: vi.fn(),
    getPendingTimesheets: vi.fn(),
    getTimesheet: vi.fn(),
    createTimesheet: vi.fn(),
    updateTimesheet: vi.fn(),
    deleteTimesheet: vi.fn(),
    approveTimesheet: vi.fn(),
    batchApproveTimesheets: vi.fn(),
    getDashboardSummary: vi.fn(),
    getAdminDashboardSummary: vi.fn(),
    calculateTotalHours: vi.fn(),
    calculateTotalPay: vi.fn(),
    groupByStatus: vi.fn(),
    filterByDateRange: vi.fn(),
    getActionableTimesheets: vi.fn(),
    validateTimesheet: vi.fn()
  }
}));

// Mock useAuth hook directly
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

const mockTimesheetService = TimesheetService as any;

// Import the mocked useAuth after vi.mock
import { useAuth } from '../contexts/AuthContext';
const mockUseAuth = useAuth as any;

// Mock user for testing
const mockUser = createMockUser({ id: 1, role: 'TUTOR' });

// =============================================================================
// Test Data
// =============================================================================

const mockTimesheetPage = createMockTimesheetPage(5);
const mockDashboardSummary = createMockDashboardSummary();
const mockTimesheet = createMockTimesheet();

// =============================================================================
// useTimesheets Hook Tests
// =============================================================================

describe('useTimesheets Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.getTimesheets.mockResolvedValue(mockTimesheetPage);
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(true); // Should start loading when authenticated
      expect(result.current.error).toBeNull();
      expect(result.current.timesheets).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.currentPage).toBe(0);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should fetch timesheets on mount when authenticated', async () => {
      renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(mockTimesheetService.getTimesheets).toHaveBeenCalledWith({});
      });
    });

    it('should not fetch when not authenticated', () => {
      mockUseAuth.mockReturnValueOnce({
        user: null,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false,
        error: null
      });

      renderHook(() => useTimesheets(), { wrapper });

      expect(mockTimesheetService.getTimesheets).not.toHaveBeenCalled();
    });

    it('should update state when fetch succeeds', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockTimesheetPage);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.timesheets).toEqual(mockTimesheetPage.timesheets);
        expect(result.current.totalCount).toBe(mockTimesheetPage.pageInfo.totalElements);
        expect(result.current.isEmpty).toBe(false);
      });
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch timesheets';
      mockTimesheetService.getTimesheets.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeNull();
      });
    });
  });

  describe('Query Management', () => {
    it('should accept initial query parameters', async () => {
      const initialQuery: TimesheetQuery = { status: 'SUBMITTED', page: 1, size: 10 };
      
      renderHook(() => useTimesheets(initialQuery), { wrapper });

      await waitFor(() => {
        expect(mockTimesheetService.getTimesheets).toHaveBeenCalledWith(initialQuery);
      });
    });

    it('should update query and refetch', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateQuery({ status: 'APPROVED_BY_LECTURER' });
      });

      expect(mockTimesheetService.getTimesheets).toHaveBeenCalledWith({
        status: 'APPROVED_BY_LECTURER'
      });
    });

    it('should load more pages', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(!mockTimesheetPage.pageInfo.last);
      });

      if (result.current.hasMore) {
        act(() => {
          result.current.loadMore();
        });

        expect(mockTimesheetService.getTimesheets).toHaveBeenCalledWith({ page: 1 });
      }
    });

    it('should reset to first page', async () => {
      const { result } = renderHook(() => useTimesheets({ page: 2 }), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.reset();
      });

      expect(mockTimesheetService.getTimesheets).toHaveBeenCalledWith({ page: 0 });
    });

    it('should refresh data', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear previous calls
      mockTimesheetService.getTimesheets.mockClear();

      act(() => {
        result.current.refresh();
      });

      expect(mockTimesheetService.getTimesheets).toHaveBeenCalledWith({});
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear service calls
      mockTimesheetService.getTimesheets.mockClear();

      // Trigger same query again
      act(() => {
        result.current.updateQuery({});
      });

      // Should not call service again due to cache
      await waitForAsync(100);
      expect(mockTimesheetService.getTimesheets).not.toHaveBeenCalled();
    });

    it('should bypass cache when refreshing', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimesheetService.getTimesheets.mockClear();

      act(() => {
        result.current.refresh();
      });

      expect(mockTimesheetService.getTimesheets).toHaveBeenCalled();
    });

    it('should cache different queries separately', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mock call count after initial load
      mockTimesheetService.getTimesheets.mockClear();

      // Query 1
      act(() => {
        result.current.updateQuery({ status: 'SUBMITTED' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Query 2 - different parameters
      act(() => {
        result.current.updateQuery({ status: 'APPROVED_BY_LECTURER' });
      });

      expect(mockTimesheetService.getTimesheets).toHaveBeenCalledTimes(2); // 2 updates only
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel previous requests when making new ones', async () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false }
      };

      global.AbortController = vi.fn(() => mockAbortController) as any;

      const { result } = renderHook(() => useTimesheets(), { wrapper });

      // Make first request
      act(() => {
        result.current.updateQuery({ status: 'SUBMITTED' });
      });

      // Make second request before first completes
      act(() => {
        result.current.updateQuery({ status: 'APPROVED_BY_LECTURER' });
      });

      expect(abortSpy).toHaveBeenCalled();
    });

    it('should not update state for aborted requests', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      
      mockTimesheetService.getTimesheets.mockRejectedValue(abortError);

      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitForAsync(100);

      // Should not set error for aborted requests
      expect(result.current.error).toBeNull();
    });
  });

  describe('Cache Cleanup', () => {
    it('should clean up expired cache entries', async () => {
      const { result } = renderHook(() => useTimesheets(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.useFakeTimers();

      // Fast forward time beyond cache duration (5 minutes)
      act(() => {
        vi.advanceTimersByTime(6 * 60 * 1000);
      });

      // Cache cleanup should have run
      // Subsequent request should call service again
      mockTimesheetService.getTimesheets.mockClear();

      act(() => {
        result.current.refresh();
      });

      expect(mockTimesheetService.getTimesheets).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});

// =============================================================================
// usePendingTimesheets Hook Tests
// =============================================================================

describe('usePendingTimesheets Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.getPendingTimesheets.mockResolvedValue(mockTimesheetPage);
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
  });

  it('should fetch pending timesheets on mount', async () => {
    renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() => {
      expect(mockTimesheetService.getPendingTimesheets).toHaveBeenCalled();
    });
  });

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockTimesheetService.getPendingTimesheets.mockClear();

    act(() => {
      result.current.refetch();
    });

    expect(mockTimesheetService.getPendingTimesheets).toHaveBeenCalled();
  });

  it('should handle errors correctly', async () => {
    const errorMessage = 'Failed to fetch pending timesheets';
    mockTimesheetService.getPendingTimesheets.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePendingTimesheets(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });
  });
});

// =============================================================================
// useDashboardSummary Hook Tests
// =============================================================================

describe('useDashboardSummary Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.getDashboardSummary.mockResolvedValue(mockDashboardSummary);
    mockTimesheetService.getAdminDashboardSummary.mockResolvedValue(mockDashboardSummary);
  });

  it('should fetch user dashboard summary by default', async () => {
    renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(mockTimesheetService.getDashboardSummary).toHaveBeenCalled();
      expect(mockTimesheetService.getAdminDashboardSummary).not.toHaveBeenCalled();
    });
  });

  it('should fetch admin dashboard summary when isAdmin is true', async () => {
    renderHook(() => useDashboardSummary(true), { wrapper });

    await waitFor(() => {
      expect(mockTimesheetService.getAdminDashboardSummary).toHaveBeenCalled();
      expect(mockTimesheetService.getDashboardSummary).not.toHaveBeenCalled();
    });
  });

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => useDashboardSummary(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockTimesheetService.getDashboardSummary.mockClear();

    act(() => {
      result.current.refetch();
    });

    expect(mockTimesheetService.getDashboardSummary).toHaveBeenCalled();
  });
});

// =============================================================================
// useApprovalAction Hook Tests
// =============================================================================

describe('useApprovalAction Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.approveTimesheet.mockResolvedValue({ 
      success: true, 
      message: 'Approved successfully' 
    });
    mockTimesheetService.batchApproveTimesheets.mockResolvedValue([
      { success: true, message: 'Approved successfully' }
    ]);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useApprovalAction(), { wrapper });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should approve single timesheet', async () => {
    const { result } = renderHook(() => useApprovalAction(), { wrapper });

    const approvalRequest: ApprovalRequest = {
      timesheetId: 1,
      action: 'FINAL_APPROVAL',
      comments: 'Looks good'
    };

    let approvalResult;
    await act(async () => {
      approvalResult = await result.current.approveTimesheet(approvalRequest);
    });

    expect(mockTimesheetService.approveTimesheet).toHaveBeenCalledWith(approvalRequest);
    expect(approvalResult).toEqual({ success: true, message: 'Approved successfully' });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle approval errors', async () => {
    const errorMessage = 'Approval failed';
    mockTimesheetService.approveTimesheet.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useApprovalAction(), { wrapper });

    const approvalRequest: ApprovalRequest = {
      timesheetId: 1,
      action: 'FINAL_APPROVAL'
    };

    await expect(async () => {
      await act(async () => {
        await result.current.approveTimesheet(approvalRequest);
      });
    }).rejects.toThrow(errorMessage);

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should batch approve multiple timesheets', async () => {
    const { result } = renderHook(() => useApprovalAction(), { wrapper });

    const approvalRequests: ApprovalRequest[] = [
      { timesheetId: 1, action: 'FINAL_APPROVAL' },
      { timesheetId: 2, action: 'FINAL_APPROVAL' }
    ];

    let batchResult;
    await act(async () => {
      batchResult = await result.current.batchApprove(approvalRequests);
    });

    expect(mockTimesheetService.batchApproveTimesheets).toHaveBeenCalledWith(approvalRequests);
    expect(batchResult).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useApprovalAction(), { wrapper });

    // Set some state first
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

// =============================================================================
// useCreateTimesheet Hook Tests
// =============================================================================

describe('useCreateTimesheet Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.createTimesheet.mockResolvedValue(mockTimesheet);
    mockTimesheetService.validateTimesheet.mockReturnValue([]);
  });

  it('should create timesheet successfully', async () => {
    const { result } = renderHook(() => useCreateTimesheet(), { wrapper });

    const createRequest = {
      tutorId: 1,
      courseId: 1,
      weekStartDate: '2024-01-01',
      hours: 10,
      hourlyRate: 35.50,
      description: 'Weekly tutoring'
    };

    let createdTimesheet;
    await act(async () => {
      createdTimesheet = await result.current.createTimesheet(createRequest);
    });

    expect(mockTimesheetService.validateTimesheet).toHaveBeenCalledWith(createRequest);
    expect(mockTimesheetService.createTimesheet).toHaveBeenCalledWith(createRequest);
    expect(createdTimesheet).toEqual(mockTimesheet);
  });

  it('should handle validation errors', async () => {
    const validationErrors = ['Hours must be between 0.1 and 60'];
    mockTimesheetService.validateTimesheet.mockReturnValue(validationErrors);

    const { result } = renderHook(() => useCreateTimesheet(), { wrapper });

    const invalidRequest = {
      tutorId: 1,
      courseId: 1,
      weekStartDate: '2024-01-01',
      hours: 0,
      hourlyRate: 35.50,
      description: 'Invalid hours'
    };

    await expect(async () => {
      await act(async () => {
        await result.current.createTimesheet(invalidRequest);
      });
    }).rejects.toThrow(validationErrors[0]);

    await waitFor(() => {
      expect(result.current.error).toBe(validationErrors[0]);
    });
    expect(mockTimesheetService.createTimesheet).not.toHaveBeenCalled();
  });
});

// =============================================================================
// useUpdateTimesheet Hook Tests
// =============================================================================

describe('useUpdateTimesheet Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.updateTimesheet.mockResolvedValue(mockTimesheet);
  });

  it('should update timesheet successfully', async () => {
    const { result } = renderHook(() => useUpdateTimesheet(), { wrapper });

    const updateRequest = {
      hours: 15,
      description: 'Updated description'
    };

    let updatedTimesheet;
    await act(async () => {
      updatedTimesheet = await result.current.updateTimesheet(1, updateRequest);
    });

    expect(mockTimesheetService.updateTimesheet).toHaveBeenCalledWith(1, updateRequest);
    expect(updatedTimesheet).toEqual(mockTimesheet);
  });

  it('should handle update errors', async () => {
    const errorMessage = 'Update failed';
    mockTimesheetService.updateTimesheet.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useUpdateTimesheet(), { wrapper });

    await expect(async () => {
      await act(async () => {
        await result.current.updateTimesheet(1, { hours: 15 });
      });
    }).rejects.toThrow(errorMessage);

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });
  });
});

// =============================================================================
// useTimesheetStats Hook Tests
// =============================================================================

describe('useTimesheetStats Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.calculateTotalHours.mockReturnValue(50);
    mockTimesheetService.calculateTotalPay.mockReturnValue(1775);
    mockTimesheetService.groupByStatus.mockReturnValue({
      SUBMITTED: [mockTimesheet],
      APPROVED_BY_LECTURER: [mockTimesheet]
    });
  });

  it('should calculate timesheet statistics', () => {
    const timesheets = [mockTimesheet, { ...mockTimesheet, id: 2 }];
    const { result } = renderHook(() => useTimesheetStats(timesheets));

    expect(result.current.totalHours).toBe(50);
    expect(result.current.totalPay).toBe(1775);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.averageHoursPerTimesheet).toBe(25);
    expect(result.current.averagePayPerTimesheet).toBe(887.5);
  });

  it('should handle empty timesheet array', () => {
    const { result } = renderHook(() => useTimesheetStats([]));

    expect(result.current.totalCount).toBe(0);
    expect(result.current.averageHoursPerTimesheet).toBe(0);
    expect(result.current.averagePayPerTimesheet).toBe(0);
  });

  it('should memoize calculations', () => {
    const timesheets = [mockTimesheet];
    const { result, rerender } = renderHook(
      ({ timesheets }) => useTimesheetStats(timesheets),
      { initialProps: { timesheets } }
    );

    const firstResult = result.current;

    // Rerender with same timesheets
    rerender({ timesheets });

    // Should return same object reference (memoized)
    expect(result.current).toBe(firstResult);
  });
});

// =============================================================================
// useActionableTimesheets Hook Tests
// =============================================================================

describe('useActionableTimesheets Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default useAuth mock return
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    mockTimesheetService.getActionableTimesheets.mockReturnValue([mockTimesheet]);
  });

  it('should get actionable timesheets for user role', () => {
    const timesheets = [mockTimesheet];
    const { result } = renderHook(() => useActionableTimesheets(timesheets, 'LECTURER'));

    expect(mockTimesheetService.getActionableTimesheets).toHaveBeenCalledWith(timesheets, 'LECTURER');
    expect(result.current).toEqual([mockTimesheet]);
  });

  it('should return empty array when no user role', () => {
    const timesheets = [mockTimesheet];
    const { result } = renderHook(() => useActionableTimesheets(timesheets, undefined));

    expect(result.current).toEqual([]);
    expect(mockTimesheetService.getActionableTimesheets).not.toHaveBeenCalled();
  });

  it('should memoize results', () => {
    const timesheets = [mockTimesheet];
    const { result, rerender } = renderHook(
      ({ timesheets, role }) => useActionableTimesheets(timesheets, role),
      { initialProps: { timesheets, role: 'LECTURER' } }
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({ timesheets, role: 'LECTURER' });

    // Should return same array reference (memoized)
    expect(result.current).toBe(firstResult);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Hook Integration', () => {
  beforeEach(() => {
    // Setup validation to pass by default
    mockTimesheetService.validateTimesheet.mockReturnValue([]);
    mockTimesheetService.createTimesheet.mockResolvedValue(mockTimesheet);
  });

  it('should work together in real usage scenario', async () => {
    // Create timesheet
    const { result: createResult } = renderHook(() => useCreateTimesheet(), { wrapper });
    
    const newTimesheet = {
      tutorId: 1,
      courseId: 1,
      weekStartDate: '2024-01-01',
      hours: 10,
      hourlyRate: 35.50,
      description: 'New timesheet'
    };

    await act(async () => {
      await createResult.current.createTimesheet(newTimesheet);
    });

    // Fetch timesheets
    const { result: fetchResult } = renderHook(() => useTimesheets(), { wrapper });

    await waitFor(() => {
      expect(fetchResult.current.loading).toBe(false);
    });

    // Calculate stats
    const { result: statsResult } = renderHook(() => 
      useTimesheetStats(fetchResult.current.timesheets)
    );

    expect(statsResult.current.totalCount).toBeGreaterThan(0);
  });

  it('should handle authentication state changes', async () => {
    const { result, rerender } = renderHook(() => useTimesheets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change auth state to unauthenticated
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null
    });
    
    rerender();

    // Should handle the change gracefully (no error state for unauthenticated)
    expect(result.current.timesheets).toEqual([]);
  });
});