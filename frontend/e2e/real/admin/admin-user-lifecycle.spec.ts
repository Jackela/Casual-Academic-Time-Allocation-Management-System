import { test, expect, type APIResponse } from '@playwright/test';
import AdminUsersPage from '../../shared/pages/admin/AdminUsersPage';
import { waitForRoute, waitForToastSuccess, waitForVisible, waitForAdminUsersReady } from '../../shared/utils/waits';
import { assertUserResponseShape } from '../api/users.contract.helpers';
// import { ensureLoggedIn } from '../../shared/utils/auth';
import { gotoAdminUsers } from '../../shared/utils/nav';
import { E2E_CONFIG } from '../../config/e2e.config';

type AuthSnapshot = {
  isAuthenticated?: boolean;
  user?: { role?: string | null } | null;
};

type WhoAmIProbe = {
  endpoint?: string;
  ok: boolean;
  reason?: string;
  body?: unknown;
};

type AdminAuthWindow = Window & {
  __E2E_GET_AUTH__?: () => AuthSnapshot | null;
  __E2E_SESSION_STATE__?: () => AuthSnapshot | null;
};

test.describe('@p1 @admin Admin User Lifecycle – create + activate/deactivate', () => {
  // Explicit per-spec storageState binding to enforce admin role state
  // Per-test storage state setup removed; using project-level storageState instead.

test('@admin should create Tutor and toggle active state twice', async ({ page }, testInfo) => {
    // Attach lightweight diagnostics
    const requests: Array<{ method: string; url: string; status?: number }> = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/users')) {
        requests.push({ method: req.method(), url });
      }
    });
    page.on('response', (res) => {
      const req = res.request();
      const url = req.url();
      if (url.includes('/api/users')) {
        requests.push({ method: req.method(), url, status: res.status() });
      }
    });
    
    const authResult: { method: string } = { method: 'unknown' };
    let nav: { path: string } = { path: '' };
    let authStateSnapshot: AuthSnapshot | null = null;
    let whoamiProbe: WhoAmIProbe | null = null;
    const users = new AdminUsersPage(page);
    try {
      // Navigate and wait for admin users page readiness (project-level storageState provides auth)
      // Capture SPA auth state before navigating to admin/users
      authStateSnapshot = await page.evaluate(() => {
        const globalWindow = window as AdminAuthWindow;
        return globalWindow.__E2E_GET_AUTH__?.() ?? globalWindow.__E2E_SESSION_STATE__?.() ?? null;
      }).catch(() => null);
      // Attempt a whoami probe using injected token
      whoamiProbe = await page.evaluate(async (backend) => {
        try {
          const token = localStorage.getItem('token');
          const endpoints = ['/api/auth/whoami','/api/users/me','/api/me'];
          for (const rel of endpoints) {
            try {
              const res = await fetch(`${backend}${rel}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
              if (res.ok) {
                const body = await res.json().catch(() => ({} as Record<string, unknown>));
                return { endpoint: rel, ok: true, body };
              }
            } catch (error) {
              void error;
            }
          }
          return { ok: false, reason: 'no-ok-endpoint' };
        } catch (error) {
          void error;
          return { ok: false, reason: 'probe-error' };
        }
      }, E2E_CONFIG.BACKEND.URL).catch(() => null);
      // Log for trace viewer
      console.log(JSON.stringify({ AUTH_SNAPSHOT_BEFORE_NAV: { isAuthenticated: !!authStateSnapshot?.isAuthenticated, role: authStateSnapshot?.user?.role ?? null, whoami: whoamiProbe } }));
      nav = await gotoAdminUsers(page);
      await waitForAdminUsersReady(page);

    // Prepare unique test data
    const ts = Date.now();
    const email = `tutor.e2e.${ts}@example.edu`;
    const name = `Tutor E2E ${ts}`;
    const passwordTooShort = 'short7'; // 7 chars – expect server validation to reject
    const validPassword = (process.env.E2E_NEW_USER_PASSWORD && process.env.E2E_NEW_USER_PASSWORD.trim().length >= 8)
      ? String(process.env.E2E_NEW_USER_PASSWORD)
      : `Aa1!Aa1!${ts}Aa1!`; // ≥12 chars, upper/lower/digit/special (robust default)

    // 1) Negative password policy check: attempt create with too-short password
    // Accept either client-side block or server-side 400 validation
    await users.createUser({ email, name, role: 'TUTOR', password: passwordTooShort });
    const policyAlert = page.getByRole('alert').filter({ hasText: /unable to create user|password/i }).first();
    await expect(policyAlert).toBeVisible({ timeout: 8000 });
    // Reset and proceed with positive path
    await users.closeCreateModal();
    await users.openCreate();

    // 2) Positive create: fill fields, generate secure password via UI, then submit
    await users.fillCreateFields({ email, name, role: 'TUTOR' });
    await page.getByTestId('admin-user-password').fill(validPassword);
    await users.submitCreate();
    let createRes: APIResponse | null = null;
    createRes = await waitForRoute(page, { method: 'POST', pathPart: '/api/users', status: 201 });
    // From here, we have a created user
    const createJson = await createRes.json();
    assertUserResponseShape(createJson, { email, role: 'TUTOR' });

    // UI assertions: toast-success plus row visible with expected cols
    await waitForToastSuccess(page);

    const row = await users.findUserRow(email);
    await waitForVisible(row);
    await expect(row).toContainText(name);
    await expect(row).toContainText(email);
    await expect(row).toContainText(/Tutor/i);
    await expect(row).toContainText(/Active/i); // default active

    // Extract userId from response for precise toggles
    const userId: number | undefined = (createJson?.id as number | undefined) ?? undefined;
    expect(typeof userId).toBe('number');
    const fetchUserByEmail = async (): Promise<Record<string, unknown>> => {
      const lookupToken = await page.evaluate(() => localStorage.getItem('token'));
      const lookupRes = await page.request.get(
        `${E2E_CONFIG.BACKEND.URL}/api/users?email=${encodeURIComponent(email)}`,
        {
          headers: { Authorization: lookupToken ? `Bearer ${lookupToken}` : '' },
        },
      );
      expect(lookupRes.ok()).toBeTruthy();
      const lookupPayload = await lookupRes.json().catch(() => ({} as Record<string, unknown>));
      const candidates = Array.isArray(lookupPayload)
        ? lookupPayload
        : Array.isArray((lookupPayload as { content?: unknown[] }).content)
          ? (lookupPayload as { content: unknown[] }).content
          : Array.isArray((lookupPayload as { data?: unknown[] }).data)
            ? (lookupPayload as { data: unknown[] }).data
            : [lookupPayload];

      const matched = candidates.find((entry) => {
        const candidate = entry as { email?: string };
        return typeof candidate?.email === 'string'
          && candidate.email.toLowerCase() === email.toLowerCase();
      }) as Record<string, unknown> | undefined;

      const resolved = matched ?? (candidates.length === 1 ? (candidates[0] as Record<string, unknown>) : undefined);
      expect(resolved).toBeTruthy();
      return resolved as Record<string, unknown>;
    };

    // SSOT check: created user should be active in backend
    const createdBody = await fetchUserByEmail();
    // Accept either isActive or active flags
    const activeFlag = (createdBody?.isActive ?? createdBody?.active) as boolean | undefined;
    expect(activeFlag).toBe(true);

    // 3) Toggle active → inactive (PATCH 200) and assert state flips
    const deactivatePromise = waitForRoute(page, { method: 'PATCH', pathPart: `/api/users/${userId}`, status: 200 });
    await users.toggleActive(email);
    const deactivateRes = await deactivatePromise;
    expect(deactivateRes.status()).toBe(200);
    // SSOT first: verify backend reflects inactive state
    const body = await fetchUserByEmail();
    const inactiveFlag = (body?.isActive ?? body?.active) as boolean | undefined;
    expect(inactiveFlag).toBe(false);

    const deactivated = await users.findUserRow(email);
    await expect(deactivated).toContainText(/Inactive/i);
    await expect(deactivated.getByTestId('admin-user-activate-toggle')).toHaveText(/Reactivate|Updating…/i);

    // 4) Toggle inactive → active (PATCH 200) and assert state flips back
    const activatePromise = waitForRoute(page, { method: 'PATCH', pathPart: `/api/users/${userId}`, status: 200 });
    await users.toggleActive(email);
    const activateRes = await activatePromise;
    expect(activateRes.status()).toBe(200);
    // SSOT first: verify backend reflects active state
    const body2 = await fetchUserByEmail();
    const activeFlag2 = (body2?.isActive ?? body2?.active) as boolean | undefined;
    expect(activeFlag2).toBe(true);

    const activated = await users.findUserRow(email);
    await expect(activated).toContainText(/Active/i);
    await expect(activated.getByTestId('admin-user-activate-toggle')).toHaveText(/Deactivate|Updating…/i);

      // Minimal console summary for verification output
      console.log(JSON.stringify({
        route: nav.path,
        authMethod: authResult.method,
        createdEmail: email,
        createStatus: createRes.status(),
        deactivateStatus: deactivateRes.status(),
        activateStatus: activateRes.status(),
        responseShape: { id: !!userId, email: createJson?.email, role: createJson?.role },
        observed: requests,
      }));
    } catch (error) {
      // Diagnostics on failure: url, title, whoami probe, SPA auth state, screenshot and html snippet
      const url = page.url();
      const title = await page.title().catch(() => '');
      let whoami: unknown = null;
      try {
        const base = (await import('../../config/e2e.config')).E2E_CONFIG.BACKEND.URL;
        const candidates = ['/api/auth/whoami', '/api/users/me', '/api/me'];
        for (const rel of candidates) {
          const res = await page.request.get(`${base}${rel}`);
          if (res.ok()) { whoami = await res.json(); break; }
        }
      } catch (diagError) {
        void diagError; /* noop */
      }
      console.log(JSON.stringify({ diag: { url, title: String(title).slice(0, 120), whoami, authMethod: authResult.method, routeTried: nav.path, spaAuth: authStateSnapshot, whoamiProbe } }));
      try {
        await testInfo.attach('screenshot', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
      } catch (attachmentError) {
        void attachmentError;
      }
      try {
        const html = await page.content();
        await testInfo.attach('html-snippet', { body: Buffer.from(html.slice(0, 2000), 'utf-8'), contentType: 'text/html' });
      } catch (attachmentError) {
        void attachmentError;
      }
      try {
        const dbg = { spaAuth: authStateSnapshot, whoamiProbe };
        await testInfo.attach('auth-state', { body: Buffer.from(JSON.stringify(dbg, null, 2), 'utf-8'), contentType: 'application/json' });
      } catch (attachmentError) {
        void attachmentError;
      }
      throw error;
    }
  });
});
