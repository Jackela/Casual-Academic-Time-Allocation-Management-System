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
    await expect(this.timesheetsTable).toBeVisible();
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
    
    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/approvals'),
      approveButton.click()
    ]);
    
    // Wait for refresh
    await this.page.waitForResponse('**/api/timesheets/pending-approval');
    
    return response;
  }

  async rejectTimesheet(id: number) {
    const rejectButton = await this.getRejectButtonForTimesheet(id);
    
    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/approvals'),
      rejectButton.click()
    ]);
    
    // Wait for refresh
    await this.page.waitForResponse('**/api/timesheets/pending-approval');
    
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
    try {
      await this.timesheetsTable.waitFor({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async retryDataLoad() {
    await this.retryButton.click();
    await this.page.waitForResponse('**/api/timesheets/pending-approval');
  }
}