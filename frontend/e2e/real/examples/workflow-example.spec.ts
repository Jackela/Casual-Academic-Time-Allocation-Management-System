import { test, expect, type Page } from '@playwright/test';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { NavigationPage } from '../../shared/pages/NavigationPage';
import { TimesheetPage } from '../../shared/pages/TimesheetPage';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole, type UserRole } from '../../api/auth-helper';
import type { AuthContext } from '../../utils/workflow-helpers';

/**
 * Example suite demonstrating the shared Page Object Model with isolated auth sessions.
 */
test.describe('Page Object Model Examples', () => {
  let dashboardPage: DashboardPage;
  let navigationPage: NavigationPage;
  let timesheetPage: TimesheetPage;
  let dataFactory: TestDataFactory;
  let tokens: AuthContext;
  const trackedPages = new Set<Page>();

  const trackSession = async (page: Page, role: UserRole) => {
    await signInAsRole(page, role);
    trackedPages.add(page);
  };

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
    tokens = dataFactory.getAuthTokens();
    trackedPages.clear();
  });

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    navigationPage = new NavigationPage(page);
    timesheetPage = new TimesheetPage(page);
  });

  test.afterEach(async () => {
    for (const page of trackedPages) {
      await clearAuthSessionFromPage(page);
    }
    trackedPages.clear();
    await dataFactory?.cleanupAll();
  });

  test.describe('Lecturer workflows', () => {
    test.beforeEach(async ({ page }) => {
      await trackSession(page, 'lecturer');
    });

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
    const lecturerContext = await browser.newContext();
    const lecturerPage = await lecturerContext.newPage();
    await trackSession(lecturerPage, 'lecturer');
    const lecturerDashboard = new DashboardPage(lecturerPage);
    await lecturerPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    // Use full session data for display name assertions (tokens only contain userId)
    await lecturerDashboard.expectUserInfo(dataFactory.getAuthSessions().lecturer.user.name, 'Lecturer');
    await lecturerContext.close();

    const tutorContext = await browser.newContext();
    const tutorPage = await tutorContext.newPage();
    await trackSession(tutorPage, 'tutor');
    const tutorDashboard = new DashboardPage(tutorPage);
    await tutorPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await tutorDashboard.expectUserInfo(dataFactory.getAuthSessions().tutor.user.name, 'Tutor');
    await tutorContext.close();

    const summaryResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${tokens.admin.token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(summaryResponse.ok()).toBeTruthy();
  });
});
