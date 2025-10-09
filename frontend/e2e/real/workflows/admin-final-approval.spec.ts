import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import {
  acquireAuthTokens,
  createTimesheetWithStatus,
  finalizeTimesheet,
  type AuthContext,
} from '../../utils/workflow-helpers';
import { ADMIN_STORAGE } from '../utils/auth-storage';

const uniqueDescription = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const adminHeaders = (tokens: AuthContext) => ({
  Authorization: `Bearer ${tokens.admin.token}`,
  'Content-Type': 'application/json',
});

test.use({ storageState: ADMIN_STORAGE });

test.describe('Admin Final Approval API Flow', () => {
  let tokens: AuthContext;

  test.beforeAll(async ({ request }) => {
    tokens = await acquireAuthTokens(request);
  });

  test('admin can finalise lecturer confirmed timesheet', async ({ request }) => {
    const seed = await createTimesheetWithStatus(request, tokens, {
      description: uniqueDescription('Admin Final Approve'),
      targetStatus: 'LECTURER_CONFIRMED',
    });

    try {
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
    } finally {
      await finalizeTimesheet(request, tokens, seed.id).catch(() => undefined);
    }
  });
});
