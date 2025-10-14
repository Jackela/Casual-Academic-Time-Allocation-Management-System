import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { statusLabel } from '../../utils/status-labels';
import { E2E_CONFIG } from '../../config/e2e.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, '../../../playwright-screenshots');

test.describe('Visual Workflow Audit', () => {
  let dataFactory: TestDataFactory;

  test('captures screenshots for the timesheet approval lifecycle', async ({ page, request }) => {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    dataFactory = await createTestDataFactory(request);

    const capture = async (name: string) => {
      const resolved = path.resolve(SCREENSHOT_DIR, name);
      await page.waitForTimeout(300);
      await page.screenshot({ path: resolved, fullPage: true });
      console.info(`[visual-workflow] captured ${resolved}`);
    };

    const tokens = dataFactory.getAuthTokens();
    const seed = await dataFactory.createTimesheetForTest({
      description: `Visual Workflow ${Date.now()}`,
      targetStatus: 'DRAFT'
    });

    try {
      // Tutor stage: submit draft
      await signInAsRole(page, 'tutor');
      const tutorDashboard = new TutorDashboardPage(page);
      await tutorDashboard.waitForMyTimesheetData();
      await tutorDashboard.expectToBeLoaded();
      await capture('01-tutor-dashboard.png');

      await tutorDashboard.submitDraft(seed.id);
      await tutorDashboard.waitForMyTimesheetData();
      await expect(tutorDashboard.getStatusBadge(seed.id)).toContainText(statusLabel('PENDING_TUTOR_CONFIRMATION'));
      await capture('02-tutor-submitted.png');

      // Simulate tutor confirmation to advance lifecycle for lecturer stage
      await dataFactory.transitionTimesheet(seed.id, 'TUTOR_CONFIRM');

      await clearAuthSessionFromPage(page);

      // Lecturer stage: approve pending timesheet
      await signInAsRole(page, 'lecturer');
      const lecturerDashboard = new DashboardPage(page);
      await lecturerDashboard.waitForTimesheetData();
      await lecturerDashboard.expectToBeLoaded('LECTURER');
      await capture('03-lecturer-dashboard.png');

      await dataFactory.transitionTimesheet(seed.id, 'LECTURER_CONFIRM');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await lecturerDashboard.waitForTimesheetData();
      await lecturerDashboard.expectToBeLoaded('LECTURER');
      await capture('04-lecturer-approved.png');

      await clearAuthSessionFromPage(page);

      // Admin stage: final approval via API, confirm UI
      await dataFactory.transitionTimesheet(seed.id, 'HR_CONFIRM');

      await signInAsRole(page, 'admin');
      const adminDashboard = new DashboardPage(page);
      await adminDashboard.waitForTimesheetData();
      await adminDashboard.expectToBeLoaded('ADMIN');
      await capture('05-admin-final-approval.png');

      // Validate final status through API response (safety check)
      await expect(async () => {
        const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seed.id}`, {
          headers: { Authorization: `Bearer ${tokens.admin.token}` }
        });
        expect(detail.ok()).toBeTruthy();
        const payload = await detail.json();
        const status = payload?.status ?? payload?.timesheet?.status;
        expect(status).toBe('FINAL_CONFIRMED');
      }).toPass({ timeout: 15000 });
    } finally {
      await clearAuthSessionFromPage(page).catch(() => undefined);
      await dataFactory?.cleanupAll().catch(() => undefined);
    }
  });
});
