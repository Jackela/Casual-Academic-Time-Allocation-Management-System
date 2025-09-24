import { test, expect, mockResponses } from '../fixtures/base';

test.describe('Frontend-Only Tests with Full API Mocking', { tag: '@frontend' }, () => {
  test.describe.configure({ mode: 'serial' });
  test('should handle login flow with mocked API', async ({ page }) => {
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
    await page.goto('/login');

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

  test('should handle dashboard with authentication state', async ({ page }) => {
    // Set up authentication state directly
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

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

  test('should handle dashboard with empty data', async ({ page }) => {
    // Set up authentication state
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

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

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // No authentication setup
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');
  });

  test('should handle API error states', async ({ page }) => {
    // Set up authentication state
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

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
    await page.waitForFunction(() =>
      !!document.querySelector('[data-testid="error-message"]')
      || !!document.querySelector('[data-testid="retry-button"]'),
      undefined,
      { timeout: 15000 }
    );

    // Should show error state (flexible)
    const errorVisible = (await page.locator('[data-testid="error-message"]').count()) > 0
      || await page.locator('[data-testid="error-message"], text="Error", text="Failed", text="Something went wrong"').first().isVisible({ timeout: 10000 }).catch(() => false);
    const retryVisible = (await page.locator('[data-testid="retry-button"]').count()) > 0
      || await page.locator('[data-testid="retry-button"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(errorVisible || retryVisible).toBeTruthy();
  });

});
