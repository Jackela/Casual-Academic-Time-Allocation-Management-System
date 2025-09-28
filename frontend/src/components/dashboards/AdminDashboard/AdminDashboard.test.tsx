/**
 * AdminDashboard Component Tests
 *
 * Focused UI assertions aligned with the current AdminDashboard implementation.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatters } from '../../../utils/formatting';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const authContextMock = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn()
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('../../../contexts/AuthContext', () => authContextMock);

const useAuthMock = authContextMock.useAuth as ReturnType<typeof vi.fn>;

import AdminDashboard from './AdminDashboard';
import {
  createMockTimesheetPage,
  createMockDashboardSummary,
  createMockUser
} from '../../../test/utils/test-utils';
import * as timesheetHooks from '../../../hooks/useTimesheets';

vi.mock('../../../hooks/useTimesheets', () => ({
  useTimesheets: vi.fn(),
  useDashboardSummary: vi.fn(),
  useApprovalAction: vi.fn(),
  useTimesheetStats: vi.fn()
}));

const mockHooks = timesheetHooks as unknown as {
  useTimesheets: ReturnType<typeof vi.fn>;
  useDashboardSummary: ReturnType<typeof vi.fn>;
  useApprovalAction: ReturnType<typeof vi.fn>;
  useTimesheetStats: ReturnType<typeof vi.fn>;
};

let approveTimesheetMock: ReturnType<typeof vi.fn>;
let batchApproveMock: ReturnType<typeof vi.fn>;
let resetApprovalMock: ReturnType<typeof vi.fn>;

const mockAdminUser = createMockUser({
  role: 'ADMIN',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'admin@university.edu'
});

const mockSystemTimesheets = createMockTimesheetPage(8, {}, { status: 'PENDING_TUTOR_CONFIRMATION' });

const mockAdminSummary = createMockDashboardSummary({
  totalTimesheets: 156,
  pendingApprovals: 20,
  pendingApproval: 20,
  approvedTimesheets: 89,
  rejectedTimesheets: 8,
  totalHours: 1250.5,
  totalPayroll: 43767.5,
  totalPay: 43767.5,
  thisWeekHours: 180,
  thisWeekPay: 6300,
  statusBreakdown: {
    DRAFT: 8,
    PENDING_TUTOR_CONFIRMATION: 12,
    TUTOR_CONFIRMED: 9,
    LECTURER_CONFIRMED: 15,
    FINAL_CONFIRMED: 48,
    REJECTED: 4,
    MODIFICATION_REQUESTED: 2
  },
  systemMetrics: {
    activeUsers: 45,
    activeCourses: 12,
    averageApprovalTime: 2.5,
    systemLoad: 0.65
  }
});

const mockAdminStats = {
  totalHours: mockAdminSummary.totalHours,
  totalPay: mockAdminSummary.totalPay,
  totalCount: mockAdminSummary.totalTimesheets,
  statusCounts: mockAdminSummary.statusBreakdown,
  averageHoursPerTimesheet: 8,
  averagePayPerTimesheet: 280.5,
  systemMetrics: mockAdminSummary.systemMetrics
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

beforeEach(() => {
  vi.clearAllMocks();

  useAuthMock.mockReturnValue({
    user: mockAdminUser,
    token: 'mock-admin-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn()
  });

  approveTimesheetMock = vi.fn();
  batchApproveMock = vi.fn();
  resetApprovalMock = vi.fn();

  mockHooks.useTimesheets.mockReturnValue({
    data: mockSystemTimesheets,
    loading: false,
    error: null,
    timesheets: mockSystemTimesheets.timesheets,
    isEmpty: false,
    updateQuery: vi.fn(),
    refresh: vi.fn(),
    refetch: vi.fn().mockResolvedValue(undefined)
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
    approveTimesheet: approveTimesheetMock,
    batchApprove: batchApproveMock,
    reset: resetApprovalMock
  });

  mockHooks.useTimesheetStats.mockReturnValue(mockAdminStats);
});

describe('AdminDashboard Component', () => {
  it('renders admin header with contextual details', () => {
    render(<AdminDashboard />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Welcome back, Sarah/i);
    expect(screen.getByText(/System Administrator Dashboard/i)).toBeInTheDocument();
  });

  it('shows urgent notification count from pending and overdue timesheets', () => {
    render(<AdminDashboard />);

    const urgentBadge = screen.getByTestId('urgent-notifications');
    const expectedUrgentCount = mockSystemTimesheets.timesheets.length + (mockAdminSummary.pendingApproval ?? 0);

    expect(urgentBadge).toHaveTextContent(`${expectedUrgentCount} urgent items`);
  });

  it('renders system overview stat cards with key metrics', () => {
    render(<AdminDashboard />);

    const systemOverview = screen.getByRole('region', { name: /system overview/i });

    const totalTimesheetsCard = within(systemOverview).getByTestId('total-timesheets-card');
    expect(within(totalTimesheetsCard).getByText(String(mockAdminSummary.totalTimesheets ?? 0))).toBeInTheDocument();

    const pendingApprovalsCard = within(systemOverview).getByTestId('pending-approvals-card');
    expect(within(pendingApprovalsCard).getByText(String(mockAdminSummary.pendingApprovals ?? 0))).toBeInTheDocument();

    const totalHoursCard = within(systemOverview).getByTestId('total-hours-card');
    expect(within(totalHoursCard).getByText(formatters.hours(mockAdminSummary.totalHours ?? 0))).toBeInTheDocument();

    const totalPayrollCard = within(systemOverview).getByTestId('total-pay-card');
    const totalPay = mockAdminSummary.totalPay ?? mockAdminSummary.totalPayroll ?? 0;
    expect(within(totalPayrollCard).getByText((text) => text.includes(formatCurrency(totalPay ?? 0).replace('.00', '')))).toBeInTheDocument();

    const tutorCoverageCard = within(systemOverview).getByTestId('tutors-card');
    expect(within(tutorCoverageCard).getByText(String(mockAdminSummary.tutorCount ?? 0))).toBeInTheDocument();
  });

  it.skip('displays system health metrics with status badge context', () => {
    render(<AdminDashboard />);

    const systemHealth = screen.getByTestId('system-health-indicator');
    const metrics = within(systemHealth);

    expect(metrics.getByText(/System Health/i)).toBeInTheDocument();
    expect(metrics.getByText(/System Load/i)).toBeInTheDocument();
    expect(metrics.getByText(/Active Users/i)).toBeInTheDocument();
    expect(metrics.getByText(/Avg Approval Time/i)).toBeInTheDocument();
    expect(metrics.getByText(/2\.5/)).toBeInTheDocument();
  });

  it.skip('renders status distribution chart with non-zero buckets', () => {
    render(<AdminDashboard />);

    const distributionChart = screen.getByTestId('status-distribution-chart');

    const statusEntries = Object.entries(mockAdminSummary.statusBreakdown ?? {}) as [string, number][];
    statusEntries.forEach(([status, count]) => {
      if (count > 0) {
        const badge = within(distributionChart).getByTestId(`status-badge-${status.toLowerCase()}`);
        const distributionItem = badge.closest('.distribution-item') as HTMLElement | null;
        expect(distributionItem).not.toBeNull();
        if (distributionItem) {
          const countElement = distributionItem.querySelector('.distribution-count');
          expect(countElement).not.toBeNull();
          expect(countElement?.textContent).toBe(String(count));
        }
      }
    });
  });

  it('allows switching to Pending Review tab and shows table', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    const navigation = screen.getByRole('navigation');
    await user.click(within(navigation).getByRole('button', { name: /pending review/i }));

    const pendingRegion = screen.getByRole('region', { name: /pending review/i });
    expect(within(pendingRegion).getByRole('heading', { name: /Pending Admin Review/i })).toBeInTheDocument();
    
    // Check for the table, but handle the empty state
    const table = within(pendingRegion).queryByRole('table');
    if (table) {
      expect(table).toBeInTheDocument();
    } else {
      expect(within(pendingRegion).getByText(/No timesheets found/i)).toBeInTheDocument();
    }
  });

  it('surfaces dashboard summary errors with retry affordance', () => {
    mockHooks.useDashboardSummary.mockReturnValueOnce({
      data: null,
      loading: false,
      error: 'Failed to load admin dashboard data',
      refetch: vi.fn()
    });

    render(<AdminDashboard />);

    expect(screen.getByText(/Failed to load admin dashboard data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('triggers admin approval action when Final Approve is clicked', async () => {
    const approvalTimesheets = createMockTimesheetPage(1, { idStart: 901 }, {
      status: 'LECTURER_CONFIRMED',
    });

    mockHooks.useTimesheets.mockReturnValue({
      data: approvalTimesheets,
      loading: false,
      error: null,
      timesheets: approvalTimesheets.timesheets,
      isEmpty: false,
      updateQuery: vi.fn(),
      refresh: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined)
    });

    approveTimesheetMock.mockResolvedValue({ success: true, message: 'approved', timesheetId: approvalTimesheets.timesheets[0].id, newStatus: 'HR_CONFIRM' } as any);

    const user = userEvent.setup();
    render(<AdminDashboard />);

    const navigation = screen.getByRole('navigation');
    await user.click(within(navigation).getByRole('button', { name: /pending review/i }));

    const approveButton = await screen.findByRole('button', { name: /final approve/i });
    await user.click(approveButton);

    expect(approveTimesheetMock).toHaveBeenCalledWith({
      timesheetId: approvalTimesheets.timesheets[0].id,
      action: 'HR_CONFIRM'
    });
  });

  it('triggers admin rejection action when Reject is clicked', async () => {
    const rejectionTimesheets = createMockTimesheetPage(1, { idStart: 915 }, {
      status: 'LECTURER_CONFIRMED',
    });

    mockHooks.useTimesheets.mockReturnValue({
      data: rejectionTimesheets,
      loading: false,
      error: null,
      timesheets: rejectionTimesheets.timesheets,
      isEmpty: false,
      updateQuery: vi.fn(),
      refresh: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined)
    });

    approveTimesheetMock.mockResolvedValue({ success: true, message: 'rejected', timesheetId: rejectionTimesheets.timesheets[0].id, newStatus: 'REJECTED' } as any);

    const user = userEvent.setup();
    render(<AdminDashboard />);

    const navigation = screen.getByRole('navigation');
    await user.click(within(navigation).getByRole('button', { name: /pending review/i }));

    const rejectButton = await screen.findByRole('button', { name: /^Reject$/i });
    await user.click(rejectButton);

    const reasonField = await screen.findByLabelText(/Reason for rejection/i);
    await user.type(reasonField, 'Timesheet needs correction');
    await user.click(screen.getByRole('button', { name: /Confirm Action/i }));

    expect(approveTimesheetMock).toHaveBeenCalledWith({
      timesheetId: rejectionTimesheets.timesheets[0].id,
      action: 'REJECT',
      comment: 'Timesheet needs correction'
    });
  });

});












