import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TutorDashboardPage } from '../pages/TutorDashboardPage';
import { acquireAuthTokens, createTimesheetWithStatus, finalizeTimesheet, transitionTimesheet, type AuthContext } from '../utils/workflow-helpers';
import { E2E_CONFIG } from '../config/e2e.config';

/**
 * Real backend verification using live data and SSOT workflow
 */

test.describe('Real Backend Timesheet Operations', () => {
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

  const loginAsTutor = async (page: Page) => {
    const loginPage = new LoginPage(page);
    const tutorDashboard = new TutorDashboardPage(page);
    await loginPage.navigateTo();
    await loginPage.loginAsTutor();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();
    return tutorDashboard;
  };

  test('loads tutor dashboard data from real backend', async ({ page, request }) => {
    const dashboard = await loginAsTutor(page);

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

  test('creates draft timesheet via API seed and displays in UI', async ({ page, request }) => {
    const description = `Real backend draft ${Date.now()}`;
    const seed = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'DRAFT'
    });
    cleanupIds.push(seed.id);

    const dashboard = await loginAsTutor(page);
    await dashboard.refreshDashboard();

    const row = dashboard.page.getByTestId(`timesheet-row-${seed.id}`);
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(dashboard.getStatusBadge(seed.id)).toContainText(/Draft/i);
    await expect(row).toContainText(description);
  });

  test('submits tutor draft and sees pending confirmation status', async ({ page, request }) => {
    const description = `Submit flow ${Date.now()}`;
    const draft = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'DRAFT'
    });
    cleanupIds.push(draft.id);

    const dashboard = await loginAsTutor(page);
    await dashboard.refreshDashboard();
    await dashboard.submitDraft(draft.id);
    await expect(dashboard.getStatusBadge(draft.id)).toContainText(/Pending Tutor Confirmation/i);

    await transitionTimesheet(request, tokens, draft.id, 'TUTOR_CONFIRM');
    await transitionTimesheet(request, tokens, draft.id, 'LECTURER_CONFIRM');
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
