import { test as base, expect, mockResponses } from '../../../fixtures/base';
import type { Page } from '@playwright/test';
import { DashboardPage } from '../../../shared/pages/DashboardPage';
import { setupMockAuth } from '../../../shared/mock-backend/auth';
import { statusLabel } from '../../../utils/status-labels';
import {
  TIMESHEET_TEST_IDS,
  getTimesheetActionSelector,
  getTimesheetRowSelector,
  getTimesheetStatusBadgeSelector,
} from '../../../../src/lib/config/table-config';

// Mock responses specifically for UI tests
const uiMockResponses = {
  timesheets: {
    withData: {
      success: true,
      timesheets: mockResponses.timesheets.withData.content.map((item) => ({
        ...item,
        status: 'PENDING_TUTOR_CONFIRMATION',
        createdAt: item.createdAt ?? '2025-03-01T09:00:00Z',
        updatedAt: item.updatedAt ?? '2025-03-03T10:30:00Z',
      })),
      pageInfo: {
        currentPage: 0,
        pageSize: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false
      }
    },
    empty: {
      success: true,
      timesheets: [],
      pageInfo: {
        currentPage: 0,
        pageSize: 20,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true
      }
    },
    error: {
      success: false,
      error: 'Server error',
      timesheets: [],
      pageInfo: null
    }
  }
};

const [defaultTimesheet] = uiMockResponses.timesheets.withData.timesheets;
if (!defaultTimesheet) {
  throw new Error('Expected uiMockResponses.timesheets.withData to include at least one entry.');
}

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
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  ],
  upcomingDeadlines: [],
  systemMetrics: {
    uptime: '99.9%',
    averageApprovalTime: '6h',
    escalationsThisWeek: 0,
  },
};

const registerDashboardSummary = async (page: Page, overrides: Partial<typeof dashboardSummary> = {}) => {
  const payload = { ...dashboardSummary, ...overrides };
  await page.route('**/api/dashboard/summary*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
};

// Clean UI test fixture that doesn't conflict with existing routes
type UITestFixtures = {
  uiPage: Page;
};

const test = base.extend<UITestFixtures>({
  uiPage: async ({ page }, apply) => {
    await setupMockAuth(page, 'lecturer');
    await apply(page);
  }
});

const getTimesheetRow = (page: Page, timesheetId: number) =>
  page.locator(getTimesheetRowSelector(timesheetId));

const getActionButton = (page: Page, action: 'submit' | 'confirm' | 'approve' | 'reject' | 'edit', timesheetId: number) =>
  page.locator(getTimesheetActionSelector(action, timesheetId));

const getActionsContainer = (page: Page, timesheetId: number) =>
  getTimesheetRow(page, timesheetId).locator(`[data-testid="${TIMESHEET_TEST_IDS.actionsContainer}"]`);

const getNoActionsPlaceholder = (page: Page, timesheetId: number) =>
  getTimesheetRow(page, timesheetId).getByTestId(TIMESHEET_TEST_IDS.noActionsPlaceholder);

test.describe('Dashboard UI with Mocked Data', { tag: '@ui' }, () => {
  test('should display timesheet table with mocked data', async ({ uiPage: page }) => {
    // Set up API mocking for this specific test
    await registerDashboardSummary(page);
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(uiMockResponses.timesheets.withData)
      });
    });

    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');
    await respPromise;

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');
    await dashboard.expectResponsiveColumns();

    const table = dashboard.timesheetPage.timesheetsTable.first();
    const rows = table.locator('tbody tr').filter({ hasText: defaultTimesheet?.tutorName ?? '' });
    await expect(rows).toHaveCount(1);
    const firstRow = rows.first();
    await expect(firstRow).toContainText('John Doe');
    await expect(firstRow).toContainText('Introduction to Programming');

    const statusBadge = page.locator(getTimesheetStatusBadgeSelector(defaultTimesheet.id));
    await expect(statusBadge).toContainText(statusLabel('PENDING_TUTOR_CONFIRMATION'));

    const approveButton = getActionButton(page, 'approve', defaultTimesheet.id);
    await expect(approveButton).toHaveCount(0);

    const noActions = getNoActionsPlaceholder(page, defaultTimesheet.id);
    await expect(noActions).toBeVisible();
    await expect(getActionsContainer(page, defaultTimesheet.id)).toHaveCount(0);
  });

  test('should disable approval buttons for non-actionable statuses', async ({ uiPage: page }) => {
    // Create response with non-actionable status
    const pendingReviewResponse = {
      success: true,
      timesheets: uiMockResponses.timesheets.withData.timesheets.map(item => ({
        ...item,
        status: 'PENDING_TUTOR_CONFIRMATION'
      })),
      pageInfo: uiMockResponses.timesheets.withData.pageInfo
    };

    await registerDashboardSummary(page);
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pendingReviewResponse)
      });
    });

    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');
    await respPromise;

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');

    const approveButton = getActionButton(page, 'approve', defaultTimesheet.id);
    await expect(approveButton).toHaveCount(0);

    const noActions = getNoActionsPlaceholder(page, defaultTimesheet.id);
    await expect(noActions).toBeVisible();
    await expect(getActionsContainer(page, defaultTimesheet.id)).toHaveCount(0);
  });

  test('should show approve/reject buttons when timesheet is tutor confirmed', async ({ uiPage: page }) => {
    // Create response with actionable status
    const tutorConfirmedResponse = {
      success: true,
      timesheets: uiMockResponses.timesheets.withData.timesheets.map(item => ({
        ...item,
        status: 'TUTOR_CONFIRMED'
      })),
      pageInfo: uiMockResponses.timesheets.withData.pageInfo
    };

    await registerDashboardSummary(page);
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tutorConfirmedResponse)
      });
    });

    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');
    await respPromise;

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');

    const approveButtons = tutorConfirmedResponse.timesheets.map((item) =>
      getActionButton(page, 'approve', item.id)
    );

    for (const approveButton of approveButtons) {
      await expect(approveButton).toBeVisible();
      await expect(approveButton).toBeEnabled();
    }

    const firstTimesheetId = tutorConfirmedResponse.timesheets[0]?.id;
    if (firstTimesheetId) {
      const approveButton = getActionButton(page, 'approve', firstTimesheetId);
      await expect(approveButton).toBeVisible();
      await expect(approveButton).toBeEnabled();

      const rejectButton = getActionButton(page, 'reject', firstTimesheetId);
      await expect(rejectButton).toBeVisible();
      await expect(rejectButton).toBeEnabled();

      const noActions = getNoActionsPlaceholder(page, firstTimesheetId);
      await expect(noActions).toHaveCount(0);
      await expect(getActionsContainer(page, firstTimesheetId)).toHaveCount(1);
    }
  });

  test('should handle empty state gracefully', async ({ uiPage: page }) => {
    await registerDashboardSummary(page, { pendingApprovals: 0, pendingApproval: 0 });
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(uiMockResponses.timesheets.empty)
      });
    });

    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');
    await respPromise;
    await page.waitForLoadState('networkidle');
    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();

    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state-title"]')).toContainText('No Pending Timesheets');
  });

  test('should handle API errors gracefully', async ({ uiPage: page }) => {
    await registerDashboardSummary(page);
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify(uiMockResponses.timesheets.error)
      });
    });

    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');
    await respPromise;
    await page.waitForLoadState('networkidle');

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    const errorAlerts = page.getByTestId('global-error-banner');
    const timesheetError = errorAlerts.filter({ hasText: /Failed to fetch pending timesheets/i }).first();
    await expect(timesheetError).toBeVisible();
    await expect(timesheetError.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should show loading state initially', async ({ uiPage: page }) => {
    await registerDashboardSummary(page);
    await page.route('**/api/timesheets/pending-final-approval*', async route => {
      // Add delay to test loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(uiMockResponses.timesheets.withData)
      });
    });

    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');

    const loadingStatus = page.getByRole('status');
    await expect(loadingStatus).toContainText(/Loading pending timesheets/i, { timeout: 2000 });

    await respPromise;
    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await expect(loadingStatus).not.toContainText(/Loading pending timesheets/i, { timeout: 2000 });
  });

  test('should expose last updated tooltip on narrower viewports', async ({ uiPage: page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await registerDashboardSummary(page);
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(uiMockResponses.timesheets.withData)
      });
    });

    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');
    await respPromise;

    const dashboard = new DashboardPage(page);
    await dashboard.waitForDashboardReady();
    await dashboard.expectToBeLoaded('LECTURER');
    await dashboard.expectResponsiveColumns();

    const statusBadge = page.getByTestId(`status-badge-${defaultTimesheet.id}`);
    await expect(statusBadge).toHaveAttribute('data-has-timestamp-tooltip', 'true');
    const tooltipValue = await statusBadge.getAttribute('data-tooltip-last-updated');
    expect(tooltipValue).toBeTruthy();
  });
});
