/**
 * TutorDashboard Component Tests
 * 
 * TDD test suite for TutorDashboard component before implementation.
 * Tests tutor-specific functionality, timesheet management, and self-service features.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TutorDashboard from './TutorDashboard';
import { 
  createMockTimesheetPage, 
  createMockDashboardSummary,
  createMockAuthUser,
  createMockTimesheet,
  MockAuthProvider
} from '../../../test/utils/test-utils';
import * as timesheetHooks from '../../../hooks/useTimesheets';
import * as authContext from '../../../contexts/AuthContext';
import { getStatusConfig } from '../../shared/StatusBadge/StatusBadge';
import type { TimesheetStatus } from '../../../types/api';

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

const statusCounts = {
  DRAFT: 4,
  MODIFICATION_REQUESTED: 1,
  PENDING_TUTOR_CONFIRMATION: 5,
  TUTOR_CONFIRMED: 3,
  LECTURER_CONFIRMED: 2,
  FINAL_CONFIRMED: 6,
  REJECTED: 2
};

const mockTutorSummary = createMockDashboardSummary({
  totalTimesheets: 28,
  pendingApprovals: 5,
  approvedTimesheets: 18,
  rejectedTimesheets: 2,
  totalHours: 245.5,
  totalPay: 8593.50,
  thisWeekHours: 15,
  thisWeekPay: 525,
  statusBreakdown: statusCounts,
  upcomingDeadlines: [
    { courseId: 1, courseName: 'CS101', deadline: '2024-01-15' },
    { courseId: 2, courseName: 'CS102', deadline: '2024-01-22' }
  ]
});

const mockTutorStats = {
  totalHours: 245.5,
  totalPay: 8593.50,
  totalCount: 28,
  statusCounts,
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
      refresh: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined)
    });

    mockHooks.useDashboardSummary.mockReturnValue({
      data: mockTutorSummary,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    mockHooks.useCreateTimesheet.mockImplementation(() => ({
      loading: false,
      error: null,
      createTimesheet: vi.fn().mockResolvedValue(createMockTimesheet()),
      reset: vi.fn()
    }));

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

      const weekHeading = screen.getByRole('heading', { level: 2, name: /This Week/i });
      expect(weekHeading).toBeInTheDocument();

      const weekSummary = weekHeading.closest('.week-summary') as HTMLElement;
      expect(weekSummary).not.toBeNull();
      const weekScope = within(weekSummary as HTMLElement);
      expect(weekScope.getByText('15h')).toBeInTheDocument(); // This week hours
      expect(weekScope.getByText('$525')).toBeInTheDocument(); // This week pay
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
      
      const createButton = await screen.findByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      expect(screen.getByText(/New Timesheet Form/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Course/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Week Starting/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hours Worked/i)).toBeInTheDocument();
    });

    it('should show quick statistics cards', async () => {
      render(<TutorDashboard />, { wrapper });

      const statsRegion = screen.getByRole('region', { name: /Your Statistics/i });
      const statsScope = within(statsRegion);
      expect(statsScope.getByText(/Total Earned/i)).toBeInTheDocument();
      expect(statsScope.getByText('$8,593.50')).toBeInTheDocument();
      expect(statsScope.getByText(/Total Hours/i)).toBeInTheDocument();
      expect(statsScope.getByText('245.5h')).toBeInTheDocument();
      expect(statsScope.getByText(/Average per Week/i)).toBeInTheDocument();
    });

    it('should display status at a glance', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Drafts, 9 In Progress, 2 Needs Attention/i)).toBeInTheDocument();
    });
  });

  describe('My Timesheets Section', () => {
    it('should display timesheets in organized tabs', async () => {
      render(<TutorDashboard />, { wrapper });

      const timesheetsRegion = screen.getByRole('region', { name: /My Timesheets/i });
      const tabContainer = timesheetsRegion.querySelector('.timesheet-tabs') as HTMLElement;
      expect(tabContainer).toBeTruthy();

      const draftsCount = mockTutorTimesheets.timesheets.filter(t => ['DRAFT', 'MODIFICATION_REQUESTED'].includes(t.status)).length;
      const inProgressCount = mockTutorTimesheets.timesheets.filter(t => ['PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED'].includes(t.status)).length;
      const needAttentionCount = mockTutorTimesheets.timesheets.filter(t => ['REJECTED', 'MODIFICATION_REQUESTED'].includes(t.status)).length;

      const tabButtons = within(tabContainer).getAllByRole('button');
      const tabLabels = tabButtons.map(button => button.textContent?.trim());
      expect(tabLabels).toEqual([
        'All Timesheets',
        `Drafts (${draftsCount})`,
        `In Progress (${inProgressCount})`,
        `Needs Attention (${needAttentionCount})`
      ]);
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

      const timesheetsRegion = screen.getByRole('region', { name: /My Timesheets/i });
      const draftsTab = await within(timesheetsRegion).findByRole('button', { name: /Drafts/i });
      await user.click(draftsTab);

      const selectAllDrafts = screen.getByLabelText(/Select all drafts/i);
      await user.click(selectAllDrafts);

      const submitSelectedButton = screen.getByText(/Submit Selected/i);
      await user.click(submitSelectedButton);

      expect(screen.getByText(/Confirm Submission/i)).toBeInTheDocument();
      expect(screen.getByText(/3 timesheets will be submitted/i)).toBeInTheDocument();
    });

    it('should show timesheet status with clear indicators', async () => {
      render(<TutorDashboard />, { wrapper });
      
      const timesheetsRegion = screen.getByRole('region', { name: /My Timesheets/i });

      mockTutorTimesheets.timesheets.forEach((timesheet) => {
        const badge = within(timesheetsRegion).getByTestId(`status-badge-${timesheet.id}`);
        const expectedLabel = getStatusConfig(timesheet.status as TimesheetStatus).label;
        expect(badge).toHaveTextContent(expectedLabel);
      });
    });
  });

  describe('Timesheet Form and Editing', () => {
    it('should validate timesheet form inputs', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = await screen.findByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      // Try to submit without required fields
      const submitButton = screen.getByText(/Create Timesheet/i);
      await user.click(submitButton);
      
      expect(screen.getByText(/Course is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Hours must be greater than 0/i)).toBeInTheDocument();
    });

    it('should handle form submission successfully', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = await screen.findByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      // Fill form
      await user.selectOptions(screen.getByLabelText(/Course/i), '1');
      await user.clear(screen.getByLabelText(/Week Starting/i));
      await user.type(screen.getByLabelText(/Week Starting/i), '2024-01-01');
      await user.type(screen.getByLabelText(/Hours Worked/i), '8');
      await user.type(screen.getByLabelText(/Description/i), 'Tutorial session');
      
      const submitButton = screen.getByText(/Create Timesheet/i);
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.queryByText(/Course is required/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Hours must be greater than 0/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Week start date is required/i)).not.toBeInTheDocument();
      });
    });

    it('should auto-save drafts periodically', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = await screen.findByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      await user.type(screen.getByLabelText(/Description/i), 'Auto-save test');
      
      await screen.findByText(/Draft saved/i);
      expect(screen.getByText(/Draft saved/i)).toBeInTheDocument();
      
    });

    it('should show form validation errors clearly', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = await screen.findByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      const modalHeading = await screen.findByRole('heading', { level: 3, name: /New Timesheet Form/i });
      const modal = modalHeading.closest('.timesheet-form-modal') as HTMLElement;
      expect(modal).not.toBeNull();
      const formScope = within(modal);
      const hoursInput = formScope.getByLabelText(/Hours Worked/i) as HTMLInputElement;
      
      await user.type(hoursInput, '100');
      hoursInput.blur();
      
      expect(await formScope.findByText(/Hours must be between 0.1 and 60/i)).toBeInTheDocument();
      await waitFor(() => expect(hoursInput).toHaveClass('error'));
    });
  });

  describe('Pay and Earnings Tracking', () => {
    it('should display comprehensive pay summary', async () => {
      render(<TutorDashboard />, { wrapper });

      const paySummaryHeading = screen.getByRole('heading', { level: 3, name: /Pay Summary/i });
      const paySummarySection = paySummaryHeading.closest('.pay-summary');
      expect(paySummarySection).not.toBeNull();
      const paySummaryElement = paySummarySection as HTMLElement;

      const normaliseText = (value: string | null) =>
        value ? value.replace(/\s+/g, ' ').replace('$ ', '$').trim() : '';

      const payLabels = Array.from(paySummaryElement.querySelectorAll('.pay-label')).map(label =>
        normaliseText(label.textContent)
      );

      expect(payLabels).toEqual([
        'Total Earned: $8,593.50',
        'This Week: $525',
        'Average per Timesheet: $306.90'
      ]);
    });

    it('should show earnings breakdown by course', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('earnings-breakdown')).toBeInTheDocument();
      expect(screen.getByText(/Earnings by Course/i)).toBeInTheDocument();
    });

    it('should display payment status and history', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/Payment Status/i)).toBeInTheDocument();
      expect(screen.getByText(/6 Final Confirmed/i)).toBeInTheDocument();
      expect(screen.getByText(/2 Awaiting Final Approval/i)).toBeInTheDocument();
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
      expect(screen.getByText(/5 draft timesheets/i)).toBeInTheDocument();
    });

    it('should allow dismissing notifications', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const notificationsPanel = screen.getByTestId('notifications-panel');
      const panelScope = within(notificationsPanel);
      const deadlineNotification = panelScope.getByText(/Deadline approaching for CS101/i).closest('.notification');
      expect(deadlineNotification).not.toBeNull();
      const dismissButton = within(deadlineNotification as HTMLElement).getByRole('button', { name: /dismiss notification/i });
      await user.click(dismissButton);
      
      await waitFor(() => {
        expect(panelScope.queryByText(/Deadline approaching for CS101/i)).not.toBeInTheDocument();
      });
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

      const coursesSection = screen.getByText(/My Courses/i).closest('.my-courses') as HTMLElement;
      expect(coursesSection).not.toBeNull();
      const coursesScope = within(coursesSection as HTMLElement);
      expect(coursesScope.getByText(/Hourly Rates/i)).toBeInTheDocument();
      expect(coursesScope.getByText(/CS101 - Computer Science 101/i)).toBeInTheDocument();
      expect(coursesScope.getByText('$35.50/hr')).toBeInTheDocument();
    });
  });

  describe('Mobile and Responsive Features', () => {
    it('should adapt layout for mobile screens', async () => {
      const originalWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      try {
        render(<TutorDashboard />, { wrapper });

        const dashboard = screen.getByTestId('tutor-dashboard');
        expect(dashboard).toHaveClass('mobile-layout');
      } finally {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: originalWidth,
        });
      }
    });

    it('should provide mobile-optimized quick actions', async () => {
      const originalWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      try {
        render(<TutorDashboard />, { wrapper });

        expect(screen.getByTestId('mobile-quick-actions')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create new timesheet \(mobile\)/i })).toBeInTheDocument();
      } finally {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: originalWidth,
        });
      }
    });

    it('should show collapsible sections on mobile', async () => {
      const originalWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const user = userEvent.setup();

      try {
        render(<TutorDashboard />, { wrapper });

        const toggleButton = await screen.findByRole('button', { name: /Expand Pay Summary/i });
        const paySummarySection = toggleButton.closest('.pay-summary-section') as HTMLElement;
        expect(paySummarySection).not.toBeNull();

        await user.click(toggleButton);

        await waitFor(() => {
          expect(within(paySummarySection).getByTestId('expanded-pay-summary')).toBeInTheDocument();
        });
      } finally {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: originalWidth,
        });
      }
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
        refresh: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined)
      });

      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByText(/No timesheets yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Create your first timesheet/i)).toBeInTheDocument();
    });

    it('should handle timesheet creation errors', async () => {
      mockHooks.useCreateTimesheet.mockImplementation(() => ({
        loading: false,
        error: 'Course not found or inactive',
        createTimesheet: vi.fn(),
        reset: vi.fn()
      }));

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
        refresh: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined)
      });

      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/Loading your timesheets.../i)).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper heading hierarchy', async () => {
      render(<TutorDashboard />, { wrapper });
      
      expect(screen.getByRole('heading', { level: 1, name: /Welcome back, Michael!/i })).toBeInTheDocument();
      
      const level2Headings = screen
        .getAllByRole('heading', { level: 2 })
        .map(heading => heading.textContent?.trim() ?? '');
      expect(level2Headings).toEqual(expect.arrayContaining(['This Week', 'Quick Actions', 'Your Statistics', 'My Timesheets']));
      
      const level3Headings = screen
        .getAllByRole('heading', { level: 3 })
        .map(heading => heading.textContent?.trim() ?? '');
      expect(level3Headings).toEqual(expect.arrayContaining(['Pay Summary', 'Earnings by Course', 'My Courses', "This Week's Schedule", 'Notifications']));
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      await user.tab();
      expect(document.activeElement).toHaveAccessibleName(/Create New Timesheet/i);
      
      await user.keyboard('{Enter}');
      const modalHeading = await screen.findByRole('heading', { level: 3, name: /New Timesheet Form/i });
      expect(modalHeading).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', async () => {
      render(<TutorDashboard />, { wrapper });
      
      const statusRegion = screen.getByRole('status', { name: /dashboard status/i });
      expect(statusRegion).toBeInTheDocument();
    });

    it('should have proper form labels and descriptions', async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });
      
      const createButton = await screen.findByText(/Create New Timesheet/i);
      await user.click(createButton);
      
      expect(await screen.findByLabelText(/Course/i)).toHaveAccessibleDescription();
      expect(await screen.findByLabelText(/Hours Worked/i)).toHaveAccessibleDescription();
      expect(await screen.findByLabelText(/Description/i)).toHaveAccessibleDescription();
    });
  });
});









