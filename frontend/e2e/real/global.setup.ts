import { chromium, type FullConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { E2E_CONFIG } from '../config/e2e.config';
import { waitForBackendReady } from '../utils/health-checker';
import { loginAsRole, programmaticLoginApi } from '../api/auth-helper';
import { STORAGE_KEYS } from '../../src/utils/storage-keys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../shared/.auth');
const STORAGE_STATE_FILE = path.resolve(AUTH_DIR, 'storageState.json');

const hasRealProject = (config: FullConfig): boolean =>
  config.projects.some((project) => project.name === 'real');

const ensureStorageDirectory = async () => {
  await fs.mkdir(AUTH_DIR, { recursive: true });
};

const removeExistingState = async () => {
  try {
    await fs.rm(STORAGE_STATE_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
};

const performLoginAndPersist = async () => {
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const session = await loginAsRole(page.request, 'admin');

    // Inject auth state before any document scripts run
    await context.addInitScript(({ keys, sessionData }) => {
      try {
        localStorage.setItem(keys.TOKEN, sessionData.token);
        localStorage.setItem(keys.USER, JSON.stringify(sessionData.user));
        if (sessionData.refreshToken) {
          localStorage.setItem(keys.REFRESH_TOKEN, sessionData.refreshToken);
        }
        if (sessionData.expiresAt) {
          localStorage.setItem(keys.TOKEN_EXPIRY, String(sessionData.expiresAt));
        }
      } catch {
        // ignore
      }
    }, { keys: STORAGE_KEYS, sessionData: session });

    await page.goto(E2E_CONFIG.FRONTEND.URL, { waitUntil: 'domcontentloaded' });

    await ensureStorageDirectory();
    await context.storageState({ path: STORAGE_STATE_FILE });
    console.info(`[real/global.setup] Stored shared auth state at ${STORAGE_STATE_FILE}`);

    // Validate that storageState yields an authenticated SPA session
    let validationContext: import('@playwright/test').BrowserContext | null = null;
    let validationPage: import('@playwright/test').Page | null = null;
    try {
      validationContext = await browser.newContext({ storageState: STORAGE_STATE_FILE });
      validationPage = await validationContext.newPage();
      await validationPage.goto(E2E_CONFIG.FRONTEND.URL, { waitUntil: 'domcontentloaded' });
      // Ensure root exists before polling for E2E hooks
      await validationPage.waitForSelector('#root', { timeout: 10000 }).catch(() => undefined);
      // Wait up to 30s for the SPA to expose the E2E auth hook
      const hasHook = await validationPage
        .waitForFunction(() => typeof (window as any).__E2E_GET_AUTH__ === 'function', { timeout: 30000 })
        .then(() => true)
        .catch(() => false);
      if (hasHook) {
        const authState = await validationPage.evaluate(() => (window as any).__E2E_GET_AUTH__?.());
        const isAuthenticated = !!(authState && (authState.isAuthenticated === true));
        const gotRole = String(authState?.user?.role ?? '');
        if (!isAuthenticated || gotRole.toUpperCase() !== 'ADMIN') {
          console.warn('[real/global.setup] storageState validation: WARN (hook present but not authenticated ADMIN)');
        } else {
          console.info('[real/global.setup] storageState validation: PASS (authenticated ADMIN)');
        }
      } else {
        console.warn('[real/global.setup] storageState validation: SKIP (SPA hook not available)');
      }
    } catch (e) {
      // Diagnostics only; do not fail setup on validation error
      try {
        const ls = await validationPage?.evaluate(() => ({
          token: localStorage.getItem('token'),
          user: localStorage.getItem('user'),
        }));
        console.warn(`[real/global.setup] validation error: ${(e as Error).message}\n[real/global.setup] localStorage snapshot: ${JSON.stringify(ls)}`);
      } catch {
        console.warn(`[real/global.setup] validation error: ${(e as Error).message}`);
      }
    } finally {
      try { await validationPage?.close(); } catch {}
      try { await validationContext?.close(); } catch {}
    }
  } finally {
    await browser.close();
  }
};

export default async function globalSetup(config: FullConfig) {
  const isRealProjectRequested = hasRealProject(config);
  if (!isRealProjectRequested) {
    console.info('[real/global.setup] Skipping real authentication setup: real project not selected for this run.');
    return;
  }

  try {
    await waitForBackendReady();
  } catch (error) {
    console.error('[real/global.setup] Backend readiness check failed.', error);
    throw error;
  }

  try {
    await removeExistingState();
    await performLoginAndPersist();
    // Also persist per-role storage state to match project preference
    try {
      const admin = await programmaticLoginApi('admin');
      console.info(`[real/global.setup] programmatic admin login persisted via ${admin.endpoint}`);
    } catch (e) {
      console.warn('[real/global.setup] programmatic admin storage state generation failed (non-fatal)', e);
    }
    try {
      const lecturer = await programmaticLoginApi('lecturer');
      console.info(`[real/global.setup] programmatic lecturer login persisted via ${lecturer.endpoint}`);
    } catch (e) {
      console.warn('[real/global.setup] programmatic lecturer storage state generation failed (non-fatal)', e);
    }
    try {
      const tutor = await programmaticLoginApi('tutor');
      console.info(`[real/global.setup] programmatic tutor login persisted via ${tutor.endpoint}`);
    } catch (e) {
      console.warn('[real/global.setup] programmatic tutor storage state generation failed (non-fatal)', e);
    }
  } catch (error) {
    console.warn('[real/global.setup] Non-fatal error during auth setup; continuing without shared storage state.', error);
    await removeExistingState().catch(() => undefined);
  }
}
