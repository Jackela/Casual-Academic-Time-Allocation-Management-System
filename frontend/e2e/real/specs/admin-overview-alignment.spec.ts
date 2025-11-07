import { test, expect } from '@playwright/test';
import { signInAsRole } from '../../api/auth-helper';

// Creates a few LECTURER_CONFIRMED rows via API if needed would be better, but we rely on seeded data here.

test.describe('@p1 @admin Admin Overview Alignment', () => {
  test('Pending Approvals card equals admin pending list', async ({ page, request }) => {
    await signInAsRole(page, 'admin');
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Read value from the Pending Approvals card
    const card = page.getByTestId('pending-approvals-card');
    await expect(card).toBeVisible();
    // The value is inside a div with big font; fallback to extract first integer
    const cardText = await card.textContent();
    const match = cardText?.match(/\b(\d+)\b/);
    expect(match).toBeTruthy();
    const pendingFromCard = Number(match![1]);

    // Read backend queue length (Admin only)
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const resp = await request.get('http://localhost:8080/api/approvals/pending', {
      headers: { Authorization: token ? Bearer  : '' }
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const pendingFromApi = Array.isArray(body) ? body.length : (Array.isArray(body?.timesheets) ? body.timesheets.length : 0);

    expect(pendingFromCard).toBe(pendingFromApi);
  });
});
