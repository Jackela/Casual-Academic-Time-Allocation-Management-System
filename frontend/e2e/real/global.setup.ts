import { chromium, type FullConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { E2E_CONFIG } from '../config/e2e.config';
import { waitForBackendReady } from '../utils/health-checker';
import { loginAsRole } from '../api/auth-helper';
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
  } catch (error) {
    await removeExistingState().catch(() => undefined);
    throw error;
  }
}
