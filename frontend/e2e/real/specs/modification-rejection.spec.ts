import { test, expect } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { statusLabel } from '../../utils/status-labels';

test.describe('@p1 US4: Modification & Rejection (aligned to current UI)', () => {
  let dataFactory: TestDataFactory;

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('lecturer requests modification → tutor sees MODIFICATION_REQUESTED status', async ({ page }) => {
    // 1) Seed: create a timesheet that lecturer can act on (TUTOR_CONFIRMED)
    const seeded = await dataFactory.createTimesheetForTest({ targetStatus: 'TUTOR_CONFIRMED' });

    // 2) Lecturer requests modification (using API for determinism)
    await dataFactory.transitionTimesheet(seeded.id, 'REQUEST_MODIFICATION', 'Please adjust hours', 'LECTURER');

    // 3) Tutor sees MODIFICATION_REQUESTED status
    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
    await page
      .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET')
      .catch(() => undefined);
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText(
      statusLabel('MODIFICATION_REQUESTED'),
      { timeout: 15000 },
    );
  });

  test('admin rejects → tutor sees REJECTED and cannot resubmit', async ({ page }) => {
    // 1) Seed: create a timesheet already confirmed by lecturer (LECTURER_CONFIRMED)
    const seeded = await dataFactory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' });

    // 2) Admin rejects (using API for determinism)
    await dataFactory.transitionTimesheet(seeded.id, 'REJECT', 'Policy mismatch', 'admin');

    // 3) Tutor sees REJECTED and no Submit button
    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
    await page
      .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET')
      .catch(() => undefined);
    await expect(tutorDashboard.getStatusBadge(seeded.id)).toContainText(
      statusLabel('REJECTED'),
      { timeout: 15000 },
    );
    const submitBtn = tutorDashboard.page.locator(`[data-testid="submit-btn-${seeded.id}"]`);
    await expect(submitBtn).toHaveCount(0);
  });
});
