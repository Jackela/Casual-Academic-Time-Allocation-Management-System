import { test, expect } from '@playwright/test';

test.describe('Real suite smoke', () => {
  test('re-uses persisted admin auth state for protected routes', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByTestId('layout-dashboard-header')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    await expect(page.getByTestId('user-role-badge')).toHaveText(/Administrator/i);
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible();
    await expect(page.locator('[data-testid="login-form"]')).toHaveCount(0);
  });
});
