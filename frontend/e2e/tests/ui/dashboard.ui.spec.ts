import { test, expect, mockResponses } from '../../fixtures/base';

test.describe('Dashboard UI with Mocked Data', { tag: '@ui' }, () => {
  test('should display timesheet table with mocked data', async ({ authenticatedPage: page }) => {
    // Ensure auth state is preset (LECTURER)
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);
    // 1) Define the Mock BEFORE navigation
    await page.route('**/api/timesheets/pending-final-approval**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.withData)
      });
    });

    // 2) Navigate to dashboard
    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');

    // 3) Wait for mocked API confirmation
    await respPromise;

    // 4) Wait for UI readiness
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="main-dashboard-header"]')).toBeVisible();

    // 5) Assert UI
    await expect(page.locator('[data-testid="main-dashboard-title"]')).toContainText('Lecturer Dashboard');
    
    // Should display the timesheet table
    const table = page.locator('[data-testid="timesheets-table"]');
    await expect(table).toBeVisible();
    
    // Should have table headers
    await expect(table.locator('th:has-text("Tutor")')).toBeVisible();
    await expect(table.locator('th:has-text("Course")')).toBeVisible();
    await expect(table.locator('th:has-text("Hours")')).toBeVisible();
    await expect(table.locator('th:has-text("Actions")')).toBeVisible();
    
    // Should display mocked timesheet data
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(1); // Based on mock data (simplified to 1 item)
    
    // First row should contain John Doe
    await expect(rows.first()).toContainText('John Doe');
    await expect(rows.first()).toContainText('Introduction to Programming');
  });

  test('should show approve/reject buttons for each timesheet', async ({ authenticatedPage: page }) => {
    // Ensure auth state is preset (LECTURER)
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);
    // 1) Define the Mock BEFORE navigation
    await page.route('**/api/timesheets/pending-final-approval**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.withData)
      });
    });

    // 2) Navigate to dashboard
    const respPromise = page.waitForResponse(resp => resp.url().includes('/api/timesheets/pending-final-approval'));
    await page.goto('/dashboard');

    // 3) Wait for mocked API confirmation
    await respPromise;

    // 4) Wait for UI readiness
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="main-dashboard-header"]')).toBeVisible();

    const approveButtons = page.locator('button:has-text("Final Approve")');
    await expect(approveButtons).toHaveCount(1);
    await expect(approveButtons.first()).toBeEnabled();
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Set up authentication state
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

    // Mock empty response
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.empty)
      });
    });

    await page.goto('/dashboard');
    
    // Should show empty state message
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state-title"]')).toContainText('No Pending Timesheets');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Set up authentication state
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

    // Mock error response
    await page.route('**/api/timesheets/pending-final-approval*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('/dashboard');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Set up authentication state
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

    // Mock delayed response
    await page.route('**/api/timesheets/pending-final-approval*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.withData)
      });
    });

    await page.goto('/dashboard');
    
    // Should show loading state initially
    await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-text"]')).toContainText('Loading pending timesheets...');
  });
});