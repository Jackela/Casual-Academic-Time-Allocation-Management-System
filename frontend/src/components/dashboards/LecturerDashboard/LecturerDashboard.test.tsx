/**
 * LecturerDashboard Component Tests
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const sessionHooksMock = vi.hoisted(() => ({
  __esModule: true,
  useSession: vi.fn(),
}));

const userProfileHooksMock = vi.hoisted(() => ({
  __esModule: true,
  useUserProfile: vi.fn(),
}));

const accessControlHooksMock = vi.hoisted(() => ({
  __esModule: true,
  useAccessControl: vi.fn(),
}));

const timesheetHooksMock = vi.hoisted(() => ({
  __esModule: true,
  useTimesheetDashboardSummary: vi.fn(),
  useApprovalAction: vi.fn(),
  usePendingTimesheets: vi.fn(),
  useTimesheetStats: vi.fn(),
  useTimesheetCreate: vi.fn(),
}));

vi.mock("../../../auth/SessionProvider", () => sessionHooksMock);
vi.mock("../../../auth/UserProfileProvider", () => userProfileHooksMock);
vi.mock("../../../auth/access-control", () => accessControlHooksMock);
vi.mock("../../../hooks/timesheets", () => timesheetHooksMock);

const mockSession = sessionHooksMock.useSession as ReturnType<typeof vi.fn>;
const mockUserProfile = userProfileHooksMock.useUserProfile as ReturnType<typeof vi.fn>;

const mockAccessControl = accessControlHooksMock.useAccessControl as ReturnType<typeof vi.fn>;

const mockTimesheetHooks = timesheetHooksMock as unknown as {
  useTimesheetDashboardSummary: ReturnType<typeof vi.fn>;
  useApprovalAction: ReturnType<typeof vi.fn>;
  usePendingTimesheets: ReturnType<typeof vi.fn>;
  useTimesheetStats: ReturnType<typeof vi.fn>;
  useTimesheetCreate: ReturnType<typeof vi.fn>;
};

const renderWithRouter = (ui: React.ReactElement, { route = "/" } = {}) => {
  window.history.pushState({}, "Test page", route);
  return render(ui, { wrapper: MemoryRouter });
};
import LecturerDashboard from "./index";
import {
  createMockTimesheetPage,
  createMockDashboardSummary,
  createMockUser,
} from "../../../test/utils/test-utils";

const mockLecturerUser = createMockUser({
  role: "LECTURER",
  firstName: "Dr. Jane",
  lastName: "Smith",
});

const mockPendingTimesheets = createMockTimesheetPage(
  6,
  {},
  { status: "PENDING_TUTOR_CONFIRMATION" },
);

const mockDashboardSummary = createMockDashboardSummary({
  pendingApprovals: 6,
  pendingApproval: 6,
  totalTimesheets: 42,
  thisWeekHours: 18,
  statusBreakdown: {
    PENDING_TUTOR_CONFIRMATION: 6,
    LECTURER_CONFIRMED: 12,
    FINAL_CONFIRMED: 18,
    REJECTED: 2,
  },
});

const mockLecturerStats = {
  totalHours: 48,
  totalPay: 1680,
  totalCount: mockPendingTimesheets.timesheets.length,
  statusCounts: {
    PENDING_TUTOR_CONFIRMATION: mockPendingTimesheets.timesheets.length,
  },
  averageHoursPerTimesheet: 8,
  averagePayPerTimesheet: 280,
};

beforeEach(() => {
  vi.clearAllMocks();

  mockSession.mockReturnValue({
    status: 'authenticated',
    isAuthenticated: true,
    token: 'lecturer-token',
    refreshToken: null,
    expiresAt: null,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refresh: vi.fn(),
  });

  mockUserProfile.mockReturnValue({
    profile: mockLecturerUser,
    loading: false,
    error: null,
    reload: vi.fn(),
    setProfile: vi.fn(),
  });

  mockAccessControl.mockReturnValue({
    role: 'LECTURER',
    isTutor: false,
    isLecturer: true,
    isAdmin: false,
    canApproveTimesheets: true,
    canViewAdminDashboard: false,
    hasRole: vi.fn((role: string) => role.toUpperCase() === 'LECTURER'),
  });
  mockTimesheetHooks.usePendingTimesheets.mockReturnValue({
    data: mockPendingTimesheets,
    loading: false,
    error: null,
    timesheets: mockPendingTimesheets.timesheets,
    isEmpty: false,
    refetch: vi.fn(),
  });

  mockTimesheetHooks.useTimesheetDashboardSummary.mockReturnValue({
    data: mockDashboardSummary,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });

  mockTimesheetHooks.useApprovalAction.mockReturnValue({
    loading: false,
    error: null,
    approveTimesheet: vi.fn(),
    batchApprove: vi.fn(),
    reset: vi.fn(),
  });

  mockTimesheetHooks.useTimesheetStats.mockReturnValue(mockLecturerStats);

  mockTimesheetHooks.useTimesheetCreate.mockReturnValue({
    createTimesheet: vi.fn(),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  });
});

describe("LecturerDashboard Component", () => {
  it("renders lecturer greeting with pending summary", () => {
    renderWithRouter(<LecturerDashboard />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Welcome back, Dr. Jane/i,
    );
    const summaryRegion = screen.getByRole("region", {
      name: /Dashboard Summary/i,
    });
    expect(
      within(summaryRegion).getAllByText(/Pending Approvals/i).length,
    ).toBeGreaterThan(0);
  });

  it("shows key statistic cards for lecturer overview", () => {
    renderWithRouter(<LecturerDashboard />);

    const statistics = screen.getByTestId("statistics-cards");
    const statCards = within(statistics).getAllByTestId("stat-card");
    expect(statCards.length).toBeGreaterThanOrEqual(4);
    const pendingValue =
      mockDashboardSummary.pendingApproval ??
      mockDashboardSummary.pendingApprovals ??
      0;
    expect(
      within(statistics).getByText(String(pendingValue)),
    ).toBeInTheDocument();
    expect(
      within(statistics).getByText(
        String(mockDashboardSummary.totalTimesheets),
      ),
    ).toBeInTheDocument();
  });

  it("renders pending timesheet table with selectable rows", () => {
    renderWithRouter(<LecturerDashboard />);

    const rows = screen.getAllByTestId(/timesheet-row-/i);
    expect(rows).toHaveLength(mockPendingTimesheets.timesheets.length);
  });

  it("supports refreshing lecturer data from the toolbar", async () => {
    const refetchPending = vi.fn();
    const refetchSummary = vi.fn();

    mockTimesheetHooks.usePendingTimesheets.mockReturnValueOnce({
      data: mockPendingTimesheets,
      loading: false,
      error: null,
      timesheets: mockPendingTimesheets.timesheets,
      isEmpty: false,
      refetch: refetchPending,
    });

    mockTimesheetHooks.useTimesheetDashboardSummary.mockReturnValueOnce({
      data: mockDashboardSummary,
      loading: false,
      error: null,
      refetch: refetchSummary,
    });

    const user = userEvent.setup();
    renderWithRouter(<LecturerDashboard />);

    await user.click(screen.getByRole("button", { name: /refresh/i }));

    expect(refetchPending).toHaveBeenCalled();
    expect(refetchSummary).toHaveBeenCalled();
  });

  it("displays status breakdown chart with lecturer-specific totals", () => {
    renderWithRouter(<LecturerDashboard />);

    const statusChart = screen.getByTestId("status-breakdown-chart");
    const countNodes = statusChart.querySelectorAll("p.font-semibold");
    const countValues = Array.from(countNodes).map((node) =>
      node.textContent?.trim(),
    );

    const lecturerStatusEntries = Object.values(
      mockDashboardSummary.statusBreakdown ?? {},
    ) as number[];
    lecturerStatusEntries
      .filter((count) => count > 0)
      .map((count) => String(count))
      .forEach((expectedCount) => {
        expect(countValues).toContain(expectedCount);
      });
  });

  it("surfaces pending timesheet fetch errors with retry option", async () => {
    const refetchPendingMock = vi.fn();
    mockTimesheetHooks.usePendingTimesheets.mockReturnValueOnce({
      data: null,
      loading: false,
      error: 'Network timeout',
      timesheets: [],
      isEmpty: true,
      refetch: refetchPendingMock,
      pageInfo: null,
    });

    const user = userEvent.setup();
    renderWithRouter(<LecturerDashboard />);

    const banner = screen.getAllByTestId('global-error-banner')[0];
    expect(within(banner).getByText(/Failed to fetch pending timesheets/i)).toBeInTheDocument();
    expect(within(banner).getByText(/Network timeout/i)).toBeInTheDocument();

    await user.click(within(banner).getByRole('button', { name: /Retry/i }));
    expect(refetchPendingMock).toHaveBeenCalled();
  });
});



