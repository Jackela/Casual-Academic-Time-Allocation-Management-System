import { test as base, expect, Page } from '@playwright/test';
import { testCredentials } from './base';
import { E2E_CONFIG } from '../config/e2e.config';

// Extended fixture type definitions
type WorkflowFixtures = {
  dashboardWorkflow: DashboardWorkflow;
  authWorkflow: AuthWorkflow;
  navigationWorkflow: NavigationWorkflow;
  timesheetWorkflow: TimesheetWorkflow;
};

// Dashboard workflow helper
export class DashboardWorkflow {
  constructor(private page: Page) {}

  async navigateAndWaitForData() {
    // Navigate to dashboard with explicit API waiting
    const timesheetResponse = this.page.waitForResponse(`**${E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS_PENDING}*`);
    await this.page.goto('/dashboard');
    await timesheetResponse;
    await this.page.waitForLoadState('networkidle');
    
    // Wait for UI to stabilize
    await this.page.waitForTimeout(300);
  }

  async waitForTableToLoad() {
    // Wait for table to be fully rendered with data
    await this.page.waitForFunction(() => {
      const table = document.querySelector('[data-testid="timesheets-table"]');
      return table && (
        table.querySelectorAll('tbody tr').length > 0 || 
        document.querySelector('[data-testid="empty-state"]')
      );
    }, { timeout: 10000 });
  }

  async expectDashboardLoaded() {
    // Verify dashboard is properly loaded
    const title = this.page.locator('.lecturer-dashboard h1, .dashboard-header h1')
      .filter({ hasText: 'Lecturer Dashboard' });
    await expect(title).toBeVisible();
    
    const welcomeMessage = this.page.getByTestId('user-greeting')
      .or(this.page.getByTestId('main-welcome-message'));
    await expect(welcomeMessage).toBeVisible();
  }

  async hasDataAvailable(): Promise<boolean> {
    try {
      await this.page.getByTestId('timesheets-table').waitFor({ timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

// Authentication workflow helper  
export class AuthWorkflow {
  constructor(private page: Page) {}

  async loginAsLecturer() {
    await this.loginWithCredentials(testCredentials.lecturer);
  }

  async loginAsTutor() {
    await this.loginWithCredentials(testCredentials.tutor);
  }

  async loginAsAdmin() {
    await this.loginWithCredentials(testCredentials.admin);
  }

  async loginWithCredentials(credentials: { email: string; password: string }) {
    // Navigate to login page
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    // Fill credentials
    await this.page.fill('input[type="email"]', credentials.email);
    await this.page.fill('input[type="password"]', credentials.password);

    // Submit with API response waiting
    const responsePromise = this.page.waitForResponse(`**${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`);
    await this.page.click('button[type="submit"]');
    await responsePromise;

    // Wait for redirect
    await this.page.waitForURL('/dashboard', { timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.PAGE_LOAD });
    await this.page.waitForLoadState('networkidle');
  }

  async logout() {
    // Wait for logout button to be available
    const logoutButton = this.page.getByTestId('logout-button');
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });

    // Perform logout with navigation waiting
    const logoutPromise = this.page.waitForURL('/login', { timeout: 10000 });
    await logoutButton.click();
    await logoutPromise;
    
    // Wait for page to stabilize
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoggedOut() {
    // Verify we're at login page
    await expect(this.page).toHaveURL('/login');
    
    // Verify login form is visible
    await expect(this.page.locator('input[type="email"]')).toBeVisible();
    await expect(this.page.locator('input[type="password"]')).toBeVisible();
    
    // Verify auth data is cleared
    const token = await this.page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  }
}

// Navigation workflow helper
export class NavigationWorkflow {
  constructor(private page: Page) {}

  async navigateWithWaiting(url: string, expectedUrl?: string) {
    // Navigate with explicit waiting
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    if (expectedUrl) {
      await this.page.waitForURL(expectedUrl, { timeout: 10000 });
    }
  }

  async expectProtectedRoute() {
    // Try to access protected route without auth
    await this.page.goto('/dashboard');
    
    // Should redirect to login
    await this.page.waitForURL('/login', { timeout: 10000 });
    await expect(this.page).toHaveURL('/login');
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(300); // UI stabilization
  }
}

// Timesheet workflow helper
export class TimesheetWorkflow {
  constructor(private page: Page) {}

  async approveTimesheetById(id: number) {
    // Wait for approve button and click with API waiting
    const approveButton = this.page.getByTestId(`approve-btn-${id}`);
    await approveButton.waitFor({ state: 'visible', timeout: 5000 });

    const [approvalResponse] = await Promise.all([
      this.page.waitForResponse(`**${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`),
      this.page.waitForResponse(`**${E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS_PENDING}*`), // Refresh call
      approveButton.click()
    ]);

    // Wait for UI to update
    await this.page.waitForLoadState('networkidle');
    
    return approvalResponse;
  }

  async rejectTimesheetById(id: number) {
    // Wait for reject button and click with API waiting
    const rejectButton = this.page.getByTestId(`reject-btn-${id}`);
    await rejectButton.waitFor({ state: 'visible', timeout: 5000 });

    const [rejectionResponse] = await Promise.all([
      this.page.waitForResponse(`**${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`),
      this.page.waitForResponse(`**${E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS_PENDING}*`), // Refresh call
      rejectButton.click()
    ]);

    // Wait for UI to update
    await this.page.waitForLoadState('networkidle');
    
    return rejectionResponse;
  }

  async expectTimesheetInState(id: number, state: 'approved' | 'rejected' | 'pending') {
    const timesheetRow = this.page.getByTestId(`timesheet-row-${id}`);
    
    switch (state) {
      case 'approved':
        await expect(timesheetRow.locator('.status-approved')).toBeVisible();
        break;
      case 'rejected':
        await expect(timesheetRow.locator('.status-rejected')).toBeVisible();
        break;
      case 'pending':
        await expect(timesheetRow.locator('.status-pending, .status-draft')).toBeVisible();
        break;
    }
  }

  async waitForTimesheetTableUpdate() {
    // Wait for table to update after API operations
    await this.page.waitForFunction(() => {
      const table = document.querySelector('[data-testid="timesheets-table"]');
      return !table?.classList.contains('loading');
    }, { timeout: 5000 });
  }
}

// Export the test fixture with workflow helpers
export const test = base.extend<WorkflowFixtures>({
  dashboardWorkflow: async ({ page }, use) => {
    await use(new DashboardWorkflow(page));
  },

  authWorkflow: async ({ page }, use) => {
    await use(new AuthWorkflow(page));
  },

  navigationWorkflow: async ({ page }, use) => {
    await use(new NavigationWorkflow(page));
  },

  timesheetWorkflow: async ({ page }, use) => {
    await use(new TimesheetWorkflow(page));
  },
});

export { expect } from '@playwright/test';