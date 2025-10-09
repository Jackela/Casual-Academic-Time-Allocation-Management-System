import { test as base, expect, mockResponses } from '../../../fixtures/base';
import type { Page } from '@playwright/test';
import { setupMockAuth } from '../../../shared/mock-backend/auth';

// Mock responses specifically for UI tests
const uiMockResponses = {
  timesheets: {
    withData: {
      success: true,
      timesheets: mockResponses.timesheets.withData.content,
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

test.describe('Dashboard UI with Mocked Data', { tag: '@ui' }, () => {
  test('should display timesheet table with mocked data', async ({ uiPage: page }) => {
    // Set up API mocking for this specific test
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

    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="main-dashboard-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-dashboard-title"]')).toContainText('Lecturer Dashboard');

    const table = page.locator('[data-testid="timesheets-table"]');
    await expect(table).toBeVisible();
    await expect(table.locator('th:has-text("Tutor")')).toBeVisible();
    await expect(table.locator('th:has-text("Course")')).toBeVisible();
    await expect(table.locator('th:has-text("Hours")')).toBeVisible();
    await expect(table.locator('th:has-text("Actions")')).toBeVisible();

    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('John Doe');
    await expect(rows.first()).toContainText('Introduction to Programming');
  });

  test('should hide approval buttons for non-actionable statuses', async ({ uiPage: page }) => {
    // Create response with non-actionable status
    const pendingReviewResponse = {
      success: true,
      timesheets: uiMockResponses.timesheets.withData.timesheets.map(item => ({
        ...item,
        status: 'PENDING_TUTOR_CONFIRMATION'
      })),
      pageInfo: uiMockResponses.timesheets.withData.pageInfo
    };

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

    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="main-dashboard-title"]')).toBeVisible();

    await expect(page.locator('button:has-text("Final Approve")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Reject")')).toHaveCount(0);
    const actionCell = page.locator('[data-testid="action-buttons"]');
    await expect(actionCell.first()).toContainText('—');
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

    await page.waitForLoadState('networkidle');
    const approveButtons = page.locator('button:has-text("Final Approve")');
    const rejectButtons = page.locator('button:has-text("Reject")');
    await expect(approveButtons).toHaveCount(tutorConfirmedResponse.timesheets.length);
    await expect(rejectButtons).toHaveCount(tutorConfirmedResponse.timesheets.length);
    await expect(approveButtons.first()).toBeEnabled();
    await expect(rejectButtons.first()).toBeEnabled();
  });

  test('should handle empty state gracefully', async ({ uiPage: page }) => {
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

    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state-title"]')).toContainText('No Pending Timesheets');
  });

  test('should handle API errors gracefully', async ({ uiPage: page }) => {
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

    const errorAlerts = page.getByTestId('global-error-banner');
    const timesheetError = errorAlerts.filter({ hasText: /Failed to fetch pending timesheets/i }).first();
    await expect(timesheetError).toBeVisible();
    await expect(timesheetError.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should show loading state initially', async ({ uiPage: page }) => {
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
    await expect(loadingStatus).not.toContainText(/Loading pending timesheets/i, { timeout: 2000 });
  });
});
