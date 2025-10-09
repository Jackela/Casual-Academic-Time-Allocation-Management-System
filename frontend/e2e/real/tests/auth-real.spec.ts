import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { ADMIN_STORAGE, LECTURER_STORAGE, TUTOR_STORAGE } from '../utils/auth-storage';
import { acquireAuthTokens, type AuthContext } from '../../utils/workflow-helpers';

const adminHeaders = (tokens: AuthContext) => ({
  Authorization: `Bearer ${tokens.admin.token}`,
  'Content-Type': 'application/json',
});

test.describe('Persisted authentication states', () => {
  test.describe('admin session', () => {
    test.use({ storageState: ADMIN_STORAGE });

    let tokens: AuthContext;

    test.beforeAll(async ({ request }) => {
      tokens = await acquireAuthTokens(request);
    });

    test('can access protected summary endpoint without re-authenticating', async ({ request }) => {
      const response = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
        headers: adminHeaders(tokens),
      });
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('lecturer session', () => {
    test.use({ storageState: LECTURER_STORAGE });

    test('lands on lecturer dashboard', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('main-dashboard-title')).toContainText(/Lecturer Dashboard/i);
      await expect(page.getByRole('region', { name: /Pending Approvals/i })).toBeVisible();
    });
  });

  test.describe('tutor session', () => {
    test.use({ storageState: TUTOR_STORAGE });

    test('shows tutor dashboard summary', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('main-dashboard-title')).toContainText(/Tutor Dashboard/i);
      await expect(page.getByTestId('main-content')).toBeVisible();
    });
  });
});

test('login API rejects invalid credentials', async ({ request }) => {
  const response = await request.post(`${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`, {
    headers: { 'Content-Type': 'application/json' },
    data: {
      email: 'invalid@example.com',
      password: 'WrongPass123!',
    },
  });

  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body).toMatchObject({
    success: false,
  });
});

test.describe('logout behaviour', () => {
  test.use({ storageState: TUTOR_STORAGE });

  test('clears tutor session and redirects to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('logout-button')).toBeVisible();

    await page.getByTestId('logout-button').click();

    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login$/);
  });
});
