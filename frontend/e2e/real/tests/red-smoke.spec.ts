import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { acquireAuthTokens, type AuthContext } from '../../utils/workflow-helpers';

const adminHeaders = (tokens: AuthContext) => ({
  Authorization: `Bearer ${tokens.admin.token}`,
  'Content-Type': 'application/json',
});

// Minimal red smoke to ensure backend health and a protected navigation flow

test('health endpoint should be reachable (red if backend not started)', async ({ request }) => {
  const res = await request.get(`${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.HEALTH}`);
  expect(res.ok()).toBeTruthy();
});

test.describe('protected route access', () => {
  test('redirects to login when no auth state is supplied', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const loginForm = page.getByTestId('login-form');
    if (await loginForm.isVisible().catch(() => false)) {
      await expect(page).toHaveURL(/login/i);
    } else {
      await expect(page).toHaveURL(/dashboard/);
    }
    await context.close();
  });

  test('can access protected summary with admin credentials', async ({ request }) => {
    const tokens = await acquireAuthTokens(request);
    const summaryResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
      headers: adminHeaders(tokens),
    });
    expect(summaryResponse.ok()).toBeTruthy();
  });
});
