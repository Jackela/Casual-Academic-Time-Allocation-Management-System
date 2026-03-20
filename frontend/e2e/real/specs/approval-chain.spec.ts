import { test, expect } from '@playwright/test';
import BasePage from '../pages/base.page';
import { createTestDataFactory } from '../../api/test-data-factory';
import { E2E_CONFIG } from '../../config/e2e.config';

const isApprovalResponseForTimesheet = (
  response: { url(): string; request(): { method(): string; postDataJSON(): unknown } },
  timesheetId: number,
  action: string,
): boolean => {
  if (!response.url().includes('/api/approvals')) return false;
  if (response.request().method() !== 'POST') return false;
  try {
    const body = response.request().postDataJSON() as { timesheetId?: number; action?: string };
    return body?.timesheetId === timesheetId && body?.action === action;
  } catch {
    return false;
  }
};

const getStatusFromPayload = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const candidate = payload as { status?: string; timesheet?: { status?: string } };
  return candidate.status ?? candidate.timesheet?.status ?? '';
};

test.describe('@p0 US3: Approval chain', () => {
  test('draft → tutor confirm → lecturer approve → admin approve', async ({ page, request }) => {
    const base = new BasePage(page);
    const factory = await createTestDataFactory(request);
    const tokens = factory.getAuthTokens();

    try {
      const seeded = await factory.createTimesheetForTest({ targetStatus: 'DRAFT' });
      const tutorHeaders = {
        Authorization: `Bearer ${tokens.tutor.token}`,
        'Content-Type': 'application/json',
      };
      const lecturerHeaders = {
        Authorization: `Bearer ${tokens.lecturer.token}`,
        'Content-Type': 'application/json',
      };
      const adminHeaders = {
        Authorization: `Bearer ${tokens.admin.token}`,
        'Content-Type': 'application/json',
      };

      const submitDraft = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: tutorHeaders,
        data: { timesheetId: seeded.id, action: 'SUBMIT_FOR_APPROVAL', comment: 'Submit for tutor confirmation' },
      });
      expect(submitDraft.ok()).toBeTruthy();

      const tutorConfirm = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: tutorHeaders,
        data: { timesheetId: seeded.id, action: 'TUTOR_CONFIRM', comment: 'Tutor confirmed' },
      });
      expect(tutorConfirm.ok()).toBeTruthy();

      const lecturerConfirm = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: lecturerHeaders,
        data: { timesheetId: seeded.id, action: 'LECTURER_CONFIRM', comment: 'Lecturer approved' },
      });
      expect(lecturerConfirm.ok()).toBeTruthy();

      await base.goto('/dashboard?tab=pending');
      const pendingRegion = page.getByRole('region', { name: /Pending Review/i });
      await expect(pendingRegion).toBeVisible({ timeout: 20000 });
      await page
        .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET')
        .catch(() => undefined);

      const row = pendingRegion.getByTestId(`timesheet-row-${seeded.id}`);
      await expect(row).toBeVisible({ timeout: 20000 });
      const approveBtn = row
        .getByTestId('admin-final-approve-btn')
        .getByRole('button', { name: /(Final Approve|Approve)/i })
        .first();
      await expect(approveBtn).toBeVisible({ timeout: 10000 });

      const responsePromise = page.waitForResponse((r) =>
        isApprovalResponseForTimesheet(r, seeded.id, 'HR_CONFIRM'));
      await approveBtn.click();
      const approvalResponse = await responsePromise;
      expect(approvalResponse.ok()).toBeTruthy();

      await expect
        .poll(async () => {
          const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seeded.id}`, {
            headers: adminHeaders,
          });
          if (!detail.ok()) return '';
          const payload = await detail.json().catch(() => ({}));
          return getStatusFromPayload(payload);
        }, { timeout: 30000 })
        .toBe('FINAL_CONFIRMED');

      await expect
        .poll(async () => await row.count().catch(() => 0), { timeout: 30000 })
        .toBe(0);
    } finally {
      await factory.cleanupAll();
    }
  });

  test('policy check: admin approval rejected at TUTOR_CONFIRMED', async ({ request }) => {
    const factory = await createTestDataFactory(request);
    const tokens = factory.getAuthTokens();
    const adminHeaders = {
      Authorization: `Bearer ${tokens.admin.token}`,
      'Content-Type': 'application/json',
    };

    try {
      const seeded = await factory.createTimesheetForTest({ targetStatus: 'TUTOR_CONFIRMED' });
      const approvalResponse = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
        headers: adminHeaders,
        data: { timesheetId: seeded.id, action: 'HR_CONFIRM', comment: 'Admin final approval (policy check)' },
      });
      expect([400, 403, 409]).toContain(approvalResponse.status());

      await expect
        .poll(async () => {
          const detail = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${seeded.id}`, {
            headers: adminHeaders,
          });
          if (!detail.ok()) return '';
          const payload = await detail.json().catch(() => ({}));
          return getStatusFromPayload(payload);
        }, { timeout: 30000 })
        .toBe('TUTOR_CONFIRMED');
    } finally {
      await factory.cleanupAll();
    }
  });
});
