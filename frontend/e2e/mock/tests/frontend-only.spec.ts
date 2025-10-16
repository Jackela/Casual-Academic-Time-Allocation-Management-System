import { test as base, expect, mockResponses } from '../../fixtures/base';
import { setupMockAuth } from '../../shared/mock-backend/auth';
import { DashboardPage } from '../../shared/pages/DashboardPage';

const test = base;
const dashboardSummary = {
  totalTimesheets: 48,
  pendingApprovals: 3,
  pendingApproval: 3,
  thisWeekHours: 18,
  thisWeekPay: 864,
  statusBreakdown: {
    LECTURER_CONFIRMED: 12,
    TUTOR_CONFIRMED: 9,
    FINAL_CONFIRMED: 20,
  },
  recentActivity: [
    {
      id: 1,
      description: 'Tutor confirmed COMP3101 submission',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  upcomingDeadlines: [],
  systemMetrics: {
    uptime: '99.9%',
    averageApprovalTime: '6h',
    escalationsThisWeek: 0,
  },
};

test.describe('Frontend-Only Tests with Full API Mocking', { tag: '@frontend' }, () => {
  test.describe.configure({ mode: 'serial' });
  test('should handle login flow with mocked API', async ({ mockedPage }) => {
    const page = mockedPage;
    // Mock all API endpoints
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.auth.success)
      });
    });

    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.withData)
      });
    });
    await page.route('**/api/dashboard/summary*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardSummary),
      });
    });

    // Test login flow
    await page.goto('/login?disableAutoAuth=1');

    await page.fill('input[type="email"]', 'lecturer@example.com');
    await page.fill('input[type="password"]', 'password123');

    const timesheetResponse = page.waitForResponse(response =>
      response.url().includes('/api/timesheets/pending-final-approval')
        && response.request().method() === 'GET'
    );

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 15000 });
    await timesheetResponse;

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');
    await dashboard.expectResponsiveColumns();

    const state = await dashboard.timesheetPage.waitForFirstRender();
    expect(['table', 'empty'].includes(state)).toBeTruthy();
  });

  test('should handle dashboard with authentication state', async ({ mockedPage }) => {
    const page = mockedPage;
    await setupMockAuth(page, 'lecturer');

    // Mock timesheet response
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.withData)
      });
    });
    await page.route('**/api/dashboard/summary*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardSummary),
      });
    });

    const timesheetResponse = page.waitForResponse(response =>
      response.url().includes('/api/timesheets/pending-final-approval')
        && response.request().method() === 'GET'
    );

    await page.goto('/dashboard');
    await timesheetResponse;

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');
    await dashboard.expectResponsiveColumns();
    const state = await dashboard.timesheetPage.waitForFirstRender();
    expect(['table', 'empty'].includes(state)).toBeTruthy();
  });

  test('should handle dashboard with empty data', async ({ mockedPage }) => {
    const page = mockedPage;
    await setupMockAuth(page, 'lecturer');

    // Mock empty timesheet response
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.empty)
      });
    });
    await page.route('**/api/dashboard/summary*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...dashboardSummary,
          pendingApprovals: 0,
          pendingApproval: 0,
        }),
      });
    });

    await page.goto('/dashboard');

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');
    await dashboard.expectResponsiveColumns();
    const state = await dashboard.timesheetPage.waitForFirstRender();
    expect(['empty', 'table'].includes(state)).toBeTruthy();
  });

  test('should redirect unauthenticated users to login', async ({ mockedPage }) => {
    const page = mockedPage;
    // No authentication setup
    await page.goto('/dashboard?disableAutoAuth=1');

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('should handle API error states', async ({ mockedPage }) => {
    const page = mockedPage;
    await setupMockAuth(page, 'lecturer');

    // Mock error response (SSOT endpoint)
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    await page.route('**/api/dashboard/summary*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardSummary),
      });
    });

    const timesheetErrorResponse = page.waitForResponse(response =>
      response.url().includes('/api/timesheets/pending-final-approval')
        && response.status() === 500
    );

    await page.goto('/dashboard');
    await timesheetErrorResponse;

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');

    const errorBanner = page.getByRole('alert');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/Failed to fetch pending timesheets/i);
    await expect(errorBanner.getByRole('button', { name: /retry/i })).toBeVisible();
    await expect(dashboard.timesheetPage.timesheetsTable).toHaveCount(0);
  });
});
