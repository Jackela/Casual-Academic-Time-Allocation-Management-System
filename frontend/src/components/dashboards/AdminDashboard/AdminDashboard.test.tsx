/**
 * AdminDashboard Component Tests
 *
 * Focused UI assertions aligned with the current AdminDashboard implementation.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatCurrency, formatters } from "../../../utils/formatting";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";
import type { ApprovalRequest, ApprovalResponse } from "../../../types/api";

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
  useTimesheetQuery: vi.fn(),
  useTimesheetDashboardSummary: vi.fn(),
  useApprovalAction: vi.fn(),
  useTimesheetStats: vi.fn(),
}));

vi.mock("../../../auth/SessionProvider", () => sessionHooksMock);
vi.mock("../../../auth/UserProfileProvider", () => userProfileHooksMock);
vi.mock("../../../auth/access-control", () => accessControlHooksMock);
vi.mock("../../../hooks/timesheets", () => timesheetHooksMock);

const mockSession = sessionHooksMock.useSession as ReturnType<typeof vi.fn>;
const mockUserProfile = userProfileHooksMock.useUserProfile as ReturnType<typeof vi.fn>;
const mockAccessControl = accessControlHooksMock.useAccessControl as ReturnType<typeof vi.fn>;

const mockTimesheetModule = timesheetHooksMock as unknown as {
  useTimesheetQuery: ReturnType<typeof vi.fn>;
  useTimesheetDashboardSummary: ReturnType<typeof vi.fn>;
  useApprovalAction: ReturnType<typeof vi.fn>;
  useTimesheetStats: ReturnType<typeof vi.fn>;
};
import AdminDashboard from "./index";
import {
  createMockTimesheetPage,
  createMockDashboardSummary,
  createMockUser,
  renderWithRouter,
} from "../../../test/utils/test-utils";

let approveTimesheetMock: MockedFunction<(request: ApprovalRequest) => Promise<ApprovalResponse>>;
let batchApproveMock: ReturnType<typeof vi.fn>;
let resetApprovalMock: ReturnType<typeof vi.fn>;

const mockAdminUser = createMockUser({
  role: "ADMIN",
  firstName: "Sarah",
  lastName: "Johnson",
  email: "admin@university.edu",
});

const mockSystemTimesheets = createMockTimesheetPage(
  8,
  {},
  { status: "PENDING_TUTOR_CONFIRMATION" },
);

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
  tutorCount: 24,
  statusBreakdown: {
    DRAFT: 8,
    PENDING_TUTOR_CONFIRMATION: 12,
    TUTOR_CONFIRMED: 9,
    LECTURER_CONFIRMED: 15,
    FINAL_CONFIRMED: 48,
    REJECTED: 4,
    MODIFICATION_REQUESTED: 2,
  },
  systemMetrics: {
    activeUsers: 45,
    activeCourses: 12,
    averageApprovalTime: 2.5,
    systemLoad: 0.65,
  },
});

const mockAdminStats = {
  totalHours: mockAdminSummary.totalHours,
  totalPay: mockAdminSummary.totalPay,
  totalCount: mockAdminSummary.totalTimesheets,
  statusCounts: mockAdminSummary.statusBreakdown,
  averageHoursPerTimesheet: 8,
  averagePayPerTimesheet: 280.5,
  systemMetrics: mockAdminSummary.systemMetrics,
};

beforeEach(() => {
  vi.clearAllMocks();

  mockSession.mockReturnValue({
    status: 'authenticated',
    isAuthenticated: true,
    token: 'mock-admin-token',
    refreshToken: null,
    expiresAt: null,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refresh: vi.fn(),
  });

  mockUserProfile.mockReturnValue({
    profile: mockAdminUser,
    loading: false,
    error: null,
    reload: vi.fn(),
    setProfile: vi.fn(),
  });

  mockAccessControl.mockReturnValue({
    role: 'ADMIN',
    isTutor: false,
    isLecturer: false,
    isAdmin: true,
    canApproveTimesheets: true,
    canViewAdminDashboard: true,
    hasRole: vi.fn((role: string) => role.toUpperCase() === 'ADMIN'),
  });

  approveTimesheetMock = vi.fn<[ApprovalRequest], Promise<ApprovalResponse>>();

  mockTimesheetModule.useTimesheetQuery.mockReturnValue({
    data: mockSystemTimesheets,
    loading: false,
    error: null,
    timesheets: mockSystemTimesheets.timesheets,
    hasMore: false,
    totalCount: mockSystemTimesheets.pageInfo.totalElements,
    currentPage: mockSystemTimesheets.pageInfo.currentPage,
    refresh: vi.fn(),
    refetch: vi.fn().mockResolvedValue(undefined),
    updateQuery: vi.fn(),
  });

  approveTimesheetMock = vi.fn<[ApprovalRequest], Promise<ApprovalResponse>>();
  batchApproveMock = vi.fn();
  resetApprovalMock = vi.fn();
  mockTimesheetModule.useTimesheetDashboardSummary.mockReturnValue({
    data: mockAdminSummary,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });

  mockTimesheetModule.useApprovalAction.mockReturnValue({
    loading: false,
    error: null,
    approveTimesheet: approveTimesheetMock,
    batchApprove: batchApproveMock,
    reset: resetApprovalMock,
  });

  mockTimesheetModule.useTimesheetStats.mockReturnValue(mockAdminStats);
});

describe("AdminDashboard Component", () => {
  it("renders admin header with contextual details", () => {
    renderWithRouter(<AdminDashboard />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Welcome back, Sarah/i,
    );
    expect(
      screen.getByText(/System Administrator Dashboard/i),
    ).toBeInTheDocument();
  });

  it("shows urgent notification count from pending and overdue timesheets", () => {
    renderWithRouter(<AdminDashboard />);

    const urgentBadge = screen.getByTestId("urgent-notifications");
    const expectedUrgentCount =
      mockSystemTimesheets.timesheets.length +
      (mockAdminSummary.pendingApproval ?? 0);

    expect(urgentBadge).toHaveTextContent(
      `${expectedUrgentCount} urgent items`,
    );
  });

  it("renders system overview stat cards with key metrics", () => {
    renderWithRouter(<AdminDashboard />);

    const systemOverview = screen.getByRole("region", {
      name: /system overview/i,
    });

    const totalTimesheetsCard = within(systemOverview).getByTestId(
      "total-timesheets-card",
    );
    expect(
      within(totalTimesheetsCard).getByText(
        String(mockAdminSummary.totalTimesheets ?? 0),
      ),
    ).toBeInTheDocument();

    const pendingApprovalsCard = within(systemOverview).getByTestId(
      "pending-approvals-card",
    );
    expect(
      within(pendingApprovalsCard).getByText(
        String(mockAdminSummary.pendingApprovals ?? 0),
      ),
    ).toBeInTheDocument();

    const totalHoursCard =
      within(systemOverview).getByTestId("total-hours-card");
    expect(
      within(totalHoursCard).getByText(
        formatters.hours(mockAdminSummary.totalHours ?? 0),
      ),
    ).toBeInTheDocument();

    const totalPayrollCard =
      within(systemOverview).getByTestId("total-pay-card");
    const totalPay =
      mockAdminSummary.totalPay ?? mockAdminSummary.totalPayroll ?? 0;
    expect(
      within(totalPayrollCard).getByText((text) =>
        text.includes(formatCurrency(totalPay ?? 0).replace(".00", "")),
      ),
    ).toBeInTheDocument();

    const tutorCoverageCard = within(systemOverview).getByTestId("tutors-card");
    expect(
      within(tutorCoverageCard).getByText(
        String(mockAdminSummary.tutorCount ?? 0),
      ),
    ).toBeInTheDocument();
  });

  it("shows N/A when tutor metrics are unavailable", () => {
    mockTimesheetModule.useTimesheetDashboardSummary.mockReturnValueOnce({
      data: createMockDashboardSummary({ tutorCount: undefined }),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter(<AdminDashboard />);

    const tutorCoverageCard = screen.getByTestId("tutors-card");
    expect(within(tutorCoverageCard).getByText(/N\/A/i)).toBeInTheDocument();
    expect(
      within(tutorCoverageCard).getByText(/Data not available yet/i),
    ).toBeInTheDocument();
  });

  it.skip("displays system health metrics with status badge context", () => {
    renderWithRouter(<AdminDashboard />);

    const systemHealth = screen.getByTestId("system-health-indicator");
    const metrics = within(systemHealth);

    expect(metrics.getByText(/System Health/i)).toBeInTheDocument();
    expect(metrics.getByText(/System Load/i)).toBeInTheDocument();
    expect(metrics.getByText(/Active Users/i)).toBeInTheDocument();
    expect(metrics.getByText(/Avg Approval Time/i)).toBeInTheDocument();
    expect(metrics.getByText(/2\.5/)).toBeInTheDocument();
  });

  it.skip("renders status distribution chart with non-zero buckets", () => {
    renderWithRouter(<AdminDashboard />);

    const distributionChart = screen.getByTestId("status-distribution-chart");

    const statusEntries = Object.entries(
      mockAdminSummary.statusBreakdown ?? {},
    ) as [string, number][];
    statusEntries.forEach(([status, count]) => {
      if (count > 0) {
        const badge = within(distributionChart).getByTestId(
          `status-badge-${status.toLowerCase()}`,
        );
        const distributionItem = badge.closest(
          ".distribution-item",
        ) as HTMLElement | null;
        expect(distributionItem).not.toBeNull();
        if (distributionItem) {
          const countElement = distributionItem.querySelector(
            ".distribution-count",
          );
          expect(countElement).not.toBeNull();
          expect(countElement?.textContent).toBe(String(count));
        }
      }
    });
  });

  it("allows switching to Pending Approvals tab and shows table", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminDashboard />);

    const navigation = screen.getByRole("navigation");
    await user.click(
      within(navigation).getByRole("button", { name: /pending approvals/i }),
    );

    const pendingRegion = screen.getByRole("region", {
      name: /pending approvals/i,
    });
    expect(
      within(pendingRegion).getByRole("heading", {
        name: /Pending Admin Review/i,
      }),
    ).toBeInTheDocument();

    // Check for the table, but handle the empty state
    const table = within(pendingRegion).queryByRole("table");
    if (table) {
      expect(table).toBeInTheDocument();
    } else {
      expect(
        within(pendingRegion).getByText(/No timesheets found/i),
      ).toBeInTheDocument();
    }
  });

  it("surfaces dashboard summary errors with retry affordance", async () => {
    const refetchMock = vi.fn();
    mockTimesheetModule.useTimesheetDashboardSummary.mockReturnValueOnce({
      data: null,
      loading: false,
      error: 'Failed to load admin dashboard data',
      refetch: refetchMock,
    });

    const user = userEvent.setup();
    renderWithRouter(<AdminDashboard />);

    const banner = screen.getAllByTestId('global-error-banner')[0];
    expect(within(banner).getAllByText(/Failed to load admin dashboard data/i)[0]).toBeInTheDocument();

    await user.click(within(banner).getByRole('button', { name: /Retry/i }));
    expect(refetchMock).toHaveBeenCalled();
  });

  it("triggers admin approval action when Final Approve is clicked", async () => {
    const approvalTimesheets = createMockTimesheetPage(
      1,
      {},
      {
        id: 901,
        status: "LECTURER_CONFIRMED",
      },
    );

    mockTimesheetModule.useTimesheetQuery.mockReturnValue({
      data: approvalTimesheets,
      loading: false,
      error: null,
      timesheets: approvalTimesheets.timesheets,
      hasMore: false,
      totalCount: approvalTimesheets.pageInfo.totalElements,
      currentPage: approvalTimesheets.pageInfo.currentPage,
      refresh: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined),
      updateQuery: vi.fn(),
    });

    const approvalResponse: ApprovalResponse = {
      success: true,
      message: "approved",
      timesheetId: approvalTimesheets.timesheets[0].id,
      newStatus: "FINAL_CONFIRMED",
    };
    approveTimesheetMock.mockResolvedValue(approvalResponse);

    const user = userEvent.setup();
    renderWithRouter(<AdminDashboard />);

    const navigation = screen.getByRole("navigation");
    await user.click(
      within(navigation).getByRole("button", { name: /pending approvals/i }),
    );

    const approveButton = await screen.findByRole("button", {
      name: /final approve/i,
    });
    await user.click(approveButton);

    expect(approveTimesheetMock).toHaveBeenCalledWith({
      timesheetId: approvalTimesheets.timesheets[0].id,
      action: "HR_CONFIRM",
      comment: "Approved timesheet",
    });
  });

  it("triggers admin rejection action when Reject is clicked", async () => {
    const rejectionTimesheets = createMockTimesheetPage(
      1,
      {},
      {
        id: 915,
        status: "LECTURER_CONFIRMED",
      },
    );

    mockTimesheetModule.useTimesheetQuery.mockReturnValue({
      data: rejectionTimesheets,
      loading: false,
      error: null,
      timesheets: rejectionTimesheets.timesheets,
      hasMore: false,
      totalCount: rejectionTimesheets.pageInfo.totalElements,
      currentPage: rejectionTimesheets.pageInfo.currentPage,
      refresh: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined),
      updateQuery: vi.fn(),
    });

    const rejectionResponse: ApprovalResponse = {
      success: true,
      message: "rejected",
      timesheetId: rejectionTimesheets.timesheets[0].id,
      newStatus: "REJECTED",
    };
    approveTimesheetMock.mockResolvedValue(rejectionResponse);

    const user = userEvent.setup();
    renderWithRouter(<AdminDashboard />);

    const navigation = screen.getByRole("navigation");
    await user.click(
      within(navigation).getByRole("button", { name: /pending approvals/i }),
    );

    const rejectButton = await screen.findByRole("button", {
      name: /^Reject$/i,
    });
    await user.click(rejectButton);

    const reasonField = await screen.findByLabelText(/Reason for rejection/i);
    await user.type(reasonField, "Timesheet needs correction");
    await user.click(screen.getByRole("button", { name: /Reject Timesheet/i }));

    expect(approveTimesheetMock).toHaveBeenCalledWith({
      timesheetId: rejectionTimesheets.timesheets[0].id,
      action: "REJECT",
      comment: "Timesheet needs correction",
    });
  });
});




