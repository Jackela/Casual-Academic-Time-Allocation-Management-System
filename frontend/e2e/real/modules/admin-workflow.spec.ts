import { test, expect } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import type { AuthContext } from '../../utils/workflow-helpers';
import { E2E_CONFIG } from '../../config/e2e.config';

const uniqueDescription = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const adminHeaders = (tokens: AuthContext) => ({
  Authorization: `Bearer ${tokens.admin.token}`,
  'Content-Type': 'application/json',
});

test.describe('Admin Backend Workflows', () => {
  let dataFactory: TestDataFactory;
  let tokens: AuthContext;

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
    tokens = dataFactory.getAuthTokens();
  });

  test.afterEach(async () => {
    await dataFactory?.cleanupAll();
  });

  test('Admin can perform final approval via API', async ({ request }) => {
    const seed = await dataFactory.createTimesheetForTest({
      description: uniqueDescription('Admin Final Approve'),
      targetStatus: 'LECTURER_CONFIRMED',
    });

    const response = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: adminHeaders(tokens),
      data: {
        timesheetId: seed.id,
        action: 'HR_CONFIRM',
        comment: 'Approved for payroll',
      },
    });
    expect(response.ok()).toBeTruthy();

    const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seed.id}`, {
      headers: adminHeaders(tokens),
    });
    expect(detail.ok()).toBeTruthy();
    const payload = await detail.json();
    const status = payload?.status ?? payload?.timesheet?.status;
    expect(status).toBe('FINAL_CONFIRMED');
  });

  test('Admin approval journey transitions record to final confirmed', async ({ request }) => {
    const seed = await dataFactory.createTimesheetForTest({
      description: uniqueDescription('Admin Journey'),
      targetStatus: 'LECTURER_CONFIRMED',
    });

    const approveResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: adminHeaders(tokens),
      data: {
        timesheetId: seed.id,
        action: 'HR_CONFIRM',
        comment: 'Auto-approved during E2E journey',
      },
    });
    expect(approveResponse.ok()).toBeTruthy();

    const pendingQueue = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/pending-final-approval`, {
      headers: adminHeaders(tokens),
    });
    expect(pendingQueue.ok()).toBeTruthy();
    const queuePayload = await pendingQueue.json();
    const ids = (queuePayload?.timesheets ?? []).map((row: { id: number }) => row.id);
    expect(ids).not.toContain(seed.id);
  });

  test('Admin can reject lecturer confirmed timesheet with justification', async ({ request }) => {
    const seed = await dataFactory.createTimesheetForTest({
      description: uniqueDescription('Admin Reject'),
      targetStatus: 'LECTURER_CONFIRMED',
    });

    const rejectResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: adminHeaders(tokens),
      data: {
        timesheetId: seed.id,
        action: 'REJECT',
        comment: 'Needs correction before payroll',
      },
    });
    expect(rejectResponse.ok()).toBeTruthy();

    const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seed.id}`, {
      headers: adminHeaders(tokens),
    });
    expect(detail.ok()).toBeTruthy();
    const payload = await detail.json();
    const status = payload?.status ?? payload?.timesheet?.status;
    expect(status).toBe('REJECTED');
  });

  test('Admin cannot reject the same timesheet twice', async ({ request }) => {
    const seed = await dataFactory.createTimesheetForTest({
      description: uniqueDescription('Admin Reject Twice'),
      targetStatus: 'LECTURER_CONFIRMED',
    });

    const firstRejectResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: adminHeaders(tokens),
      data: {
        timesheetId: seed.id,
        action: 'REJECT',
        comment: 'Rejecting for validation coverage',
      },
    });
    expect(firstRejectResponse.ok()).toBeTruthy();

    const secondRejectResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: adminHeaders(tokens),
      data: {
        timesheetId: seed.id,
        action: 'REJECT',
        comment: 'Rejecting for validation coverage',
      },
    });
    expect(secondRejectResponse.ok()).toBeFalsy();
    expect(secondRejectResponse.status()).toBeGreaterThanOrEqual(400);
    expect(secondRejectResponse.status()).toBeLessThan(500);

    const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seed.id}`, {
      headers: adminHeaders(tokens),
    });
    expect(detail.ok()).toBeTruthy();
    const payload = await detail.json();
    const status = payload?.status ?? payload?.timesheet?.status;
    expect(status).toBe('REJECTED');
  });

  test('Admin dashboard summary endpoint returns metrics', async ({ request }) => {
    const summaryResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
      headers: adminHeaders(tokens),
    });
    expect(summaryResponse.ok()).toBeTruthy();

    const summary = await summaryResponse.json();
    const payload = summary?.data ?? summary;
    expect(payload).toMatchObject({
      totalTimesheets: expect.any(Number),
    });
  });
});
