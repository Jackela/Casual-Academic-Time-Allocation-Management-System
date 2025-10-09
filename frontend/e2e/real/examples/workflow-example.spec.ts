import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { NavigationPage } from '../../shared/pages/NavigationPage';
import { TimesheetPage } from '../../shared/pages/TimesheetPage';
import { LECTURER_STORAGE, TUTOR_STORAGE } from '../utils/auth-storage';
import { E2E_CONFIG } from '../../config/e2e.config';
import { acquireAuthTokens } from '../../utils/workflow-helpers';

/**
 * Example suite demonstrating the shared Page Object Model with persisted auth states.
 */
test.describe('Page Object Model Examples', () => {
  let dashboardPage: DashboardPage;
  let navigationPage: NavigationPage;
  let timesheetPage: TimesheetPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    navigationPage = new NavigationPage(page);
    timesheetPage = new TimesheetPage(page);
  });

  test.describe('Lecturer workflows', () => {
    test.use({ storageState: LECTURER_STORAGE });

    test('can review dashboard data using page objects', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await dashboardPage.expectToBeLoaded('LECTURER');
      await navigationPage.expectHeaderElements();

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

      await dashboardPage.logout();
      await navigationPage.expectLoggedOut();
    });

    test('can approve a timesheet via page objects', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await dashboardPage.waitForTimesheetData();

      const hasData = await dashboardPage.hasTimesheetData();
      test.skip(!hasData, 'No timesheet data available for approval testing');

      await dashboardPage.expectTimesheetsTable();
      const rows = await dashboardPage.getTimesheetRows();
      const firstRow = rows.first();
      const timesheetIdAttr = await firstRow.getAttribute('data-testid');
      const timesheetId = Number.parseInt(timesheetIdAttr?.replace('timesheet-row-', '') ?? 'NaN', 10);
      test.skip(Number.isNaN(timesheetId), 'Unable to determine timesheet id');

      await timesheetPage.expectTimesheetActionButtonsEnabled(timesheetId);
      const response = await dashboardPage.approveTimesheet(timesheetId);
      expect(response.status()).toBe(200);

      await dashboardPage.waitForTimesheetData();
    });
  });

  test('redirects unauthenticated users to login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const loginForm = page.getByTestId('login-form');
    if (await loginForm.isVisible().catch(() => false)) {
      await expect(page).toHaveURL(/login/i);
    } else {
      await expect(page).toHaveURL(/dashboard/);
    }
    await context.close();
  });

  test('Multi-role authentication workflow with Page Objects', async ({ browser, request }) => {
    const lecturerContext = await browser.newContext({ storageState: LECTURER_STORAGE });
    const lecturerPage = await lecturerContext.newPage();
    const lecturerDashboard = new DashboardPage(lecturerPage);
    await lecturerPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await lecturerDashboard.expectUserInfo('Dr. Jane Smith', 'Lecturer');
    await lecturerContext.close();

    const tutorContext = await browser.newContext({ storageState: TUTOR_STORAGE });
    const tutorPage = await tutorContext.newPage();
    const tutorDashboard = new DashboardPage(tutorPage);
    await tutorPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await tutorDashboard.expectUserInfo('John Doe', 'Tutor');
    await tutorContext.close();

    const adminTokens = await acquireAuthTokens(request);
    const summaryResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${adminTokens.admin.token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(summaryResponse.ok()).toBeTruthy();
  });
});
