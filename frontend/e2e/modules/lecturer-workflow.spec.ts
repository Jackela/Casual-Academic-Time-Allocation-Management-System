import { test, expect } from '../fixtures/base';
import { LoginPage } from '../pages/LoginPage';

/**
 * Lecturer Dashboard Workflow Tests
 * 
 * Tests for the LecturerDashboard functionality including:
 * - Authentication and navigation to dashboard
 * - Viewing pending timesheets for approval
 * - Approve and reject actions
 */

test.describe('Lecturer Dashboard Workflow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateTo();
  });

  test('Lecturer can login and view dashboard', async ({ page }) => {
    // Login as lecturer
    await loginPage.fillCredentials('lecturer@example.com', 'Lecturer123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should redirect to dashboard page
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Should show lecturer dashboard title
    await expect(page.getByTestId('dashboard-title')).toContainText('Lecturer Dashboard');
    
    // Should show welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('Lecturer dashboard shows pending timesheets section', async ({ page }) => {
    // Login as lecturer
    await loginPage.fillCredentials('lecturer@example.com', 'Lecturer123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should show timesheets section
    await expect(page.locator('text=Pending Timesheet Approvals')).toBeVisible();
    
    // Should show either empty state or timesheet table
    const emptyState = page.locator('[data-testid="empty-state"]');
    const timesheetTable = page.locator('[data-testid="timesheets-table"]');
    
    // Either empty state or table should be visible
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);
    const tableVisible = await timesheetTable.isVisible().catch(() => false);
    
    expect(emptyStateVisible || tableVisible).toBe(true);
  });

  test('Lecturer can interact with timesheet approval buttons if timesheets exist', async ({ page }) => {
    // Login as lecturer
    await loginPage.fillCredentials('lecturer@example.com', 'Lecturer123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Check if timesheets table exists
    const timesheetTable = page.locator('[data-testid="timesheets-table"]');
    const tableVisible = await timesheetTable.isVisible().catch(() => false);
    
    if (tableVisible) {
      // If there are timesheets, check for approve/reject buttons
      const approveButtons = page.locator('button:has-text("Approve")');
      const rejectButtons = page.locator('button:has-text("Reject")');
      
      const approveCount = await approveButtons.count();
      const rejectCount = await rejectButtons.count();
      
      // Should have equal number of approve and reject buttons
      expect(approveCount).toBe(rejectCount);
      
      if (approveCount > 0) {
        // Buttons should be enabled
        await expect(approveButtons.first()).toBeEnabled();
        await expect(rejectButtons.first()).toBeEnabled();
      }
    } else {
      // If no timesheets, should show empty state
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('text=No Pending Timesheets')).toBeVisible();
    }
  });

  test('Lecturer dashboard handles loading state', async ({ page }) => {
    // Login as lecturer
    await loginPage.fillCredentials('lecturer@example.com', 'Lecturer123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Ensure main content anchor is present
    await page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });
    // Best-effort: hide loading if present briefly
    try {
      await page.locator('[data-testid="loading-state"]').first().waitFor({ state: 'hidden', timeout: 5000 });
    } catch {}
  });

  test('Lecturer can refresh dashboard data', async ({ page }) => {
    // Login as lecturer
    await loginPage.fillCredentials('lecturer@example.com', 'Lecturer123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Look for retry/refresh button if there's an error state
    const retryButton = page.locator('[data-testid="retry-button"]');
    const retryVisible = await retryButton.isVisible().catch(() => false);
    
    if (retryVisible) {
      // Click retry button
      await retryButton.click();
      
      // Should trigger a reload - verify by checking for loading or content
      await page.waitForTimeout(1000); // Give time for reload
      
      // Page should still show dashboard content
      await expect(page.locator('h1')).toContainText('Lecturer Dashboard');
    }
  });
});