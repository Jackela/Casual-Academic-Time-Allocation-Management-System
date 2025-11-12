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
      await this.dismissBlockingToasts();
      const trigger = this.createButton;
      await waitForEnabled(trigger);
      await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
      await trigger.focus().catch(() => undefined);
      await trigger.click();
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
    const modal = this.modal;
    const submit = this.page.getByTestId('admin-user-submit');
    await waitForVisible(modal);
    const modalBox = await modal.boundingBox().catch(() => null);
    if (modalBox) {
      const centerX = modalBox.x + modalBox.width / 2;
      const startY = Math.min(modalBox.y + 20, modalBox.y + modalBox.height - 10);
      await this.page.mouse.move(centerX, startY);
      await this.page.mouse.wheel(0, modalBox.height);
    }
    // Ensure the modal itself is scrolled so the submit button becomes visible
    await modal.evaluate((dialog) => {
      try {
        dialog.scrollTop = dialog.scrollHeight;
        dialog.scrollIntoView?.({ block: 'center', inline: 'center' });
      } catch (error) {
        void error;
      }
    }).catch(() => undefined);
    await submit.evaluate((button) => {
      try {
        let parent = button.parentElement;
        while (parent) {
          const scrollable = parent.scrollHeight > parent.clientHeight + 4;
          if (scrollable) {
            parent.scrollTop = parent.scrollHeight;
          }
          parent = parent.parentElement;
        }
        button.scrollIntoView({ block: 'center', inline: 'center' });
      } catch (error) {
        void error;
      }
    }).catch(() => undefined);
    await submit.scrollIntoViewIfNeeded().catch(() => undefined);
    await submit.focus().catch(() => undefined);
    await waitForEnabled(submit);
    try {
      await submit.click();
    } catch (error) {
      await submit.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
    }
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

  private async dismissBlockingToasts(): Promise<void> {
    const stack = this.page.getByTestId('toast-stack');
    const hasStack = await stack.isVisible().catch(() => false);
    if (!hasStack) {
      return;
    }
    const dismissButtons = stack.getByRole('button', { name: /dismiss notification/i });
    const count = await dismissButtons.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      await dismissButtons.nth(i).click().catch(() => undefined);
    }
  }
}

export default AdminUsersPage;
