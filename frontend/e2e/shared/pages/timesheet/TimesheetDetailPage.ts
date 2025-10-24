import { type Page, type Locator } from '@playwright/test';
import { waitForEnabled, waitForVisible } from '../../utils/waits';

export class TimesheetDetailPage {
  constructor(private page: Page) {}

  get detail(): Locator { return this.page.getByTestId('timesheet-detail'); }
  get activity(): Locator { return this.page.getByTestId('activity-log'); }

  statusText(): Locator {
    return this.page.getByTestId('timesheet-status');
  }

  activityLog(): Locator {
    return this.activity;
  }

  async approveAsLecturer(): Promise<void> {
    const btn = this.page.getByTestId('lecturer-approve-btn').first();
    await waitForEnabled(btn);
    await btn.click();
  }

  async finalApproveAsAdmin(): Promise<void> {
    const btn = this.page.getByTestId('admin-final-approve-btn').first();
    await waitForEnabled(btn);
    await btn.click();
  }
}

export default TimesheetDetailPage;

