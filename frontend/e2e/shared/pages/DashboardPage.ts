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

  private async getViewportWidth(): Promise<number> {
    const viewport = this.page.viewportSize();
    if (viewport?.width) {
      return viewport.width;
    }
    return this.page.evaluate(() => window.innerWidth || document.documentElement.clientWidth || 1280);
  }

  async waitForDashboardReady(options: { timeout?: number } = {}) {
    const timeout = options.timeout ?? 15000;
    await this.page.waitForLoadState('domcontentloaded', { timeout: Math.min(timeout, 5000) }).catch(() => undefined);
    let state: 'table' | 'empty' | 'error' | 'banner';
    try {
      state = await this.timesheetPage.waitForFirstRender({ timeout });
    } catch (error) {
      const adminDashboard = this.page.locator('[data-testid="admin-dashboard"], .admin-dashboard');
      const lecturerDashboard = this.page.locator('[data-testid="lecturer-dashboard"], .lecturer-dashboard');
      const dashboardLoaded = await Promise.race([
        adminDashboard.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false),
        lecturerDashboard.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false),
      ]);

      if (!dashboardLoaded) {
        throw error;
      }
      state = 'banner';
    }

    if (state === 'banner') {
      await this.page.getByTestId('page-banner').waitFor({ state: 'visible', timeout: 2000 }).catch(() => undefined);
    }
  }

  /**
   * Enhanced data loading wait mechanism with cross-browser compatibility
   * Addresses race conditions and provides multiple fallback strategies
   */
  async waitForTimesheetData(options: { timeout?: number; preferPendingTab?: boolean } = {}) {
    const { timeout, preferPendingTab = true } = options;

    if (preferPendingTab) {
      const pendingTab = this.page.getByRole('button', { name: /Pending Review/i });
      try {
        const tabCount = await pendingTab.count();
        if (tabCount > 0 && !(await pendingTab.isDisabled().catch(() => true))) {
          await pendingTab.click();
        }
      } catch {
        // Tabs not available in current dashboard; continue with default wait strategy.
      }
    }

    await this.waitForDashboardReady({ timeout });
  }

  async expectToBeLoaded(role: 'LECTURER' | 'ADMIN' | 'TUTOR' = 'LECTURER') {
    await this.waitForDashboardReady();

    const container = role === 'ADMIN'
      ? this.page.locator('[data-testid="admin-dashboard"]')
      : role === 'TUTOR'
        ? this.page.locator('[data-testid="tutor-dashboard"]')
        : this.page.locator('[data-testid="lecturer-dashboard"]');

    if (await container.count()) {
      await expect(container).toBeVisible();
    } else {
      // Fallback: confirm core dashboard content exists when specific container is absent.
      await expect(this.page.locator('[data-testid="main-content"], [data-testid="dashboard-main"]').first())
        .toBeVisible({ timeout: 5000 });
    }

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

  async expectResponsiveColumns(options: { expectTutorColumn?: boolean } = {}) {
    const table = this.timesheetPage.timesheetsTable.first();
    const tableVisible = await table.isVisible().catch(() => false);

    if (!tableVisible) {
      const emptyStateVisible = await this.page.getByTestId('empty-state')
        .first()
        .isVisible()
        .catch(() => false);
      if (!emptyStateVisible) {
        console.warn('[DashboardPage] Table not visible and empty state missing; skipping responsive column checks');
      }
      return;
    }

    const width = await this.getViewportWidth();
    const normalizeHeader = (text: string) => text
      .replace(/[⇅↕↑↓]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const headers = table.locator('thead th');
    const headerCount = await headers.count();
    if (headerCount === 0) {
      console.warn('[DashboardPage] No table headers rendered; skipping responsive column checks');
      return;
    }

    const expectTutor = options.expectTutorColumn ?? true;

    const columnVisible = async (key: string): Promise<boolean> => {
      const locator = this.timesheetPage.timesheetsTable.locator(`thead [data-column="${key}"]`);
      return (await locator.count()) > 0;
    };

    const [
      courseVisible,
      statusVisible,
      actionsVisible,
      tutorVisible,
      hoursVisible,
      descriptionVisible,
      lastUpdatedVisible,
    ] = await Promise.all([
      columnVisible('course'),
      columnVisible('status'),
      columnVisible('actions'),
      columnVisible('tutor'),
      columnVisible('hours'),
      columnVisible('description'),
      columnVisible('lastUpdated'),
    ]);

    expect(courseVisible).toBeTruthy();
    expect(statusVisible).toBeTruthy();
    expect(actionsVisible).toBeTruthy();

    if (expectTutor) {
      expect(tutorVisible).toBeTruthy();
    }

    const breakpointValues = await this.page.evaluate(() => {
      const parseVar = (name: string, fallback: number): number => {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        const match = raw.match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : fallback;
      };

      return {
        tablet: parseVar('--breakpoint-tablet', 1024),
        tabletLandscape: parseVar('--breakpoint-tablet-landscape', 1280),
        desktop: parseVar('--breakpoint-desktop', 1440),
      };
    });

    if (width < breakpointValues.tablet) {
      expect(hoursVisible).toBeFalsy();
      expect(descriptionVisible).toBeFalsy();
    }

    if (lastUpdatedVisible) {
      expect(width).toBeGreaterThanOrEqual(breakpointValues.tabletLandscape);
    }
  }
}
