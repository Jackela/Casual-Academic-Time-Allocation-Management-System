import { test, expect } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { E2E_CONFIG } from '../../config/e2e.config';
import { statusLabel } from '../../utils/status-labels';

test.describe('Tutor Confirmation E2E Workflow - Bug #1 Coverage', () => {
  let dataFactory: TestDataFactory;

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('API: Tutor confirms timesheet via PUT /api/timesheets/{id}/confirm endpoint', async ({
    request,
  }) => {
    const tokens = dataFactory.getAuthTokens();

    const tutorHeaders = {
      Authorization: `Bearer ${tokens.tutor.token}`,
      'Content-Type': 'application/json',
    };

    const uniqueDescription = `Bug #1 Coverage Test ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const createdTimesheet = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'PENDING_TUTOR_CONFIRMATION',
    });

    expect(createdTimesheet.status).toBe('PENDING_TUTOR_CONFIRMATION');
    const timesheetId = createdTimesheet.id;

    const confirmResponse = await request.put(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}/confirm`,
      {
        headers: tutorHeaders,
      }
    );

    const responseStatus = confirmResponse.status();
    if (!confirmResponse.ok()) {
      const errorBody = await confirmResponse.text();
      console.log(`Error ${responseStatus}: ${errorBody}`);
    }

    expect(confirmResponse.ok()).toBeTruthy();
    expect(responseStatus).toBe(200);

    const responseBody = await confirmResponse.json();
    expect(responseBody).toMatchObject({
      action: 'TUTOR_CONFIRM',
      timesheetId,
      confirmationResponse: true,
      rejectionResponse: false,
      modificationRequestResponse: false,
      newStatus: 'TUTOR_CONFIRMED',
    });
    expect(Array.isArray(responseBody.nextSteps)).toBe(true);
    expect(responseBody.nextSteps.length).toBeGreaterThan(0);

    const verifyResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`, {
      headers: tutorHeaders,
    });
    expect(verifyResponse.ok()).toBeTruthy();

    const verifyData = await verifyResponse.json();
    const finalStatus = verifyData?.status ?? verifyData?.timesheet?.status;
    expect(finalStatus).toBe('TUTOR_CONFIRMED');
  });

  test.skip('E2E: Tutor confirmation drives end-to-end approval lifecycle', async ({
    page,
    request,
  }) => {
    const tokens = dataFactory.getAuthTokens();
    const uniqueDescription = `E2E Tutor Confirmation ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const seededTimesheet = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'DRAFT',
    });
    expect(seededTimesheet.status).toBe('DRAFT');
    const timesheetId = seededTimesheet.id;

    // Tutor submits draft and confirms
    await signInAsRole(page, 'tutor');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const tutorDashboard = new TutorDashboardPage(page);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
    const tutorRow = tutorDashboard.getTimesheetRow(timesheetId, seededTimesheet.description);
    await expect(tutorRow).toBeVisible({ timeout: 20000 });

    const submitResponse = await tutorDashboard.submitDraft(timesheetId);
    expect(submitResponse.ok()).toBeTruthy();
    await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
      statusLabel('PENDING_TUTOR_CONFIRMATION'),
      { timeout: 10000 },
    );

    const confirmResponse = await tutorDashboard.confirmTimesheet(timesheetId);
    expect(confirmResponse.ok()).toBeTruthy();
    await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
      statusLabel('TUTOR_CONFIRMED'),
      { timeout: 10000 },
    );

    await clearAuthSessionFromPage(page);

    // Lecturer approves the tutor-confirmed timesheet
    await signInAsRole(page, 'lecturer');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const lecturerDashboard = new DashboardPage(page);
    await lecturerDashboard.expectToBeLoaded('LECTURER');
    await lecturerDashboard.waitForTimesheetData();
    const lecturerApproveResponse = await lecturerDashboard.approveTimesheet(timesheetId);
    expect(lecturerApproveResponse.ok()).toBeTruthy();
    const lecturerRow = lecturerDashboard.page.locator(`[data-testid="timesheet-row-${timesheetId}"]`);
    await expect(lecturerRow).toHaveCount(0, { timeout: 20000 });
    const lecturerVerification = await request.get(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.admin.token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    expect(lecturerVerification.ok()).toBeTruthy();
    const lecturerSnapshot = await lecturerVerification.json();
    const lecturerStatus = lecturerSnapshot?.status ?? lecturerSnapshot?.timesheet?.status;
    expect(lecturerStatus).toBe('LECTURER_CONFIRMED');

    await clearAuthSessionFromPage(page);

    // Admin final approval to complete lifecycle
    await signInAsRole(page, 'admin');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const adminDashboard = new DashboardPage(page);
    await adminDashboard.expectToBeLoaded('ADMIN');
    await adminDashboard.waitForTimesheetData();
    const adminApproveResponse = await adminDashboard.approveTimesheet(timesheetId);
    expect(adminApproveResponse.ok()).toBeTruthy();
    const adminRow = adminDashboard.page.locator(`[data-testid="timesheet-row-${timesheetId}"]`);
    await expect(adminRow).toHaveCount(0, { timeout: 20000 });

    const verificationResponse = await request.get(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.admin.token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    expect(verificationResponse.ok()).toBeTruthy();
    const payload = await verificationResponse.json();
    const resolvedStatus = payload?.status ?? payload?.timesheet?.status;
    expect(resolvedStatus).toBe('FINAL_CONFIRMED');
  });

  test('API Contract: PUT /api/timesheets/{id}/confirm returns correct response structure', async ({
    request,
  }) => {
    const tokens = dataFactory.getAuthTokens();

    const tutorHeaders = {
      Authorization: `Bearer ${tokens.tutor.token}`,
      'Content-Type': 'application/json',
    };

    const uniqueDescription = `API Contract Test ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const createdTimesheet = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'PENDING_TUTOR_CONFIRMATION',
    });

    expect(createdTimesheet.status).toBe('PENDING_TUTOR_CONFIRMATION');
    const timesheetId = createdTimesheet.id;

    const confirmResponse = await request.put(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}/confirm`,
      {
        headers: tutorHeaders,
      }
    );

    expect(confirmResponse.ok()).toBeTruthy();
    expect(confirmResponse.status()).toBe(200);

    const responseBody = await confirmResponse.json();

    expect(responseBody).toMatchObject({
      action: 'TUTOR_CONFIRM',
      timesheetId,
      confirmationResponse: true,
      rejectionResponse: false,
      modificationRequestResponse: false,
      newStatus: 'TUTOR_CONFIRMED',
    });
    expect(responseBody).toHaveProperty('approverId', tokens.tutor.userId);
    expect(typeof responseBody.approverName).toBe('string');
    expect(responseBody.approverName.length).toBeGreaterThan(0);
    expect(responseBody).toHaveProperty('timestamp');

    const verifyResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}`, {
      headers: tutorHeaders,
    });
    expect(verifyResponse.ok()).toBeTruthy();

    const verifyData = await verifyResponse.json();
    const finalStatus = verifyData?.status ?? verifyData?.timesheet?.status;
    expect(finalStatus).toBe('TUTOR_CONFIRMED');
  });

  test('Error Handling: Cannot confirm timesheet not in PENDING_TUTOR_CONFIRMATION status', async ({
    request,
  }) => {
    const tokens = dataFactory.getAuthTokens();

    const tutorHeaders = {
      Authorization: `Bearer ${tokens.tutor.token}`,
      'Content-Type': 'application/json',
    };

    const uniqueDescription = `Error Handling Test ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const draftTimesheet = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'DRAFT',
    });

    expect(draftTimesheet.status).toBe('DRAFT');
    const timesheetId = draftTimesheet.id;

    const confirmResponse = await request.put(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}/confirm`,
      {
        headers: tutorHeaders,
      }
    );

    expect(confirmResponse.ok()).toBeFalsy();
    expect([400, 422]).toContain(confirmResponse.status());

    const errorBody = await confirmResponse.json();
    expect(errorBody).toHaveProperty('success', false);
  });

  test('Authorization: Only tutor can confirm their own timesheets', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();

    const lecturerHeaders = {
      Authorization: `Bearer ${tokens.lecturer.token}`,
      'Content-Type': 'application/json',
    };

    const uniqueDescription = `Authorization Test ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const createdTimesheet = await dataFactory.createTimesheetForTest({
      description: uniqueDescription,
      targetStatus: 'PENDING_TUTOR_CONFIRMATION',
    });

    expect(createdTimesheet.status).toBe('PENDING_TUTOR_CONFIRMATION');
    const timesheetId = createdTimesheet.id;

    const confirmResponse = await request.put(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheetId}/confirm`,
      {
        headers: lecturerHeaders,
      }
    );

    expect(confirmResponse.ok()).toBeFalsy();
    expect([403, 422]).toContain(confirmResponse.status());
  });
});
