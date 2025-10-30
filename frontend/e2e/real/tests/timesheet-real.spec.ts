import { test, expect, type Page } from '@playwright/test';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { E2E_CONFIG } from '../../config/e2e.config';
import { statusLabel, statusLabelPattern } from '../../utils/status-labels';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import type { AuthContext } from '../../utils/workflow-helpers';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';

/**
 * Real backend verification using live data and SSOT workflow
 */

test.describe('Real Backend Timesheet Operations', () => {
  let dataFactory: TestDataFactory;
  let tokens: AuthContext;

  test.beforeEach(async ({ page, request }) => {
    dataFactory = await createTestDataFactory(request);
    tokens = dataFactory.getAuthTokens();
    await signInAsRole(page, 'tutor');
  });

  test.afterEach(async ({ page }) => {
    await dataFactory?.cleanupAll();
    await clearAuthSessionFromPage(page);
  });

  const openTutorDashboard = async (page: Page) => {
    const tutorDashboard = new TutorDashboardPage(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
    return tutorDashboard;
  };

  test('loads tutor dashboard data from real backend', async ({ page, request }) => {
    const dashboard = await openTutorDashboard(page);

    const response = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets?page=0&size=5`, {
      headers: { Authorization: `Bearer ${tokens.tutor.token}` }
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(Array.isArray(payload.timesheets)).toBe(true);

    const hasRows = Array.isArray(payload.timesheets) && payload.timesheets.length > 0;
    if (hasRows) {
      await dashboard.expectTimesheetsTable();
      const rowsLocator = await dashboard.getTimesheetRows();
      const rows = await rowsLocator.count();
      expect(rows).toBeGreaterThan(0);
    } else {
      await dashboard.expectEmptyState();
    }
  });

  test('creates draft timesheet via API seed and displays in UI', async ({ page }) => {
    const description = `Real backend draft ${Date.now()}`;
    const seed = await dataFactory.createTimesheetForTest({
      description,
      targetStatus: 'DRAFT'
    });

    const dashboard = await openTutorDashboard(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await dashboard.waitForDashboardReady();
    const row = dashboard.getTimesheetRow(seed.id, seed.description);
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(dashboard.getStatusBadge(seed.id)).toContainText(statusLabel('DRAFT'));
    await expect(row).toContainText(description);
  });

  test('submits tutor draft and sees pending confirmation status', async ({ page }) => {
    const description = `Submit flow ${Date.now()}`;
    const draft = await dataFactory.createTimesheetForTest({
      description,
      targetStatus: 'DRAFT'
    });

    const dashboard = await openTutorDashboard(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await dashboard.waitForDashboardReady();
    const row = dashboard.getTimesheetRow(draft.id, draft.description);
    await expect(row).toBeVisible({ timeout: 20000 });

    await dashboard.submitDraft(draft.id);
    await expect(dashboard.getStatusBadge(draft.id)).toHaveText(
      statusLabelPattern('PENDING_TUTOR_CONFIRMATION'),
      { timeout: 20000 }
    );

    await dataFactory.transitionTimesheet(draft.id, 'TUTOR_CONFIRM');
    await dataFactory.transitionTimesheet(draft.id, 'LECTURER_CONFIRM');
  });

  test('returns validation error when creating invalid timesheet', async ({ request }) => {
    const response = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/timesheets`, {
      headers: {
        Authorization: `Bearer ${tokens.admin.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        tutorId: tokens.tutor.userId,
        courseId: 999,
        weekStartDate: '2025-02-03',
        hours: 120,
        hourlyRate: 45,
        description: 'Invalid Test Case'
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error).toMatchObject({ success: false });
  });
});
