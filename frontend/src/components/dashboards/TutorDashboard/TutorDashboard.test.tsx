/**
 * TutorDashboard Component Tests
 *
 * TDD test suite for TutorDashboard component before implementation.
 * Tests tutor-specific functionality, timesheet management, and self-service features.
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TutorDashboard from "./TutorDashboard";
import { messages } from "../../../i18n/messages";
import {
  createMockTimesheetPage,
  createMockDashboardSummary,
  createMockAuthUser,
  createMockTimesheet,
  MockAuthProvider,
} from "../../../test/utils/test-utils";
import * as timesheetReadHooks from "../../../hooks/timesheets";
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

import { getStatusConfig } from "../../shared/StatusBadge/status-badge-utils";
import type { Timesheet, TimesheetStatus } from "../../../types/api";
import {
  getVisibleColumns,
  TIMESHEET_COLUMNS,
} from "../../../lib/config/table-config";
import type { TimesheetColumnKey } from "../../../lib/config/table-config";

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock("../../../hooks/timesheets", () => ({
  __esModule: true,
  useTimesheetQuery: vi.fn(),
  useTimesheetDashboardSummary: vi.fn(),
  useUpdateTimesheet: vi.fn(),
  useTimesheetStats: vi.fn(),
}));

vi.mock("../../../auth/SessionProvider", () => sessionHooksMock);
vi.mock("../../../auth/UserProfileProvider", () => userProfileHooksMock);
vi.mock("../../../auth/access-control", () => accessControlHooksMock);

const mockReadHooks = vi.mocked(timesheetReadHooks);
const mockSession = sessionHooksMock.useSession as ReturnType<typeof vi.fn>;
const mockUserProfile = userProfileHooksMock.useUserProfile as ReturnType<typeof vi.fn>;
const mockAccessControl = accessControlHooksMock.useAccessControl as ReturnType<typeof vi.fn>;
const mockTutorUser = createMockAuthUser({
  role: "TUTOR",
  name: "Michael Chen",
  email: "michael.chen@student.edu",
  id: 1,
});

const mockTutorTimesheets = createMockTimesheetPage(15, {}, { tutorId: 1 });

const groupedByStatus = mockTutorTimesheets.timesheets.reduce(
  (accumulator, sheet) => {
    if (!accumulator[sheet.status]) {
      accumulator[sheet.status] = [];
    }
    accumulator[sheet.status].push(sheet);
    return accumulator;
  },
  {} as Record<string, Timesheet[]>,
);

const statusCounts = {
  DRAFT: 4,
  MODIFICATION_REQUESTED: 1,
  PENDING_TUTOR_CONFIRMATION: 5,
  TUTOR_CONFIRMED: 3,
  LECTURER_CONFIRMED: 2,
  FINAL_CONFIRMED: 6,
  REJECTED: 2,
};

const mockTutorSummary = createMockDashboardSummary({
  totalTimesheets: 28,
  pendingApprovals: 5,
  approvedTimesheets: 18,
  rejectedTimesheets: 2,
  totalHours: 245.5,
  totalPay: 8593.5,
  thisWeekHours: 15,
  thisWeekPay: 525,
  statusBreakdown: statusCounts,
  upcomingDeadlines: [
    { courseId: 1, courseName: "CS101", deadline: "2024-01-15" },
    { courseId: 2, courseName: "CS102", deadline: "2024-01-22" },
  ],
});

const mockTutorStats = {
  totalHours: 245.5,
  totalPay: 8593.5,
  totalCount: 28,
  groupedByStatus,
  statusCounts,
  averageHoursPerTimesheet: 8.8,
  averagePayPerTimesheet: 306.9,
  completionRate: 0.89,
  onTimeSubmissionRate: 0.95,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockAuthProvider
    value={{ user: mockTutorUser, isAuthenticated: true, token: "mock-token" }}
  >
    {children}
  </MockAuthProvider>
);

// =============================================================================
// Responsive Helpers
// =============================================================================

const ORIGINAL_VIEWPORT_WIDTH = globalThis.innerWidth || 1024;
const ORIGINAL_OUTER_WIDTH = globalThis.outerWidth || ORIGINAL_VIEWPORT_WIDTH;

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "outerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
};

const TUTOR_TABLE_COLUMN_KEYS: TimesheetColumnKey[] = [
  "course",
  "weekStartDate",
  "hours",
  "hourlyRate",
  "totalPay",
  "status",
  "lastUpdated",
  "description",
  "actions",
];

const getTutorTableColumnExpectation = (viewportWidth: number) => {
  const relevantColumns = TUTOR_TABLE_COLUMN_KEYS.map((key) =>
    TIMESHEET_COLUMNS.find((column) => column.key === key),
  ).filter((column): column is NonNullable<typeof column> => Boolean(column));

  const visibleColumns = getVisibleColumns(relevantColumns, viewportWidth);
  const visibleKeys = visibleColumns.map((column) => column.key);
  const hiddenKeys = relevantColumns
    .map((column) => column.key)
    .filter((key) => !visibleKeys.includes(key));

  return {
    visibleKeys,
    hiddenKeys,
  };
};

afterEach(() => {
  setViewportWidth(ORIGINAL_VIEWPORT_WIDTH);
  Object.defineProperty(window, "outerWidth", {
    configurable: true,
    writable: true,
    value: ORIGINAL_OUTER_WIDTH,
  });
});

// =============================================================================
// TutorDashboard Component Tests
// =============================================================================

describe("TutorDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSession.mockReturnValue({
      status: 'authenticated',
      isAuthenticated: true,
      token: 'mock-token',
      refreshToken: null,
      expiresAt: null,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refresh: vi.fn(),
    });

    mockUserProfile.mockReturnValue({
      profile: mockTutorUser,
      loading: false,
      error: null,
      reload: vi.fn(),
      setProfile: vi.fn(),
    });

    mockAccessControl.mockReturnValue({
      role: 'TUTOR',
      isTutor: true,
      isLecturer: false,
      isAdmin: false,
      canApproveTimesheets: false,
      canViewAdminDashboard: false,
      hasRole: vi.fn((role: string) => role.toUpperCase() === 'TUTOR'),
    });

    // Setup default hook returns for tutor context
    mockReadHooks.useTimesheetQuery.mockReturnValue({
      data: mockTutorTimesheets,
      loading: false,
      error: null,
      timesheets: mockTutorTimesheets.timesheets,
      hasMore: false,
      totalCount: mockTutorTimesheets.pageInfo.totalElements,
      currentPage: mockTutorTimesheets.pageInfo.currentPage,
      refresh: vi.fn(),
      refetch: vi.fn().mockResolvedValue(undefined),
      updateQuery: vi.fn(),
    });

    mockReadHooks.useTimesheetDashboardSummary.mockReturnValue({
      data: mockTutorSummary,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockReadHooks.useUpdateTimesheet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      updateTimesheet: vi.fn().mockResolvedValue(createMockTimesheet()),
      reset: vi.fn(),
    });

    mockReadHooks.useTimesheetStats.mockReturnValue(mockTutorStats);
  });

  describe("Tutor Header and Welcome", () => {
    it("should render personalized welcome message", async () => {
      render(<TutorDashboard />);

      expect(screen.getByText(/Welcome back, Michael!/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Here's an overview of your timesheets and earnings/i),
      ).toBeInTheDocument();
    });

    it("should show completion progress bar", async () => {
      render(<TutorDashboard />, { wrapper });

      expect(screen.getByTestId("completion-progress")).toBeInTheDocument();
      // Calculated from mock data: 6 FINAL_CONFIRMED / 28 total = 21.4% -> rounded to 21%
      expect(screen.getByText(/21%/i)).toBeInTheDocument();
    });
  });

  describe("Main Content Layout", () => {
    it("should not expose a create timesheet button in the timesheet card", async () => {
      render(<TutorDashboard />, { wrapper });
      const timesheetsRegion = screen.getByRole("region", {
        name: /My Timesheets/i,
      });
      const cardScope = within(timesheetsRegion);
      expect(
        cardScope.queryByRole("button", { name: /Create New/i }),
      ).not.toBeInTheDocument();
      expect(cardScope.getByTestId("creation-info")).toHaveTextContent(
        /Timesheets are created by your lecturer or administrator/i,
      );
    });

    it("should show quick statistics cards", async () => {
      render(<TutorDashboard />, { wrapper });

      const statsRegion = screen.getByRole("region", {
        name: /Your Statistics/i,
      });
      const statsScope = within(statsRegion);
      expect(statsScope.getByText(/Total Earned/i)).toBeInTheDocument();
      expect(statsScope.getByText("$8,593.50")).toBeInTheDocument();
      expect(statsScope.getByText(/Total Hours/i)).toBeInTheDocument();
      expect(statsScope.getByText("245.5h")).toBeInTheDocument();
      expect(statsScope.getByText(/Average per Week/i)).toBeInTheDocument();
    });

    it("should display status at a glance", async () => {
      render(<TutorDashboard />, { wrapper });

      const statsRegion = screen.getByRole("region", {
        name: /Your Statistics/i,
      });
      const statsScope = within(statsRegion);
      expect(statsScope.getByText(/5 Drafts/i)).toBeInTheDocument();
      const inProgressCount = mockTutorTimesheets.timesheets.filter((t) =>
        [
          "PENDING_TUTOR_CONFIRMATION",
          "TUTOR_CONFIRMED",
          "LECTURER_CONFIRMED",
        ].includes(t.status),
      ).length;
      expect(
        statsScope.getByText(`${inProgressCount} In Progress`),
      ).toBeInTheDocument();
    });
  });

  describe("My Timesheets Section", () => {
    it("should display timesheets in organized tabs", async () => {
      render(<TutorDashboard />, { wrapper });

      const timesheetsRegion = screen.getByRole("region", {
        name: /My Timesheets/i,
      });
      const tabContainer = timesheetsRegion.querySelector("nav") as HTMLElement;
      expect(tabContainer).toBeTruthy();

      const draftsCount = mockTutorTimesheets.timesheets.filter((t) =>
        ["DRAFT", "MODIFICATION_REQUESTED"].includes(t.status),
      ).length;
      const inProgressCount = mockTutorTimesheets.timesheets.filter((t) =>
        [
          "PENDING_TUTOR_CONFIRMATION",
          "TUTOR_CONFIRMED",
          "LECTURER_CONFIRMED",
        ].includes(t.status),
      ).length;
      const needAttentionCount = mockTutorTimesheets.timesheets.filter((t) =>
        ["REJECTED", "MODIFICATION_REQUESTED"].includes(t.status),
      ).length;

      const tabButtons = within(tabContainer).getAllByRole("button");
      const tabLabels = tabButtons.map((button) => button.textContent?.trim());
      expect(tabLabels).toEqual([
        "All Timesheets",
        `Drafts (${draftsCount})`,
        `In Progress (${inProgressCount})`,
        `Needs Attention (${needAttentionCount})`,
      ]);
    });

    it("should show timesheets in table with tutor-specific columns", async () => {
      setViewportWidth(1024);
      render(<TutorDashboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId("timesheets-table")).toBeInTheDocument();
      });

      const table = screen.getByTestId("timesheets-table");
      const { visibleKeys, hiddenKeys } = getTutorTableColumnExpectation(
        window.innerWidth,
      );

      const headerCells = within(table).getAllByRole("columnheader");
      const headerKeys = headerCells
        .map((cell) => cell.getAttribute("data-column"))
        .filter(
          (key): key is TimesheetColumnKey =>
            Boolean(key) && key !== "selection",
        );

      expect(headerKeys).toEqual(visibleKeys);

      hiddenKeys.forEach((key) => {
        expect(table.querySelector(`[data-column="${key}"]`)).toBeNull();
      });
    });

    it("should reveal additional columns on wider viewports", async () => {
      setViewportWidth(1440);
      render(<TutorDashboard />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId("timesheets-table")).toBeInTheDocument();
      });

      const table = screen.getByTestId("timesheets-table");
      const { visibleKeys } = getTutorTableColumnExpectation(window.innerWidth);
      const headerCells = within(table).getAllByRole("columnheader");
      const headerKeys = headerCells
        .map((cell) => cell.getAttribute("data-column"))
        .filter(
          (key): key is TimesheetColumnKey =>
            Boolean(key) && key !== "selection",
        );

      expect(headerKeys).toEqual(visibleKeys);
      expect(visibleKeys).toEqual(
        expect.arrayContaining([
          "hours",
          "hourlyRate",
          "lastUpdated",
          "description",
        ]),
      );

      expect(
        within(table).getByRole("columnheader", { name: /hours/i }),
      ).toBeInTheDocument();
      expect(
        within(table).getByRole("columnheader", { name: /rate/i }),
      ).toBeInTheDocument();
    });

    it("should allow bulk submission of drafts", async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });

      const timesheetsRegion = screen.getByRole("region", {
        name: /My Timesheets/i,
      });
      const draftsTab = await within(timesheetsRegion).findByRole("button", {
        name: /Drafts/i,
      });
      await user.click(draftsTab);

      const selectAllDrafts = screen.getByLabelText(/Select all drafts/i);
      await user.click(selectAllDrafts);

      const submitSelectedButton = screen.getByText(/Submit Selected/i);
      await user.click(submitSelectedButton);

      expect(screen.getByText(/Confirm Submission/i)).toBeInTheDocument();
      const draftTimesheets = mockTutorTimesheets.timesheets.filter(
        (t) => t.status === "DRAFT" || t.status === "MODIFICATION_REQUESTED",
      );
      expect(
        screen.getByText(
          `${draftTimesheets.length} timesheets will be submitted`,
        ),
      ).toBeInTheDocument();
    });

    it("should show timesheet status with clear indicators", async () => {
      render(<TutorDashboard />, { wrapper });

      const timesheetsRegion = screen.getByRole("region", {
        name: /My Timesheets/i,
      });

      mockTutorTimesheets.timesheets.forEach((timesheet) => {
        const row = within(timesheetsRegion)
          .getAllByText(timesheet.courseName as string)[0]
          .closest("tr");
        expect(row).not.toBeNull();
        const rowScope = within(row!);
        const expectedLabel = getStatusConfig(
          timesheet.status as TimesheetStatus,
        ).label;
        const badge = rowScope.getByText(expectedLabel);
        expect(badge).toBeInTheDocument();
      });
    });

    it("should expose edit actions for editable timesheets", async () => {
      render(<TutorDashboard />, { wrapper });
      const editButtons = await screen.findAllByRole("button", {
        name: /^Edit$/i,
      });
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Sidebar Widgets", () => {
    it("should display comprehensive pay summary", async () => {
      render(<TutorDashboard />, { wrapper });

      const paySummaryHeading = screen.getByRole("heading", {
        name: /Pay Summary/i,
      });
      const paySummarySection = paySummaryHeading.closest("div");
      expect(paySummarySection).not.toBeNull();
      const paySummaryElement = paySummarySection as HTMLElement;

      const paySummaryScope = within(paySummaryElement);

      expect(
        paySummaryScope.getByText(`${messages.tutorDashboard.totalEarnings}:`),
      ).toBeInTheDocument();
      expect(paySummaryScope.getByText("This Week:")).toBeInTheDocument();
      expect(
        paySummaryScope.getByText("Average per Timesheet:"),
      ).toBeInTheDocument();
      const [totalEarningsValue, thisWeekValue, averageValue] =
        paySummaryScope.getAllByText(/AUD/, { selector: "strong" });
      expect(totalEarningsValue.textContent).toMatch(/8,593\.50/);
      expect(thisWeekValue.textContent).toMatch(/525/);
      expect(averageValue.textContent).toMatch(/306\.90/);
    });

    it("should show earnings breakdown by course", async () => {
      render(<TutorDashboard />, { wrapper });
      expect(screen.getByText(/Earnings by Course/i)).toBeInTheDocument();
    });

    // These sidebar components are now separate and can be tested independently.
    // it('should display payment status and history', async () => { ... });
    // it('should provide tax document preparation info', async () => { ... });
  });

  describe("Course and Schedule Integration", () => {
    it.skip("should display enrolled courses", async () => {
      render(<TutorDashboard />, { wrapper });

      expect(screen.getByText(/My Courses/i)).toBeInTheDocument();
      expect(
        screen.getByText(/CS101 - Computer Science 101/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/CS102 - Data Structures/i)).toBeInTheDocument();
    });

    it.skip("should show course-specific statistics", async () => {
      render(<TutorDashboard />, { wrapper });

      expect(screen.getByTestId("course-stats")).toBeInTheDocument();
      expect(screen.getByText(/Hours per Course/i)).toBeInTheDocument();
    });

    it.skip("should integrate with course calendar", async () => {
      render(<TutorDashboard />, { wrapper });

      expect(screen.getByTestId("course-calendar")).toBeInTheDocument();
      expect(screen.getByText(/This Week's Schedule/i)).toBeInTheDocument();
    });

    it.skip("should show rate information per course", async () => {
      render(<TutorDashboard />, { wrapper });

      const coursesSection = screen
        .getByText(/My Courses/i)
        .closest(".my-courses") as HTMLElement;
      expect(coursesSection).not.toBeNull();
      const coursesScope = within(coursesSection as HTMLElement);
      expect(coursesScope.getByText(/Hourly Rates/i)).toBeInTheDocument();
      expect(
        coursesScope.getByText(/CS101 - Computer Science 101/i),
      ).toBeInTheDocument();
      expect(coursesScope.getByText("$35.50/hr")).toBeInTheDocument();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle empty timesheet state", async () => {
      mockReadHooks.useTimesheetQuery.mockReturnValue({
        data: { ...mockTutorTimesheets, timesheets: [] },
        loading: false,
        error: null,
        timesheets: [],
        hasMore: false,
        totalCount: 0,
        currentPage: mockTutorTimesheets.pageInfo.currentPage,
        refresh: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        updateQuery: vi.fn(),
      });

      render(<TutorDashboard />, { wrapper });

      const emptyState = screen.getByTestId("empty-state");
      expect(
        within(emptyState).getByTestId("empty-state-title"),
      ).toHaveTextContent(/No Timesheets Found/i);
      const description = within(emptyState).getByTestId(
        "empty-state-description",
      );
      expect(description).toHaveTextContent(
        /Ask your lecturer or administrator to create a timesheet/i,
      );
      expect(
        within(emptyState).queryByRole("button", {
          name: /Create First Timesheet/i,
        }),
      ).not.toBeInTheDocument();
    });

    it("should handle network errors gracefully", async () => {
      mockReadHooks.useTimesheetDashboardSummary.mockReturnValue({
        loading: false,
        data: null,
        error: "Network connection failed",
        refetch: vi.fn(),
      });

      render(<TutorDashboard />, { wrapper });

      expect(
        screen.getByText(/Network connection failed/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });

    it("should show loading states appropriately", async () => {
      mockReadHooks.useTimesheetQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        timesheets: [],
        hasMore: false,
        totalCount: 0,
        currentPage: 0,
        refresh: vi.fn(),
        refetch: vi.fn().mockResolvedValue(undefined),
        updateQuery: vi.fn(),
      });

      render(<TutorDashboard />, { wrapper });

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      expect(
        screen.getByText(/Loading your timesheets.../i),
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", async () => {
      render(<TutorDashboard />, { wrapper });
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Welcome back, Michael!/i,
        }),
      ).toBeInTheDocument();
      const cardTitles = await screen.findAllByRole("heading", { level: 2 });
      const cardTitleTexts = cardTitles.map((h) => h.textContent);
      expect(cardTitleTexts).toEqual(["Quick Actions", "Your Statistics"]);

      // Check for Card Titles (h3 in this implementation)
      const timesheetsTitle = await screen.findByTestId(
        "timesheets-section-title",
      );
      expect(timesheetsTitle).toBeInTheDocument();
      expect(timesheetsTitle.tagName).toBe("H3");
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<TutorDashboard />, { wrapper });

      await user.tab();
      expect(document.activeElement).toHaveAccessibleName(
        /Refresh Data/i,
      );

      await user.keyboard("{Enter}");
      expect(
        screen.queryByRole("heading", { name: /New Timesheet Form/i }),
      ).not.toBeInTheDocument();
    });

    it("should announce status changes to screen readers", async () => {
      render(<TutorDashboard />, { wrapper });

      const statusRegion = screen.getByRole("status", {
        name: /dashboard status/i,
      });
      expect(statusRegion).toBeInTheDocument();
    });

  });
});



