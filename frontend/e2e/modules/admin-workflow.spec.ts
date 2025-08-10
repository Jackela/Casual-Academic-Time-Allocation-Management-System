import { test, expect } from '../fixtures/base';
import { LoginPage } from '../pages/LoginPage';

/**
 * Admin Dashboard Workflow Tests
 * 
 * Comprehensive E2E test suite for the AdminDashboard functionality including:
 * - Viewing system-wide summary stats
 * - Viewing table with all timesheets from all users
 * - Filtering timesheet table by tutor, course, and status
 * - Using admin override "Approve" and "Reject" actions
 */

test.describe('Admin Dashboard Workflow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateTo();
  });

  test('Admin can login and view dashboard', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should redirect to dashboard page
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Should show admin dashboard title
    await expect(page.getByTestId('dashboard-title')).toContainText('Admin Dashboard');
    
    // Should show welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('Admin dashboard displays system-wide summary stats', async ({ mockedPage }) => {
    // Setup admin authentication for mocked page
    loginPage = new LoginPage(mockedPage);
    await loginPage.navigateTo();
    
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await mockedPage.waitForURL('**/dashboard');
    
    // Wait for loading to complete and data to be available
    await expect(mockedPage.getByTestId('loading-state')).not.toBeVisible({ timeout: 10000 });
    
    // Should show system overview section
    await expect(mockedPage.locator('text=System Overview')).toBeVisible({ timeout: 10000 });
    
    // Should show summary cards
    await expect(mockedPage.locator('[data-testid="total-timesheets-card"]')).toBeVisible();
    await expect(mockedPage.locator('[data-testid="pending-approvals-card"]')).toBeVisible();
    await expect(mockedPage.locator('[data-testid="total-hours-card"]')).toBeVisible();
    await expect(mockedPage.locator('[data-testid="total-pay-card"]')).toBeVisible();
    await expect(mockedPage.locator('[data-testid="tutors-card"]')).toBeVisible();
    
    // Cards should show numeric values
    await expect(mockedPage.locator('[data-testid="total-timesheets-card"] h3')).not.toBeEmpty();
    await expect(mockedPage.locator('[data-testid="pending-approvals-card"] h3')).not.toBeEmpty();
  });

  test('Admin dashboard shows comprehensive timesheet table from all users', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should show All System Timesheets section
    await expect(page.locator('text=All System Timesheets')).toBeVisible();
    
    // Should show either empty state or timesheet table (race for whichever appears first)
    const emptyState = page.locator('[data-testid="empty-state"]');
    const timesheetTable = page.locator('[data-testid="timesheets-table"]');

    const branch = await Promise.race([
      timesheetTable.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'table').catch(() => undefined),
      emptyState.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'empty').catch(() => undefined),
    ]);

    expect(['table', 'empty']).toContain(branch);

    if (branch === 'table') {      // If table is visible, should have admin-specific columns
      await expect(timesheetTable.locator('th:has-text("ID")')).toBeVisible();
      await expect(timesheetTable.locator('th:has-text("Tutor")')).toBeVisible();
      await expect(timesheetTable.locator('th:has-text("Course")')).toBeVisible();
      await expect(timesheetTable.locator('th:has-text("Status")')).toBeVisible();
      await expect(timesheetTable.locator('th:has-text("Actions")')).toBeVisible();
    }
  });

  test('Admin can filter timesheet table by tutor name', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should show filters section
    await expect(page.locator('[data-testid="filters-section"]')).toBeVisible();
    
    // Should have tutor filter input
    const tutorFilter = page.locator('[data-testid="tutor-filter"]');
    await expect(tutorFilter).toBeVisible();
    
    // Try filtering by tutor name
    await tutorFilter.fill('John');
    
    // Should show filtered badge if results change
    await page.waitForTimeout(1000); // Allow time for filtering
    
    // Filter input should retain the value
    await expect(tutorFilter).toHaveValue('John');
  });

  test('Admin can filter timesheet table by course ID', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should have course filter input
    const courseFilter = page.locator('[data-testid="course-filter"]');
    await expect(courseFilter).toBeVisible();
    
    // Try filtering by course ID
    await courseFilter.fill('1');
    
    // Should show filtered results
    await page.waitForTimeout(1000); // Allow time for filtering
    
    // Filter input should retain the value
    await expect(courseFilter).toHaveValue('1');
  });

  test('Admin can filter timesheet table by status', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should have status filter dropdown
    const statusFilter = page.locator('[data-testid="status-filter"]');
    await expect(statusFilter).toBeVisible();

    // Content-probe: check the available option texts rather than visibility
    const optionTexts = await statusFilter.locator('option').allTextContents();
    expect(optionTexts.map(t => t.trim())).toEqual(
      expect.arrayContaining(['All Statuses', 'Draft', 'Pending', 'Approved', 'Rejected'])
    );
    // Try filtering by status (UI shows alias values, backend expects SSOT)
    await statusFilter.selectOption('PENDING');
    await expect(statusFilter).toHaveValue('PENDING');
  });

  test('Admin can clear all filters', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Apply some filters first
    await page.locator('[data-testid="tutor-filter"]').fill('John');
    await page.locator('[data-testid="course-filter"]').fill('1');
    await page.locator('[data-testid="status-filter"]').selectOption('PENDING');
    
    // Should have clear filters button
    const clearFiltersBtn = page.locator('[data-testid="clear-filters-btn"]');
    await expect(clearFiltersBtn).toBeVisible();
    
    // Click clear filters
    await clearFiltersBtn.click();
    
    // All filters should be cleared
    await expect(page.locator('[data-testid="tutor-filter"]')).toHaveValue('');
    await expect(page.locator('[data-testid="course-filter"]')).toHaveValue('');
    await expect(page.locator('[data-testid="status-filter"]')).toHaveValue('');
  });

  test('Admin can use override approve action on pending timesheets', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Check if timesheets table or empty state appears
    const timesheetTable = page.locator('[data-testid="timesheets-table"]');
    const emptyState = page.locator('[data-testid="empty-state"]');
    const branch = await Promise.race([
      timesheetTable.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'table').catch(() => undefined),
      emptyState.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'empty').catch(() => undefined),
    ]);

    if (branch === 'table') {      // Look for admin approve buttons (with crown icon)
      const adminApproveButtons = page.locator('[data-testid*="admin-approve-btn"]');
      const approveButtonCount = await adminApproveButtons.count();
      
      if (approveButtonCount > 0) {
        // Should have admin override styling/icon
        const firstApproveBtn = adminApproveButtons.first();
        await expect(firstApproveBtn).toBeVisible();
        await expect(firstApproveBtn).toBeEnabled();
        
        // Button should have admin override indicator
        await expect(firstApproveBtn).toHaveClass(/admin-override/);
        
        // Click approve button (but don't actually complete the action to avoid side effects)
        // Just verify the button is clickable
        await expect(firstApproveBtn).toBeEnabled();
      } else {
        // If no pending timesheets, that's also a valid state
        console.log('No pending timesheets found for admin override testing');
      }
    } else {
      // If no timesheets, should show empty state
      await expect(emptyState).toBeVisible();    }
  });

  test('Admin can use override reject action on pending timesheets', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Check if timesheets table or empty state appears
    const timesheetTable = page.locator('[data-testid="timesheets-table"]');
    const emptyState = page.locator('[data-testid="empty-state"]');
    const branch = await Promise.race([
      timesheetTable.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'table').catch(() => undefined),
      emptyState.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'empty').catch(() => undefined),
    ]);

    if (branch === 'table') {      // Look for admin reject buttons (with crown icon)  
      const adminRejectButtons = page.locator('[data-testid*="admin-reject-btn"]');
      const rejectButtonCount = await adminRejectButtons.count();
      
      if (rejectButtonCount > 0) {
        // Should have admin override styling/icon
        const firstRejectBtn = adminRejectButtons.first();
        await expect(firstRejectBtn).toBeVisible();
        await expect(firstRejectBtn).toBeEnabled();
        
        // Button should have admin override indicator
        await expect(firstRejectBtn).toHaveClass(/admin-override/);
        
        // Verify the button is clickable (but don't actually click to avoid side effects)
        await expect(firstRejectBtn).toBeEnabled();
      } else {
        // If no pending timesheets, that's also a valid state
        console.log('No pending timesheets found for admin override testing');
      }
    } else {
      // If no timesheets, should show empty state
      await expect(emptyState).toBeVisible();    }
  });

  test('Admin dashboard shows pagination when many timesheets exist', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Check if pagination exists (it may not if there are few timesheets)
    const pagination = page.locator('[data-testid="pagination"]');
    const paginationVisible = await pagination.isVisible().catch(() => false);
    
    if (paginationVisible) {
      // Should have pagination controls
      await expect(page.locator('[data-testid="prev-page-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-page-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="pagination-info"]')).toBeVisible();
      
      // Pagination info should show current page
      await expect(page.locator('[data-testid="pagination-info"]')).toContainText('Page');
    } else {
      // If no pagination, should still show total count
      await expect(page.locator('[data-testid="total-count-badge"]')).toBeVisible();
    }
  });

  test('Admin dashboard handles refresh functionality', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should have refresh button
    const refreshBtn = page.locator('button:has-text("Refresh Data")');
    const refreshVisible = await refreshBtn.isVisible().catch(() => false);
    
    if (refreshVisible) {
      // Click refresh button
      await refreshBtn.click();
      
      // Should trigger a reload - verify by checking for loading or content
      await page.waitForTimeout(1000); // Give time for reload
      
      // Page should still show admin dashboard content
      await expect(page.getByTestId('dashboard-title')).toContainText('Admin Dashboard');
    } else {
      // If no explicit refresh button, check for retry button on error
      const retryButton = page.locator('[data-testid="retry-button"]');
      const retryVisible = await retryButton.isVisible().catch(() => false);
      
      if (retryVisible) {
        await retryButton.click();
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('dashboard-title')).toContainText('Admin Dashboard');
      }
    }
  });

  test('Admin dashboard displays total count of timesheets', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should show total count badge
    const totalCountBadge = page.locator('[data-testid="total-count-badge"]');
    await expect(totalCountBadge).toBeVisible();
    
    // Should contain the word "total"
    await expect(totalCountBadge).toContainText('total');
    
    // Should show a number
    const countText = await totalCountBadge.textContent();
    expect(countText).toMatch(/\d+/); // Should contain at least one digit
  });

  test('Admin dashboard shows appropriate actions for different timesheet statuses', async ({ page }) => {
    // Login as admin
    await loginPage.fillCredentials('admin@example.com', 'Admin123!');
    await loginPage.submitForm();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Check if timesheets table or empty state appears
    const timesheetTable = page.locator('[data-testid="timesheets-table"]');
    const emptyState = page.locator('[data-testid="empty-state"]');
    const branch = await Promise.race([
      timesheetTable.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'table').catch(() => undefined),
      emptyState.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'empty').catch(() => undefined),
    ]);

    if (branch === 'table') {      // Check for status badges
      const statusBadges = page.locator('[data-testid*="status-badge"]');
      const statusCount = await statusBadges.count();
      
      if (statusCount > 0) {
        // For each timesheet row, verify appropriate actions are shown
        const timesheetRows = page.locator('[data-testid*="timesheet-row"]');
        const rowCount = await timesheetRows.count();
        
        // At least verify that action cells exist
        for (let i = 0; i < Math.min(rowCount, 3); i++) { // Check first 3 rows
          const row = timesheetRows.nth(i);
          const actionsCell = row.locator('td').last(); // Actions should be in last column
          await expect(actionsCell).toBeVisible();
        }
      }
    } else {
      // If no timesheets, should show empty state
      await expect(emptyState).toBeVisible();    }
  });
});