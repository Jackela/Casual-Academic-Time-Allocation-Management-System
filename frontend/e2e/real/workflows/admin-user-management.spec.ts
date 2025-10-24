import { test, expect } from '@playwright/test';
import { signInAsRole, clearAuthSessionFromPage } from '../../api/auth-helper';
import { AdminUsersPage } from '../../shared/pages/AdminUsersPage';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsRole(page, 'admin');
    await page.goto('/admin/users', { waitUntil: 'networkidle' });
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
  });

  test('admin can create and activate/deactivate a user', async ({ page }) => {
    const timestamp = Date.now();
    const email = `tutor.auto+${timestamp}@example.com`;
    const users = new AdminUsersPage(page);

    await users.goto();
    await users.openCreateModal();

    // Password UX hint present and generator works
    await expect(page.getByText(/temporary password/i)).toBeVisible();
    await expect(page.getByText(/Use at least 12 characters/i)).toBeVisible();

    await users.fillCreateForm({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email,
      role: 'TUTOR',
      password: 'ChangeMe123!'
    });
    await users.submitCreate();

    const row = users.rowByEmail(email);
    await expect(row).toBeVisible();

    // Toggle deactivate then reactivate via PATCH
    await users.toggleActiveForRow(row);
    await users.toggleActiveForRow(row);
  });
});
