import { expect, type Locator, type Page } from '@playwright/test';
import { waitForEnabled, waitForVisible } from '../../utils/waits';

export class TutorDashboardPage {
  constructor(private page: Page) {}

  get table(): Locator {
    return this.page.getByTestId('tutor-inbox-table');
  }

  inboxRow(timesheetId: number): Locator {
    return this.page.getByTestId('tutor-inbox-row').filter({ has: this.page.getByTestId(`status-chip-${timesheetId}`) }).first();
  }

  async openDetail(timesheetId: number): Promise<void> {
    const row = this.inboxRow(timesheetId);
    await waitForVisible(row);
    await row.click();
  }

  async submitForApproval(timesheetId: number): Promise<void> {
    const btn = this.page.getByTestId('tutor-submit-btn').first();
    await waitForEnabled(btn);
    await btn.click();
  }

  async confirm(timesheetId: number): Promise<void> {
    const btn = this.page.getByTestId('tutor-confirm-btn').first();
    await waitForEnabled(btn);
    await btn.click();
  }
}

export default TutorDashboardPage;

