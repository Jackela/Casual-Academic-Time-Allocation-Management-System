import { expect, type Page } from '@playwright/test';
import { waitForVisible } from '../../utils/waits';

export class LoginPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async login(email: string, password: string): Promise<void> {
    const emailInput = this.page
      .getByTestId('email-input')
      .or(this.page.getByLabel(/Email/i))
      .or(this.page.getByPlaceholder(/email/i));
    const passwordInput = this.page
      .getByTestId('password-input')
      .or(this.page.getByLabel(/Password/i))
      .or(this.page.getByPlaceholder(/password/i));
    const submit = this.page
      .getByTestId('login-submit-button')
      .or(this.page.getByRole('button', { name: /sign in|log in/i }));
    await waitForVisible(emailInput);
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submit.click();
  }

  async expectLoggedIn(): Promise<void> {
    // Heuristic: dashboard shell present
    const dashboard = this.page.getByTestId('dashboard-sidebar').first();
    await waitForVisible(dashboard);
    await expect(dashboard).toBeVisible();
  }
}

export default LoginPage;
