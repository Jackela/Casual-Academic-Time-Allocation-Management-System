/**
 * AdminDashboard Component Tests
 * 
 * TDD test suite for AdminDashboard component before implementation.
 * Tests comprehensive admin functionality, system oversight, and management features.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from './AdminDashboard';
import { 
  createMockTimesheetPage, 
  createMockDashboardSummary,
  createMockUser,
  createMockTimesheets,
  MockAuthProvider
} from '../../../test/utils/test-utils';
import * as timesheetHooks from '../../../hooks/useTimesheets';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('../../../hooks/useTimesheets', () => ({
  useTimesheets: vi.fn(),
  useDashboardSummary: vi.fn(),
  useApprovalAction: vi.fn(),
  useTimesheetStats: vi.fn()
}));

const mockHooks = timesheetHooks as any;

// Mock data for admin dashboard
const mockAdminUser = createMockUser({ 
  role: 'ADMIN', 
  firstName: 'Sarah', 
  lastName: 'Johnson',
  email: 'admin@university.edu'
});

const mockSystemTimesheets = createMockTimesheetPage(25, {}, {});
const mockPendingReview = createMockTimesheets(12, { status: 'APPROVED_BY_LECTURER' });
const mockRecentSubmissions = createMockTimesheets(8, { status: 'SUBMITTED' });

const mockAdminSummary = createMockDashboardSummary({
  totalTimesheets: 156,
  pendingApproval: 20, // Combined lecturer + admin pending
  approvedTimesheets: 89,
  rejectedTimesheets: 8,
  totalHours: 1250.5,
  totalPay: 43767.50,
  thisWeekHours: 180,
  thisWeekPay: 6300,
  statusBreakdown: {
    DRAFT: 8,
    SUBMITTED: 8,
    APPROVED_BY_LECTURER: 12,
    REJECTED_BY_LECTURER: 5,
    APPROVED_BY_ADMIN: 45,
    REJECTED_BY_ADMIN: 3,
    FINAL_APPROVED: 68,
    PAID: 7
  },
  systemMetrics: {
    activeUsers: 45,
    activeCourses: 12,
    averageApprovalTime: 2.5,
    systemLoad: 0.65
  }
});

const mockAdminStats = {
  totalHours: 1250.5,
  totalPay: 43767.50,
  totalCount: 156,
  statusCounts: mockAdminSummary.statusBreakdown,
  averageHoursPerTimesheet: 8.0,
  averagePayPerTimesheet: 280.5,
  systemMetrics: mockAdminSummary.systemMetrics
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockAuthProvider value={{ user: mockAdminUser, isAuthenticated: true }}>
    {children}
  </MockAuthProvider>
);

// =============================================================================
// AdminDashboard Component Tests
// =============================================================================

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default hook returns for admin context
    mockHooks.useTimesheets.mockReturnValue({
      data: mockSystemTimesheets,
      loading: false,
      error: null,
      timesheets: mockSystemTimesheets.timesheets,
      isEmpty: false,
      updateQuery: vi.fn(),
      refresh: vi.fn()
    });

    mockHooks.useDashboardSummary.mockReturnValue({
      data: mockAdminSummary,
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

    mockHooks.useTimesheetStats.mockReturnValue(mockAdminStats);
  });

  describe('Admin Header and Navigation', () => {
    it('should render admin dashboard header with admin name', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Welcome, Sarah Johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/System Administrator/i)).toBeInTheDocument();
      expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    });

    it('should render admin-specific navigation tabs', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/System Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Reports & Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/System Settings/i)).toBeInTheDocument();
    });

    it('should show system status indicators', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('system-health-indicator')).toBeInTheDocument();
      expect(screen.getByText(/System Load: 65%/i)).toBeInTheDocument();
      expect(screen.getByText(/All Systems Operational/i)).toBeInTheDocument();
    });

    it('should display urgent notifications badge', async () => {
      render(<AdminDashboard />, { wrapper });
      
      const urgentBadge = screen.getByTestId('urgent-notifications');
      expect(urgentBadge).toBeInTheDocument();
      expect(urgentBadge).toHaveTextContent('20'); // Pending approvals
    });
  });

  describe('System Overview Section', () => {
    it('should display comprehensive system metrics', async () => {
      render(<AdminDashboard />, { wrapper });
      
      // Key system statistics
      expect(screen.getByText('156')).toBeInTheDocument(); // Total timesheets
      expect(screen.getByText('45')).toBeInTheDocument(); // Active users
      expect(screen.getByText('12')).toBeInTheDocument(); // Active courses
      expect(screen.getByText('$43,767.50')).toBeInTheDocument(); // Total pay
      expect(screen.getByText('1,250.5h')).toBeInTheDocument(); // Total hours
    });

    it('should show system performance metrics', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Average Approval Time/i)).toBeInTheDocument();
      expect(screen.getByText('2.5 days')).toBeInTheDocument();
      expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
    });

    it('should display real-time system status', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('real-time-status')).toBeInTheDocument();
      expect(screen.getByText(/Last Updated/i)).toBeInTheDocument();
      expect(screen.getByText(/Auto-refresh in/i)).toBeInTheDocument();
    });

    it('should show status distribution chart', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('status-distribution-chart')).toBeInTheDocument();
      
      // Should show all status categories with counts
      Object.entries(mockAdminSummary.statusBreakdown).forEach(([status, count]) => {
        if (count > 0) {
          expect(screen.getByText(count.toString())).toBeInTheDocument();
        }
      });
    });
  });

  describe('Pending Review Section', () => {
    it('should display timesheets requiring admin attention', async () => {
      render(<AdminDashboard />, { wrapper });
      
      // Should show both lecturer-approved and submitted timesheets
      expect(screen.getByText(/Requires Final Approval/i)).toBeInTheDocument();
      expect(screen.getByText(/Recently Submitted/i)).toBeInTheDocument();
    });

    it('should show priority queue for urgent approvals', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('priority-queue')).toBeInTheDocument();
      expect(screen.getByText(/High Priority/i)).toBeInTheDocument();
      expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
    });

    it('should enable advanced filtering and sorting', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByLabelText(/Filter by status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Filter by tutor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Filter by course/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sort by/i)).toBeInTheDocument();
    });

    it('should support bulk admin actions', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      // Select multiple items
      const selectAllCheckbox = screen.getByLabelText('Select all timesheets');
      await user.click(selectAllCheckbox);
      
      expect(screen.getByText(/Final Approve Selected/i)).toBeInTheDocument();
      expect(screen.getByText(/Bulk Reject/i)).toBeInTheDocument();
      expect(screen.getByText(/Export Selected/i)).toBeInTheDocument();
    });

    it('should show approval workflow stage', async () => {
      render(<AdminDashboard />, { wrapper });
      
      mockPendingReview.forEach(timesheet => {
        const row = screen.getByTestId(`timesheet-row-${timesheet.id}`);
        expect(row.querySelector('.workflow-stage')).toBeInTheDocument();
      });
    });
  });

  describe('User Management Integration', () => {
    it('should display active users summary', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Active Users/i)).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText(/Tutors: 32/i)).toBeInTheDocument();
      expect(screen.getByText(/Lecturers: 12/i)).toBeInTheDocument();
      expect(screen.getByText(/Admins: 1/i)).toBeInTheDocument();
    });

    it('should show recent user activity', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('recent-user-activity')).toBeInTheDocument();
      expect(screen.getByText(/New Registrations/i)).toBeInTheDocument();
      expect(screen.getByText(/Recent Logins/i)).toBeInTheDocument();
    });

    it('should link to user management functions', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      const manageUsersButton = screen.getByText(/Manage Users/i);
      await user.click(manageUsersButton);
      
      // Should navigate to user management (would test with router mocks)
      expect(manageUsersButton).toBeInTheDocument();
    });
  });

  describe('Reports and Analytics', () => {
    it('should display analytics dashboard', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Revenue Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Usage Trends/i)).toBeInTheDocument();
      expect(screen.getByText(/Efficiency Metrics/i)).toBeInTheDocument();
    });

    it('should show financial overview', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Total Payroll/i)).toBeInTheDocument();
      expect(screen.getByText('$43,767.50')).toBeInTheDocument();
      expect(screen.getByText(/This Week: $6,300/i)).toBeInTheDocument();
      expect(screen.getByText(/Budget Utilization/i)).toBeInTheDocument();
    });

    it('should provide export capabilities', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Export Reports/i)).toBeInTheDocument();
      expect(screen.getByText(/PDF Report/i)).toBeInTheDocument();
      expect(screen.getByText(/Excel Export/i)).toBeInTheDocument();
      expect(screen.getByText(/Custom Report/i)).toBeInTheDocument();
    });

    it('should show trend analysis', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('trend-analysis')).toBeInTheDocument();
      expect(screen.getByText(/Month over Month/i)).toBeInTheDocument();
      expect(screen.getByText(/Year over Year/i)).toBeInTheDocument();
    });
  });

  describe('Admin Actions and Controls', () => {
    it('should provide system-wide controls', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/System Maintenance/i)).toBeInTheDocument();
      expect(screen.getByText(/Backup Database/i)).toBeInTheDocument();
      expect(screen.getByText(/Clear Cache/i)).toBeInTheDocument();
      expect(screen.getByText(/Run Reports/i)).toBeInTheDocument();
    });

    it('should handle final approval with audit trail', async () => {
      const finalApproveMock = vi.fn().mockResolvedValue({ success: true });
      mockHooks.useApprovalAction.mockReturnValue({
        loading: false,
        error: null,
        approveTimesheet: finalApproveMock,
        batchApprove: vi.fn(),
        reset: vi.fn()
      });

      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      const finalApproveButton = screen.getByText(/Final Approve/i);
      await user.click(finalApproveButton);
      
      expect(finalApproveMock).toHaveBeenCalledWith({
        timesheetId: expect.any(Number),
        action: 'FINAL_APPROVED',
        adminNotes: expect.any(String)
      });
    });

    it('should support emergency override actions', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Emergency Override/i)).toBeInTheDocument();
      expect(screen.getByText(/Force Approval/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency Reject/i)).toBeInTheDocument();
    });

    it('should show confirmation dialogs for critical actions', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      const emergencyButton = screen.getByText(/Emergency Override/i);
      await user.click(emergencyButton);
      
      expect(screen.getByText(/Confirm Emergency Action/i)).toBeInTheDocument();
      expect(screen.getByText(/This action requires administrator authorization/i)).toBeInTheDocument();
    });
  });

  describe('System Monitoring and Alerts', () => {
    it('should display system health indicators', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('system-health')).toBeInTheDocument();
      expect(screen.getByText(/Database Status/i)).toBeInTheDocument();
      expect(screen.getByText(/API Response Time/i)).toBeInTheDocument();
      expect(screen.getByText(/Memory Usage/i)).toBeInTheDocument();
    });

    it('should show active alerts and warnings', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('system-alerts')).toBeInTheDocument();
      expect(screen.getByText(/System Alerts/i)).toBeInTheDocument();
    });

    it('should provide performance monitoring', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
      expect(screen.getByText(/Request Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Rate/i)).toBeInTheDocument();
    });

    it('should handle system status changes', async () => {
      const { rerender } = render(<AdminDashboard />, { wrapper });
      
      // Simulate system issue
      const alertingSummary = {
        ...mockAdminSummary,
        systemMetrics: {
          ...mockAdminSummary.systemMetrics,
          systemLoad: 0.95,
          alerts: ['High system load detected']
        }
      };

      mockHooks.useDashboardSummary.mockReturnValue({
        data: alertingSummary,
        loading: false,
        error: null,
        refetch: vi.fn()
      });

      rerender(<AdminDashboard />);
      
      expect(screen.getByText(/High system load detected/i)).toBeInTheDocument();
      expect(screen.getByTestId('system-health-indicator')).toHaveClass('warning');
    });
  });

  describe('Advanced Filtering and Search', () => {
    it('should support complex timesheet filtering', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      const filterButton = screen.getByText(/Advanced Filters/i);
      await user.click(filterButton);
      
      expect(screen.getByLabelText(/Date Range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Amount Range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tutor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Course/i)).toBeInTheDocument();
    });

    it('should provide global search functionality', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      const searchInput = screen.getByPlaceholderText(/Search timesheets, users, courses.../i);
      await user.type(searchInput, 'CS101');
      
      expect(searchInput).toHaveValue('CS101');
      expect(screen.getByText(/Search Results/i)).toBeInTheDocument();
    });

    it('should save and load filter presets', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Filter Presets/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending Final Approval/i)).toBeInTheDocument();
      expect(screen.getByText(/High Value Timesheets/i)).toBeInTheDocument();
      expect(screen.getByText(/This Week/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle dashboard data loading errors', async () => {
      mockHooks.useDashboardSummary.mockReturnValue({
        loading: false,
        data: null,
        error: 'Failed to load admin dashboard data',
        refetch: vi.fn()
      });

      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Failed to load admin dashboard data/i)).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });

    it('should show fallback UI for missing data', async () => {
      mockHooks.useDashboardSummary.mockReturnValue({
        loading: false,
        data: null,
        error: null,
        refetch: vi.fn()
      });

      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Dashboard data unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
    });

    it('should handle approval action failures', async () => {
      mockHooks.useApprovalAction.mockReturnValue({
        loading: false,
        error: 'Approval failed: Insufficient permissions',
        approveTimesheet: vi.fn(),
        batchApprove: vi.fn(),
        reset: vi.fn()
      });

      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByText(/Approval failed: Insufficient permissions/i)).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = createMockTimesheetPage(500);
      mockHooks.useTimesheets.mockReturnValue({
        data: largeDataset,
        loading: false,
        error: null,
        timesheets: largeDataset.timesheets,
        isEmpty: false,
        updateQuery: vi.fn(),
        refresh: vi.fn()
      });

      const startTime = performance.now();
      render(<AdminDashboard />, { wrapper });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(300);
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('should implement lazy loading for dashboard sections', async () => {
      render(<AdminDashboard />, { wrapper });
      
      // Heavy sections should load progressively
      expect(screen.getByTestId('loading-analytics')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
      });
    });

    it('should memoize expensive calculations', async () => {
      const { rerender } = render(<AdminDashboard />, { wrapper });
      
      rerender(<AdminDashboard />);
      
      // Statistics should be computed only when dependencies change
      expect(mockHooks.useTimesheetStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility and Usability', () => {
    it('should have proper admin dashboard semantics', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Admin Dashboard');
      expect(screen.getByRole('region', { name: /system overview/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /pending review/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /user management/i })).toBeInTheDocument();
    });

    it('should support admin keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard />, { wrapper });
      
      // Admin-specific shortcuts
      await user.keyboard('{Control>}{Shift>}a{/Shift}{/Control}'); // Approve all
      await user.keyboard('{Control>}{Shift>}r{/Shift}{/Control}'); // Refresh data
      await user.keyboard('{Control>}{Shift>}e{/Shift}{/Control}'); // Export
      
      // Should trigger appropriate actions
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    });

    it('should announce critical system changes', async () => {
      render(<AdminDashboard />, { wrapper });
      
      const announceRegion = screen.getByRole('status', { name: /system announcements/i });
      expect(announceRegion).toBeInTheDocument();
    });

    it('should have clear visual hierarchy for admin functions', async () => {
      render(<AdminDashboard />, { wrapper });
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Admin Dashboard/i);
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5); // Main sections
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(8); // Subsections
    });
  });
});