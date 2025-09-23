import { test, expect } from './fixtures/base';
import { LoginPage } from './pages/LoginPage';
import { E2E_CONFIG } from './config/e2e.config';
import {
  acquireAuthTokens,
  createTimesheetWithStatus,
  finalizeTimesheet,
  type AuthContext
} from './utils/workflow-helpers';

const uniqueDescription = (label: string) => `${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

test.describe('Admin Final Approval UAT', () => {
  let tokens: AuthContext;

  test.beforeAll(async ({ request }) => {
    tokens = await acquireAuthTokens(request);
  });

  test('admin can perform final approval to complete workflow', async ({ page, request }) => {
    const description = uniqueDescription('Admin Final Approve');
    const { id } = await createTimesheetWithStatus(request, tokens, {
      description,
      targetStatus: 'LECTURER_CONFIRMED'
    });

    try {
      const loginPage = new LoginPage(page);
      await loginPage.navigateTo();
      await loginPage.loginAsAdmin();

      await page.getByRole('button', { name: 'Pending Review' }).click();
      const pendingFinalPreset = page.getByTestId('filter-preset-pending-final');
      if (await pendingFinalPreset.isVisible().catch(() => false)) {
        await pendingFinalPreset.click();
      }

      const row = page.getByTestId(`timesheet-row-${id}`);
      await expect(row).toBeVisible({ timeout: 15000 });

      const statusBadge = row.getByTestId(`status-badge-${id}`);
      await expect(statusBadge).toContainText(/Lecturer Confirmed/i);

      const approveButton = row.getByTestId(`approve-btn-${id}`);
      await expect(approveButton).toBeEnabled();

      const approvalResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/approvals') && response.request().method() === 'POST'
      );
      await approveButton.click();
      const approvalResponse = await approvalResponsePromise;
      expect(approvalResponse.ok()).toBeTruthy();

      await expect(async () => {
        const detailResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${id}`, {
          headers: { Authorization: `Bearer ${tokens.admin.token}` }
        });
        expect(detailResponse.ok()).toBeTruthy();
        const payload = await detailResponse.json();
        const status = payload?.status ?? payload?.timesheet?.status;
        expect(status).toMatch(/FINAL/i);
      }).toPass({ timeout: 15000 });

      await expect(row).not.toBeVisible({ timeout: 15000 }).catch(async () => {
        await expect(statusBadge).toContainText(/Final Confirmed|Final Approved/i);
      });
    } finally {
      await finalizeTimesheet(request, tokens, id).catch(() => undefined);
    }
  });
});
