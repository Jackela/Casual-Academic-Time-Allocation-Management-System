import { Page, expect, Locator } from '@playwright/test';

export class NavigationPage {
  readonly page: Page;
  readonly appTitle: Locator;
  readonly userInfo: Locator;
  readonly userName: Locator;
  readonly userRoleBadge: Locator;
  readonly logoutButton: Locator;
  readonly dashboardNav: Locator;
  readonly navDashboard: Locator;
  readonly navTimesheets: Locator;
  readonly navApprovals: Locator;
  readonly navUsers: Locator;
  readonly navReports: Locator;

  constructor(page: Page) {
    this.page = page;
    this.appTitle = page.getByTestId('app-title');
    this.userInfo = page.getByTestId('user-info');
    this.userName = page.getByTestId('user-name');
    this.userRoleBadge = page.getByTestId('user-role-badge');
    this.logoutButton = page.getByTestId('logout-button');
    this.dashboardNav = page.getByTestId('dashboard-nav');
    this.navDashboard = page.getByTestId('nav-dashboard');
    this.navTimesheets = page.getByTestId('nav-timesheets');
    this.navApprovals = page.getByTestId('nav-approvals');
    this.navUsers = page.getByTestId('nav-users');
    this.navReports = page.getByTestId('nav-reports');
  }

  async expectHeaderElements() {
    await expect(this.appTitle).toContainText('CATAMS');
    await expect(this.userInfo).toBeVisible();
    await expect(this.logoutButton).toBeVisible();
  }

  async expectUserInfo(expectedName: string, expectedRole: string) {
    await expect(this.userName).toContainText(expectedName);
    await expect(this.userRoleBadge).toContainText(expectedRole);
  }

  async expectNavigationForRole(role: 'LECTURER' | 'ADMIN' | 'TUTOR') {
    await expect(this.dashboardNav).toBeVisible();
    await expect(this.navDashboard).toBeVisible();

    if (role === 'LECTURER') {
      await expect(this.navTimesheets).toBeVisible();
      await expect(this.navApprovals).toBeVisible();
      // Should not see admin navigation
      await expect(this.navUsers).not.toBeVisible();
      await expect(this.navReports).not.toBeVisible();
    } else if (role === 'ADMIN') {
      await expect(this.navUsers).toBeVisible();
      await expect(this.navReports).toBeVisible();
      // Should not see lecturer navigation
      await expect(this.navTimesheets).not.toBeVisible();
      await expect(this.navApprovals).not.toBeVisible();
    }
    // TUTOR role would have different navigation items if implemented
  }

  async clickNavigation(item: 'dashboard' | 'timesheets' | 'approvals' | 'users' | 'reports') {
    switch (item) {
      case 'dashboard':
        await this.navDashboard.click();
        break;
      case 'timesheets':
        await this.navTimesheets.click();
        break;
      case 'approvals':
        await this.navApprovals.click();
        break;
      case 'users':
        await this.navUsers.click();
        break;
      case 'reports':
        await this.navReports.click();
        break;
    }
  }

  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL('/login', { timeout: 10000 });
  }

  async expectLoggedOut() {
    await expect(this.page).toHaveURL('/login');
    // Should not see any navigation elements after logout
    await expect(this.dashboardNav).not.toBeVisible();
    await expect(this.userInfo).not.toBeVisible();
  }

  async expectProtectedRoute() {
    // When accessing protected routes without authentication, should redirect to login
    await this.page.goto('/dashboard');
    await expect(this.page).toHaveURL('/login');
  }

  async navigateWithWaiting(url: string, expectedUrl: string) {
    await this.page.goto(url);
    await expect(this.page).toHaveURL(expectedUrl);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}