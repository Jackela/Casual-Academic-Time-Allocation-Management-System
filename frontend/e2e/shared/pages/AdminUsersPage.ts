import { expect, Page, Locator } from '@playwright/test';

export class AdminUsersPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addUserButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /User Management/i });
    this.addUserButton = page.getByRole('button', { name: /Add User/i });
  }

  async goto() {
    await this.page.goto('/admin/users', { waitUntil: 'networkidle' });
    await expect(this.heading).toBeVisible();
  }

  async openCreateModal() {
    await this.addUserButton.click();
    await expect(this.page.getByRole('dialog', { name: /Create User/i })).toBeVisible();
  }

  async fillCreateForm(params: { firstName: string; lastName: string; email: string; role: 'TUTOR'|'LECTURER'|'ADMIN'; password: string; }) {
    await this.page.getByLabel(/First Name/i).fill(params.firstName);
    await this.page.getByLabel(/Last Name/i).fill(params.lastName);
    await this.page.getByLabel(/Email/i).fill(params.email);
    await this.page.getByLabel(/Role/i).selectOption(params.role);
    await this.page.getByLabel(/Password|Temporary Password/i).fill(params.password);
  }

  async submitCreate() {
    await this.page.getByRole('button', { name: /Create User/i }).click();
    await expect(this.page.getByText(/User created successfully/i)).toBeVisible();
  }

  rowByEmail(email: string): Locator {
    return this.page.getByRole('row', { name: new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
  }

  async toggleActiveForRow(row: Locator) {
    const btn = row.getByRole('button', { name: /Deactivate|Reactivate|Updating/i });
    await expect(btn).toBeVisible();
    const label = await btn.innerText();
    await btn.click();
    // Expect feedback message and opposite label next
    await expect(this.page.getByText(/User (deactivated|reactivated) successfully\./i)).toBeVisible();
    const next = row.getByRole('button', { name: label.includes('Deactivate') ? /Reactivate/i : /Deactivate/i });
    await expect(next).toBeVisible();
  }
}

