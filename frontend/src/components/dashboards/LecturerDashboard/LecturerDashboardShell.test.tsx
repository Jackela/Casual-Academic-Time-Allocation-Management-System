import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseLecturerDashboardDataResult } from './hooks/useLecturerDashboardData';

const mockUseLecturerDashboardData = vi.fn();

vi.mock('./hooks/useLecturerDashboardData', () => ({
  useLecturerDashboardData: () => mockUseLecturerDashboardData(),
}));

const mockUserProfile = vi.fn();

vi.mock('../../../auth/UserProfileProvider', () => ({
  useUserProfile: () => mockUserProfile(),
}));

vi.mock('./components/LecturerSummaryBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="lecturer-summary-banner" />,
}));

vi.mock('./components/LecturerFiltersPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="lecturer-filters-panel" />,
}));

vi.mock('./components/LecturerPendingTable', () => ({
  __esModule: true,
  default: () => <div data-testid="lecturer-pending-table" />,
}));

vi.mock('../../shared/feedback/GlobalErrorBanner', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../shared/feedback/PageLoadingIndicator', () => ({
  __esModule: true,
  default: () => null,
}));

const modalMock = vi.hoisted(() =>
  vi.fn((props: { isOpen: boolean }) =>
    props.isOpen ? <div data-testid="lecturer-create-modal" /> : null,
  ),
);

vi.mock('./components/LecturerTimesheetCreateModal', () => ({
  __esModule: true,
  default: modalMock,
}));

import LecturerDashboardShell from './LecturerDashboardShell';

const createHookValue = (): UseLecturerDashboardDataResult => ({
  sessionStatus: 'authenticated',
  welcomeMessage: 'Welcome back, Lecturer',
  pageLoading: false,
  pageErrors: [],
  canPerformApprovals: true,
  metrics: {
    pendingApproval: 0,
    totalTimesheets: 0,
    thisWeekHours: 0,
    thisWeekPay: 0,
    statusBreakdown: {},
  },
  urgentCount: 0,
  pendingTimesheets: [],
  filteredTimesheets: [],
  noPendingTimesheets: true,
  selectedTimesheets: [],
  setSelectedTimesheets: vi.fn(),
  filters: {
    searchQuery: '',
    showOnlyUrgent: false,
    courseId: 'ALL',
  },
  updateFilters: vi.fn(),
  clearFilters: vi.fn(),
  courseOptions: [],
  loading: {
    pending: false,
    dashboard: false,
    approval: false,
  },
  errors: {
    pending: null,
    dashboard: null,
    approval: null,
    hasErrors: false,
  },
  actionLoadingId: null,
  handleApprovalAction: vi.fn(),
  handleBatchApproval: vi.fn(),
  handleBatchRejection: vi.fn(),
  handleRejectionSubmit: vi.fn(),
  handleRejectionCancel: vi.fn(),
  rejectionModal: { open: false, timesheetId: null },
  handleModificationSubmit: vi.fn(),
  handleModificationCancel: vi.fn(),
  modificationModal: { open: false, timesheetId: null },
  refreshPending: vi.fn(async () => {}),
  refetchDashboard: vi.fn(async () => {}),
  resetApproval: vi.fn(),
});

describe('LecturerDashboardShell', () => {
  beforeEach(() => {
    modalMock.mockClear();
    mockUseLecturerDashboardData.mockReset();
    mockUseLecturerDashboardData.mockImplementation(() => createHookValue());
    mockUserProfile.mockReset();
    mockUserProfile.mockReturnValue({
      profile: { id: 99 },
      loading: false,
      error: null,
      reload: vi.fn(),
      setProfile: vi.fn(),
    });
  });

  it('renders create timesheet trigger with dialog semantics', () => {
    render(<LecturerDashboardShell />);

    const trigger = screen.getByRole('button', { name: /Create Timesheet/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens LecturerTimesheetCreateModal when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<LecturerDashboardShell />);

    expect(screen.queryByTestId('lecturer-create-modal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create Timesheet/i }));

    expect(screen.getByTestId('lecturer-create-modal')).toBeInTheDocument();
    const latestCall = modalMock.mock.calls.at(-1);
    expect(latestCall?.[0]).toEqual(expect.objectContaining({ isOpen: true, lecturerId: 99 }));
    expect(screen.getByRole('button', { name: /Create Timesheet/i })).toHaveAttribute('aria-expanded', 'true');
  });
});
