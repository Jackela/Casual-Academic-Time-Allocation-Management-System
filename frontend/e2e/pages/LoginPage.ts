import { Page, expect, Locator } from '@playwright/test';
import { E2E_CONFIG } from '../config/e2e.config';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginTitle: Locator;
  readonly loginSubtitle: Locator;
  readonly loginForm: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly credentialsSection: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('login-submit-button');
    this.loginTitle = page.getByTestId('login-title');
    this.loginSubtitle = page.getByTestId('login-subtitle');
    this.loginForm = page.getByTestId('login-form');
    this.errorMessage = page.getByTestId('error-message');
    this.successMessage = page.getByTestId('success-message');
    this.credentialsSection = page.getByTestId('login-footer');
    
    // Enhanced logout support with multiple selectors for cross-browser compatibility
    this.logoutButton = page.locator('button:has-text("Sign Out"), [data-testid="logout-button"], .logout-button').first();
  }

  async navigateTo() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    
    // Wait for both backend auth response and navigation to dashboard to avoid race conditions
    const [response] = await Promise.all([
      this.page.waitForResponse(`**${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`),
      this.page.waitForURL('/dashboard', { timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.PAGE_LOAD }),
      this.submitForm()
    ]);
    // Post-navigation stabilization: ensure network is idle and main content is present
    try {
      await this.page.waitForLoadState('networkidle');
    } catch {}
    try {
      await this.page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });
    } catch {}

    return response;
  }

  async expectToBeVisible() {
    await expect(this.loginTitle).toContainText('CATAMS');
    await expect(this.loginSubtitle).toContainText('Casual Academic Time Allocation Management System');
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectSubmitButtonState(state: 'enabled' | 'disabled') {
    if (state === 'enabled') {
      await expect(this.submitButton).toBeEnabled();
    } else {
      await expect(this.submitButton).toBeDisabled();
    }
  }

  async expectErrorMessage(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectSuccessfulLogin() {
    await this.page.waitForURL('/dashboard', { timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.PAGE_LOAD });
    await expect(this.page).toHaveURL('/dashboard');
  }

  async expectCredentialsSection() {
    await expect(this.credentialsSection).toBeVisible();
    await expect(this.credentialsSection).toContainText('Testing Credentials');
  }

  async expectFormDisabled() {
    await expect(this.emailInput).toBeDisabled();
    await expect(this.passwordInput).toBeDisabled();
    await expect(this.submitButton).toBeDisabled();
  }

  async expectLoadingState() {
    await expect(this.submitButton).toContainText('Signing in...');
    await this.expectFormDisabled();
  }

  private resolveEnv(name: string, fallback: string): string {
    const value = process.env[name];
    return value && value.length > 0 ? value : fallback;
  }

  async loginAsTutor() {
    const email = this.resolveEnv('E2E_TUTOR_EMAIL', 'tutor@example.com');
    const password = this.resolveEnv('E2E_TUTOR_PASSWORD', 'Tutor123!');
    return await this.login(email, password);
  }

  async loginAsLecturer() {
    const email = this.resolveEnv('E2E_LECTURER_EMAIL', 'lecturer@example.com');
    const password = this.resolveEnv('E2E_LECTURER_PASSWORD', 'Lecturer123!');
    return await this.login(email, password);
  }

  async loginAsAdmin() {
    const email = this.resolveEnv('E2E_ADMIN_EMAIL', 'admin@example.com');
    const password = this.resolveEnv('E2E_ADMIN_PASSWORD', 'Admin123!');
    return await this.login(email, password);
  }

  /**
   * Robust logout flow with comprehensive state management and cross-browser compatibility
   * Addresses race conditions and ensures clean authentication state transitions
   */
  async logout() {
    try {
      // Verify we're on a page where logout is available
      await this.logoutButton.waitFor({ 
        state: 'visible', 
        timeout: 5000 
      });

      // Perform logout with comprehensive wait strategy
      const logoutPromises = [
        // Wait for logout API response (if available)
        this.page.waitForResponse(response => 
          response.url().includes('/logout') || response.url().includes('/auth'), 
          { timeout: 10000 }
        ).catch(() => null), // Don't fail if no logout endpoint
        
        // Wait for navigation to login page
        this.page.waitForURL('/login', { 
          timeout: E2E_CONFIG.FRONTEND.TIMEOUTS.PAGE_LOAD,
          waitUntil: 'networkidle' 
        }),
        
        // Click logout button
        this.logoutButton.click()
      ];

      // Execute logout with timeout protection
      await Promise.race([
        Promise.all(logoutPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Logout timeout')), 15000)
        )
      ]);

      // Post-logout stabilization and verification
      await this.page.waitForLoadState('networkidle');
      
      // Verify we're on the login page with clean state
      await this.expectToBeOnLoginPage();
      
      // Clear any potential cached authentication state
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

    } catch (error) {
      console.warn('Logout flow encountered issues:', error);
      // Fallback: Direct navigation to login with state clearing
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await this.navigateTo();
    }
  }

  /**
   * Verify that we're properly on the login page after logout
   */
  async expectToBeOnLoginPage() {
    // Verify URL
    await expect(this.page).toHaveURL('/login');
    
    // Verify login form is visible and functional
    await expect(this.loginForm).toBeVisible();
    await expect(this.loginTitle).toContainText('CATAMS');
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    
    // Verify form is in clean state (not disabled from loading)
    await expect(this.emailInput).toBeEnabled();
    await expect(this.passwordInput).toBeEnabled();
  }

  /**
   * Enhanced login with better error handling and stability
   */
  async loginWithRetry(email: string, password: string, maxRetries: number = 2) {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Login attempt ${attempt}/${maxRetries} for ${email}`);
        return await this.login(email, password);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Login attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry and ensure clean state
          await this.page.waitForTimeout(1000 * attempt);
          await this.navigateTo();
        }
      }
    }
    
    throw lastError || new Error('Login failed after retries');
  }
}