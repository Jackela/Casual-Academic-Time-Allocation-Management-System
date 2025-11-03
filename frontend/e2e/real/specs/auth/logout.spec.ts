import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../../../config/e2e.config';
import { loginAsRole } from '../../../api/auth-helper';

test.describe('Auth API - Logout', () => {
  test('returns 204 with valid token', async ({ request, page }) => {
    const { token } = await loginAsRole(page.request, 'admin');
    const logoutRes = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.status()).toBe(204);
  });
});
