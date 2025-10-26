import { expect, type Locator, type Page, type APIResponse } from '@playwright/test';

/**
 * Wait helpers for SPA-safe, UI-first readiness.
 *
 * Principles:
 * - Deterministic UI sentinels over network probes.
 * - Single-timeout expectations; no arbitrary sleeps.
 * - Optional diagnostics are non-blocking.
 */

export async function waitForVisible(locator: Locator, timeout = 10000): Promise<void> {
  await expect(locator).toBeVisible({ timeout });
}

export async function waitForEnabled(locator: Locator, timeout = 10000): Promise<void> {
  await expect(locator).toBeEnabled({ timeout });
}

export async function waitForToastSuccess(page: Page, timeout = 8000): Promise<void> {
  const toast = page.getByTestId('toast-success').first().or(page.getByTestId('toast').filter({ hasText: /success|created|updated/i }));
  await expect(toast).toBeVisible({ timeout });
}

export async function waitForToastGone(page: Page, timeout = 8000): Promise<void> {
  const stack = page.getByTestId('toast-stack');
  await expect(stack).toBeHidden({ timeout });
}

export function waitForRoute(
  page: Page,
  opts: { method: string; pathPart: string; status?: number; timeoutMs?: number }
): Promise<APIResponse> {
  const { method, pathPart, status, timeoutMs = 15000 } = opts;
  return page.waitForResponse(
    (res) => {
      try {
        const req = res.request();
        const urlOk = req.url().includes(pathPart);
        const methodOk = req.method().toUpperCase() === method.toUpperCase();
        const statusOk = typeof status === 'number' ? res.status() === status : true;
        return urlOk && methodOk && statusOk;
      } catch {
        return false;
      }
    },
    { timeout: timeoutMs }
  );
}

// Wait for a specific API path to return OK (2xx)
export async function waitForApiOk(
  page: Page,
  method: string,
  pathPart: string,
  timeoutMs = 10000
): Promise<void> {
  await page
    .waitForResponse(
      (res) => {
        try {
          const req = res.request();
          const urlOk = req.url().includes(pathPart);
          const methodOk = req.method().toUpperCase() === method.toUpperCase();
          return urlOk && methodOk && res.ok();
        } catch {
          return false;
        }
      },
      { timeout: timeoutMs }
    )
    .catch(() => undefined);
}

export async function waitForIdleAfter(page: Page, action: () => Promise<void>, idleMs = 250): Promise<void> {
  await action();
  // Small network idle heuristic for UI transitions; not a sleep – relies on stable expectations above
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(idleMs);
}

// App readiness: wait for role-specific shell where available
export async function waitForAppReady(page: Page, _role: 'ADMIN'|'LECTURER'|'TUTOR', timeout = 30000): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  // Ensure root mounts before looking for shell sentinels
  await page.waitForSelector('#root', { timeout: 10000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle').catch(() => undefined);

  // Combined sentinel per SPA best practices
  const shell = page.locator([
    '[data-testid="app-ready"]',
    '[data-testid="app-title"]',
    '[data-testid="dashboard-nav"]',
    '[data-testid="dashboard-main"]',
    '[data-testid="admin-dashboard"]',
    '[data-testid="lecturer-dashboard"]',
    '[data-testid="tutor-dashboard"]',
  ].join(',')).first();
  try {
    await expect(shell).toBeVisible({ timeout });
  } catch (err) {
    // One more stabilization pass after potential lazy mounting
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(shell).toBeVisible({ timeout: Math.max(5000, Math.floor(timeout / 2)) });
  }

  // Optional: wait for first whoami/profile to succeed, but don't block if app doesn't call it
  await page.waitForResponse(
    (resp) => {
      try {
        const req = resp.request();
        return (
          req.method() === 'GET' &&
          /\/api\/(auth\/whoami|users\/me|me)\b/.test(resp.url()) &&
          resp.ok()
        );
      } catch { return false; }
    },
    { timeout: Math.min(10000, timeout) }
  ).catch(() => undefined);
}

// Optional readiness: resolve on first OK whoami-like response
export async function waitForWhoAmI(page: Page, timeout = 8000): Promise<void> {
  await page.waitForResponse(
    (resp) => {
      try {
        const ok = resp.ok();
        const req = resp.request();
        const isGet = req.method().toUpperCase() === 'GET';
        const url = resp.url();
        return ok && isGet && /\/api\/(auth\/whoami|users\/me|me)\b/.test(url);
      } catch { return false; }
    },
    { timeout }
  );
}

// Admin Users page readiness: any of key elements present
export async function waitForAdminUsersReady(page: Page, timeout = 15000): Promise<void> {
  // Combined sentinel: prefer explicit route marker; fall back to table/create button or heading
  const route = page
    .locator('[data-testid="admin-users-ready"], [data-testid="admin-users-table"], [data-testid="admin-user-create-btn"]')
    .first()
    .or(page.getByRole('heading', { name: /User Management/i }));
  await expect(route.first()).toBeVisible({ timeout });
}

// Convenience: wait until GET /api/users yields a 2xx response once (handles auth warmup)
export async function waitForUsersListOk(page: Page, timeout = 10000): Promise<void> {
  await waitForApiOk(page, 'GET', '/api/users', timeout);
}

// Auth warm-up: ensure whoami returns 200 before first protected list call
export async function waitForAuthAndWhoamiOk(page: Page, timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    attempt += 1;
    try {
      const res = await page.request.get('/api/whoami');
      if (res.ok()) return true;
    } catch {}
    // bounded backoff, capped small; this helper is only used once per spec after navigation
    const backoff = Math.min(250 + attempt * 100, 600);
    try { await page.waitForTimeout(backoff); } catch {}
  }
  return false;
}

// Optional micro-stability after sentinel; never a primary wait
export async function waitForStableVisible(locator: Locator, windowMs = 400): Promise<boolean> {
  const page: Page | undefined = (locator as any).page?.() as any;
  const start = Date.now();
  while (Date.now() - start < windowMs) {
    const ok = await locator.isVisible().catch(() => false);
    if (!ok) return false;
    try { await page?.waitForTimeout?.(50); } catch {}
  }
  return true;
}
