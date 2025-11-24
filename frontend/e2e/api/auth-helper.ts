import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import type { APIRequestContext, Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { STORAGE_KEYS } from '../../src/utils/storage-keys';
import type { AuthSession, User } from '../../src/types/api';
import type { SessionState } from '../../src/types/auth';
import { E2E_CONFIG } from '../config/e2e.config';
import type { AuthContext } from '../utils/workflow-helpers';

export type UserRole = keyof typeof E2E_CONFIG.USERS;

export interface RoleAuthSession extends AuthSession {
  role: UserRole;
}

export type RoleSessionMap = Record<UserRole, RoleAuthSession>;

const LOGIN_ENDPOINT = `${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`;

function getKeepAliveAgents(targetUrl: string) {
  const url = new URL(targetUrl);
  const isHttps = url.protocol === 'https:';
  const httpAgent = new http.Agent({ keepAlive: true });
  const httpsAgent = new https.Agent({ keepAlive: true });
  return isHttps ? { httpsAgent } : { httpAgent };
}

type RawAuthResponse =
  | AuthSession
  | {
      success?: boolean;
      message?: string;
      data?: AuthSession | null;
    }
  | {
      token?: string;
      refreshToken?: string | null;
      expiresAt?: number | null;
      user?: Partial<User>;
      [key: string]: unknown;
    };

const sanitizeUser = (role: UserRole, input: Partial<User> | undefined): User => {
  if (!input?.id) {
    throw new Error(`Authentication response missing user id for role "${role}"`);
  }

  const fallbackName =
    [input.firstName, input.lastName].filter(Boolean).join(' ').trim() ||
    input.email ||
    role;
  const resolvedName = input.name ?? fallbackName;

  const normalizedRole = (input.role ??
    role.toUpperCase()) as User['role'];

  return {
    id: Number(input.id),
    email: String(input.email ?? `${role}@example.com`),
    name: resolvedName,
    role: normalizedRole,
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: input.displayName ?? resolvedName,
  };
};

const extractSession = (payload: RawAuthResponse, role: UserRole): AuthSession => {
  const source =
    (typeof payload === 'object' && payload !== null && 'data' in payload
      ? (payload as { data?: AuthSession | null }).data ?? payload
      : payload) as Record<string, unknown>;

  const token = source.token ?? source['accessToken'];
  const refreshToken = source.refreshToken ?? source['refresh_token'] ?? null;
  const expiresAt = source.expiresAt ?? source['expires_at'] ?? null;
  const user = sanitizeUser(role, source.user as Partial<User> | undefined);

  if (!token || typeof token !== 'string') {
    throw new Error(`Authentication response missing token for role "${role}"`);
  }

  return {
    token,
    refreshToken: refreshToken === undefined ? null : (refreshToken as string | null),
    expiresAt: typeof expiresAt === 'number' ? expiresAt : expiresAt ? Number(expiresAt) : null,
    user,
  };
};

export const roleCredentials = (role: UserRole) => {
  const credentials = E2E_CONFIG.USERS[role];
  if (!credentials) {
    throw new Error(`No credentials configured for role "${role}"`);
  }
  return credentials;
};

export async function loginAsRole(
  request: APIRequestContext,
  role: UserRole,
): Promise<RoleAuthSession> {
  const skip = String(process.env.E2E_SKIP_REAL_LOGIN || '').toLowerCase();
  if (['1','true','yes','y'].includes(skip)) {
    const creds = roleCredentials(role);
    const idMap: Record<UserRole, number> = { admin: 1, lecturer: 2, tutor: 3 } as const;
    const user: User = {
      id: idMap[role] ?? 0,
      email: creds.email,
      name: role,
      role: role.toUpperCase() as User['role'],
      firstName: role,
      lastName: 'Mock',
      displayName: `${role} Mock`,
    };
    return { token: `mock-${role}-token`, refreshToken: null, expiresAt: null, user, role };
  }
  const { email, password } = roleCredentials(role);
  const agents = getKeepAliveAgents(LOGIN_ENDPOINT);
  const axiosResp = await axios.post(LOGIN_ENDPOINT, { email, password }, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 15000,
    ...agents,
    // Avoid proxy/DNS oddities in some envs
    transitional: { clarifyTimeoutError: true },
    validateStatus: () => true,
  });

  if (axiosResp.status < 200 || axiosResp.status >= 300) {
    const bodyTxt = typeof axiosResp.data === 'string' ? axiosResp.data : JSON.stringify(axiosResp.data);
    throw new Error(`Login failed for ${role} (${email}): ${axiosResp.status} ${bodyTxt?.slice(0,200)}`);
  }

  const body = axiosResp.data as RawAuthResponse;
  const session = extractSession(body, role);
  return { ...session, role };
}

export async function loginAllRoles(request: APIRequestContext): Promise<RoleSessionMap> {
  const [admin, lecturer, tutor] = await Promise.all([
    loginAsRole(request, 'admin'),
    loginAsRole(request, 'lecturer'),
    loginAsRole(request, 'tutor'),
  ]);
  return { admin, lecturer, tutor };
}

export function toAuthContext(sessions: RoleSessionMap): AuthContext {
  return {
    admin: { token: sessions.admin.token, userId: sessions.admin.user.id },
    lecturer: { token: sessions.lecturer.token, userId: sessions.lecturer.user.id },
    tutor: { token: sessions.tutor.token, userId: sessions.tutor.user.id },
  };
}

export async function clearAuthSessionFromPage(page: Page): Promise<void> {
  if (page.isClosed()) return;

  await page.evaluate(keys => {
    window.localStorage.removeItem(keys.TOKEN);
    window.localStorage.removeItem(keys.USER);
    window.localStorage.removeItem(keys.REFRESH_TOKEN);
    window.localStorage.removeItem(keys.TOKEN_EXPIRY);
  }, STORAGE_KEYS).catch(() => undefined);
}

export async function signInAsRole(page: Page, role: UserRole): Promise<void> {
  const session = await loginAsRole(page.request, role);
  // Prefer early injection; tolerate page/context closure and fall back to runtime set
  try {
    await page.addInitScript(({ keys, sess }) => {
      try {
        if (localStorage.getItem('__E2E_DISABLE_AUTH_SEED__') === '1') return;
        localStorage.setItem(keys.TOKEN, sess.token);
        localStorage.setItem(keys.USER, JSON.stringify(sess.user));
        if (sess.refreshToken) {
          localStorage.setItem(keys.REFRESH_TOKEN, sess.refreshToken);
        } else {
          localStorage.removeItem(keys.REFRESH_TOKEN);
        }
        if (typeof sess.expiresAt === 'number') {
          localStorage.setItem(keys.TOKEN_EXPIRY, String(sess.expiresAt));
        } else {
          localStorage.removeItem(keys.TOKEN_EXPIRY);
        }
      } catch (error) {
        void error; // swallow to allow runtime fallback
      }
    }, { keys: STORAGE_KEYS, sess: session });
  } catch (error) {
    // Fallback: will set storage after navigation below
    void error;
  }

  // Navigate; then ensure storage is set even if addInitScript was skipped
  await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  try {
    await page.evaluate(({ keys, sess }) => {
      try {
        localStorage.setItem(keys.TOKEN, sess.token);
        localStorage.setItem(keys.USER, JSON.stringify(sess.user));
      } catch (error) {
        void error;
      }
    }, { keys: STORAGE_KEYS, sess: session });
  } catch (error) {
    void error;
  }
}

/**
 * Sign in via UI login page for presentation demos
 * 
 * @param page - Playwright page instance
 * @param role - User role to sign in as
 * @param options - Optional configuration for login behavior
 * @param options.pauseAfterLogin - Milliseconds to pause after successful login (default: 2000)
 * @param options.showTyping - Show typing animation for email input (default: false)
 * @param options.typingDelay - Delay between keystrokes in ms (default: 100)
 */
export async function signInViaUI(
  page: Page,
  role: UserRole,
  options: {
    pauseAfterLogin?: number;
    showTyping?: boolean;
    typingDelay?: number;
  } = {}
): Promise<void> {
  const {
    pauseAfterLogin = 2000,
    showTyping = false,
    typingDelay = 100,
  } = options;

  const credentials = roleCredentials(role);
  
  console.log(`\n🎬 NARRATION CUE: "Logging in as ${role.toUpperCase()}..."`);
  
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  
  // Wait for login form to be visible
  const loginForm = page.getByTestId('login-form');
  await loginForm.waitFor({ state: 'visible', timeout: 10000 });
  
  // Fill email (with optional typing animation)
  const emailInput = page.getByLabel(/email/i);
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  
  if (showTyping) {
    // Type with visible animation
    await emailInput.click();
    await emailInput.type(credentials.email, { delay: typingDelay });
  } else {
    // Fast fill
    await emailInput.fill(credentials.email);
  }
  
  // Fill password (always fast for security)
  const passwordInput = page.getByLabel(/password/i);
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(credentials.password);
  
  // Click login button
  const loginButton = page.getByRole('button', { name: /sign in|login/i });
  await loginButton.waitFor({ state: 'visible', timeout: 5000 });
  await loginButton.click();
  
  // Wait for successful navigation to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  
  console.log(`✅ Logged in as ${role.toUpperCase()}`);
  
  // Pause after login for audience to observe
  if (pauseAfterLogin > 0) {
    await page.waitForTimeout(pauseAfterLogin);
  }
}

/**
 * Sign out via UI logout button for presentation demos
 * 
 * @param page - Playwright page instance
 * @param options - Optional configuration for logout behavior
 * @param options.pauseAfterLogout - Milliseconds to pause after successful logout (default: 1500)
 */
export async function signOutViaUI(
  page: Page,
  options: { pauseAfterLogout?: number } = {}
): Promise<void> {
  const { pauseAfterLogout = 1500 } = options;
  
  console.log(`\n🎬 NARRATION CUE: "Logging out to switch roles..."`);
  
  // Dismiss any blocking modals first (especially lecturer create modal)
  await dismissBlockingModals(page);
  
  // Find logout button (try multiple selectors)
  const logoutButton = page.getByTestId('logout-button')
    .or(page.getByRole('button', { name: /logout|sign out/i }));
  
  // Ensure button is visible and clickable
  await logoutButton.waitFor({ state: 'visible', timeout: 10000 });
  await logoutButton.scrollIntoViewIfNeeded().catch(() => undefined);
  
  // Click logout button
  await logoutButton.click();
  
  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: 10000 });
  
  console.log(`✅ Logged out successfully`);
  
  // Pause after logout for audience to observe
  if (pauseAfterLogout > 0) {
    await page.waitForTimeout(pauseAfterLogout);
  }
}

/**
 * Helper function to dismiss blocking modals (aggressive multi-strategy approach)
 */
async function dismissBlockingModals(page: Page): Promise<void> {
  // Try multiple strategies to dismiss modals
  
  // Strategy 1: Set localStorage flag to prevent auto-open
  await page.evaluate(() => {
    window.localStorage.setItem('__E2E_DISABLE_LECTURER_MODAL__', '1');
  }).catch(() => undefined);
  
  // Strategy 2: Press Escape key multiple times
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
  }
  
  // Strategy 3: Click close button if exists
  const closeButton = page.locator('[data-testid$="modal"] button').filter({ hasText: /cancel|close|×/i });
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(500);
  }
  
  // Strategy 4: Click backdrop overlay to close modal
  const backdrop = page.locator('[data-testid$="modal"]').first();
  if (await backdrop.isVisible().catch(() => false)) {
    await backdrop.click({ position: { x: 5, y: 5 }, force: true }).catch(() => undefined);
    await page.waitForTimeout(500);
  }
  
  // Final verification: wait for all modals to be hidden
  await page.waitForTimeout(1000);
}

/**
 * Programmatic-only API login that persists a working storageState for ADMIN.
 * - Discovers login endpoint among candidates and authenticates using env creds.
 * - Persists synthetic storageState with localStorage token+user for the frontend origin.
 * - Returns details for reporting.
 */
export async function programmaticLoginApi(role: UserRole): Promise<{ ok: true; endpoint: string; persisted: 'jwt'; session: AuthSession }>{
  const skip = String(process.env.E2E_SKIP_REAL_LOGIN || '').toLowerCase();
  if (['1','true','yes','y'].includes(skip)) {
    // Synthesize a mock session without network calls
    const creds = roleCredentials(role);
    const idMap: Record<UserRole, number> = { admin: 1, lecturer: 2, tutor: 3 } as const;
    const session: AuthSession = {
      token: `mock-${role}-token`,
      refreshToken: null,
      expiresAt: null,
      user: {
        id: idMap[role] ?? 0,
        email: creds.email,
        name: role,
        role: role.toUpperCase() as User['role'],
        firstName: role,
        lastName: 'Mock',
        displayName: `${role} Mock`,
      },
    };
    // Persist synthetic storage state for frontend origin
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const AUTH_DIR = path.resolve(__dirname, '../shared/.auth');
    const STORAGE_STATE_FILE = path.resolve(AUTH_DIR, 'storageState.json');
    await fs.mkdir(AUTH_DIR, { recursive: true });
    const storageState: SessionState = {
      origins: [
        {
          origin: E2E_CONFIG.FRONTEND.URL,
          localStorage: [
            { name: STORAGE_KEYS.TOKEN, value: session.token },
            { name: STORAGE_KEYS.USER, value: JSON.stringify(session.user) },
          ],
        },
      ],
    } as unknown as SessionState;
    await fs.writeFile(STORAGE_STATE_FILE, JSON.stringify(storageState, null, 2), 'utf8');
    return { ok: true, endpoint: 'mock', persisted: 'jwt', session };
  }
  const creds = roleCredentials(role);
  const candidates = [
    `${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`,
    `${E2E_CONFIG.BACKEND.URL}/api/login`,
    `${E2E_CONFIG.BACKEND.URL}/auth/login`,
  ];

  let endpointUsed = '';
  let session: AuthSession | null = null;
  for (const candidate of candidates) {
    try {
      const agents = getKeepAliveAgents(candidate);
      const res = await axios.post(candidate, { email: creds.email, password: creds.password }, {
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        timeout: 15000,
        validateStatus: () => true,
        ...agents,
      });
      if (res.status < 200 || res.status >= 300) continue;
      const raw = res.data;
      const extracted = extractSession(raw, role);
      session = extracted;
      endpointUsed = candidate;
      break;
    } catch (error) {
      // Try the next candidate endpoint on error
      void error;
    }
  }

  if (!session || !endpointUsed) {
    throw new Error(`Programmatic login failed for role ${role}; no candidate endpoint succeeded.`);
  }

  // Persist synthetic storageState with localStorage for the frontend origin
  const frontendUrl = new URL(E2E_CONFIG.FRONTEND.URL);
  const origin = `${frontendUrl.protocol}//${frontendUrl.host}`;
  const state = {
    cookies: [] as Array<unknown>,
    origins: [
      {
        origin,
        localStorage: [
          { name: STORAGE_KEYS.TOKEN, value: session.token },
          { name: STORAGE_KEYS.USER, value: JSON.stringify(session.user) },
        ],
      },
    ],
  };

  const __filename = fileURLToPath(import.meta.url);
  const authRoot = path.resolve(path.dirname(__filename), '..', 'shared', '.auth');
  const outFile = path.resolve(authRoot, `${role}.json`);
  await fs.mkdir(authRoot, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(state, null, 2), 'utf-8');

  return { ok: true, endpoint: endpointUsed, persisted: 'jwt', session } as const;
}
