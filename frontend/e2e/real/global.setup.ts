import { chromium, type FullConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { E2E_CONFIG } from '../config/e2e.config';
import { LoginPage } from '../shared/pages/LoginPage';
import { waitForBackendReady } from '../utils/health-checker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../shared/.auth');
const STORAGE_STATE_FILE = path.resolve(AUTH_DIR, 'storageState.json');

const truthy = new Set(['1', 'true', 'TRUE', 'yes', 'YES']);

const asBool = (value?: string | null): boolean => (value ? truthy.has(value) : false);

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

interface Credentials {
  email: string;
  password: string;
}

const readAdminCredentials = (): Credentials => {
  const fallback = E2E_CONFIG.USERS.admin;
  const email = (process.env.E2E_ADMIN_EMAIL ?? fallback.email ?? '').trim();
  const password = (process.env.E2E_ADMIN_PASSWORD ?? fallback.password ?? '').trim();

  if (!email || !password) {
    throw new Error(
      '[real/global.setup] Missing admin credentials. Ensure E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are set.'
    );
  }

  return { email, password };
};

const waitForLoginPage = async (loginPage: LoginPage, attempts: number = 3) => {
  const loginUrl = `${E2E_CONFIG.FRONTEND.URL}/login`;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await loginPage.page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
        timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.STARTUP,
      });
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await loginPage.page.waitForTimeout(1000 * attempt);
    }
  }
};

const performLoginAndPersist = async (credentials: Credentials) => {
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    await waitForLoginPage(loginPage);
    const response = await loginPage.login(credentials.email, credentials.password, {
      waitUntil: 'networkidle',
    });

    if (!response.ok()) {
      throw new Error(
        `[real/global.setup] Authentication failed (${response.status()} ${response.statusText()}).`
      );
    }

    await ensureStorageDirectory();
    await context.storageState({ path: STORAGE_STATE_FILE });
    console.info(`[real/global.setup] Stored shared auth state at ${STORAGE_STATE_FILE}`);
  } finally {
    await browser.close();
  }
};

export default async function globalSetup(config: FullConfig) {
  const isRealProjectRequested = hasRealProject(config);
  const shouldSkip =
    !isRealProjectRequested || asBool(process.env.E2E_SKIP_BACKEND) || asBool(process.env.E2E_SKIP_REAL_LOGIN);

  if (shouldSkip) {
    const reason = !isRealProjectRequested
      ? 'real project not selected for this run'
      : 'skip flag detected (E2E_SKIP_BACKEND / E2E_SKIP_REAL_LOGIN)';
    console.info(`[real/global.setup] Skipping real authentication setup: ${reason}.`);
    return;
  }

  try {
    await waitForBackendReady();
  } catch (error) {
    console.error('[real/global.setup] Backend readiness check failed.', error);
    throw error;
  }

  try {
    const credentials = readAdminCredentials();
    await removeExistingState();
    await performLoginAndPersist(credentials);
  } catch (error) {
    await removeExistingState().catch(() => undefined);
    throw error;
  }
}
