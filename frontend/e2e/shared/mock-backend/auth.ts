import type { Page } from '@playwright/test';
import { STORAGE_KEYS } from '../../../src/utils/storage-keys';
import { E2E_CONFIG } from '../../config/e2e.config';
import {
  createMockAuthBundle,
  type MockAuthBundle,
  type MockAuthSession,
  type MockUserRole,
} from '../../fixtures/base';

export interface MockAuthSetupOptions {
  storage?: boolean;
  routeLogin?: boolean;
  applyImmediately?: boolean;
}

type StoragePayload = {
  session: Required<Pick<MockAuthSession, 'token' | 'user' | 'expiresAt'>> & {
    refreshToken: string | null;
  };
  storageKeys: typeof STORAGE_KEYS;
};

const STORAGE_KEYS_PAYLOAD: typeof STORAGE_KEYS = {
  TOKEN: STORAGE_KEYS.TOKEN,
  USER: STORAGE_KEYS.USER,
  REFRESH_TOKEN: STORAGE_KEYS.REFRESH_TOKEN,
  TOKEN_EXPIRY: STORAGE_KEYS.TOKEN_EXPIRY,
} as const;

const buildStoragePayload = (session: MockAuthSession): StoragePayload => ({
  session: {
    token: session.token,
    user: session.user,
    expiresAt: session.expiresAt,
    refreshToken: session.refreshToken ?? 'mock-refresh-token',
  },
  storageKeys: STORAGE_KEYS_PAYLOAD,
});

const applyAuthStorage = async (
  page: Page,
  session: MockAuthSession,
  applyImmediately: boolean,
): Promise<void> => {
  const payload = buildStoragePayload(session);

  await page.addInitScript(
    ({ session: sess, storageKeys }) => {
      try {
        localStorage.setItem(storageKeys.TOKEN, sess.token);
        localStorage.setItem(storageKeys.USER, JSON.stringify(sess.user));
        localStorage.setItem(storageKeys.TOKEN_EXPIRY, String(sess.expiresAt));
        localStorage.setItem(storageKeys.REFRESH_TOKEN, sess.refreshToken ?? 'mock-refresh-token');
      } catch {
        // ignore storage injection errors during init script execution
      }
    },
    payload,
  );

  if (!applyImmediately) {
    return;
  }

  try {
    await page.evaluate(
      ({ session: sess, storageKeys }) => {
        try {
          localStorage.setItem(storageKeys.TOKEN, sess.token);
          localStorage.setItem(storageKeys.USER, JSON.stringify(sess.user));
          localStorage.setItem(storageKeys.TOKEN_EXPIRY, String(sess.expiresAt));
          localStorage.setItem(storageKeys.REFRESH_TOKEN, sess.refreshToken ?? 'mock-refresh-token');
        } catch {
          // ignore storage write issues during eager application
        }
      },
      payload,
    );
  } catch {
    // ignore evaluation errors when page context is not yet ready
  }
};

const registerMockLogin = async (page: Page, bundle: MockAuthBundle): Promise<void> => {
  const loginPattern = `**${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`;
  await page.route(loginPattern, async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(bundle.response),
    });
  });
};

export const setupMockAuth = async (
  page: Page,
  role: MockUserRole = 'lecturer',
  options: MockAuthSetupOptions = {},
): Promise<MockAuthBundle> => {
  const { storage = true, routeLogin = false, applyImmediately = true } = options;
  const bundle = createMockAuthBundle(role);

  if (storage) {
    await applyAuthStorage(page, bundle.session, applyImmediately);
  }

  if (routeLogin) {
    await registerMockLogin(page, bundle);
  }

  return bundle;
};

export const injectMockAuthState = async (
  page: Page,
  role: MockUserRole = 'lecturer',
  options: Pick<MockAuthSetupOptions, 'applyImmediately'> = {},
): Promise<MockAuthBundle> => {
  return setupMockAuth(page, role, { storage: true, routeLogin: false, applyImmediately: options.applyImmediately });
};

export const mockLoginRoute = async (
  page: Page,
  role: MockUserRole = 'lecturer',
): Promise<MockAuthBundle> => {
  return setupMockAuth(page, role, { storage: false, routeLogin: true });
};

