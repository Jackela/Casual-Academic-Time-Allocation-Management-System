import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { MyTimesheets } from "./MyTimesheets";
import { createMockTimesheets } from "../../test/utils/test-utils";
import type { PageInfo } from "../../types/api";
import { useTimesheetQuery } from "../../hooks/timesheets";

vi.mock("../../hooks/timesheets", () => ({
  useTimesheetQuery: vi.fn(),
}));

const mockedUseTimesheetQuery = vi.mocked(useTimesheetQuery);

const createPageInfo = (overrides: Partial<PageInfo> = {}): PageInfo => ({
  currentPage: overrides.currentPage ?? 0,
  pageSize: overrides.pageSize ?? 20,
  totalElements: overrides.totalElements ?? 60,
  totalPages: overrides.totalPages ?? 3,
  first: overrides.first ?? true,
  last: overrides.last ?? false,
  numberOfElements: overrides.numberOfElements ?? 20,
  empty: overrides.empty ?? false,
});

describe("MyTimesheets", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockedUseTimesheetQuery.mockReset();
  });

  it("uses server-side pagination when page info is available", async () => {
    const updateQuery = vi.fn();
    const timesheets = createMockTimesheets(20).map((timesheet, index) => ({
      ...timesheet,
      courseName: `Course ${index + 1}`,
    }));

    mockedUseTimesheetQuery.mockReturnValue({
      data: { pageInfo: createPageInfo() },
      timesheets,
      loading: false,
      error: null,
      totalCount: 60,
      currentPage: 0,
      refetch: vi.fn(),
      refresh: vi.fn(),
      updateQuery,
    });

    const user = userEvent.setup();
    render(<MyTimesheets />);

    const pagination = await screen.findByRole("navigation", {
      name: /pagination/i,
    });

    const nextButton = within(pagination).getByRole("button", {
      name: /next page/i,
    });
    await user.click(nextButton);

    expect(updateQuery).toHaveBeenCalledWith({ page: 1 });

    const pageSizeSelect = within(pagination).getByLabelText(/rows per page/i);
    await user.selectOptions(pageSizeSelect, "50");

    expect(updateQuery).toHaveBeenCalledWith({ page: 0, size: 50 });
  });

  it("falls back to client-side pagination when page info is missing", async () => {
    const allTimesheets = createMockTimesheets(30).map((timesheet, index) => ({
      ...timesheet,
      courseName: `Course ${index + 1}`,
    }));

    mockedUseTimesheetQuery.mockReturnValue({
      data: null,
      timesheets: allTimesheets,
      loading: false,
      error: null,
      totalCount: allTimesheets.length,
      currentPage: 0,
      refetch: vi.fn(),
      refresh: vi.fn(),
      updateQuery: vi.fn(),
    });

    const user = userEvent.setup();
    render(<MyTimesheets />);

    const pagination = await screen.findByRole("navigation", {
      name: /pagination/i,
    });

    expect(screen.getByText("Course 1")).toBeInTheDocument();
    expect(screen.queryByText("Course 25")).not.toBeInTheDocument();

    const nextButton = within(pagination).getByRole("button", {
      name: /next page/i,
    });
    await user.click(nextButton);

    expect(await screen.findByText("Course 25")).toBeInTheDocument();
    expect(screen.queryByText("Course 1")).not.toBeInTheDocument();

    const pageSizeSelect = within(pagination).getByLabelText(/rows per page/i);
    await user.selectOptions(pageSizeSelect, "100");

    expect(pageSizeSelect).toHaveValue("100");
  });
});
