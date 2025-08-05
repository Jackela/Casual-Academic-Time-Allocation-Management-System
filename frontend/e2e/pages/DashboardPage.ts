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
    this.dashboardTitle = page.getByTestId('main-dashboard-title').or(page.getByTestId('dashboard-title'));
    this.welcomeMessage = page.getByTestId('main-welcome-message').or(page.getByTestId('welcome-message'));
    this.timesheetPage = new TimesheetPage(page);
    this.navigationPage = new NavigationPage(page);
  }

  async navigateTo() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForTimesheetData() {
    await this.page.waitForResponse('**/api/timesheets/pending-approval');
  }

  async expectToBeLoaded() {
    await expect(this.dashboardTitle).toContainText('Lecturer Dashboard');
    await expect(this.welcomeMessage).toBeVisible();
    await this.navigationPage.expectHeaderElements();
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