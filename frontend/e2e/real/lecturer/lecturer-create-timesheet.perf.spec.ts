import { test, expect } from '@playwright/test';
import { roleCredentials } from '../../api/auth-helper';
import { LoginPage } from '../../shared/pages/LoginPage';

test.describe('@ui @performance lecturer create modal open', () => {
  test('click→dialog focus ≤ threshold', async ({ page }) => {
    const baseURL = process.env.E2E_FRONTEND_URL || 'http://localhost:5174';
    // Login via UI to ensure auth context; fallback to hitting dashboard directly if storage is pre-seeded
    await page.goto(`${baseURL}/login`);
    const lec = roleCredentials('lecturer' as any);
    const login = new LoginPage(page);
    await login.login(lec.email, lec.password);

    // Navigate to lecturer dashboard
    await page.waitForURL(/\/dashboard\/?$/i, { timeout: 15000 });

    // Ensure loading marker present or dashboard ready marker
    const createBtn = page.getByTestId('lecturer-create-open-btn').first();
    await expect(createBtn).toBeVisible();

    const isDocker = (process.env.E2E_BACKEND_MODE || '').toLowerCase() === 'docker';
    // Allow a bit more headroom under Docker to reduce perf flake from auth/navigation jitter
    const threshold = isDocker ? 800 : 200;
    const t0 = Date.now();
    await createBtn.click();
    // Wait for the dialog container to receive focus
    const dialog = page.locator('[data-testid="lecturer-create-modal"][aria-hidden="false"]');
    await expect(dialog).toBeVisible();
    // small expect to ensure a focusable inside exists
    await expect(page.locator('#lecturer-create-timesheet-modal')).toBeVisible();
    const dt = Date.now() - t0;
    expect(dt).toBeLessThanOrEqual(threshold);
  });
});
