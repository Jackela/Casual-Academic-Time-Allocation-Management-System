import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { NavigationPage } from '../../shared/pages/NavigationPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { E2E_CONFIG } from '../../config/e2e.config';
import { statusLabel, statusLabelPattern } from '../../utils/status-labels';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import type { AuthContext } from '../../utils/workflow-helpers';

const uniqueDescription = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

test.describe('Critical User Journeys', () => {
  let dataFactory: TestDataFactory;
  let tokens: AuthContext;

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
    tokens = dataFactory.getAuthTokens();
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test.describe('Lecturer overview', () => {
    test.beforeEach(async ({ page }) => {
      await signInAsRole(page, 'lecturer');
    });

    test('Lecturer can view dashboard overview', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const navigationPage = new NavigationPage(page);

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

      await dashboardPage.expectToBeLoaded('LECTURER');
      await navigationPage.expectUserInfo(['Dr. Jane Smith', 'E2E Lecturer'], 'Lecturer');
      await dashboardPage.waitForTimesheetData();

      const hasData = await dashboardPage.hasTimesheetData();
      if (hasData) {
        await dashboardPage.expectTimesheetsTable();
      } else {
        await dashboardPage.expectEmptyState();
      }
    });
  });

  test.describe('Cross-role approval lifecycle', () => {
    test.beforeEach(async ({ page }) => {
      await signInAsRole(page, 'tutor');
    });

    test('End-to-end approval flow follows SSOT lifecycle', async ({ page, request }) => {
      const description = uniqueDescription('Critical Workflow');
      const seed = await dataFactory.createTimesheetForTest({
        description,
        targetStatus: 'PENDING_TUTOR_CONFIRMATION'
      });

      const tutorDashboard = new TutorDashboardPage(page);

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await tutorDashboard.expectToBeLoaded();
      await tutorDashboard.waitForDashboardReady();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await tutorDashboard.waitForDashboardReady();
      const row = tutorDashboard.getTimesheetRow(seed.id, seed.description);
      await expect(row).toBeVisible({ timeout: 20000 });

      await expect(tutorDashboard.getStatusBadge(seed.id)).toContainText(statusLabel('PENDING_TUTOR_CONFIRMATION'));
      const confirmResponse = await tutorDashboard.confirmTimesheet(seed.id);
      expect(confirmResponse.status()).toBe(200);
      await expect(tutorDashboard.getStatusBadge(seed.id)).toHaveText(
        statusLabelPattern('TUTOR_CONFIRMED'),
        { timeout: 20000 }
      );

      await dataFactory.transitionTimesheet(seed.id, 'LECTURER_CONFIRM');

      const finalApproval = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: {
          Authorization: `Bearer ${tokens.admin.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          timesheetId: seed.id,
          action: 'HR_CONFIRM',
          comment: 'Final approval via multi-role journey',
        },
      });
      expect(finalApproval.ok()).toBeTruthy();

      await expect(async () => {
        const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seed.id}`, {
          headers: { Authorization: `Bearer ${tokens.admin.token}` }
        });
        expect(detail.ok()).toBeTruthy();
        const payload = await detail.json();
        const status = payload?.status ?? payload?.timesheet?.status;
        expect(status).toBe('FINAL_CONFIRMED');
      }).toPass({ timeout: 15000 });

    });
  });
});
