import { type Locator, type Page } from '@playwright/test';
import { waitForEnabled, waitForVisible, waitForAdminUsersReady, waitForAppReady } from '../../utils/waits';

export class AdminUsersPage {
  constructor(private page: Page) {}

  get table(): Locator {
    return this.page.getByTestId('admin-users-table');
  }

  get createButton(): Locator {
    return this.page.getByTestId('admin-user-create-btn');
  }

  get modal(): Locator {
    return this.page.getByRole('dialog', { name: /Create User/i }).first();
  }

  async openCreate(): Promise<void> {
    // Ensure route is ready before interacting
    await waitForAppReady(this.page, 'ADMIN');
    await waitForAdminUsersReady(this.page);
    const modal = this.modal;
    // If the modal is already open, skip clicking the Add User button
    const alreadyOpen = await modal.isVisible().catch(() => false);
    if (!alreadyOpen) {
      await waitForEnabled(this.createButton);
      await this.createButton.click();
      await modal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    }
  }

  async fillCreateFields(input: { email: string; name: string; role: 'ADMIN'|'LECTURER'|'TUTOR' }): Promise<void> {
    await this.openCreate();
    await this.page.getByTestId('admin-user-email').fill(input.email);
    const [first, ...rest] = input.name.trim().split(/\s+/);
    const last = rest.join(' ');
    await this.page.getByLabel(/First Name/i).fill(first);
    await this.page.getByLabel(/Last Name/i).fill(last);
    await this.page.getByTestId('admin-user-role').selectOption(input.role);
  }

  async generateSecurePassword(): Promise<void> {
    const btn = this.modal.getByRole('button', { name: /Generate Secure Password/i });
    await btn.click();
    await this.page.getByTestId('generated-password-hint').waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
  }

  async submitCreate(): Promise<void> {
    await this.page.getByTestId('admin-user-submit').click();
  }

  async closeCreateModal(): Promise<void> {
    const btn = this.modal.getByRole('button', { name: /Cancel/i });
    await btn.click().catch(() => undefined);
  }

  async createUser(input: { email: string; name: string; role: 'ADMIN'|'LECTURER'|'TUTOR'; password?: string }): Promise<void> {
    await this.fillCreateFields(input);
    if (input.password && input.password.trim().length > 0) {
      await this.page.getByTestId('admin-user-password').fill(input.password);
    } else {
      await this.generateSecurePassword();
    }
    await this.submitCreate();
  }

  async setQualification(userId: number, qualification: 'STANDARD'|'COORDINATOR'|'PHD'): Promise<void> {
    const row = await this.findUserRow(String(userId));
    const select = row.getByTestId('admin-user-qualification-select');
    await waitForEnabled(select);
    await select.selectOption(qualification);
  }

  async toggleActive(userId: number): Promise<void> {
    const row = await this.findUserRow(String(userId));
    const toggle = row.getByTestId('admin-user-activate-toggle');
    await waitForEnabled(toggle);
    await toggle.click();
  }

  async findUserRow(emailOrId: string): Promise<Locator> {
    await waitForVisible(this.table);
    return this.table.getByRole('row').filter({ hasText: emailOrId }).first();
  }
}

export default AdminUsersPage;
