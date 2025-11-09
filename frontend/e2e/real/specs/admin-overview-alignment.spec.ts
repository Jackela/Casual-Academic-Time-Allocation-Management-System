import { test, expect } from '@playwright/test';
import { signInAsRole } from '../../api/auth-helper';
import { E2E_CONFIG } from '../../config/e2e.config';

// Creates a few LECTURER_CONFIRMED rows via API if needed would be better, but we rely on seeded data here.

test.describe('@p1 @admin Admin Overview Alignment', () => {
  test('Pending Approvals card equals dashboard summary pendingApprovals', async ({ page, request }) => {
    await signInAsRole(page, 'admin');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Read value from the Pending Approvals card
    const card = page.getByTestId('pending-approvals-card');
    await expect(card).toBeVisible();
    const valueEl = card.locator('div.text-2xl.font-bold');
    await expect(valueEl).toHaveText(/\b\d+\b/, { timeout: 20000 });
    const cardValueText = await valueEl.textContent();
    const pendingFromCard = Number((cardValueText ?? '').match(/\b(\d+)\b/)?.[1] ?? '0');

    // Read dashboard summary (source of AdminMetricsPanel metrics)
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const summaryResp = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    });
    expect(summaryResp.ok()).toBeTruthy();
    const summary = await summaryResp.json();
    const pendingFromSummary = typeof summary?.pendingApprovals === 'number'
      ? summary.pendingApprovals
      : (typeof summary?.pendingApproval === 'number' ? summary.pendingApproval : 0);

    expect(pendingFromCard).toBe(pendingFromSummary);
  });
});
