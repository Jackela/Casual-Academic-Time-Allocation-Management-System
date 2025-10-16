import { test, expect } from '../fixtures/base';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { E2E_CONFIG } from '../config/e2e.config';
import { DashboardPage } from '../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../shared/pages/TutorDashboardPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.resolve(__dirname, '../../screenshots');

async function ensureScreenshotDir() {
  await mkdir(screenshotDir, { recursive: true });
}

async function login(page: Parameters<typeof test>[0]['page'], email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}

async function capture(page: Parameters<typeof test>[0]['page'], filename: string) {
  const target = path.join(screenshotDir, filename);
  await page.waitForTimeout(500);
  await page.screenshot({ path: target, fullPage: true });
}

test.beforeAll(async () => {
  await ensureScreenshotDir();
});

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  page.on('console', (message) => {
    console.log(`[browser:${message.type()}] ${message.text()}`);
  });
});

test('Figure A1: Tutor dashboard overview', async ({ page }) => {
  const { email, password } = E2E_CONFIG.USERS.tutor;
  await login(page, email, password);
  const dashboard = new DashboardPage(page);
  await dashboard.waitForDashboardReady();
  await dashboard.expectToBeLoaded('TUTOR');
  await dashboard.expectResponsiveColumns({ expectTutorColumn: false });
  const tutorDashboard = new TutorDashboardPage(page);
  await tutorDashboard.waitForDashboardReady();
  await capture(page, 'fig-a1-tutor-dashboard.png');
});

test('Figure A2: Tutor create timesheet form', async ({ page }) => {
  const { email, password } = E2E_CONFIG.USERS.tutor;
  await login(page, email, password);
  const tutorDashboard = new TutorDashboardPage(page);
  await tutorDashboard.waitForDashboardReady();
  await new DashboardPage(page).expectResponsiveColumns({ expectTutorColumn: false });
  await page.getByRole('button', { name: /Create New/i }).first().click();
  await page.getByRole('heading', { name: 'New Timesheet Form' }).waitFor({ state: 'visible' });
  await page.selectOption('#course', '1');
  await page.fill('#week-start', '2025-01-27');
  await page.fill('#hours', '6');
  await page.fill('#description', 'Led tutorial recap and office hours support.');
  await capture(page, 'fig-a2-create-timesheet-form.png');
});

test('Figure A3: Tutor validation feedback', async ({ page }) => {
  const { email, password } = E2E_CONFIG.USERS.tutor;
  await login(page, email, password);
  const tutorDashboard = new TutorDashboardPage(page);
  await tutorDashboard.waitForDashboardReady();
  await new DashboardPage(page).expectResponsiveColumns({ expectTutorColumn: false });
  await page.getByRole('button', { name: /Create New/i }).first().click();
  await page.getByRole('heading', { name: 'New Timesheet Form' }).waitFor({ state: 'visible' });
  await page.selectOption('#course', '1');
  const hoursField = page.locator('#hours');
  await hoursField.fill('70');
  await hoursField.blur();
  await page.getByText(/Hours must be between/i).waitFor({ state: 'visible' });
  await capture(page, 'fig-a3-validation-error.png');
});

test('Figure A4: Lecturer approval queue', async ({ page }) => {
  const { email, password } = E2E_CONFIG.USERS.lecturer;
  await login(page, email, password);
  const dashboard = new DashboardPage(page);
  await dashboard.waitForDashboardReady();
  await dashboard.expectToBeLoaded('LECTURER');
  await dashboard.expectResponsiveColumns();
  await page.getByRole('region', { name: 'Pending Approvals' }).waitFor({ state: 'visible' });
  await capture(page, 'fig-a4-lecturer-approvals.png');
});

test('Figure A5: Lecturer approval selection', async ({ page }) => {
  const { email, password } = E2E_CONFIG.USERS.lecturer;
  await login(page, email, password);
  const dashboard = new DashboardPage(page);
  await dashboard.waitForDashboardReady();
  await dashboard.expectToBeLoaded('LECTURER');
  await dashboard.expectResponsiveColumns();
  const firstCheckbox = page.getByRole('checkbox', { name: /Select timesheet/ }).first();
  await expect(firstCheckbox).toBeEnabled({ timeout: 10000 });
  await firstCheckbox.check();
  await page.getByRole('button', { name: /Approve selected/i }).waitFor({ state: 'visible' });
  await capture(page, 'fig-a5-lecturer-batch-approve.png');
});
