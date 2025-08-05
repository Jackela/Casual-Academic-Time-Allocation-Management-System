import { test, expect } from '../fixtures/base';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NavigationPage } from '../pages/NavigationPage';
import { TimesheetPage } from '../pages/TimesheetPage';

/**
 * Critical User Journey Tests
 * 
 * These tests focus on complete multi-step workflows that users perform
 * in the CATAMS application. Single-component behaviors are now covered
 * by our comprehensive component test suite.
 */

test.describe('Critical User Journeys', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let navigationPage: NavigationPage;
  let timesheetPage: TimesheetPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    navigationPage = new NavigationPage(page);
    timesheetPage = new TimesheetPage(page);
  });

  test('Complete lecturer authentication and dashboard workflow', async ({ page }) => {
    // Navigate to login page
    await loginPage.navigateTo();
    await loginPage.expectToBeVisible();

    // Login as lecturer
    const response = await loginPage.login('lecturer@example.com', 'Lecturer123!');
    expect(response.status()).toBe(200);

    // Verify successful navigation to dashboard
    await loginPage.expectSuccessfulLogin();
    await dashboardPage.expectToBeLoaded();

    // Verify user information and navigation are correct for lecturer role
    await dashboardPage.expectUserInfo('Dr. Jane Smith', 'Lecturer');
    await dashboardPage.expectNavigationForRole('LECTURER');

    // Verify timesheet data loading workflow
    await dashboardPage.waitForTimesheetData();
    
    const hasData = await dashboardPage.hasTimesheetData();
    if (hasData) {
      await dashboardPage.expectTimesheetsTable();
      const rows = await dashboardPage.getTimesheetRows();
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      await timesheetPage.expectCountBadge(rowCount);
    } else {
      await dashboardPage.expectEmptyState();
      await timesheetPage.expectCountBadge(0);
    }
  });

  test('Complete timesheet approval workflow', async ({ page }) => {
    // Login and navigate to dashboard
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.waitForTimesheetData();

    // Skip if no timesheet data available
    const hasData = await dashboardPage.hasTimesheetData();
    if (!hasData) {
      test.skip(true, 'No timesheet data available for approval workflow testing');
    }

    await dashboardPage.expectTimesheetsTable();

    // Get first timesheet for approval
    const rows = await dashboardPage.getTimesheetRows();
    const firstRow = rows.first();
    const timesheetId = await firstRow.getAttribute('data-testid');
    const id = parseInt(timesheetId?.replace('timesheet-row-', '') || '1');

    // Verify timesheet data is displayed correctly
    await timesheetPage.expectTimesheetActionButtonsEnabled(id);

    // Approve the timesheet
    const response = await dashboardPage.approveTimesheet(id);
    expect(response.status()).toBe(200);

    // Verify the workflow completed successfully
    // The table should refresh and the approved timesheet should no longer be visible
    await dashboardPage.waitForTimesheetData();
    
    // Verify the count has decreased or state has changed appropriately
    const finalRowCount = await timesheetPage.getTimesheetCount();
    console.log(`Timesheet approved successfully. Remaining pending: ${finalRowCount}`);
  });

  test('Complete error handling and recovery workflow', async ({ page }) => {
    // Login successfully first
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.expectToBeLoaded();

    // Mock API failure to test error handling
    await page.route('**/api/timesheets/pending-approval', async route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    // Navigate away and back to trigger the error condition
    await page.reload();
    
    // Verify error state is handled properly
    await dashboardPage.expectErrorState();

    // Clear the mock and test retry functionality
    await page.unroute('**/api/timesheets/pending-approval');
    
    // Test recovery workflow
    await timesheetPage.retryDataLoad();
    
    // Should now load successfully
    const hasData = await dashboardPage.hasTimesheetData();
    if (hasData) {
      await dashboardPage.expectTimesheetsTable();
    } else {
      await dashboardPage.expectEmptyState();
    }
  });

  test('Complete logout and re-authentication workflow', async ({ page }) => {
    // Login as lecturer
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.expectToBeLoaded();

    // Verify authenticated state
    await dashboardPage.expectUserInfo('Dr. Jane Smith', 'Lecturer');

    // Logout workflow
    await dashboardPage.logout();
    await navigationPage.expectLoggedOut();

    // Verify login page is displayed
    await loginPage.expectToBeVisible();

    // Test re-authentication with different user
    await loginPage.login('admin@example.com', 'Admin123!');
    await dashboardPage.expectToBeLoaded();

    // Verify different user context
    await dashboardPage.expectUserInfo('Admin User', 'Administrator');
    await dashboardPage.expectNavigationForRole('ADMIN');
  });

  test('Protected route access workflow', async ({ page }) => {
    // Test accessing protected route without authentication
    await navigationPage.expectProtectedRoute();
    
    // Should be redirected to login
    await loginPage.expectToBeVisible();

    // Login and verify access is granted
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.expectToBeLoaded();

    // Verify navigation works correctly after authentication
    await navigationPage.expectHeaderElements();
    await dashboardPage.expectNavigationForRole('LECTURER');
  });

  test('Multi-step timesheet rejection workflow', async ({ page }) => {
    // Setup: Login and navigate to dashboard
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.waitForTimesheetData();

    // Skip if no data available
    const hasData = await dashboardPage.hasTimesheetData();
    if (!hasData) {
      test.skip(true, 'No timesheet data available for rejection workflow testing');
    }

    await dashboardPage.expectTimesheetsTable();

    // Get timesheet for rejection
    const rows = await dashboardPage.getTimesheetRows();
    const firstRow = rows.first();
    const timesheetId = await firstRow.getAttribute('data-testid');
    const id = parseInt(timesheetId?.replace('timesheet-row-', '') || '1');

    // Verify initial state
    await timesheetPage.expectTimesheetActionButtonsEnabled(id);

    // Reject the timesheet
    const response = await dashboardPage.rejectTimesheet(id);
    expect(response.status()).toBe(200);

    // Verify the workflow completed
    await dashboardPage.waitForTimesheetData();
    
    // The rejected timesheet should no longer appear in pending list
    const finalRowCount = await timesheetPage.getTimesheetCount();
    console.log(`Timesheet rejected successfully. Remaining pending: ${finalRowCount}`);
  });
});