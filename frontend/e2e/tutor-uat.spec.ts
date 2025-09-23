import { test, expect } from './fixtures/base';
import { LoginPage } from './pages/LoginPage';
import { TutorDashboardPage } from './pages/TutorDashboardPage';
import { E2E_CONFIG } from './config/e2e.config';
import { acquireAuthTokens, finalizeTimesheet, createTimesheetWithStatus, type AuthContext } from './utils/workflow-helpers';

test.describe('Tutor UAT - Core Workflow', () => {
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
        headers: {
          Authorization: `Bearer ${tokens.admin.token}`
        }
      }).catch(() => undefined);
    }
  });

  test('tutor can confirm a drafted timesheet without forbidden errors', async ({ page, request }) => {
    const loginPage = new LoginPage(page);
    const tutorDashboard = new TutorDashboardPage(page);
    const description = `Tutor UAT ${Date.now()}`;

    const seeded = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'DRAFT',
    });
    cleanupIds.push(seeded.id);

    await loginPage.navigateTo();
    await loginPage.loginAsTutor();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();

    const row = tutorDashboard.page.getByTestId(`timesheet-row-${seeded.id}`);
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText(/Draft/i);

    await tutorDashboard.submitDraft(seeded.id);
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText('Pending Tutor Confirmation', { timeout: 15000 });
  });
});
