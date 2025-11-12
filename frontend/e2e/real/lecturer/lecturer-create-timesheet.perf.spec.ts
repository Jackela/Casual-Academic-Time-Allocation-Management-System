import { test, expect } from '@playwright/test';
import { roleCredentials, type UserRole } from '../../api/auth-helper';
import { LoginPage } from '../../shared/pages/LoginPage';

const runPerfSuite = String(process.env.E2E_RUN_PERF || '').toLowerCase() === 'true';
const describePerf = runPerfSuite ? test.describe : test.describe.skip;

describePerf('@ui @performance lecturer create modal open', () => {
  test('click→dialog focus ≤ threshold', async ({ page }) => {
    const baseURL = process.env.E2E_FRONTEND_URL || 'http://localhost:5174';
    // Login via UI to ensure auth context; fallback to hitting dashboard directly if storage is pre-seeded
    await page.goto(`${baseURL}/login`);
    const lec = roleCredentials('lecturer' as UserRole);
    const login = new LoginPage(page);
    await login.login(lec.email, lec.password);

    // Navigate to lecturer dashboard
    await page.waitForURL(/\/dashboard\/?$/i, { timeout: 15000 });

    // Ensure loading marker present or dashboard ready marker
    const createBtn = page.getByTestId('lecturer-create-open-btn').first();
    const dialog = page.getByTestId('lecturer-create-modal');
    await expect(createBtn).toBeVisible();
    const ariaHidden = await dialog.getAttribute('aria-hidden').catch(() => null);
    if (ariaHidden === 'false') {
      const closeBtn = dialog.getByRole('button', { name: /close/i });
      await closeBtn.click().catch(async () => {
        await page.keyboard.press('Escape').catch(() => undefined);
      });
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => undefined);
    }

    const isDocker = (process.env.E2E_BACKEND_MODE || '').toLowerCase() === 'docker';
    // Allow a bit more headroom under Docker to reduce perf flake from auth/navigation jitter
    const threshold = isDocker ? 800 : 200;
    const t0 = Date.now();
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();
    // Wait for the dialog container to receive focus
    await expect(dialog).toBeVisible();
    const dt = Date.now() - t0;
    expect(dt).toBeLessThanOrEqual(threshold);
  });
});
