import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import type { AuthContext } from '../../utils/workflow-helpers';

const uniqueDescription = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const adminHeaders = (tokens: AuthContext) => ({
  Authorization: `Bearer ${tokens.admin.token}`,
  'Content-Type': 'application/json',
});

test.describe('Admin Final Approval API Flow', () => {
  let dataFactory: TestDataFactory;
  let tokens: AuthContext;

  test.beforeEach(async ({ page, request }) => {
    dataFactory = await createTestDataFactory(request);
    tokens = dataFactory.getAuthTokens();
    await signInAsRole(page, 'admin');
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('admin can finalise lecturer confirmed timesheet', async ({ request }) => {
    const seed = await dataFactory.createTimesheetForTest({
      description: uniqueDescription('Admin Final Approve'),
      targetStatus: 'LECTURER_CONFIRMED',
    });

    const approveResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: adminHeaders(tokens),
      data: {
        timesheetId: seed.id,
        action: 'HR_CONFIRM',
        comment: 'Approved for payroll',
      },
    });
    expect(approveResponse.ok()).toBeTruthy();

    const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seed.id}`, {
      headers: adminHeaders(tokens),
    });
    expect(detail.ok()).toBeTruthy();
    const payload = await detail.json();
    const status = payload?.status ?? payload?.timesheet?.status;
    expect(status).toBe('FINAL_CONFIRMED');
  });
});
