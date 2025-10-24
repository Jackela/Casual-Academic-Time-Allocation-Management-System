import { Page, expect } from '@playwright/test';
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

  async createUser(email: string, password: string) {
    // Prefer canonical button id; fallback to legacy
    const createBtn = this.byTestId('admin-user-create-btn');
    if (await createBtn.count()) {
      await createBtn.click();
    } else {
      await this.byTestId('btn-create-user').click();
    }

    await this.byTestId('admin-user-email').fill(email);
    await this.byTestId('admin-user-password').fill(password);
    await this.byTestId('admin-user-submit').click();
  }

  async activate(email: string) {
    await this.byTestId(`row-${email}`).getByTestId('btn-activate').click();
  }

  async deactivate(email: string) {
    await this.byTestId(`row-${email}`).getByTestId('btn-deactivate').click();
  }

  async expectPasswordPolicyError() {
    await expect(this.byTestId('error-password-policy')).toBeVisible();
  }
}

export default AdminUsersPage;
