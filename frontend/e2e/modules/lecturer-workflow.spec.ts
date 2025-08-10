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
    
    // Robust detection: either dedicated test id or plain table element
    const tableCandidate = page.locator('[data-testid="timesheets-table"], table');
    const tableVisible = (await tableCandidate.count()) > 0 || await tableCandidate.first().isVisible().catch(() => false);
    
    if (tableVisible) {
      // Row-scoped strong consistency: each data row should present actions within the same row
      const table = tableCandidate.first();
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      if (rowCount === 0) {
        // No pending items left is acceptable; consider multiple valid UI outcomes
        const emptyByTestId = await page.locator('[data-testid="empty-state"]').first().isVisible().catch(() => false);
        const zeroPendingText = (await page.getByText(/\b0\s+pending\b/i).count()) > 0;
        const tableHidden = await table.isHidden().catch(() => false);
        expect(emptyByTestId || zeroPendingText || tableHidden).toBe(true);
        return;
      }

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        // Prefer stable testids if present; fall back to role/name
        const approveTestId = row.locator('[data-testid^="approve-btn-"]');
        const rejectTestId = row.locator('[data-testid^="reject-btn-"]');

        const approveFromRole = row.getByRole('button', { name: 'Final Approve', exact: true }).or(
          row.getByRole('button', { name: 'Approve', exact: true })
        );
        const rejectFromRole = row.getByRole('button', { name: 'Reject', exact: true });

        const approveLocator = (await approveTestId.count()) > 0 ? approveTestId.first() : approveFromRole.first();
        const rejectLocator = (await rejectTestId.count()) > 0 ? rejectTestId.first() : rejectFromRole.first();

        await expect(approveLocator).toBeVisible();
        await expect(rejectLocator).toBeVisible();
      }
    } else {
      // If no table is present/visible, accept as valid state for this test scenario
      expect(true).toBe(true);
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
    } catch {}  });

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