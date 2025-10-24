import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_CONFIG } from '../../config/e2e.config';
import { STORAGE_KEYS } from '../../../src/utils/storage-keys';
import { loginAsRole, programmaticLoginApi, type UserRole } from '../../api/auth-helper';
// No UI login fallback allowed for e2e programmatic auth
import { waitForWhoAmI } from './waits';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_ROOT = path.resolve(__dirname, '..', '.auth');

const roleStatePath = (role: UserRole) => path.resolve(AUTH_ROOT, `${role}.json`);

/**
 * Persist the current browser storage state for a given role.
 * Used to speed up subsequent tests by reusing authenticated state.
 */
async function persistState(page: Page, role: UserRole) {
  try {
    const p = roleStatePath(role);
    await page.context().storageState({ path: p });
  } catch {
    // ignore
  }
}

/**
 * Lightweight UI-only check that the dashboard shell renders for an authenticated user.
 * Avoids making server calls; relies on UI sentinels.
 */
async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const sentinel = page.getByTestId('dashboard-sidebar').first();
    await expect(sentinel).toBeVisible({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function applyLocalStorage(page: Page, token: string, userJson: string) {
  await page.goto(E2E_CONFIG.FRONTEND.URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ keys, tokenValue, userValue }) => {
    try {
      localStorage.setItem(keys.TOKEN, tokenValue);
      localStorage.setItem(keys.USER, userValue);
    } catch {}
  }, { keys: STORAGE_KEYS, tokenValue: token, userValue: userJson });
}

function readTokenFromStateFile(filePath: string): { token?: string; user?: string } {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }> };
    const ls = parsed.origins?.[0]?.localStorage ?? [];
    const token = ls.find((e) => e.name === 'token')?.value;
    const user = ls.find((e) => e.name === 'user')?.value;
    return { token, user };
  } catch {
    return {};
  }
}

/**
 * Ensure the page is logged in as the specified role using storageState when available,
 * otherwise performing programmatic login and injecting a test-only init script.
 */
export async function ensureLoggedIn(page: Page, role: 'ADMIN'|'LECTURER'|'TUTOR') {
  // Build an init script that seeds localStorage and triggers app auth wiring as early as possible.
  const addAuthInitScript = async (authMethod: 'storageState'|'programmatic', sessionData: { token: string; user: any; refreshToken?: string|null; expiresAt?: number|null }) => {
    const sessionJson = JSON.stringify(sessionData)
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/<\//g, '<\\/');
    const content = `(() => { try {
      const sessionData = JSON.parse(\`${sessionJson}\`);
      const method = ${JSON.stringify(authMethod)};
      try {
        localStorage.setItem(${JSON.stringify(STORAGE_KEYS.TOKEN)}, sessionData.token);
        localStorage.setItem(${JSON.stringify(STORAGE_KEYS.USER)}, JSON.stringify(sessionData.user));
        if (sessionData.refreshToken) localStorage.setItem(${JSON.stringify(STORAGE_KEYS.REFRESH_TOKEN)}, sessionData.refreshToken);
        if (typeof sessionData.expiresAt === 'number') localStorage.setItem(${JSON.stringify(STORAGE_KEYS.TOKEN_EXPIRY)}, String(sessionData.expiresAt));
      } catch {}
      const g = window;
      try {
        // Set pending session immediately so the app can consume it when ready
        g.__E2E_PENDING_SESSION__ = sessionData;
        if (g.__E2E_SET_AUTH__) {
          g.__E2E_SET_AUTH__(sessionData);
          try { console.log('E2E init auth applied via SET_AUTH'); } catch {}
        } else {
          // Poll for up to 5s for __E2E_SET_AUTH__ to become available
          const started = Date.now();
          const h = setInterval(() => {
            try {
              if (typeof g.__E2E_SET_AUTH__ === 'function') {
                g.__E2E_SET_AUTH__(sessionData);
                try { console.log('E2E init auth applied via SET_AUTH'); } catch {}
                clearInterval(h);
              } else if (Date.now() - started > 5000) {
                clearInterval(h);
              }
            } catch { clearInterval(h); }
          }, 100);
          // Also attempt on DOMContentLoaded as a fallback
          try {
            document.addEventListener('DOMContentLoaded', () => {
              try {
                if (typeof g.__E2E_SET_AUTH__ === 'function') {
                  g.__E2E_SET_AUTH__(sessionData);
                  try { console.log('E2E init auth applied via SET_AUTH (DOMContentLoaded)'); } catch {}
                }
              } catch {}
            }, { once: true });
          } catch {}
        }
      } catch {}
      try { console.log('E2E init auth injected:', { method, hasToken: !!sessionData?.token, role: sessionData?.user?.role }); } catch {}
    } catch {} })();`;
    await page.context().addInitScript({ content });
  };

  const roleKey: UserRole = role.toLowerCase() as UserRole;
  const statePath = roleStatePath(roleKey);

  // 1) Try role storage state file without navigating first
  if (fs.existsSync(statePath)) {
    const { token, user } = readTokenFromStateFile(statePath);
    if (token && user) {
      const session = { token, user: JSON.parse(user), refreshToken: null as string | null, expiresAt: null as number | null };
      await addAuthInitScript('storageState', session);
      await page.goto(E2E_CONFIG.FRONTEND.URL, { waitUntil: 'domcontentloaded' });
      // Wait until app reflects authenticated state via auth manager
      await page.waitForFunction(() => {
        const g = window as any;
        const state = g.__E2E_AUTH_MANAGER_STATE__?.() ?? g.__E2E_SESSION_STATE__?.();
        return !!(state && state.isAuthenticated);
      }, null, { timeout: 5000 }).catch(() => undefined);
      await waitForWhoAmI(page).catch(() => undefined);
      const ok = await assertAuthenticated(page, role);
      if (ok) {
        await persistState(page, roleKey);
        return { method: 'storageState' } as const;
      }
      // If not ok, fallthrough to programmatic
    }
  }

  // 2) Programmatic login via API and inject via init script prior to first navigation
  const result = await programmaticLoginApi(roleKey);
  await addAuthInitScript('programmatic', {
    token: result.session.token,
    user: result.session.user,
    refreshToken: result.session.refreshToken ?? null,
    expiresAt: result.session.expiresAt ?? null,
  });
  await page.goto(E2E_CONFIG.FRONTEND.URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const g = window as any;
    const state = g.__E2E_AUTH_MANAGER_STATE__?.() ?? g.__E2E_SESSION_STATE__?.();
    return !!(state && state.isAuthenticated);
  }, null, { timeout: 5000 }).catch(() => undefined);
  await waitForWhoAmI(page).catch(() => undefined);
  await assertAuthenticated(page, role);
  return { method: 'programmatic' } as const;
}

/**
 * Assert the SPA considers the session authenticated for the given role.
 * UI-first check with optional non-blocking whoami diagnostics.
 */
export async function assertAuthenticated(page: Page, role: 'ADMIN'|'LECTURER'|'TUTOR'): Promise<boolean> {
  // 1) SPA session probe (support multiple keys) — quick path
  const spaOk = await page.evaluate(() => {
    const g = window as any;
    const state = g.__E2E_SESSION_STATE__?.() ?? g.__E2E_AUTH_MANAGER_STATE__?.() ?? g.E2E_SESSION_STATE ?? null;
    return state && (state.isAuthenticated === true || state.status === 'authenticated');
  }).catch(() => false);
  if (spaOk) return true;

  // 1a) Give SPA up to 15s to flip authenticated state before falling back to whoami
  await page
    .waitForFunction(() => {
      try {
        const g = window as any;
        const state = g.__E2E_AUTH_MANAGER_STATE__?.() ?? g.__E2E_SESSION_STATE__?.();
        return !!(state && (state.isAuthenticated === true || state.status === 'authenticated'));
      } catch { return false }
    }, null, { timeout: 15000 })
    .catch(() => undefined);

  const spaOkAfterWait = await page.evaluate(() => {
    const g = window as any;
    const state = g.__E2E_SESSION_STATE__?.() ?? g.__E2E_AUTH_MANAGER_STATE__?.() ?? g.E2E_SESSION_STATE ?? null;
    return state && (state.isAuthenticated === true || state.status === 'authenticated');
  }).catch(() => false);
  if (spaOkAfterWait) return true;

  // 2) UI sentinel fallback — do not block on server probes
  try {
    const shell = page.locator('[data-testid="app-ready"], [data-testid="app-title"], [data-testid="dashboard-nav"], [data-testid="dashboard-main"]').first();
    await expect(shell).toBeVisible({ timeout: 5000 });
    return true;
  } catch {
    // As a last resort, make a single non-blocking whoami probe for diagnostics only
    try { await waitForWhoAmI(page, 2000); } catch {}
    return false;
  }
}
