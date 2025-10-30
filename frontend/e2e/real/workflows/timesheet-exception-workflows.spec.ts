import { test, expect } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { E2E_CONFIG } from '../../config/e2e.config';
import { statusLabel } from '../../utils/status-labels';

const approvalsFromPayload = (payload: unknown): Array<{ action?: string; comment?: string }> => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidate = payload as Record<string, unknown>;
  if (Array.isArray(candidate.approvals)) {
    return candidate.approvals as Array<{ action?: string; comment?: string }>;
  }

  if (candidate.timesheet) {
    return approvalsFromPayload(candidate.timesheet);
  }

  if (candidate.data) {
    return approvalsFromPayload(candidate.data);
  }

  return [];
};

test.describe('Exception workflow guard-rails', () => {
  let dataFactory: TestDataFactory;

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('Tutor confirmation golden path covers Bug #1 regression', async ({ page, request }) => {
    const tokens = dataFactory.getAuthTokens();
    const uniqueDescription = `Tutor Confirmation Regression ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const seeded = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'PENDING_TUTOR_CONFIRMATION',
    });
    const timesheetId = seeded.id;

    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);

    await test.step('Tutor sees pending confirmation timesheet (WF Golden Path step 2)', async () => {
      await tutorDashboard.expectToBeLoaded();
      await tutorDashboard.waitForDashboardReady();
      await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
        statusLabel('PENDING_TUTOR_CONFIRMATION'),
        { timeout: 10000 },
      );
      await tutorDashboard.expectConfirmButtonVisible(timesheetId);
    });

    await test.step('Tutor confirms via UI, covering Bug #1 regression', async () => {
      const confirmation = await tutorDashboard.confirmTimesheet(timesheetId);
      expect(confirmation.ok(), 'TUTOR_CONFIRM action should succeed').toBeTruthy();
      await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
        statusLabel('TUTOR_CONFIRMED'),
        { timeout: 10000 },
      );
    });

    await test.step('API snapshot shows lecturer can now review confirmed timesheet', async () => {
      const verification = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`, {
        headers: {
          Authorization: `Bearer ${tokens.tutor.token}`,
          'Content-Type': 'application/json',
        },
      });
      expect(verification.ok()).toBeTruthy();
      const payload = await verification.json();
      const status = payload?.status ?? payload?.timesheet?.status;
      expect(status).toBe('TUTOR_CONFIRMED');
    });

    await test.step('Lecturer queue receives the confirmed timesheet', async () => {
      await clearAuthSessionFromPage(page);
      await signInAsRole(page, 'lecturer');
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

      const lecturerDashboard = new DashboardPage(page);
      await lecturerDashboard.expectToBeLoaded('LECTURER');
      await lecturerDashboard.waitForTimesheetData();

      const lecturerRow = await lecturerDashboard.getTimesheetById(timesheetId);
      await expect(lecturerRow).toHaveCount(1, { timeout: 15000 });
      await expect(
        lecturerDashboard.page.locator(`[data-testid="status-badge-${timesheetId}"]`),
      ).toContainText(statusLabel('TUTOR_CONFIRMED'), { timeout: 10000 });
    });
  });

  test('Lecturer modification request enforces role guard-rails', async ({ page, request }) => {
    const tokens = dataFactory.getAuthTokens();
    const feedbackComment = 'Please attach tutorial attendance confirmation before approval.';
    const uniqueDescription = `Lecturer Modification Guardrail ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const seeded = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'TUTOR_CONFIRMED',
    });
    const timesheetId = seeded.id;

    await signInAsRole(page, 'lecturer');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const lecturerDashboard = new DashboardPage(page);
    await lecturerDashboard.expectToBeLoaded('LECTURER');
    await lecturerDashboard.waitForTimesheetData();

    await test.step('Tutor role is blocked from REQUEST_MODIFICATION for tutor-confirmed timesheets', async () => {
      const unauthorized = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: {
          Authorization: `Bearer ${tokens.tutor.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          timesheetId,
          action: 'REQUEST_MODIFICATION',
          comment: feedbackComment,
        },
      });

      expect(
        unauthorized.status(),
        'Tutor should not be allowed to request modification on tutor-confirmed timesheets',
      ).toBeGreaterThanOrEqual(400);
      expect(unauthorized.status()).toBeLessThan(500);
    });

    const preVerification = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`, {
      headers: {
        Authorization: `Bearer ${tokens.lecturer.token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(preVerification.ok()).toBeTruthy();
    const prePayload = await preVerification.json();
    await test.info().attach('pre-lecturer-request', {
      body: JSON.stringify(prePayload, null, 2),
      contentType: 'application/json',
    });

    await test.step('Lecturer requests modification with actionable feedback', async () => {
      try {
        await dataFactory.transitionTimesheet(timesheetId, 'REQUEST_MODIFICATION', feedbackComment, 'lecturer');
      } catch (error) {
        await test.info().attach('lecturer-request-modification-error', {
          body: String(error),
          contentType: 'text/plain',
        });
        throw error;
      }
    });

    const verification = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`, {
      headers: {
        Authorization: `Bearer ${tokens.tutor.token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(verification.ok()).toBeTruthy();
    const payload = await verification.json();
    await test.info().attach('post-lecturer-request', {
      body: JSON.stringify(payload, null, 2),
      contentType: 'application/json',
    });
    const status = payload?.status ?? payload?.timesheet?.status;
    expect(status).toBe('MODIFICATION_REQUESTED');
    const approvals = approvalsFromPayload(payload);
    expect(
      approvals.some(
        (approval) =>
          approval.action === 'REQUEST_MODIFICATION' &&
          (approval.comment ?? '').includes('tutorial attendance confirmation'),
      ),
    ).toBeTruthy();

    await clearAuthSessionFromPage(page);
    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();

    await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
      statusLabel('MODIFICATION_REQUESTED'),
      { timeout: 10000 },
    );

    const updatedDescription = `${uniqueDescription} - amended after lecturer feedback`;

    await test.step('Tutor reviews comment, applies edits, and resubmits from MODIFICATION_REQUESTED state', async () => {
      await tutorDashboard.openEditModal(timesheetId);
      await tutorDashboard.updateEditForm({ description: updatedDescription });
      await tutorDashboard.saveEditChanges();
      await tutorDashboard.expectEditFlowCompleted();

      const resubmit = await tutorDashboard.submitDraft(timesheetId);
      expect(resubmit.ok()).toBeTruthy();

      await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
        statusLabel('PENDING_TUTOR_CONFIRMATION'),
        { timeout: 10000 },
      );
    });
  });

  test('Admin rejection locks timesheet in final rejected state', async ({ page, request }) => {
    const tokens = dataFactory.getAuthTokens();
    const rejectionComment = 'Line item totals do not reconcile with submitted receipts.';
    const uniqueDescription = `Admin Rejection Final State ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const seeded = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'LECTURER_CONFIRMED',
    });
    const timesheetId = seeded.id;

    await signInAsRole(page, 'admin');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const adminDashboard = new DashboardPage(page);
    await adminDashboard.expectToBeLoaded('ADMIN');
    await adminDashboard.waitForTimesheetData();

    await test.step('Admin records rejection with comment (API path for determinism)', async () => {
      const resp = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: { Authorization: `Bearer ${tokens.admin.token}`, 'Content-Type': 'application/json' },
        data: { timesheetId, action: 'REJECT', comment: rejectionComment },
      });
      expect(resp.ok()).toBeTruthy();
      // Ensure dashboard navigates and then assert the specific row disappears
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-testid="timesheet-row-${id}"]`),
        timesheetId,
        { timeout: 20000 }
      );
    });

    const rejectedSnapshot = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`, {
      headers: {
        Authorization: `Bearer ${tokens.admin.token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(rejectedSnapshot.ok()).toBeTruthy();
    const rejectedPayload = await rejectedSnapshot.json();
    const rejectedStatus = rejectedPayload?.status ?? rejectedPayload?.timesheet?.status;
    expect(rejectedStatus).toBe('REJECTED');

    await clearAuthSessionFromPage(page);
    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();

    await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
      statusLabel('REJECTED'),
      { timeout: 10000 },
    );

    await test.step('Tutor cannot resubmit a rejected timesheet directly', async () => {
      const submitButton = tutorDashboard.page.locator(`[data-testid="submit-btn-${timesheetId}"]`);
      await expect(submitButton, 'Submit button must be hidden or disabled for REJECTED timesheets').toHaveCount(0);

      const resubmitAttempt = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: {
          Authorization: `Bearer ${tokens.tutor.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          timesheetId,
          action: 'SUBMIT_FOR_APPROVAL',
          comment: 'Attempted resubmission after rejection',
        },
      });

      expect(resubmitAttempt.status()).toBeGreaterThanOrEqual(400);
      expect(resubmitAttempt.status()).toBeLessThan(500);
    });

    const postAttemptSnapshot = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`, {
      headers: {
        Authorization: `Bearer ${tokens.tutor.token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(postAttemptSnapshot.ok()).toBeTruthy();
    const postAttemptPayload = await postAttemptSnapshot.json();
    const finalStatus = postAttemptPayload?.status ?? postAttemptPayload?.timesheet?.status;
    expect(finalStatus).toBe('REJECTED');
  });
});
