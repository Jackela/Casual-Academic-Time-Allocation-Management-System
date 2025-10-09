import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { E2E_CONFIG } from '../../config/e2e.config';
import { TUTOR_STORAGE } from '../utils/auth-storage';
import { acquireAuthTokens, finalizeTimesheet, createTimesheetWithStatus, type AuthContext } from '../../utils/workflow-helpers';

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

  const openTutorDashboard = async (page: Page) => {
    const dashboard = new TutorDashboardPage(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await dashboard.expectToBeLoaded();
    await dashboard.waitForMyTimesheetData();
    return dashboard;
  };

  test.use({ storageState: TUTOR_STORAGE });

  test('tutor can confirm a drafted timesheet without forbidden errors', async ({ page, request }) => {
    const description = `Tutor UAT ${Date.now()}`;

    const seeded = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'DRAFT',
    });
    cleanupIds.push(seeded.id);

    const tutorDashboard = await openTutorDashboard(page);

    await expect(async () => {
      await tutorDashboard.refreshDashboard();
      const count = await tutorDashboard.page.getByTestId(`timesheet-row-${seeded.id}`).count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 20000 });

    const row = tutorDashboard.page.getByTestId(`timesheet-row-${seeded.id}`);
    await expect(row).toBeVisible();
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText(/Draft/i);

    await tutorDashboard.submitDraft(seeded.id);
    await expect(async () => {
      await tutorDashboard.refreshDashboard();
      const text = await tutorDashboard.getStatusBadge(seeded.id).textContent();
      expect(text).toMatch(/Pending Tutor Confirmation|Awaiting Tutor/i);
    }).toPass({ timeout: 20000 });
  });
});
