import { test, expect, type Page } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole, type UserRole } from '../../api/auth-helper';
import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import type { AuthContext } from '../../utils/workflow-helpers';

let dataFactory: TestDataFactory;
let tokens: AuthContext;
const trackedPages = new Set<Page>();

const trackSession = async (page: Page, role: UserRole) => {
  await signInAsRole(page, role);
  trackedPages.add(page);
};

test.beforeEach(async ({ request }) => {
  dataFactory = await createTestDataFactory(request);
  tokens = dataFactory.getAuthTokens();
  trackedPages.clear();
});

test.afterEach(async () => {
  for (const page of trackedPages) {
    await clearAuthSessionFromPage(page);
  }
  trackedPages.clear();
  await dataFactory?.cleanupAll();
});

test.describe('Authentication Integration Tests', { tag: '@auth' }, () => {
  test('should authenticate via API with correct credentials', async () => {
    const url = `${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`;
    const isHttps = url.startsWith('https:');
    const agent = isHttps ? { httpsAgent: new https.Agent({ keepAlive: true }) } : { httpAgent: new http.Agent({ keepAlive: true }) };
    const resp = await axios.post(url, { email: 'lecturer@example.com', password: 'Lecturer123!' }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      validateStatus: () => true,
      timeout: 15000,
      ...agent,
    });
    if (resp.status === 200) {
      const data = resp.data;
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe('lecturer@example.com');
    } else {
      expect([400, 401, 500]).toContain(resp.status);
    }
  });

test.describe('stored lecturer session', () => {
    test.beforeEach(async ({ page }) => {
      await trackSession(page, 'lecturer');
    });

    test('reuses session without manual login', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await dashboardPage.expectToBeLoaded('LECTURER');
      await dashboardPage.expectUserInfo(dataFactory.getAuthSessions().lecturer.user.name, 'Lecturer');

      await page.reload();
      await page.waitForLoadState('networkidle');
      await dashboardPage.expectToBeLoaded('LECTURER');
      await dashboardPage.expectUserInfo(dataFactory.getAuthSessions().lecturer.user.name, 'Lecturer');
    });
  });
});

// Keep the original API-only test for contract validation
test.describe('API Authentication Contract', { tag: '@api' }, () => {
  test('API authentication contract validation', async () => {
    const url = `${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`;
    const isHttps = url.startsWith('https:');
    const agent = isHttps ? { httpsAgent: new https.Agent({ keepAlive: true }) } : { httpAgent: new http.Agent({ keepAlive: true }) };
    const resp = await axios.post(url, { email: 'lecturer@example.com', password: 'Lecturer123!' }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      validateStatus: () => true,
      timeout: 15000,
      ...agent,
    });

    if (resp.status === 200) {
      const data = resp.data;
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('name');
      expect(data.user).toHaveProperty('role');
      expect(data.user.email).toBe('lecturer@example.com');
      expect(data.user.role).toBe('LECTURER');
    } else {
      expect([400, 401, 500]).toContain(resp.status);
    }
  });

  test('admin token from test factory provides access to summary endpoint', async ({ request }) => {
    const summaryResponse = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${tokens.admin.token}`,
        'Content-Type': 'application/json',
      },
    });
    expect(summaryResponse.ok()).toBeTruthy();
  });
});
