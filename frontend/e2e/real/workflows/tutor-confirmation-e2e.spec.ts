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

  test('API: Tutor confirms timesheet via POST /api/approvals (TUTOR_CONFIRM)', async ({
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

    const confirmResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: tutorHeaders,
      data: { timesheetId, action: 'TUTOR_CONFIRM' },
    });

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

test('E2E: Tutor confirmation drives end-to-end approval lifecycle', async ({
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
    // Wait for tutor pending approvals list to refresh after confirm (double anchor + stability poll)
    await page.waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET', { timeout: 5000 }).catch(() => undefined);
    await page.waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET', { timeout: 5000 }).catch(() => undefined);
    // Manual refresh cycle to settle UI before final status assertion
    const refreshBtn = page.getByRole('button', { name: /^Refresh$/i }).first();
    if (await refreshBtn.isVisible().catch(() => false)) { await refreshBtn.click().catch(() => undefined); }
    await page.waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET', { timeout: 5000 }).catch(() => undefined);
    await expect(tutorDashboard.getStatusBadge(timesheetId)).toContainText(
      statusLabel('TUTOR_CONFIRMED'),
      { timeout: 10000 },
    );
    await expect
      .poll(async () => (await tutorDashboard.getStatusBadge(timesheetId).innerText()).includes('Tutor Confirmed'), { timeout: 2000 })
      .toBe(true);

    await clearAuthSessionFromPage(page);

    // Lecturer approves the tutor-confirmed timesheet
    await signInAsRole(page, 'lecturer');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const lecturerDashboard = new DashboardPage(page);
    await lecturerDashboard.expectToBeLoaded('LECTURER');
    await lecturerDashboard.waitForTimesheetData();
    // Wait for lecturer pending list to update before taking actions
    await page.waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET', { timeout: 5000 }).catch(() => undefined);
    await page.waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET', { timeout: 5000 }).catch(() => undefined);
    await lecturerDashboard.approveTimesheet(timesheetId);
    const lecturerRow = lecturerDashboard.page.locator(`[data-testid="timesheet-row-${timesheetId}"]`);
    await expect
      .poll(async () => {
        const count = await lecturerRow.count().catch(() => 0);
        if (count === 0) return true;
        const badge = lecturerDashboard.page.locator(`[data-testid="timesheet-row-${timesheetId}"] [data-testid="status-badge"]`);
        const text = (await badge.first().innerText().catch(() => '')).toUpperCase();
        return text.includes('LECTURER_CONFIRMED') || text.includes('FINAL_CONFIRMED');
      }, { timeout: 20000 })
      .toBe(true);
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
    expect(['LECTURER_CONFIRMED', 'FINAL_CONFIRMED']).toContain(lecturerStatus);

    await clearAuthSessionFromPage(page);

    // Admin final approval to complete lifecycle
    await signInAsRole(page, 'admin');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const adminDashboard = new DashboardPage(page);
    await adminDashboard.expectToBeLoaded('ADMIN');
    const adminPendingTab = page.getByTestId('tab-pending-approvals').first();
    if ((await adminPendingTab.count()) > 0) {
      await adminPendingTab.click({ timeout: 5000 });
    } else {
      await page.getByRole('button', { name: /Pending Approvals/i }).first().click({ timeout: 5000 });
    }
    const adminPendingRegion = page.getByTestId('admin-pending-review').first();
    await expect(adminPendingRegion).toBeVisible({ timeout: 10000 });
    const adminApproveButton = await adminDashboard.getApproveButtonForTimesheet(timesheetId);
    await expect(adminApproveButton).toBeVisible({ timeout: 10000 });
    const adminApproveResponse = await adminDashboard.approveTimesheet(timesheetId);
    expect(adminApproveResponse.ok()).toBeTruthy();
    // Wait for admin pending list refresh after approval
    await page.waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET', { timeout: 5000 }).catch(() => undefined);
    await page.waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET', { timeout: 5000 }).catch(() => undefined);
    const adminRow = adminDashboard.page.locator(`[data-testid="timesheet-row-${timesheetId}"]`);
    await expect
      .poll(async () => {
        const count = await adminRow.count().catch(() => 0);
        if (count === 0) return true;
        const badge = adminDashboard.page.locator(`[data-testid="timesheet-row-${timesheetId}"] [data-testid="status-badge"]`);
        const text = (await badge.first().innerText().catch(() => '')).toUpperCase();
        return text.includes('FINAL_CONFIRMED');
      }, { timeout: 20000 })
      .toBe(true);

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

  test('API Contract: POST /api/approvals returns correct response structure for TUTOR_CONFIRM', async ({
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

    const confirmResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: tutorHeaders,
      data: { timesheetId, action: 'TUTOR_CONFIRM' },
    });

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

    const confirmResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: tutorHeaders,
      data: { timesheetId, action: 'TUTOR_CONFIRM' },
    });

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

    const confirmResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: lecturerHeaders,
      data: { timesheetId, action: 'TUTOR_CONFIRM' },
    });

    expect(confirmResponse.ok()).toBeFalsy();
    expect([403, 422]).toContain(confirmResponse.status());
  });
});






