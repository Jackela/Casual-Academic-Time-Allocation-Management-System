import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../../../config/e2e.config';

test.describe('Auth API - Logout', () => {
  test('returns 204 with valid token', async ({ request }) => {
    const loginRes = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/auth/login`, {
      data: {
        email: E2E_CONFIG.USERS.admin.email,
        password: E2E_CONFIG.USERS.admin.password,
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const token = loginJson?.token as string;
    expect(token).toBeTruthy();

    const logoutRes = await request.post(`${E2E_CONFIG.BACKEND.URL}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.status()).toBe(204);
  });
});

