import { Page, expect } from '@playwright/test';
import BasePage from './base.page';

export class LecturerDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openCreateTimesheet() {
    await this.goto('/lecturer');
    await this.byTestId('timesheet-create').click();
  }

  async fillInstructionalInputs(unit: string, hours: string, week: string) {
    await this.byTestId('input-unit').fill(unit);
    await this.byTestId('input-hours').fill(hours);
    await this.byTestId('input-week').fill(week);
  }

  async assertComputedPreviewVisible() {
    await expect(this.byTestId('calculated-preview')).toBeVisible();
  }

  async save() {
    await this.byTestId('btn-save-timesheet').click();
  }
}

export default LecturerDashboardPage;

