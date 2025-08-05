import { test, expect, mockResponses } from '../../fixtures/base';

test.describe('Dashboard UI with Mocked Data', { tag: '@ui' }, () => {
  test('should display timesheet table with mocked data', async ({ mockedPage }) => {
    await mockedPage.goto('/dashboard');
    
    // Should show the dashboard header
    await expect(mockedPage.locator('[data-testid="main-dashboard-title"]')).toContainText('Lecturer Dashboard');
    
    // Should display the timesheet table
    const table = mockedPage.locator('[data-testid="timesheets-table"]');
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

  test('should show approve/reject buttons for each timesheet', async ({ mockedPage }) => {
    await mockedPage.goto('/dashboard');
    
    const approveButtons = mockedPage.locator('button:has-text("Approve")');
    const rejectButtons = mockedPage.locator('button:has-text("Reject")');
    
    await expect(approveButtons).toHaveCount(1);
    await expect(rejectButtons).toHaveCount(1);
    
    // Buttons should be enabled
    await expect(approveButtons.first()).toBeEnabled();
    await expect(rejectButtons.first()).toBeEnabled();
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Set up authentication state
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, mockResponses.auth.success);

    // Mock empty response
    await page.route('**/api/timesheets/pending-approval*', route => {
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
    await page.route('**/api/timesheets/pending-approval*', route => {
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
    await page.route('**/api/timesheets/pending-approval*', async route => {
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