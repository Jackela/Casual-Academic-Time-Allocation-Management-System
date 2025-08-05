import { test, expect, mockResponses } from '../fixtures/base';

test.describe('Frontend-Only Tests with Full API Mocking', { tag: '@frontend' }, () => {
  test('should handle login flow with mocked API', async ({ page }) => {
    // Mock all API endpoints
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.auth.success)
      });
    });

    await page.route('**/api/timesheets/pending-approval*', route => {
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
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Dashboard should display mocked data
    await expect(page.locator('h1, h2').filter({ hasText: 'Dashboard' }).first()).toBeVisible();
    
    // Check if table exists (might be empty or with data)
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('[data-testid="empty-state"], text="No pending", text="No data"').first().isVisible().catch(() => false);
    
    // Should have either table or empty state
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('should handle dashboard with authentication state', async ({ page }) => {
    // Set up authentication state directly
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

    // Mock timesheet response
    await page.route('**/api/timesheets/pending-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.withData)
      });
    });

    await page.goto('/dashboard');
    
    // Should show dashboard content
    await expect(page.locator('h1, h2').filter({ hasText: 'Dashboard' }).first()).toBeVisible();
    
    // Should show either table or empty state
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('[data-testid="empty-state"], text="No pending", text="No data"').first().isVisible().catch(() => false);
    
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('should handle dashboard with empty data', async ({ page }) => {
    // Set up authentication state
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

    // Mock empty timesheet response
    await page.route('**/api/timesheets/pending-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.empty)
      });
    });

    await page.goto('/dashboard');
    
    // Should show dashboard
    await expect(page.locator('h1, h2').filter({ hasText: 'Dashboard' }).first()).toBeVisible();
    
    // Should show empty state (flexible selector)
    const emptyStateVisible = await page.locator('text="No pending", text="No data", text="Empty", [data-testid="empty-state"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(emptyStateVisible).toBe(true);
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

    // Mock error response
    await page.route('**/api/timesheets/pending-approval*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('/dashboard');
    
    // Should show dashboard
    await expect(page.locator('h1, h2').filter({ hasText: 'Dashboard' }).first()).toBeVisible();
    
    // Should show error state (flexible selector)
    const errorVisible = await page.locator('text="Error", text="Failed", text="Something went wrong", [data-testid="error-message"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(errorVisible).toBe(true);
  });
});