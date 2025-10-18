import { test, expect } from '@playwright/test';
import { signInAsRole, clearAuthSessionFromPage } from '../../api/auth-helper';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsRole(page, 'admin');
    await page.goto('/admin/users', { waitUntil: 'networkidle' });
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
  });

  test('admin can create a new tutor account', async ({ page }) => {
    const timestamp = Date.now();
    const email = `tutor.auto+${timestamp}@example.com`;

    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();

    await page.getByRole('button', { name: /add user/i }).click();

    await expect(page.getByRole('dialog', { name: /create user/i })).toBeVisible();

    await page.getByLabel(/first name/i).fill('Ada');
    await page.getByLabel(/last name/i).fill('Lovelace');
    await page.getByLabel(/email/i).fill(email);

    const roleSelector = page.getByLabel(/role/i);
    await roleSelector.click();
    await roleSelector.selectOption('TUTOR');

    await page.getByLabel(/temporary password/i).fill('ChangeMe123!');

    await page.getByRole('button', { name: /create user/i }).click();

    await expect(page.getByText(/user created successfully/i)).toBeVisible();
    await expect(page.getByRole('row', { name: new RegExp(email, 'i') })).toBeVisible();
  });
});
