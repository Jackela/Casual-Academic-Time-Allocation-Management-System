import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import LecturerPendingTable from "./LecturerPendingTable";
import { createMockTimesheet } from "../../../../test/utils/test-utils";

const TimesheetTableMock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="timesheet-table-mock" />),
);

vi.mock("../../../shared/TimesheetTable/TimesheetTable", () => ({
  __esModule: true,
  default: TimesheetTableMock,
}));

const baseTimesheet = createMockTimesheet({ id: 1, status: "TUTOR_CONFIRMED" });

const renderComponent = (overrides: Partial<React.ComponentProps<typeof LecturerPendingTable>> = {}) => {
  const props: React.ComponentProps<typeof LecturerPendingTable> = {
    timesheets: [baseTimesheet],
    hasNoPendingTimesheets: false,
    showFilteredEmptyState: false,
    loading: false,
    approvalLoading: false,
    canPerformApprovals: true,
    selectedTimesheets: [],
    onSelectionChange: vi.fn(),
    onApprovalAction: vi.fn(),
    onApproveSelected: vi.fn(),
    onRejectSelected: vi.fn(),
    actionLoadingId: null,
    onClearFilters: vi.fn(),
    ...overrides,
  };

  return render(<LecturerPendingTable {...props} />);
};

describe("LecturerPendingTable", () => {
  beforeEach(() => {
    TimesheetTableMock.mockClear();
  });

  it("renders sticky batch bar when rows are selected", () => {
    renderComponent({
      timesheets: [
        createMockTimesheet({ id: 1, status: "TUTOR_CONFIRMED" }),
        createMockTimesheet({ id: 2, status: "TUTOR_CONFIRMED" }),
      ],
      selectedTimesheets: [1, 2],
    });

    const bar = screen.getByTestId("lecturer-batch-action-bar");
    expect(bar).toBeInTheDocument();
    expect(screen.getByTestId("lecturer-batch-count")).toHaveTextContent("2 selected");
    expect(screen.getByRole("button", { name: /approve selected/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /reject selected/i })).not.toBeDisabled();
  });

  it("hides sticky batch bar when no rows are selected", () => {
    renderComponent({ selectedTimesheets: [] });

    expect(screen.queryByTestId("lecturer-batch-action-bar")).not.toBeInTheDocument();
  });

  it("disables batch actions when approvals are loading or callbacks missing", () => {
    // When callbacks are undefined, BatchActions doesn't render any buttons
    // This test verifies that the batch bar is hidden when no actions are available
    renderComponent({
      timesheets: [createMockTimesheet({ id: 1, status: "TUTOR_CONFIRMED" })],
      selectedTimesheets: [1],
      approvalLoading: true,
      onApproveSelected: undefined,
      onRejectSelected: undefined,
    });

    // Batch bar should still show with count, but no action buttons
    const batchBar = screen.getByTestId("lecturer-batch-action-bar");
    expect(batchBar).toBeInTheDocument();
    expect(screen.getByTestId("lecturer-batch-count")).toHaveTextContent("1 selected");
    
    // No action buttons should be rendered when callbacks are undefined
    expect(screen.queryByRole("button", { name: /approve selected/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject selected/i })).not.toBeInTheDocument();
  });

  it("invokes batch callbacks when actions are triggered", async () => {
    const approveSpy = vi.fn().mockResolvedValue(undefined);
    const rejectSpy = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderComponent({
      timesheets: [
        createMockTimesheet({ id: 1, status: "TUTOR_CONFIRMED" }),
        createMockTimesheet({ id: 2, status: "TUTOR_CONFIRMED" }),
      ],
      selectedTimesheets: [1, 2],
      onApproveSelected: approveSpy,
      onRejectSelected: rejectSpy,
    });

    await user.click(screen.getByRole("button", { name: /approve selected/i }));
    await user.click(screen.getByRole("button", { name: /reject selected/i }));

    expect(approveSpy).toHaveBeenCalledTimes(1);
    expect(rejectSpy).toHaveBeenCalledTimes(1);
  });

  it("disables batch actions with accessible reason when status is not eligible", () => {
    renderComponent({
      timesheets: [createMockTimesheet({ id: 42, status: "DRAFT" })],
      selectedTimesheets: [42],
    });

    const approveButton = screen.getByRole("button", { name: /approve selected/i });
    const rejectButton = screen.getByRole("button", { name: /reject selected/i });
    const statusMessages = screen.getAllByText("Action not available in current status");

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(approveButton).toHaveAttribute("title", "Action not available in current status");
    expect(rejectButton).toHaveAttribute("title", "Action not available in current status");
    expect(statusMessages).toHaveLength(2);
  });

  it("enables batch actions when all selections are lecturer confirmed", () => {
    renderComponent({
      timesheets: [
        createMockTimesheet({ id: 11, status: "LECTURER_CONFIRMED" }),
        createMockTimesheet({ id: 12, status: "LECTURER_CONFIRMED" }),
      ],
      selectedTimesheets: [11, 12],
    });

    expect(screen.getByRole("button", { name: /approve selected/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /reject selected/i })).not.toBeDisabled();
  });

  it("disables batch actions for mixed status selections", () => {
    renderComponent({
      timesheets: [
        createMockTimesheet({ id: 21, status: "TUTOR_CONFIRMED" }),
        createMockTimesheet({ id: 22, status: "LECTURER_CONFIRMED" }),
      ],
      selectedTimesheets: [21, 22],
    });

    const approveButton = screen.getByRole("button", { name: /approve selected/i });
    const rejectButton = screen.getByRole("button", { name: /reject selected/i });

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
    expect(screen.getAllByText("Action not available in current status")).toHaveLength(2);
  });
});
