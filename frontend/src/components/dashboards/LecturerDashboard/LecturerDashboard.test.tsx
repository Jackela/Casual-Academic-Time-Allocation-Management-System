/**
 * LecturerDashboard Component Tests
 * 
 * TDD test suite for LecturerDashboard component before implementation.
 * Tests all expected functionality, interactions, and integrations.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LecturerDashboard from './LecturerDashboard';
import { 
  createMockTimesheetPage, 
  createMockDashboardSummary,
  createMockUser,
  MockAuthProvider,
  createMockTimesheet
} from '../../../test/utils/test-utils';
import * as timesheetHooks from '../../../hooks/useTimesheets';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock hooks
vi.mock('../../../hooks/useTimesheets', () => ({
  usePendingTimesheets: vi.fn(),
  useDashboardSummary: vi.fn(),
  useApprovalAction: vi.fn(),
  useTimesheetStats: vi.fn()
}));

const mockHooks = timesheetHooks as any;

// Mock data
const mockLecturerUser = createMockUser({ role: 'LECTURER', firstName: 'Dr. Jane', lastName: 'Smith' });
const mockPendingTimesheets = createMockTimesheetPage(8, {}, { status: 'SUBMITTED' });
const mockDashboardSummary = createMockDashboardSummary({
  pendingApproval: 8,
  totalTimesheets: 45,
  thisWeekHours: 120,
  statusBreakdown: {
    DRAFT: 2,
    SUBMITTED: 8,
    APPROVED_BY_LECTURER: 15,
    REJECTED_BY_LECTURER: 3,
    APPROVED_BY_ADMIN: 12,
    REJECTED_BY_ADMIN: 1,
    FINAL_APPROVED: 3,
    PAID: 1
  }
});

const mockStats = {
  totalHours: 85,
  totalPay: 2975,
  totalCount: 8,
  statusCounts: { SUBMITTED: 8 },
  averageHoursPerTimesheet: 10.6,
  averagePayPerTimesheet: 371.9
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockAuthProvider value={{ user: mockLecturerUser, isAuthenticated: true }}>
    {children}
  </MockAuthProvider>
);

// =============================================================================
// LecturerDashboard Component Tests
// =============================================================================

describe('LecturerDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default hook returns
    mockHooks.usePendingTimesheets.mockReturnValue({
      data: mockPendingTimesheets,
      loading: false,
      error: null,
      timesheets: mockPendingTimesheets.timesheets,
      isEmpty: false,
      refetch: vi.fn()
    });

    mockHooks.useDashboardSummary.mockReturnValue({
      data: mockDashboardSummary,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    mockHooks.useApprovalAction.mockReturnValue({
      loading: false,
      error: null,
      approveTimesheet: vi.fn().mockResolvedValue({ success: true }),
      batchApprove: vi.fn().mockResolvedValue([{ success: true }]),
      reset: vi.fn()
    });

    mockHooks.useTimesheetStats.mockReturnValue(mockStats);
  });

  describe('Basic Rendering', () => {
    it('should render dashboard header with lecturer name', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/Welcome back, Dr. Jane Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/Lecturer Dashboard/i)).toBeInTheDocument();
    });

    it('should render main navigation sections', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/Pending Approvals/i)).toBeInTheDocument();
      expect(screen.getByText(/Dashboard Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
    });

    it('should render pending approvals count badge', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      const countBadge = screen.getByText('8');
      expect(countBadge).toBeInTheDocument();
      expect(countBadge.closest('.count-badge')).toHaveClass('urgent');
    });

    it('should apply correct CSS classes', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      const dashboard = screen.getByTestId('lecturer-dashboard');
      expect(dashboard).toHaveClass('dashboard-container');
      expect(dashboard).toHaveClass('lecturer-dashboard');
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when fetching pending timesheets', async () => {
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: true,
        data: null,
        timesheets: [],
        isEmpty: false,
        refetch: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show loading spinner when fetching dashboard summary', async () => {
      mockHooks.useDashboardSummary.mockReturnValue({
        loading: true,
        data: null,
        refetch: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show skeleton cards during loading', async () => {
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: true,
        data: null,
        timesheets: [],
        isEmpty: false,
        refetch: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getAllByTestId('skeleton-card')).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when pending timesheets fail to load', async () => {
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: false,
        data: null,
        error: 'Failed to fetch pending timesheets',
        timesheets: [],
        isEmpty: false,
        refetch: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/Failed to fetch pending timesheets/i)).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });

    it('should display error message when dashboard summary fails to load', async () => {
      mockHooks.useDashboardSummary.mockReturnValue({
        loading: false,
        data: null,
        error: 'Failed to fetch dashboard summary',
        refetch: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/Failed to fetch dashboard summary/i)).toBeInTheDocument();
    });

    it('should allow retry when errors occur', async () => {
      const refetchMock = vi.fn();
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: false,
        data: null,
        error: 'Network error',
        timesheets: [],
        isEmpty: false,
        refetch: refetchMock
      });

      const user = userEvent.setup();
      render(<LecturerDashboard />, { wrapper });
      
      const retryButton = screen.getByText(/Retry/i);
      await user.click(retryButton);
      
      expect(refetchMock).toHaveBeenCalled();
    });
  });

  describe('Pending Approvals Section', () => {
    it('should display pending timesheets in table format', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      await waitFor(() => {
        expect(screen.getByTestId('timesheet-table')).toBeInTheDocument();
      });

      // Should show lecturer-specific columns
      expect(screen.getByRole('columnheader', { name: /tutor/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /course/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });

    it('should show all pending timesheets requiring lecturer approval', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      mockPendingTimesheets.timesheets.forEach(timesheet => {
        expect(screen.getByTestId(`timesheet-row-${timesheet.id}`)).toBeInTheDocument();
      });
    });

    it('should show empty state when no pending approvals', async () => {
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: false,
        data: { ...mockPendingTimesheets, timesheets: [] },
        timesheets: [],
        isEmpty: true,
        refetch: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/No pending approvals/i)).toBeInTheDocument();
      expect(screen.getByText(/All caught up!/i)).toBeInTheDocument();
    });

    it('should enable bulk selection for batch approval', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      await waitFor(() => {
        expect(screen.getByLabelText('Select all timesheets')).toBeInTheDocument();
      });

      mockPendingTimesheets.timesheets.forEach(timesheet => {
        expect(screen.getByLabelText(`Select timesheet ${timesheet.id}`)).toBeInTheDocument();
      });
    });

    it('should show batch action buttons when timesheets are selected', async () => {
      const user = userEvent.setup();
      render(<LecturerDashboard />, { wrapper });
      
      await waitFor(() => {
        const firstCheckbox = screen.getByLabelText(`Select timesheet ${mockPendingTimesheets.timesheets[0].id}`);
        expect(firstCheckbox).toBeInTheDocument();
      });

      const firstCheckbox = screen.getByLabelText(`Select timesheet ${mockPendingTimesheets.timesheets[0].id}`);
      await user.click(firstCheckbox);
      
      expect(screen.getByText(/Batch Approve/i)).toBeInTheDocument();
      expect(screen.getByText(/Batch Reject/i)).toBeInTheDocument();
    });
  });

  describe('Approval Actions', () => {
    it('should handle individual timesheet approval', async () => {
      const approveMock = vi.fn().mockResolvedValue({ success: true });
      mockHooks.useApprovalAction.mockReturnValue({
        loading: false,
        error: null,
        approveTimesheet: approveMock,
        batchApprove: vi.fn(),
        reset: vi.fn()
      });

      const user = userEvent.setup();
      render(<LecturerDashboard />, { wrapper });
      
      await waitFor(() => {
        const approveButton = screen.getAllByText('Approve')[0];
        expect(approveButton).toBeInTheDocument();
      });

      const approveButton = screen.getAllByText('Approve')[0];
      await user.click(approveButton);
      
      expect(approveMock).toHaveBeenCalledWith({
        timesheetId: mockPendingTimesheets.timesheets[0].id,
        action: 'APPROVED_BY_LECTURER'
      });
    });

    it('should handle individual timesheet rejection with modal', async () => {
      const user = userEvent.setup();
      render(<LecturerDashboard />, { wrapper });
      
      await waitFor(() => {
        const rejectButton = screen.getAllByText('Reject')[0];
        expect(rejectButton).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByText('Reject')[0];
      await user.click(rejectButton);
      
      // Should open rejection modal
      expect(screen.getByText(/Reject Timesheet/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reason for rejection/i)).toBeInTheDocument();
    });

    it('should handle batch approval', async () => {
      const batchApproveMock = vi.fn().mockResolvedValue([{ success: true }]);
      mockHooks.useApprovalAction.mockReturnValue({
        loading: false,
        error: null,
        approveTimesheet: vi.fn(),
        batchApprove: batchApproveMock,
        reset: vi.fn()
      });

      const user = userEvent.setup();
      render(<LecturerDashboard />, { wrapper });
      
      // Select multiple timesheets
      await waitFor(() => {
        const selectAllCheckbox = screen.getByLabelText('Select all timesheets');
        expect(selectAllCheckbox).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText('Select all timesheets');
      await user.click(selectAllCheckbox);
      
      const batchApproveButton = screen.getByText(/Batch Approve/i);
      await user.click(batchApproveButton);
      
      expect(batchApproveMock).toHaveBeenCalledWith(
        mockPendingTimesheets.timesheets.map(t => ({
          timesheetId: t.id,
          action: 'APPROVED_BY_LECTURER'
        }))
      );
    });

    it('should show loading state during approval actions', async () => {
      mockHooks.useApprovalAction.mockReturnValue({
        loading: true,
        error: null,
        approveTimesheet: vi.fn(),
        batchApprove: vi.fn(),
        reset: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      await waitFor(() => {
        const loadingSpinners = screen.getAllByTestId('loading-spinner');
        expect(loadingSpinners.length).toBeGreaterThan(0);
      });
    });

    it('should handle approval errors gracefully', async () => {
      mockHooks.useApprovalAction.mockReturnValue({
        loading: false,
        error: 'Approval failed due to system error',
        approveTimesheet: vi.fn(),
        batchApprove: vi.fn(),
        reset: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/Approval failed due to system error/i)).toBeInTheDocument();
    });
  });

  describe('Dashboard Summary Section', () => {
    it('should display key statistics cards', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText('8')).toBeInTheDocument(); // Pending approvals
      expect(screen.getByText('45')).toBeInTheDocument(); // Total timesheets
      expect(screen.getByText('120h')).toBeInTheDocument(); // This week hours
      expect(screen.getByText('15')).toBeInTheDocument(); // Approved by lecturer
    });

    it('should show status breakdown chart', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByTestId('status-breakdown-chart')).toBeInTheDocument();
      
      // Should show status counts
      Object.entries(mockDashboardSummary.statusBreakdown).forEach(([status, count]) => {
        if (count > 0) {
          expect(screen.getByText(count.toString())).toBeInTheDocument();
        }
      });
    });

    it('should display recent activity feed', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
      
      mockDashboardSummary.recentActivity.forEach(activity => {
        expect(screen.getByText(activity.description)).toBeInTheDocument();
      });
    });

    it('should show performance trends', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByTestId('performance-trends')).toBeInTheDocument();
      expect(screen.getByText(/Approval Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/Average Processing Time/i)).toBeInTheDocument();
    });
  });

  describe('Quick Actions Section', () => {
    it('should display quick action buttons', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/View All Timesheets/i)).toBeInTheDocument();
      expect(screen.getByText(/Export Reports/i)).toBeInTheDocument();
      expect(screen.getByText(/Manage Courses/i)).toBeInTheDocument();
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should handle quick action clicks', async () => {
      const user = userEvent.setup();
      render(<LecturerDashboard />, { wrapper });
      
      const viewAllButton = screen.getByText(/View All Timesheets/i);
      await user.click(viewAllButton);
      
      // Should navigate or trigger action (would be tested with router mocks)
      expect(viewAllButton).toBeInTheDocument();
    });

    it('should show shortcuts with keyboard hints', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByText(/Ctrl+A/i)).toBeInTheDocument(); // Select all shortcut
      expect(screen.getByText(/Ctrl+Enter/i)).toBeInTheDocument(); // Approve shortcut
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<LecturerDashboard />, { wrapper });
      
      const dashboard = screen.getByTestId('lecturer-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('should stack cards vertically on small screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<LecturerDashboard />, { wrapper });
      
      const cardContainer = screen.getByTestId('statistics-cards');
      expect(cardContainer).toHaveClass('stacked-layout');
    });

    it('should collapse sidebar on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<LecturerDashboard />, { wrapper });
      
      const sidebar = screen.getByTestId('dashboard-sidebar');
      expect(sidebar).toHaveClass('collapsed');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /pending approvals/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /dashboard summary/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LecturerDashboard />, { wrapper });
      
      // Should be able to tab through interactive elements
      await user.tab();
      expect(document.activeElement).toHaveAttribute('tabindex', '0');
    });

    it('should announce status changes to screen readers', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', async () => {
      render(<LecturerDashboard />, { wrapper });
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Welcome back/i);
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3); // Sections
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4); // Cards
    });
  });

  describe('Performance', () => {
    it('should memoize expensive computations', async () => {
      const { rerender } = render(<LecturerDashboard />, { wrapper });
      
      // Re-render with same props
      rerender(<LecturerDashboard />);
      
      // Statistics should be computed only once due to memoization
      expect(mockHooks.useTimesheetStats).toHaveBeenCalledTimes(2); // Once per render
    });

    it('should handle large datasets efficiently', async () => {
      const largePendingTimesheets = createMockTimesheetPage(100, {}, { status: 'SUBMITTED' });
      
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: false,
        data: largePendingTimesheets,
        timesheets: largePendingTimesheets.timesheets,
        isEmpty: false,
        refetch: vi.fn()
      });

      const startTime = performance.now();
      render(<LecturerDashboard />, { wrapper });
      const endTime = performance.now();
      
      // Should render large dataset in reasonable time
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should implement virtual scrolling for large lists', async () => {
      const largePendingTimesheets = createMockTimesheetPage(200, {}, { status: 'SUBMITTED' });
      
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: false,
        data: largePendingTimesheets,
        timesheets: largePendingTimesheets.timesheets,
        isEmpty: false,
        refetch: vi.fn()
      });

      render(<LecturerDashboard />, { wrapper });
      
      // Should use virtualized list for large datasets
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should refresh data periodically', async () => {
      const refetchMock = vi.fn();
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: false,
        data: mockPendingTimesheets,
        timesheets: mockPendingTimesheets.timesheets,
        isEmpty: false,
        refetch: refetchMock
      });

      render(<LecturerDashboard />, { wrapper });
      
      // Should setup periodic refresh
      expect(refetchMock).toHaveBeenCalled();
    });

    it('should handle data updates gracefully', async () => {
      const { rerender } = render(<LecturerDashboard />, { wrapper });
      
      // Update pending timesheets
      const updatedTimesheets = createMockTimesheetPage(5, {}, { status: 'SUBMITTED' });
      mockHooks.usePendingTimesheets.mockReturnValue({
        loading: false,
        data: updatedTimesheets,
        timesheets: updatedTimesheets.timesheets,
        isEmpty: false,
        refetch: vi.fn()
      });

      rerender(<LecturerDashboard />);
      
      // Should reflect updated count
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});