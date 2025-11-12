/**
 * Programmatic login utilities for real E2E.
 * Prefers API/session storage over UI flows to improve stability.
 */
import { promises as fs } from 'node:fs';
import { request, type Page, type SetCookieParam } from '@playwright/test';
import { loginAsRole, type UserRole } from '../../api/auth-helper';

export interface LoginOptions {
  baseURL: string;
  role: UserRole;
  username?: string;
  password?: string;
}

type StorageStateFile = {
  cookies?: SetCookieParam[];
};

export async function apiLogin(opts: LoginOptions): Promise<{ cookies: SetCookieParam[] }> {
  // Use centralized helper for stable auth (axios + keepAlive under the hood)
  const ctx = await request.newContext({ baseURL: opts.baseURL });
  await loginAsRole(ctx, opts.role);
  await ctx.dispose();
  // Our app uses localStorage tokens; consumers should prefer storageState injection.
  return { cookies: [] };
}

export async function attachSession(page: Page, baseURL: string, storageStatePath?: string) {
  // Option 1: Use saved storage state
  if (storageStatePath) {
    const raw = await fs.readFile(storageStatePath, 'utf-8');
    const storage = JSON.parse(raw) as StorageStateFile;
    if (Array.isArray(storage.cookies) && storage.cookies.length > 0) {
      await page.context().addCookies(storage.cookies);
      return;
    }
  }
  // Option 2: Ensure homepage sets app storage keys
  await page.goto(baseURL);
}

export default { apiLogin, attachSession };
