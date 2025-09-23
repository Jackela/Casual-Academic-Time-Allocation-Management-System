import { Page, expect, Locator } from '@playwright/test';
import { TimesheetPage } from './TimesheetPage';
import { NavigationPage } from './NavigationPage';

export class DashboardPage {
  readonly page: Page;
  readonly dashboardTitle: Locator;
  readonly welcomeMessage: Locator;
  readonly timesheetPage: TimesheetPage;
  readonly navigationPage: NavigationPage;

  constructor(page: Page) {
    this.page = page;
    this.dashboardTitle = page.locator('[data-testid="main-dashboard-title"], [data-testid="dashboard-title"], .dashboard-header__subtitle, .admin-header__subtitle, .tutor-header__subtitle');
    this.welcomeMessage = page.locator('[data-testid="main-welcome-message"], [data-testid="welcome-message"], .dashboard-header__title, .admin-header__title, .tutor-header__title');
    this.timesheetPage = new TimesheetPage(page);
    this.navigationPage = new NavigationPage(page);
  }

  async navigateTo() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForTimesheetData() {
    // Be resilient: wait for either the API response or any UI state to appear
    await Promise.race([
      this.page.waitForResponse('**/api/timesheets/pending-final-approval').catch(() => null),
      this.timesheetPage.timesheetsTable.waitFor({ timeout: 8000 }).catch(() => null),
      this.timesheetPage.emptyState.waitFor({ timeout: 8000 }).catch(() => null),
      this.timesheetPage.errorMessage.waitFor({ timeout: 8000 }).catch(() => null)
    ]);
  }

  async expectToBeLoaded(role: 'LECTURER' | 'ADMIN' | 'TUTOR' = 'LECTURER') {
    const container = role === 'ADMIN'
      ? this.page.locator('[data-testid="admin-dashboard"]')
      : role === 'TUTOR'
        ? this.page.locator('[data-testid="tutor-dashboard"]')
        : this.page.locator('[data-testid="lecturer-dashboard"]');

    await expect(container).toBeVisible();

    const expectedSubtitle = role === 'ADMIN'
      ? /System Administrator/i
      : role === 'TUTOR'
        ? /Tutor Dashboard/i
        : /Lecturer Dashboard/i;

    await expect(this.dashboardTitle.first()).toContainText(expectedSubtitle);
    await expect(this.welcomeMessage.first()).toBeVisible();
  }

  async expectLoadingState() {
    await this.timesheetPage.expectLoadingState();
  }

  async expectTimesheetsTable() {
    await this.timesheetPage.expectTimesheetsTable();
  }

  async expectEmptyState() {
    await this.timesheetPage.expectEmptyState();
  }

  async expectErrorState() {
    await this.timesheetPage.expectErrorState();
  }

  async getTimesheetRows() {
    return this.timesheetPage.getTimesheetRows();
  }

  async getTimesheetById(id: number) {
    return this.timesheetPage.getTimesheetById(id);
  }

  async getApproveButtonForTimesheet(id: number) {
    return this.timesheetPage.getApproveButtonForTimesheet(id);
  }

  async getRejectButtonForTimesheet(id: number) {
    return this.timesheetPage.getRejectButtonForTimesheet(id);
  }

  async approveTimesheet(id: number) {
    return this.timesheetPage.approveTimesheet(id);
  }

  async rejectTimesheet(id: number) {
    return this.timesheetPage.rejectTimesheet(id);
  }

  async logout() {
    await this.navigationPage.logout();
  }

  async expectTableHeaders(expectedHeaders: string[]) {
    const headers = this.timesheetPage.timesheetsTable.locator('thead th');
    
    for (let i = 0; i < expectedHeaders.length; i++) {
      await expect(headers.nth(i)).toContainText(expectedHeaders[i]);
    }
  }

  async hasTimesheetData(): Promise<boolean> {
    return this.timesheetPage.hasTimesheetData();
  }

  async expectUserInfo(expectedName: string, expectedRole: string) {
    await this.navigationPage.expectUserInfo(expectedName, expectedRole);
  }

  async expectNavigationForRole(role: 'LECTURER' | 'ADMIN' | 'TUTOR') {
    await this.navigationPage.expectNavigationForRole(role);
  }
}