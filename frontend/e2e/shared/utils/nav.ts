import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForAdminUsersReady, waitForAppReady, waitForAuthAndWhoamiOk, waitForUsersListOk } from './waits';
import { attachPageDiagnostics } from './diagnostics';
import { assertAuthenticated } from './auth';

const ADMIN_USERS_PATH = '/admin/users';

export async function gotoAdminUsers(page: Page): Promise<{ path: string }> {
  attachPageDiagnostics(page);
  await page.goto(ADMIN_USERS_PATH, { waitUntil: 'domcontentloaded' });
  // Fail fast on redirect away
  await expect(page).toHaveURL(/\/admin\/users\b/, { timeout: 5000 });
  // Inline auth state probe for diagnostics before readiness checks
  await page.evaluate(() => console.log('Auth State Probe:', (window as any).__E2E_GET_AUTH__?.()));
  // Page readiness: ensure shell mounts, then route-specific marker
  await waitForAppReady(page, 'ADMIN');
  // Auth warm-up: ensure whoami resolves before first protected list call
  await waitForAuthAndWhoamiOk(page).catch(() => undefined);
  // Anchor the initial users list fetch to a successful 2xx response
  await waitForUsersListOk(page).catch(() => undefined);
  await waitForAdminUsersReady(page);
  return { path: ADMIN_USERS_PATH };
}
