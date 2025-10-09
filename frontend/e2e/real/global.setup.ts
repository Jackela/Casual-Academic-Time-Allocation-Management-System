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

type RoleKey = 'admin' | 'lecturer' | 'tutor';

interface RoleDefinition {
  role: RoleKey;
  storageFile: string;
  emailEnv: string;
  passwordEnv: string;
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: 'admin', storageFile: 'admin.json', emailEnv: 'E2E_ADMIN_EMAIL', passwordEnv: 'E2E_ADMIN_PASSWORD' },
  { role: 'lecturer', storageFile: 'lecturer.json', emailEnv: 'E2E_LECTURER_EMAIL', passwordEnv: 'E2E_LECTURER_PASSWORD' },
  { role: 'tutor', storageFile: 'tutor.json', emailEnv: 'E2E_TUTOR_EMAIL', passwordEnv: 'E2E_TUTOR_PASSWORD' },
];

const truthy = new Set(['1', 'true', 'TRUE', 'yes', 'YES']);

const asBool = (value?: string | null): boolean => (value ? truthy.has(value) : false);

const hasRealProject = (config: FullConfig): boolean =>
  config.projects.some((project) => project.name === 'real');

const storagePathFor = (definition: RoleDefinition) => path.resolve(AUTH_DIR, definition.storageFile);

const ensureStorageDirectory = async () => {
  await fs.mkdir(AUTH_DIR, { recursive: true });
};

const removeExistingState = async (definition: RoleDefinition) => {
  const target = storagePathFor(definition);
  try {
    await fs.rm(target);
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

const readCredentials = (definition: RoleDefinition): Credentials => {
  const fallback = E2E_CONFIG.USERS[definition.role];
  const email = (process.env[definition.emailEnv] ?? fallback.email ?? '').trim();
  const password = (process.env[definition.passwordEnv] ?? fallback.password ?? '').trim();

  if (!email || !password) {
    throw new Error(
      `[real/global.setup] Missing credentials for ${definition.role}. Ensure ${definition.emailEnv} and ${definition.passwordEnv} are set.`
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

const performLogin = async (definition: RoleDefinition, credentials: Credentials) => {
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
        `[real/global.setup] Authentication for ${definition.role} failed (${response.status()} ${response.statusText()}).`
      );
    }

    await ensureStorageDirectory();
    await context.storageState({ path: storagePathFor(definition) });
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

  const failures: Array<{ role: RoleKey; error: unknown }> = [];

  for (const definition of ROLE_DEFINITIONS) {
    try {
      const credentials = readCredentials(definition);
      await removeExistingState(definition);
      await performLogin(definition, credentials);
      console.info(`[real/global.setup] Stored ${definition.role} state at ${storagePathFor(definition)}`);
    } catch (error) {
      await removeExistingState(definition).catch(() => undefined);
      failures.push({ role: definition.role, error });
    }
  }

  if (failures.length > 0) {
    failures.forEach(({ role, error }) => {
      console.error(`[real/global.setup] Failed to capture storage state for ${role}`, error);
    });
    throw new Error(
      `[real/global.setup] Unable to prepare storage state for roles: ${failures.map(({ role }) => role).join(', ')}`
    );
  }
}
