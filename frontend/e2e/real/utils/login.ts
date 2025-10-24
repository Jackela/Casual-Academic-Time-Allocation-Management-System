/**
 * Programmatic login utilities for real E2E.
 * Prefers API/session storage over UI flows to improve stability.
 */
import { APIRequestContext, request, Page } from '@playwright/test';

export type UserRole = 'tutor' | 'lecturer' | 'admin';

export interface LoginOptions {
  baseURL: string;
  role: UserRole;
  username?: string;
  password?: string;
}

export async function apiLogin(opts: LoginOptions): Promise<{ cookies: any[] }>{
  const context = await request.newContext({ baseURL: opts.baseURL });
  // NOTE: Replace endpoint/fields with actual API when available.
  const res = await context.post('/api/auth/login', {
    data: {
      username:
        opts.username ??
        process.env[`E2E_${opts.role.toUpperCase()}_USER` as any] ??
        process.env[`E2E_${opts.role.toUpperCase()}_EMAIL` as any],
      password:
        opts.password ??
        process.env[`E2E_${opts.role.toUpperCase()}_PASS` as any] ??
        process.env[`E2E_${opts.role.toUpperCase()}_PASSWORD` as any],
    },
  });
  if (!res.ok()) throw new Error(`Login failed for role ${opts.role}: ${res.status()}`);
  const cookies = await context.storageState();
  await context.dispose();
  // @ts-expect-error storageState typing
  return { cookies: cookies.cookies ?? [] };
}

export async function attachSession(page: Page, baseURL: string, storageStatePath?: string) {
  // Option 1: Use saved storage state
  if (storageStatePath) {
    await page.context().addCookies(require(storageStatePath).cookies);
    return;
  }
  // Option 2: Ensure homepage sets app storage keys
  await page.goto(baseURL);
}

export default { apiLogin, attachSession };
