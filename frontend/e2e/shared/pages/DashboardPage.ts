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

  /**
   * Enhanced data loading wait mechanism with cross-browser compatibility
   * Addresses race conditions and provides multiple fallback strategies
   */
  async waitForTimesheetData() {
    console.log('[DashboardPage] Waiting for timesheet data...');
    
    try {
      // Multi-strategy wait approach for maximum reliability
      const waitStrategies = [
        // Strategy 1: Wait for API response
        this.page.waitForResponse(response => {
          const url = response.url();
          return url.includes('/api/timesheets') || url.includes('/api/dashboard');
        }, { timeout: 12000 }).catch(() => null),
        
        // Strategy 2: Wait for UI elements to appear
        Promise.race([
          this.timesheetPage.timesheetsTable.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
          this.timesheetPage.emptyState.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
          this.timesheetPage.errorMessage.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null)
        ]),
        
        // Strategy 3: Network idle fallback
        this.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null)
      ];

      // Wait for any strategy to succeed
      await Promise.race([
        Promise.all(waitStrategies.filter(s => s !== null)),
        new Promise(resolve => setTimeout(resolve, 15000)) // Ultimate timeout
      ]);

      // Ensure loading spinner is gone (best effort)
      const loadingSpinner = this.page.getByTestId('loading-spinner').or(
        this.page.locator('[data-testid="loading-state"], .loading-spinner, .spinner')
      );
      
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
        console.log('[DashboardPage] Loading spinner still visible or not found');
      });

      console.log('[DashboardPage] Timesheet data loading completed');
      
    } catch (error) {
      console.warn('[DashboardPage] Data loading wait encountered issues:', error);
      // Continue anyway - UI might still be functional
    }
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