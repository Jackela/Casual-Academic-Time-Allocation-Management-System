import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import type { AuthContext } from '../../utils/workflow-helpers';

const adminHeaders = (tokens: AuthContext) => ({
  Authorization: `Bearer ${tokens.admin.token}`,
  'Content-Type': 'application/json',
});

let dataFactory: TestDataFactory;
let tokens: AuthContext;
test.beforeEach(async ({ request }) => {
  dataFactory = await createTestDataFactory(request);
  tokens = dataFactory.getAuthTokens();
});

test.afterEach(async ({ page }) => {
  await dataFactory?.cleanupAll();
  await clearAuthSessionFromPage(page);
});

test.describe('Persisted authentication states', () => {
  test.describe('admin session', () => {
    test.beforeEach(async ({ page }) => {
      await signInAsRole(page, 'admin');
    });

    test('can access protected summary endpoint without re-authenticating', async ({ request }) => {
      const response = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
        headers: adminHeaders(tokens),
      });
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('lecturer session', () => {
    test.beforeEach(async ({ page }) => {
      await signInAsRole(page, 'lecturer');
    });

    test('lands on lecturer dashboard', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('main-dashboard-title')).toContainText(/Lecturer Dashboard/i);
      await expect(page.getByRole('region', { name: /Pending Approvals/i })).toBeVisible();
    });
  });

  test.describe('tutor session', () => {
    test.beforeEach(async ({ page }) => {
      await signInAsRole(page, 'tutor');
    });

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
  test.beforeEach(async ({ page }) => {
    await signInAsRole(page, 'tutor');
  });

  test('clears tutor session and redirects to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('logout-button')).toBeVisible();

    // Trigger logout
    const logoutDone = page
      .waitForResponse((r) => r.url().includes('/api/auth/logout') && r.request().method() === 'POST')
      .catch(() => null);
    await page.getByTestId('logout-button').click();
    await logoutDone;

    // Wait until token is cleared from storage deterministically (no timeouts)
    await expect.poll(async () => {
      return await page.evaluate(() => localStorage.getItem('token'));
    }).toBeNull();

    // Force navigation to a protected route; it must redirect to login
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const loginForm = page.getByTestId('login-form');
    await expect(page).toHaveURL(/\/login(\?.*)?$/, { timeout: 15000 });
    await expect(loginForm).toBeVisible({ timeout: 8000 });
  });
});
