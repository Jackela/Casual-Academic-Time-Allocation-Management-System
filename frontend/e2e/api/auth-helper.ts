import { request as pwRequest } from '@playwright/test';
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
  const response = await request.post(LOGIN_ENDPOINT, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${role} (${email}): ${response.status()} ${await response.text()}`);
  }

  const body = (await response.json()) as RawAuthResponse;
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
  // Ensure token is available before any app scripts run so api client picks it up on init
  await page.addInitScript(({ keys, sess }) => {
    try {
      // Allow tests/app to disable auth seeding for logout flows
      if (localStorage.getItem('__E2E_DISABLE_AUTH_SEED__') === '1') {
        return;
      }
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
    } catch {}
  }, { keys: STORAGE_KEYS, sess: session });

  // Navigate fresh with injected storage to let app initialize with token
  await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`, { waitUntil: 'domcontentloaded' });
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

  const ctx = await pwRequest.newContext();
  let endpointUsed = '';
  let session: AuthSession | null = null;
  for (const candidate of candidates) {
    try {
      const res = await ctx.post(candidate, {
        headers: { 'Content-Type': 'application/json' },
        data: { email: creds.email, password: creds.password },
      });
      if (!res.ok()) continue;
      const raw = await res.json();
      const extracted = extractSession(raw, role);
      session = extracted;
      endpointUsed = candidate;
      break;
    } catch {
      // try next
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

  await ctx.dispose();
  return { ok: true, endpoint: endpointUsed, persisted: 'jwt', session } as const;
}
