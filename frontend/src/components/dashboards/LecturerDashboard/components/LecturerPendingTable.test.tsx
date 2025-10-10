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
    renderComponent({ selectedTimesheets: [1, 2] });

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
    renderComponent({
      selectedTimesheets: [1],
      approvalLoading: true,
      onApproveSelected: undefined,
      onRejectSelected: undefined,
    });

    const approveButton = screen.getByRole("button", { name: /approve selected/i });
    const rejectButton = screen.getByRole("button", { name: /reject selected/i });

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it("invokes batch callbacks when actions are triggered", async () => {
    const approveSpy = vi.fn().mockResolvedValue(undefined);
    const rejectSpy = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderComponent({
      selectedTimesheets: [1, 2],
      onApproveSelected: approveSpy,
      onRejectSelected: rejectSpy,
    });

    await user.click(screen.getByRole("button", { name: /approve selected/i }));
    await user.click(screen.getByRole("button", { name: /reject selected/i }));

    expect(approveSpy).toHaveBeenCalledTimes(1);
    expect(rejectSpy).toHaveBeenCalledTimes(1);
  });
});
