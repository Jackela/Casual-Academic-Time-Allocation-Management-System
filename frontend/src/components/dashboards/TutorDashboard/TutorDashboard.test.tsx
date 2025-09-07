/**
 * TutorDashboard Component Tests
 * 
 * TDD test suite for TutorDashboard component before implementation.
 * Tests tutor-specific functionality, timesheet management, and self-service features.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TutorDashboard from './TutorDashboard';
import { 
  createMockTimesheetPage, 
  createMockDashboardSummary,
  createMockUser,
  createMockAuthUser,
  createMockTimesheets,
  createMockTimesheet,
  MockAuthProvider
} from '../../../test/utils/test-utils';
import * as timesheetHooks from '../../../hooks/useTimesheets';
import * as authContext from '../../../contexts/AuthContext';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('../../../hooks/useTimesheets', () => ({
  useTimesheets: vi.fn(),
  useDashboardSummary: vi.fn(),
  useCreateTimesheet: vi.fn(),
  useUpdateTimesheet: vi.fn(),
  useTimesheetStats: vi.fn()
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockHooks = timesheetHooks as any;
const mockAuth = authContext as any;

// Mock data for tutor dashboard
const mockTutorUser = createMockAuthUser({ 
  role: 'TUTOR', 
  name: 'Michael Chen',
  email: 'michael.chen@student.edu',
  id: 1
});

const mockTutorTimesheets = createMockTimesheetPage(15, {}, { tutorId: 1 });
const mockDraftTimesheets = createMockTimesheets(3, { status: 'DRAFT', tutorId: 1 });
const mockSubmittedTimesheets = createMockTimesheets(5, { status: 'SUBMITTED', tutorId: 1 });
const mockRejectedTimesheets = createMockTimesheets(2, { status: 'REJECTED_BY_LECTURER', tutorId: 1 });

const mockTutorSummary = createMockDashboardSummary({
  totalTimesheets: 28,
  pendingApproval: 5, // Submitted awaiting approval
  approvedTimesheets: 18,
  rejectedTimesheets: 2,
  totalHours: 245.5,
  totalPay: 8593.50,
  thisWeekHours: 15,
  thisWeekPay: 525,
  statusBreakdown: {
    DRAFT: 3,
    SUBMITTED: 5,
    APPROVED_BY_LECTURER: 8,
    REJECTED_BY_LECTURER: 2,
    APPROVED_BY_ADMIN: 5,
    REJECTED_BY_ADMIN: 0,
    FINAL_APPROVED: 4,
    PAID: 1
  },
  upcomingDeadlines: [
    { courseId: 1, courseName: 'CS101', deadline: '2024-01-15' },
    { courseId: 2, courseName: 'CS102', deadline: '2024-01-22' }
  ]
});

const mockTutorStats = {
  totalHours: 245.5,
  totalPay: 8593.50,
  totalCount: 28,
  statusCounts: mockTutorSummary.statusBreakdown,
  averageHoursPerTimesheet: 8.8,
  averagePayPerTimesheet: 306.9,
  completionRate: 0.89,
  onTimeSubmissionRate: 0.95
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockAuthProvider value={{ user: mockTutorUser, isAuthenticated: true, token: 'mock-token' }}>
    {children}
  </MockAuthProvider>
);

// =============================================================================
// TutorDashboard Component Tests
// =============================================================================

describe('TutorDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup useAuth mock
    mockAuth.useAuth.mockReturnValue({
      user: mockTutorUser,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn()
    });
    
    // Setup default hook returns for tutor context
    mockHooks.useTimesheets.mockReturnValue({
      data: mockTutorTimesheets,
      loading: false,
      error: null,
      timesheets: mockTutorTimesheets.timesheets,
      isEmpty: false,
      updateQuery: vi.fn(),
      loadMore: vi.fn(),
      refresh: vi.fn()
    });

    mockHooks.useDashboardSummary.mockReturnValue({
      data: mockTutorSummary,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    mockHooks.useCreateTimesheet.mockReturnValue({
      loading: false,
      error: null,
      createTimesheet: vi.fn().mockResolvedValue(createMockTimesheet()),
      reset: vi.fn()
    });

    mockHooks.useUpdateTimesheet.mockReturnValue({
      loading: false,
      error: null,
      updateTimesheet: vi.fn().mockResolvedValue(createMockTimesheet()),
      reset: vi.fn()
    });

    mockHooks.useTimesheetStats.mockReturnValue(mockTutorStats);
  });

  describe('Tutor Header and Welcome', () => {
    it('should render personalized welcome message', async () => {
      render(<TutorDashboard />);
      
      expect(screen.getByText(/Welcome back, Michael!/i)).toBeInTheDocument();
      expect(screen.getByText(/Tutor Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Let's manage your timesheets/i)).toBeInTheDocument();
    });

    it('should show current week summary', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/This Week/i)).toBeInTheDocument();
      expect(screen.getByText('15h')).toBeInTheDocument(); // This week hours
      expect(screen.getByText('$525')).toBeInTheDocument(); // This week pay
    });

    it('should display upcoming deadlines', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Upcoming Deadlines/i)).toBeInTheDocument();
      expect(screen.getByText(/CS101 - Due Jan 15/i)).toBeInTheDocument();
      expect(screen.getByText(/CS102 - Due Jan 22/i)).toBeInTheDocument();
    });

    it('should show completion progress bar', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('completion-progress')).toBeInTheDocument();
      expect(screen.getByText(/89% Complete/i)).toBeInTheDocument();
    });
  });

  describe('Quick Actions Section', () => {
    it('should display primary action buttons', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Create New Timesheet/i)).toBeInTheDocument();
      expect(screen.getByText(/Submit All Drafts/i)).toBeInTheDocument();
      expect(screen.getByText(/View Pay Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Export My Data/i)).toBeInTheDocument();
    });

    it('should handle create new timesheet action', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = screen.getByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      expect(screen.getByText(/New Timesheet Form/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Course/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Week Starting/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hours Worked/i)).toBeInTheDocument();
    });

    it('should show quick statistics cards', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Total Earned/i)).toBeInTheDocument();
      expect(screen.getByText('$8,593.50')).toBeInTheDocument();
      expect(screen.getByText(/Total Hours/i)).toBeInTheDocument();
      expect(screen.getByText('245.5h')).toBeInTheDocument();
      expect(screen.getByText(/Average per Week/i)).toBeInTheDocument();
    });

    it('should display status at a glance', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/3 Drafts/i)).toBeInTheDocument();
      expect(screen.getByText(/5 Submitted/i)).toBeInTheDocument();
      expect(screen.getByText(/2 Need Attention/i)).toBeInTheDocument(); // Rejected
    });
  });

  describe('My Timesheets Section', () => {
    it('should display timesheets in organized tabs', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/All Timesheets/i)).toBeInTheDocument();
      expect(screen.getByText(/Drafts (3)/i)).toBeInTheDocument();
      expect(screen.getByText(/Submitted (5)/i)).toBeInTheDocument();
      expect(screen.getByText(/Need Action (2)/i)).toBeInTheDocument();
    });

    it('should show timesheets in table with tutor-specific columns', async () => {
      render(<TutorDashboard />, { wrapper });
      
      await waitFor(() => {
        expect(screen.getByTestId('timesheet-table')).toBeInTheDocument();
      });

      // Should show tutor-relevant columns
      expect(screen.getByRole('columnheader', { name: /course/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /week/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /hours/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });

    it('should enable quick editing of draft timesheets', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      // Click on a draft timesheet
      const editButton = screen.getAllByText(/Edit/i)[0];
      await user.click(editButton);
      
      expect(screen.getByText(/Edit Timesheet/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/10/i)).toBeInTheDocument(); // Hours field
    });

    it('should allow bulk submission of drafts', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      // Select multiple drafts
      const selectAllDrafts = screen.getByLabelText(/Select all drafts/i);
      await user.click(selectAllDrafts);
      
      const submitSelectedButton = screen.getByText(/Submit Selected/i);
      await user.click(submitSelectedButton);
      
      expect(screen.getByText(/Confirm Submission/i)).toBeInTheDocument();
      expect(screen.getByText(/3 timesheets will be submitted/i)).toBeInTheDocument();
    });

    it('should show timesheet status with clear indicators', async () => {
      render(<TutorDashboard />, { wrapper });
      
      mockTutorTimesheets.timesheets.forEach(timesheet => {
        const statusBadge = screen.getByTestId(`status-badge-${timesheet.status.toLowerCase()}`);
        expect(statusBadge).toBeInTheDocument();
      });
    });
  });

  describe('Timesheet Form and Editing', () => {
    it('should validate timesheet form inputs', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = screen.getByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      // Try to submit without required fields
      const submitButton = screen.getByText(/Create Timesheet/i);
      await user.click(submitButton);
      
      expect(screen.getByText(/Course is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Hours must be greater than 0/i)).toBeInTheDocument();
    });

    it('should handle form submission successfully', async () => {
      const createMock = vi.fn().mockResolvedValue(createMockTimesheet());
      mockHooks.useCreateTimesheet.mockReturnValue({
        loading: false,
        error: null,
        createTimesheet: createMock,
        reset: vi.fn()
      });

      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = screen.getByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      // Fill form
      await user.selectOptions(screen.getByLabelText(/Course/i), '1');
      await user.type(screen.getByLabelText(/Hours Worked/i), '8');
      await user.type(screen.getByLabelText(/Description/i), 'Tutorial session');
      
      const submitButton = screen.getByText(/Create Timesheet/i);
      await user.click(submitButton);
      
      expect(createMock).toHaveBeenCalledWith({
        tutorId: 1,
        courseId: 1,
        weekStartDate: expect.any(String),
        hours: 8,
        hourlyRate: expect.any(Number),
        description: 'Tutorial session'
      });
    });

    it('should auto-save drafts periodically', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = screen.getByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      await user.type(screen.getByLabelText(/Description/i), 'Auto-save test');
      
      // Trigger auto-save timer
      vi.advanceTimersByTime(30000); // 30 seconds
      
      expect(screen.getByText(/Draft saved/i)).toBeInTheDocument();
      
      vi.useRealTimers();
    });

    it('should show form validation errors clearly', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = screen.getByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      // Enter invalid hours
      await user.type(screen.getByLabelText(/Hours Worked/i), '100');
      await user.blur(screen.getByLabelText(/Hours Worked/i));
      
      expect(screen.getByText(/Hours must be between 0.1 and 60/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hours Worked/i)).toHaveClass('error');
    });
  });

  describe('Pay and Earnings Tracking', () => {
    it('should display comprehensive pay summary', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Pay Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Earned: $8,593.50/i)).toBeInTheDocument();
      expect(screen.getByText(/This Week: $525/i)).toBeInTheDocument();
      expect(screen.getByText(/Average per Timesheet: $306.90/i)).toBeInTheDocument();
    });

    it('should show earnings breakdown by course', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('earnings-breakdown')).toBeInTheDocument();
      expect(screen.getByText(/Earnings by Course/i)).toBeInTheDocument();
    });

    it('should display payment status and history', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Payment Status/i)).toBeInTheDocument();
      expect(screen.getByText(/1 Paid/i)).toBeInTheDocument();
      expect(screen.getByText(/4 Approved for Payment/i)).toBeInTheDocument();
      expect(screen.getByText(/Next Payment Date/i)).toBeInTheDocument();
    });

    it('should provide tax document preparation info', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Tax Information/i)).toBeInTheDocument();
      expect(screen.getByText(/Year-to-Date Earnings/i)).toBeInTheDocument();
      expect(screen.getByText(/Download Tax Summary/i)).toBeInTheDocument();
    });
  });

  describe('Notifications and Reminders', () => {
    it('should show important notifications', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('notifications-panel')).toBeInTheDocument();
      expect(screen.getByText(/2 timesheets need your attention/i)).toBeInTheDocument();
      expect(screen.getByText(/Deadline approaching for CS101/i)).toBeInTheDocument();
    });

    it('should display action-required items prominently', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('action-required')).toBeInTheDocument();
      expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
      expect(screen.getByText(/2 rejected timesheets/i)).toBeInTheDocument();
    });

    it('should show submission reminders', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Don't forget to submit/i)).toBeInTheDocument();
      expect(screen.getByText(/3 draft timesheets/i)).toBeInTheDocument();
    });

    it('should allow dismissing notifications', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const dismissButton = screen.getByLabelText(/Dismiss notification/i);
      await user.click(dismissButton);
      
      // Notification should be removed or marked as read
      expect(screen.queryByText(/Deadline approaching/i)).not.toBeInTheDocument();
    });
  });

  describe('Course and Schedule Integration', () => {
    it('should display enrolled courses', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/My Courses/i)).toBeInTheDocument();
      expect(screen.getByText(/CS101 - Computer Science 101/i)).toBeInTheDocument();
      expect(screen.getByText(/CS102 - Data Structures/i)).toBeInTheDocument();
    });

    it('should show course-specific statistics', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('course-stats')).toBeInTheDocument();
      expect(screen.getByText(/Hours per Course/i)).toBeInTheDocument();
    });

    it('should integrate with course calendar', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('course-calendar')).toBeInTheDocument();
      expect(screen.getByText(/This Week's Schedule/i)).toBeInTheDocument();
    });

    it('should show rate information per course', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Hourly Rates/i)).toBeInTheDocument();
      expect(screen.getByText(/CS101: $35.50\/hr/i)).toBeInTheDocument();
    });
  });

  describe('Mobile and Responsive Features', () => {
    it('should adapt layout for mobile screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TutorDashboard />, { wrapper });
      
      const dashboard = screen.getByTestId('tutor-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('should provide mobile-optimized quick actions', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('mobile-quick-actions')).toBeInTheDocument();
      expect(screen.getByText(/\+/i)).toBeInTheDocument(); // Floating action button
    });

    it('should show collapsible sections on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const collapseButton = screen.getByText(/Expand Pay Summary/i);
      await user.click(collapseButton);
      
      expect(screen.getByTestId('expanded-pay-summary')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty timesheet state', async () => {
      mockHooks.useTimesheets.mockReturnValue({
        data: { ...mockTutorTimesheets, timesheets: [] },
        loading: false,
        error: null,
        timesheets: [],
        isEmpty: true,
        updateQuery: vi.fn(),
        refresh: vi.fn()
      });

      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/No timesheets yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first timesheet/i)).toBeInTheDocument();
    });

    it('should handle timesheet creation errors', async () => {
      mockHooks.useCreateTimesheet.mockReturnValue({
        loading: false,
        error: 'Course not found or inactive',
        createTimesheet: vi.fn(),
        reset: vi.fn()
      });

      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Course not found or inactive/i)).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      mockHooks.useDashboardSummary.mockReturnValue({
        loading: false,
        data: null,
        error: 'Network connection failed',
        refetch: vi.fn()
      });

      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Network connection failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });

    it('should show loading states appropriately', async () => {
      mockHooks.useTimesheets.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        timesheets: [],
        isEmpty: false,
        updateQuery: vi.fn(),
        refresh: vi.fn()
      });

      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/Loading your timesheets.../i)).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper heading hierarchy', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Welcome back, Michael!/i);
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4); // Main sections
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6); // Subsections
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      // Should be able to tab through interactive elements
      await user.tab();
      expect(document.activeElement).toHaveAttribute('tabindex', '0');
      
      // Quick action should be accessible
      await user.keyboard('{Enter}');
      expect(screen.getByText(/New Timesheet Form/i)).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', async () => {
      render(<TutorDashboard />, { wrapper });
      
      const statusRegion = screen.getByRole('status', { name: /dashboard status/i });
      expect(statusRegion).toBeInTheDocument();
    });

    it('should have proper form labels and descriptions', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = screen.getByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      expect(screen.getByLabelText(/Course/i)).toHaveAccessibleDescription();
      expect(screen.getByLabelText(/Hours Worked/i)).toHaveAccessibleDescription();
      expect(screen.getByLabelText(/Description/i)).toHaveAccessibleDescription();
    });
  });
});