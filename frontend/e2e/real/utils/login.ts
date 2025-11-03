/**
 * Programmatic login utilities for real E2E.
 * Prefers API/session storage over UI flows to improve stability.
 */
import { APIRequestContext, request, Page } from '@playwright/test';
import { loginAsRole } from '../../api/auth-helper';

export type UserRole = 'tutor' | 'lecturer' | 'admin';

export interface LoginOptions {
  baseURL: string;
  role: UserRole;
  username?: string;
  password?: string;
}

export async function apiLogin(opts: LoginOptions): Promise<{ cookies: any[] }>{
  // Use centralized helper for stable auth (axios + keepAlive under the hood)
  const ctx = await request.newContext({ baseURL: opts.baseURL });
  await loginAsRole(ctx, opts.role as any);
  await ctx.dispose();
  // Our app uses localStorage tokens; consumers should prefer storageState injection.
  return { cookies: [] };
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
