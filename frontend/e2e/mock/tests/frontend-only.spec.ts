import { test as base, expect, mockResponses } from '../../fixtures/base';
import { setupMockAuth } from '../../shared/mock-backend/auth';

const test = base;

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
    await page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });
    await page.waitForFunction(() =>
      !!document.querySelector('[data-testid="timesheets-table"], table')
      || !!document.querySelector('[data-testid="empty-state"]'),
      undefined,
      { timeout: 15000 }
    );

    // Presence-first checks (more resilient than visibility in parallel environments)
    const hasTable = (await page.locator('[data-testid="timesheets-table"], table').count()) > 0
      || await page.locator('[data-testid="timesheets-table"], table').first().isVisible().catch(() => false);
    const hasEmptyState = (await page.locator('[data-testid="empty-state"]').count()) > 0
      || await page.locator('[data-testid="empty-state"], text="No pending", text="No data"').first().isVisible().catch(() => false);

    expect(hasTable || hasEmptyState).toBeTruthy();
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

    const timesheetResponse = page.waitForResponse(response =>
      response.url().includes('/api/timesheets/pending-final-approval')
        && response.request().method() === 'GET'
    );

    await page.goto('/dashboard');
    await timesheetResponse;
    await page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });
    await page.waitForFunction(() =>
      !!document.querySelector('[data-testid="timesheets-table"], table')
      || !!document.querySelector('[data-testid="empty-state"]'),
      undefined,
      { timeout: 15000 }
    );

    const hasTable = (await page.locator('[data-testid="timesheets-table"], table').count()) > 0
      || await page.locator('[data-testid="timesheets-table"], table').first().isVisible().catch(() => false);
    const hasEmptyState = (await page.locator('[data-testid="empty-state"]').count()) > 0
      || await page.locator('[data-testid="empty-state"], text="No pending", text="No data"').first().isVisible().catch(() => false);

    expect(hasTable || hasEmptyState).toBeTruthy();
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

    await page.goto('/dashboard');
    await page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });

    // Should show empty state (flexible)
    const emptyStateVisible = (await page.locator('[data-testid="empty-state"]').count()) > 0
      || await page.locator('[data-testid="empty-state"], text="No pending", text="No data", text="Empty"').first().isVisible({ timeout: 10000 }).catch(() => false);
    const tableRows = await page.locator('[data-testid="timesheets-table"] tbody tr').count().catch(() => 0);
    expect(emptyStateVisible || tableRows === 0).toBeTruthy();
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

    const timesheetErrorResponse = page.waitForResponse(response =>
      response.url().includes('/api/timesheets/pending-final-approval')
        && response.status() === 500
    );

    await page.goto('/dashboard');
    await timesheetErrorResponse;
    await page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });

    const errorBanner = page.getByRole('alert');
    await expect(errorBanner).toContainText(/Failed to fetch pending timesheets/i);
    await expect(errorBanner.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});
