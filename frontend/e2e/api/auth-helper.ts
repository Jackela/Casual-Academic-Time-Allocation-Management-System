import type { APIRequestContext, Page } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/utils/storage-keys';
import type { AuthSession, User } from '../../src/types/api';
import { E2E_CONFIG } from '../config/e2e.config';
import type { AuthContext } from '../utils/workflow-helpers';
import { LoginPage } from '../shared/pages/LoginPage';

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
  const loginPage = new LoginPage(page);

  switch (role) {
    case 'admin':
      await loginPage.loginAsAdmin({ waitUntil: 'networkidle' });
      break;
    case 'lecturer':
      await loginPage.loginAsLecturer({ waitUntil: 'networkidle' });
      break;
    case 'tutor':
      await loginPage.loginAsTutor({ waitUntil: 'networkidle' });
      break;
    default:
      throw new Error(`Unsupported role ${role as string}`);
  }
}
