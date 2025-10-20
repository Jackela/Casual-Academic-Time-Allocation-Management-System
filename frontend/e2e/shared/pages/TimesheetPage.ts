import { Page, expect, Locator } from '@playwright/test';
import {
  TABLE_LAYOUT_SELECTORS,
  TIMESHEET_TEST_IDS,
  getTimesheetActionSelector,
  getTimesheetHoursBadgeSelector,
  getTimesheetRowSelector,
  getTimesheetStatusBadgeSelector,
  getTimesheetTotalPaySelector,
} from '../../../src/lib/config/table-config';

export class TimesheetPage {
  readonly page: Page;
  readonly timesheetsTable: Locator;
  readonly loadingState: Locator;
  readonly emptyState: Locator;
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly countBadge: Locator;
  readonly pageBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.timesheetsTable = page.locator(TABLE_LAYOUT_SELECTORS.tableContainer);
    this.loadingState = page.locator('[data-testid="loading-state"], .loading-state');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state');
    this.errorMessage = page.locator('[data-testid="error-message"], .error-message');
    this.retryButton = page.getByRole('button', { name: /retry/i });
    this.countBadge = page.locator('[data-testid="count-badge"], [data-testid="total-count-badge"], .count-badge');
    const bannerSelectors = [TABLE_LAYOUT_SELECTORS.pageBanner, TABLE_LAYOUT_SELECTORS.legacyPageBanner]
      .filter(Boolean)
      .join(', ');
    this.pageBanner = page.locator(bannerSelectors);
  }

  getTableReadyLocators(): Locator[] {
    const locators: Locator[] = [];
    const tableSelector = TABLE_LAYOUT_SELECTORS.tableContainer?.trim();
    if (tableSelector) {
      locators.push(this.page.locator(tableSelector));
    }
    const cardSelector = TABLE_LAYOUT_SELECTORS.tableCardView?.trim();
    if (cardSelector) {
      locators.push(this.page.locator(cardSelector));
    }
    return locators;
  }

  async expectTimesheetsTable() {
    const candidates = this.getTableReadyLocators();
    for (const candidate of candidates) {
      try {
        await expect(candidate).toBeVisible({ timeout: 8000 });
        return;
      } catch {
        // Try next candidate (table or card layout) before falling back to empty state.
      }
    }
    await this.expectEmptyState();
  }

  async waitForFirstRender(options: { timeout?: number } = {}): Promise<'table' | 'empty' | 'error' | 'banner'> {
    const timeout = options.timeout ?? 12000;
    const candidates = this.getTableReadyLocators();

    const watchers = [
      ...candidates.map(candidate =>
        candidate.waitFor({ state: 'visible', timeout }).then(() => 'table').catch(() => null),
      ),
      this.emptyState.waitFor({ state: 'visible', timeout }).then(() => 'empty').catch(() => null),
      this.errorMessage.waitFor({ state: 'visible', timeout }).then(() => 'error').catch(() => null),
      this.pageBanner.waitFor({ state: 'visible', timeout }).then(() => 'banner').catch(() => null),
    ];

    const result = await Promise.race([
      ...watchers,
      this.page.waitForTimeout(timeout).then(() => null),
    ]);

    if (!result) {
      throw new Error('Timesheet view did not reach a ready state within the allotted time.');
    }

    return result as 'table' | 'empty' | 'error' | 'banner';
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
    return this.page.locator(getTimesheetRowSelector(id));
  }

  async getApproveButtonForTimesheet(id: number) {
    return this.page.locator(getTimesheetActionSelector('approve', id));
  }

  async getRejectButtonForTimesheet(id: number) {
    return this.page.locator(getTimesheetActionSelector('reject', id));
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
        (timesheetId) => !document.querySelector(`[data-testid="timesheet-row-${timesheetId}"]`),
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
    await this.openActionsMenu(id);
    const rejectButton = this.getDropdownMenuItem(id, 'reject');
    await rejectButton.waitFor({ state: 'visible' });

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
        (timesheetId) => !document.querySelector(`[data-testid="timesheet-row-${timesheetId}"]`),
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
    await expect(approveButton).toBeVisible();
    await expect(approveButton).toBeEnabled();

    const rejectButton = await this.getRejectButtonForTimesheet(id);
    if (await rejectButton.count()) {
      await expect(rejectButton).toBeVisible();
      await expect(rejectButton).toBeEnabled();
    }

    const placeholder = this.page.locator(getTimesheetRowSelector(id)).getByTestId(
      TIMESHEET_TEST_IDS.noActionsPlaceholder,
    );
    await expect(placeholder).toHaveCount(0);
  }

  async expectTimesheetActionButtonsDisabled(id: number) {
    const approveButton = await this.getApproveButtonForTimesheet(id);
    if (await approveButton.count()) {
      await expect(approveButton).toBeVisible();
      await expect(approveButton).toBeDisabled();
    } else {
      const placeholder = this.page.locator(getTimesheetRowSelector(id)).getByTestId(
        TIMESHEET_TEST_IDS.noActionsPlaceholder,
      );
      await expect(placeholder).toBeVisible();
    }

    const rejectButton = await this.getRejectButtonForTimesheet(id);
    if (await rejectButton.count()) {
      await expect(rejectButton).toBeDisabled();
    }
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

    if (expectedData.totalPay) {
      const totalPayValue = this.page.locator(getTimesheetTotalPaySelector(id));
      await expect(totalPayValue).toContainText(expectedData.totalPay);
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
    } catch {
      // Allow table refresh polling to complete without failing tests
    }
    try {
      const count = await rows.count();
      if (count > 0) return true;
    } catch {
      // Allow table refresh polling to complete without failing tests
    }
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
