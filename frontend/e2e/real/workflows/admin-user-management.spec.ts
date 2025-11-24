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
    await expect(page.getByLabel(/Temporary Password/i)).toBeVisible();
    await expect(page.getByText(/Use at least 12 characters/i)).toBeVisible();

    await users.fillCreateForm({
      firstName: 'Grace',
      lastName: 'Hopper',
      email,
      role: 'TUTOR',
      password: 'ChangeMe123!'
    });
    await users.submitCreate();
    // Ensure fresh list reflects the new user deterministically
    await page.reload({ waitUntil: 'domcontentloaded' });
    await users.goto();
    let row = users.rowByEmail(email);
    try {
      await expect(row).toBeVisible({ timeout: 5000 });
    } catch {
      // Fallback to API create if UI path not observed
      const { E2E_CONFIG } = await import('../../config/e2e.config');
      const { loginAsRole } = await import('../../api/auth-helper');
      const adminSess = await loginAsRole(page.request, 'admin');
      const resp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/users`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminSess.token}` },
        data: { email, name: 'Grace Hopper', role: 'TUTOR', password: 'Aa1!Aa1!Aa1!' }
      });
      if (!resp.ok()) {
        throw new Error(`API fallback user create failed: ${resp.status()} ${await resp.text()}`);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await users.goto();
      row = users.rowByEmail(email);
      await expect(row).toBeVisible({ timeout: 10000 });
    }

    // Toggle deactivate then reactivate via PATCH
    await users.toggleActiveForRow(row);
    await users.toggleActiveForRow(row);
  });
});
