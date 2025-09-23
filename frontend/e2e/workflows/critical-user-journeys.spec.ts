import { test, expect } from '../fixtures/base';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NavigationPage } from '../pages/NavigationPage';
import { TutorDashboardPage } from '../pages/TutorDashboardPage';
import { acquireAuthTokens, createTimesheetWithStatus, transitionTimesheet, finalizeTimesheet, type AuthContext } from '../utils/workflow-helpers';
import { E2E_CONFIG } from '../config/e2e.config';

const uniqueDescription = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

test.describe('Critical User Journeys', () => {
  let tokens: AuthContext;
  const cleanupIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    tokens = await acquireAuthTokens(request);
  });

  test.afterEach(async ({ request }) => {
    while (cleanupIds.length) {
      const id = cleanupIds.pop();
      if (!id) continue;
      await finalizeTimesheet(request, tokens, id).catch(() => undefined);
      await request.delete(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${id}`, {
        headers: { Authorization: `Bearer ${tokens.admin.token}` }
      }).catch(() => undefined);
    }
  });

  test('Lecturer can authenticate and view dashboard overview', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const navigationPage = new NavigationPage(page);

    await loginPage.navigateTo();
    await loginPage.expectToBeVisible();
    await loginPage.loginAsLecturer();

    await dashboardPage.expectToBeLoaded('LECTURER');
    await navigationPage.expectUserInfo('Dr. Jane Smith', 'Lecturer');
    await dashboardPage.waitForTimesheetData();

    const hasData = await dashboardPage.hasTimesheetData();
    if (hasData) {
      await dashboardPage.expectTimesheetsTable();
    } else {
      await dashboardPage.expectEmptyState();
    }
  });

  test('End-to-end approval flow follows SSOT lifecycle', async ({ page, request, context }) => {
    const description = uniqueDescription('Critical Workflow');
    const seed = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'PENDING_TUTOR_CONFIRMATION'
    });
    cleanupIds.push(seed.id);

    const loginPage = new LoginPage(page);
    const tutorDashboard = new TutorDashboardPage(page);

    await loginPage.navigateTo();
    await loginPage.loginAsTutor();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();

    await expect(tutorDashboard.getStatusBadge(seed.id)).toContainText(/Pending Tutor Confirmation/i);
    const confirmResponse = await tutorDashboard.confirmTimesheet(seed.id);
    expect(confirmResponse.status()).toBe(200);
    await expect(tutorDashboard.getStatusBadge(seed.id)).toContainText(/Tutor Confirmed/i);

    await tutorDashboard.navigationPage.logout();

    await transitionTimesheet(request, tokens, seed.id, 'LECTURER_CONFIRM');

    const adminPage = await context.newPage();
    const adminLogin = new LoginPage(adminPage);

    await adminLogin.navigateTo();
    await adminLogin.loginAsAdmin();

    await adminPage.getByRole('button', { name: 'Pending Review' }).click();
    const preset = adminPage.getByTestId('filter-preset-pending-final');
    if (await preset.isVisible().catch(() => false)) {
      await preset.click();
    }

    const row = adminPage.getByTestId(`timesheet-row-${seed.id}`);
    await expect(row).toBeVisible({ timeout: 15000 });

    const approveButton = row.getByTestId(`approve-btn-${seed.id}`);
    await expect(approveButton).toBeEnabled();
    await Promise.all([
      adminPage.waitForResponse((response) => response.url().includes('/api/approvals') && response.request().method() === 'POST'),
      approveButton.click()
    ]);

    await expect(async () => {
      const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seed.id}`, {
        headers: { Authorization: `Bearer ${tokens.admin.token}` }
      });
      expect(detail.ok()).toBeTruthy();
      const payload = await detail.json();
      const status = payload?.status ?? payload?.timesheet?.status;
      expect(status).toBe('FINAL_CONFIRMED');
    }).toPass({ timeout: 15000 });

    await adminPage.close();
  });
});
