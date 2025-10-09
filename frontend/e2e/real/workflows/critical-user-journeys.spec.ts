import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { NavigationPage } from '../../shared/pages/NavigationPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { acquireAuthTokens, createTimesheetWithStatus, transitionTimesheet, finalizeTimesheet, type AuthContext } from '../../utils/workflow-helpers';
import { E2E_CONFIG } from '../../config/e2e.config';
import { LECTURER_STORAGE, TUTOR_STORAGE } from '../utils/auth-storage';

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

  test.describe('Lecturer overview', () => {
    test.use({ storageState: LECTURER_STORAGE });

    test('Lecturer can view dashboard overview', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const navigationPage = new NavigationPage(page);

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

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
  });

  test.describe('Cross-role approval lifecycle', () => {
    test.use({ storageState: TUTOR_STORAGE });

    test('End-to-end approval flow follows SSOT lifecycle', async ({ page, request }) => {
      const description = uniqueDescription('Critical Workflow');
      const seed = await createTimesheetWithStatus(request, tokens, {
        description,
        targetStatus: 'PENDING_TUTOR_CONFIRMATION'
      });
      cleanupIds.push(seed.id);

      const tutorDashboard = new TutorDashboardPage(page);

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await tutorDashboard.expectToBeLoaded();
      await tutorDashboard.waitForMyTimesheetData();
      await expect(async () => {
        await tutorDashboard.refreshDashboard();
        const count = await tutorDashboard.page.getByTestId(`timesheet-row-${seed.id}`).count();
        expect(count).toBeGreaterThan(0);
      }).toPass({ timeout: 20000 });

      await expect(tutorDashboard.getStatusBadge(seed.id)).toContainText(/Pending Tutor Confirmation|Awaiting Tutor/i);
      const confirmResponse = await tutorDashboard.confirmTimesheet(seed.id);
      expect(confirmResponse.status()).toBe(200);
      await expect(async () => {
        await tutorDashboard.refreshDashboard();
        const badgeText = await tutorDashboard.getStatusBadge(seed.id).textContent();
        expect(badgeText).toMatch(/Tutor Confirmed/i);
      }).toPass({ timeout: 20000 });

      await transitionTimesheet(request, tokens, seed.id, 'LECTURER_CONFIRM');

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
