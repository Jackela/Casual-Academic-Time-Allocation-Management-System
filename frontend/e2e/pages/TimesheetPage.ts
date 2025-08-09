import { Page, expect, Locator } from '@playwright/test';

export class TimesheetPage {
  readonly page: Page;
  readonly timesheetsTable: Locator;
  readonly loadingState: Locator;
  readonly emptyState: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly countBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.timesheetsTable = page.getByTestId('timesheets-table');
    this.loadingState = page.getByTestId('loading-state');
    this.emptyState = page.getByTestId('empty-state');
    this.errorMessage = page.getByTestId('error-message');
    this.retryButton = page.getByTestId('retry-button');
    this.countBadge = page.getByTestId('count-badge');
  }

  async expectTimesheetsTable() {
    // Presence-first: either table is visible or empty-state is visible
    const tableVisible = await this.timesheetsTable.isVisible().catch(() => false);
    if (tableVisible) {
      await expect(this.timesheetsTable).toBeVisible();
      return;
    }
    await this.expectEmptyState();
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
    await expect(this.emptyState).toContainText(/no.*pending.*timesheets/i);
  }

  async expectLoadingState() {
    await expect(this.loadingState).toBeVisible();
  }

  async expectErrorState() {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.retryButton).toBeVisible();
  }

  async getTimesheetRows() {
    return this.timesheetsTable.locator('tbody tr');
  }

  async getTimesheetById(id: number) {
    return this.page.getByTestId(`timesheet-row-${id}`);
  }

  async getApproveButtonForTimesheet(id: number) {
    return this.page.getByTestId(`approve-btn-${id}`);
  }

  async getRejectButtonForTimesheet(id: number) {
    return this.page.getByTestId(`reject-btn-${id}`);
  }

  async getTutorInfoForTimesheet(id: number) {
    return this.page.getByTestId(`tutor-info-${id}`);
  }

  async getCourseCodeForTimesheet(id: number) {
    return this.page.getByTestId(`course-code-${id}`);
  }

  async getHoursBadgeForTimesheet(id: number) {
    return this.page.getByTestId(`hours-badge-${id}`);
  }

  async getDescriptionForTimesheet(id: number) {
    return this.page.getByTestId(`description-cell-${id}`);
  }

  async approveTimesheet(id: number) {
    const approveButton = await this.getApproveButtonForTimesheet(id);
    const beforeBadgeText = await this.countBadge.innerText().catch(() => null);

    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/approvals'),
      approveButton.click()
    ]);

    // User-visible-results-first: wait for row to disappear OR count badge to change OR empty-state to appear
    await Promise.race([
      this.page.waitForFunction(
        (timesheetId) => !document.querySelector(`[data-testid="timesheet-row-${timesheetId}"]`),
        id,
        { timeout: 10000 }
      ),
      (async () => {
        try {
      await this.countBadge.waitFor({ timeout: 10000 });
      await this.page.waitForFunction(
        ({ sel, prev }) => {
          const el = document.querySelector(sel as string);
          return !!el && ((el.textContent || '').trim() !== ((prev || '') as string).trim());
        },
        { sel: '[data-testid="count-badge"]', prev: beforeBadgeText },
        { timeout: 10000 }
      );
        } catch {}
      })(),
      this.emptyState.waitFor({ timeout: 10000 }).catch(() => null)
    ]);
    return response;
  }

  async rejectTimesheet(id: number) {
    const rejectButton = await this.getRejectButtonForTimesheet(id);
    const beforeBadgeText = await this.countBadge.innerText().catch(() => null);

    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/approvals'),
      rejectButton.click()
    ]);

    // User-visible-results-first: wait for row to disappear OR count badge to change OR empty-state to appear
    await Promise.race([
      this.page.waitForFunction(
        (timesheetId) => !document.querySelector(`[data-testid="timesheet-row-${timesheetId}"]`),
        id,
        { timeout: 10000 }
      ),
      (async () => {
        try {
      await this.countBadge.waitFor({ timeout: 10000 });
      await this.page.waitForFunction(
        ({ sel, prev }) => {
          const el = document.querySelector(sel as string);
          return !!el && ((el.textContent || '').trim() !== ((prev || '') as string).trim());
        },
        { sel: '[data-testid="count-badge"]', prev: beforeBadgeText },
        { timeout: 10000 }
      );
        } catch {}
      })(),
      this.emptyState.waitFor({ timeout: 10000 }).catch(() => null)
    ]);
    return response;
  }

  async expectTimesheetActionButtonsEnabled(id: number) {
    const approveButton = await this.getApproveButtonForTimesheet(id);
    const rejectButton = await this.getRejectButtonForTimesheet(id);
    
    await expect(approveButton).toBeEnabled();
    await expect(rejectButton).toBeEnabled();
  }

  async expectTimesheetActionButtonsDisabled(id: number) {
    const approveButton = await this.getApproveButtonForTimesheet(id);
    const rejectButton = await this.getRejectButtonForTimesheet(id);
    
    await expect(approveButton).toBeDisabled();
    await expect(rejectButton).toBeDisabled();
  }

  async expectTimesheetData(id: number, expectedData: {
    tutorName?: string;
    courseCode?: string;
    hours?: string;
    description?: string;
  }) {
    if (expectedData.tutorName) {
      const tutorInfo = await this.getTutorInfoForTimesheet(id);
      await expect(tutorInfo).toContainText(expectedData.tutorName);
    }
    
    if (expectedData.courseCode) {
      const courseCode = await this.getCourseCodeForTimesheet(id);
      await expect(courseCode).toContainText(expectedData.courseCode);
    }
    
    if (expectedData.hours) {
      const hoursBadge = await this.getHoursBadgeForTimesheet(id);
      await expect(hoursBadge).toContainText(expectedData.hours);
    }
    
    if (expectedData.description) {
      const description = await this.getDescriptionForTimesheet(id);
      await expect(description).toContainText(expectedData.description);
    }
  }

  async getTimesheetCount(): Promise<number> {
    const rows = await this.getTimesheetRows();
    return await rows.count();
  }

  async expectCountBadge(expectedCount: number) {
    await expect(this.countBadge).toContainText(`${expectedCount} pending`);
  }

  async hasTimesheetData(): Promise<boolean> {
    // Presence-first: prioritize DOM over network timing
    const rows = await this.getTimesheetRows();
    try {
      await this.timesheetsTable.waitFor({ timeout: 8000 });
    } catch {}
    try {
      const count = await rows.count();
      if (count > 0) return true;
    } catch {}
    // If no rows, check empty state presence
    try {
      await this.emptyState.waitFor({ timeout: 4000 });
      return false;    } catch {
      // If table not found or no rows, check for empty state
      try {
        await this.emptyState.waitFor({ timeout: 2000 });
        return false;
      } catch {
        return false;
      }
    }
  }

  async retryDataLoad() {
    await this.retryButton.click();
    await this.page.waitForResponse('**/api/timesheets/pending-final-approval');
  }
}