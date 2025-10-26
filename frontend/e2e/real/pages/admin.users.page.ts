import { Page, expect } from '@playwright/test';
import { waitForUsersListOk, waitForToastSuccess } from '../../shared/utils/waits';
import BasePage from './base.page';

export class AdminUsersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.goto('/admin/users');
    // Prefer explicit route-ready marker
    await this.byTestId('admin-users-ready').waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
      await this.page.waitForLoadState('domcontentloaded');
      await Promise.race([
        this.byTestId('admin-users-table').waitFor({ state: 'visible', timeout: 5000 }),
        this.byTestId('admin-user-create-btn').waitFor({ state: 'visible', timeout: 5000 }).catch(() => Promise.resolve()),
      ]).catch(() => undefined);
    });
  }

  async closeModal() {
    const dialog = this.page.getByRole('dialog');
    if (await dialog.isVisible().catch(() => false)) {
      const cancel = this.page.getByRole('button', { name: /Cancel/i });
      await cancel.click({ timeout: 5000 }).catch(() => undefined);
    }
  }

  async createUser(email: string, password: string, opts: { useGenerator?: boolean } = {}) {
    // If modal already open (overlay present), skip clicking the open button
    const emailField = this.byTestId('admin-user-email');
    if (!(await emailField.isVisible().catch(() => false))) {
      const createBtn = this.byTestId('admin-user-create-btn');
      if (await createBtn.count()) {
        await createBtn.scrollIntoViewIfNeeded().catch(() => undefined);
        await createBtn.click({ trial: true }).catch(() => undefined);
        await createBtn.click({ force: true }).catch(() => undefined);
      } else {
        const legacy = this.byTestId('btn-create-user');
        await legacy.scrollIntoViewIfNeeded().catch(() => undefined);
        await legacy.click({ force: true }).catch(() => undefined);
      }
    }
    // Wait for modal fields to appear
    await emailField.waitFor({ state: 'visible', timeout: 10000 });
    // Fill required first/last name fields (no data-testids; use ids)
    const first = this.page.locator('#firstName');
    const last = this.page.locator('#lastName');
    if (await first.count()) {
      await first.fill('New');
    }
    if (await last.count()) {
      await last.fill('User');
    }
    await this.byTestId('admin-user-email').fill(email);
    // Ensure role is set (default is TUTOR but be explicit for determinism)
    const roleSelect = this.byTestId('admin-user-role');
    if (await roleSelect.count()) {
      await roleSelect.selectOption('TUTOR').catch(() => undefined);
    }
    // Choose password entry strategy
    const useGenerator = !!opts.useGenerator;
    if (useGenerator) {
      const genBtn = this.page.getByRole('button', { name: /Generate Secure Password/i });
      await genBtn.click({ timeout: 5000 }).catch(() => undefined);
    } else {
      await this.byTestId('admin-user-password').fill(password);
    }
    await this.byTestId('admin-user-submit').click();
  }

  async activate(email: string) {
    const row = this.byTestId(`row-${email}`);
    await row.scrollIntoViewIfNeeded().catch(() => undefined);
    const toggle = row.getByTestId('admin-user-activate-toggle');
    await toggle.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const label = (await toggle.innerText().catch(() => '')) || '';
    if (!/Reactivate|Activate/i.test(label)) {
      // Already active; click only if needed
      return;
    }
    const listRefresh = this.page
      .waitForResponse((r) => r.url().includes('/api/users') && r.request().method() === 'GET')
      .catch(() => null);
    await toggle.click({ timeout: 10000 }).catch(() => undefined);
    await listRefresh;
    await waitForUsersListOk(this.page).catch(() => undefined);
    await waitForToastSuccess(this.page, 6000).catch(() => undefined);
  }

  async deactivate(email: string) {
    const row = this.byTestId(`row-${email}`);
    await row.scrollIntoViewIfNeeded().catch(() => undefined);
    const toggle = row.getByTestId('admin-user-activate-toggle');
    await toggle.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const label = (await toggle.innerText().catch(() => '')) || '';
    if (!/Deactivate/i.test(label)) {
      // Already inactive; click only if needed
      return;
    }
    const listRefresh = this.page
      .waitForResponse((r) => r.url().includes('/api/users') && r.request().method() === 'GET')
      .catch(() => null);
    await toggle.click({ timeout: 10000 }).catch(() => undefined);
    await listRefresh;
    await waitForUsersListOk(this.page).catch(() => undefined);
    await waitForToastSuccess(this.page, 6000).catch(() => undefined);
  }

  async expectPasswordPolicyError() {
    const alert = this.page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 8000 });
    await expect(alert).toContainText(/password|unable to create user/i);
  }
}

export default AdminUsersPage;
