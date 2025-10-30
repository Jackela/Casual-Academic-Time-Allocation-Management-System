import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { statusLabel, statusLabelPattern } from '../../utils/status-labels';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';

test.describe('Tutor UAT - Core Workflow', () => {
  let dataFactory: TestDataFactory;

  test.beforeEach(async ({ page, request }) => {
    dataFactory = await createTestDataFactory(request);
    await signInAsRole(page, 'tutor');
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  const openTutorDashboard = async (page: Page) => {
    const dashboard = new TutorDashboardPage(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await dashboard.expectToBeLoaded();
    await dashboard.waitForDashboardReady();
    return dashboard;
  };

  test('tutor can confirm a drafted timesheet without forbidden errors', async ({ page }) => {
    const description = `Tutor UAT ${Date.now()}`;

    const seeded = await dataFactory.createTimesheetForTest({
      description,
      targetStatus: 'DRAFT',
    });

    const tutorDashboard = await openTutorDashboard(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await tutorDashboard.waitForDashboardReady();
    const row = tutorDashboard.getTimesheetRow(seeded.id, seeded.description);
    await expect(row).toBeVisible({ timeout: 20000 });

    await expect(row).toBeVisible();
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText(statusLabel('DRAFT'));

    await tutorDashboard.submitDraft(seeded.id);
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toHaveText(
      statusLabelPattern('PENDING_TUTOR_CONFIRMATION'),
      { timeout: 20000 }
    );
  });
});
