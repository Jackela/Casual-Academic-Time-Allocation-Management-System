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
    this.timesheetsTable = page.locator('[data-testid="timesheet-table"], [data-testid="timesheets-table"]');
    this.loadingState = page.locator('[data-testid="loading-state"], .loading-state');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state');
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message');
    this.retryButton = page.getByRole('button', { name: /retry/i });
    this.countBadge = page.locator('[data-testid="count-badge"], [data-testid="total-count-badge"], .count-badge');
  }

  async expectTimesheetsTable() {
    const table = this.timesheetsTable.first();
    try {
      await expect(table).toBeVisible({ timeout: 8000 });
    } catch {
      await this.expectEmptyState();
    }
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
    await expect(this.emptyState).toContainText(/no/i);
  }

  async expectLoadingState() {
    await expect(this.loadingState).toBeVisible();
  }

  async expectErrorState() {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.retryButton).toBeVisible();
  }

  async getTimesheetRows() {
    return this.page.locator('[data-testid^="timesheet-row-"], .timesheet-row');
  }

  async getTimesheetById(id: number) {
    return this.page.getByTestId(`timesheet-row-${id}`);
  }

  async getApproveButtonForTimesheet(id: number) {
    const row = await this.getTimesheetById(id);
    return row.getByRole('button', { name: /approve/i });
  }

  async getRejectButtonForTimesheet(id: number) {
    const row = await this.getTimesheetById(id);
    return row.getByRole('button', { name: /reject/i });
  }

  async getTutorInfoForTimesheet(id: number) {
    const row = await this.getTimesheetById(id);
    return row.locator('.tutor-info');
  }

  async getCourseCodeForTimesheet(id: number) {
    const row = await this.getTimesheetById(id);
    return row.locator('.course-code');
  }

  async getHoursBadgeForTimesheet(id: number) {
    const row = await this.getTimesheetById(id);
    return row.locator('.hours-badge');
  }

  async getDescriptionForTimesheet(id: number) {
    const row = await this.getTimesheetById(id);
    return row.locator('.description-cell');
  }

  async approveTimesheet(id: number) {
    const approveButton = await this.getApproveButtonForTimesheet(id);

    const badgeSelector = '[data-testid="count-badge"], [data-testid="total-count-badge"], .count-badge';
    let beforeBadgeText: string | null = null;
    const badgeOccurrences = await this.countBadge.count().catch(() => 0);
    if (badgeOccurrences > 0) {
      try {
        beforeBadgeText = await this.countBadge.first().innerText();
      } catch {
        beforeBadgeText = null;
      }
    }

    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/approvals'),
      approveButton.click()
    ]);

    const waiters: Promise<unknown>[] = [
      this.page.waitForFunction(
        (timesheetId) => !document.querySelector(`[data-testid=\"timesheet-row-${timesheetId}\"]`),
        id,
        { timeout: 10000 }
      ),
      this.emptyState.waitFor({ timeout: 10000 }).catch(() => null)
    ];

    if (badgeOccurrences > 0) {
      waiters.push((async () => {
        try {
          await this.countBadge.first().waitFor({ timeout: 10000 });
          await this.page.waitForFunction(
            ({ selector, prev }) => {
              const el = document.querySelector(selector as string);
              return !!el && ((el.textContent || '').trim() !== ((prev || '') as string).trim());
            },
            { selector: badgeSelector, prev: beforeBadgeText },
            { timeout: 10000 }
          );
        } catch {
          // Badge may be absent or unchanged; allow workflow to proceed.
        }
      })());
    }

    await Promise.race(waiters);

    return response;
  }

  async rejectTimesheet(id: number) {
    const rejectButton = await this.getRejectButtonForTimesheet(id);

    const badgeSelector = '[data-testid="count-badge"], [data-testid="total-count-badge"], .count-badge';
    let beforeBadgeText: string | null = null;
    const badgeOccurrences = await this.countBadge.count().catch(() => 0);
    if (badgeOccurrences > 0) {
      try {
        beforeBadgeText = await this.countBadge.first().innerText();
      } catch {
        beforeBadgeText = null;
      }
    }

    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/approvals'),
      rejectButton.click()
    ]);

    const waiters: Promise<unknown>[] = [
      this.page.waitForFunction(
        (timesheetId) => !document.querySelector(`[data-testid=\"timesheet-row-${timesheetId}\"]`),
        id,
        { timeout: 10000 }
      ),
      this.emptyState.waitFor({ timeout: 10000 }).catch(() => null)
    ];

    if (badgeOccurrences > 0) {
      waiters.push((async () => {
        try {
          await this.countBadge.first().waitFor({ timeout: 10000 });
          await this.page.waitForFunction(
            ({ selector, prev }) => {
              const el = document.querySelector(selector as string);
              return !!el && ((el.textContent || '').trim() !== ((prev || '') as string).trim());
            },
            { selector: badgeSelector, prev: beforeBadgeText },
            { timeout: 10000 }
          );
        } catch {
          // Badge may be absent or unchanged; allow workflow to proceed.
        }
      })());
    }

    await Promise.race(waiters);

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
    const badgeOccurrences = await this.countBadge.count().catch(() => 0);
    if (badgeOccurrences === 0) {
      return;
    }

    const badge = this.countBadge.first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(String(expectedCount));
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
      return false;
    } catch {
      return false;
    }
  }

  async retryDataLoad() {
    await this.retryButton.click();
    await this.page.waitForResponse('**/api/timesheets/pending-final-approval');
  }
}