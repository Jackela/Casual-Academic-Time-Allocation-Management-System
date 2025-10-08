import { test, expect } from '../fixtures/workflows';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NavigationPage } from '../pages/NavigationPage';
import { TimesheetPage } from '../pages/TimesheetPage';

/**
 * Example test showing how to use the new Page Object Model
 * These tests demonstrate the improved maintainability and readability
 */
test.describe('Page Object Model Examples', () => {
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
  
  test('Complete authentication workflow with Page Objects', async () => {
    // Navigate to login page
    await loginPage.navigateTo();
    await loginPage.expectToBeVisible();
    
    // Login using Page Object
    const response = await loginPage.login('lecturer@example.com', 'Lecturer123!');
    expect(response.status()).toBe(200);
    
    // Navigate and verify using Page Objects
    await loginPage.expectSuccessfulLogin();
    await dashboardPage.expectToBeLoaded();
    
    // Logout using Page Object
    await dashboardPage.logout();
    await navigationPage.expectLoggedOut();
  });

  test('Dashboard data loading workflow with Page Objects', async () => {
    // Login using Page Object
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    
    // Navigate to dashboard and wait for data using Page Objects
    await dashboardPage.expectToBeLoaded();
    await dashboardPage.waitForTimesheetData();
    
    // Check if data is available using Page Objects
    const hasData = await dashboardPage.hasTimesheetData();
    
    if (hasData) {
      // Verify table elements using Page Objects
      await dashboardPage.expectTimesheetsTable();
      
      const rows = await dashboardPage.getTimesheetRows();
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      await timesheetPage.expectCountBadge(rowCount);
    } else {
      // Verify empty state using Page Objects
      await dashboardPage.expectEmptyState();
      await timesheetPage.expectCountBadge(0);
    }
  });

  test('Timesheet approval workflow with Page Objects', async () => {
    // Login and navigate using Page Objects
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.waitForTimesheetData();
    
    // Check if we have data to work with using Page Objects
    const hasData = await dashboardPage.hasTimesheetData();
    
    if (!hasData) {
      test.skip(true, 'No timesheet data available for approval testing');
    }
    
    await dashboardPage.expectTimesheetsTable();
    
    // Get first timesheet ID using Page Objects
    const rows = await dashboardPage.getTimesheetRows();
    const firstRow = rows.first();
    const timesheetId = await firstRow.getAttribute('data-testid');
    const id = parseInt(timesheetId?.replace('timesheet-row-', '') || '1');
    
    // Verify buttons are enabled before action
    await timesheetPage.expectTimesheetActionButtonsEnabled(id);
    
    // Approve timesheet using Page Object
    const response = await dashboardPage.approveTimesheet(id);
    expect(response.status()).toBe(200);
    
    // Wait for table to update
    await dashboardPage.waitForTimesheetData();
    
    console.log('Timesheet approved successfully using Page Object Model');
  });

  test('Navigation workflow with Page Objects', async () => {
    // Test protected route access without authentication using Page Objects
    await navigationPage.expectProtectedRoute();
    
    // Verify we're redirected to login using Page Objects
    await loginPage.expectToBeVisible();
    
    // Navigate to a specific URL with waiting using Page Objects
    await navigationPage.navigateWithWaiting('/login', '/login');
    await navigationPage.waitForPageLoad();
    
    // Verify login form is present using Page Objects
    await loginPage.expectToBeVisible();
  });

  test('Multi-role authentication workflow with Page Objects', async () => {
    // Test lecturer role
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.expectUserInfo('Dr. Jane Smith', 'Lecturer');
    await dashboardPage.expectNavigationForRole('LECTURER');
    await dashboardPage.logout();
    
    // Test tutor role (if available)
    await loginPage.login('tutor@example.com', 'Tutor123!');
    await dashboardPage.expectUserInfo('John Doe', 'Tutor');
    await dashboardPage.logout();
    
    // Test admin role
    await loginPage.login('admin@example.com', 'Admin123!');
    await dashboardPage.expectUserInfo('Admin User', 'Administrator');
    await dashboardPage.expectNavigationForRole('ADMIN');
    await dashboardPage.logout();
    
    // Verify final logged out state using Page Objects
    await navigationPage.expectLoggedOut();
  });
});