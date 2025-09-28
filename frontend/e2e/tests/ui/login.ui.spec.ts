import { test, expect, mockResponses } from '../../fixtures/base';

test.describe('Login UI with Mocked Responses', { tag: '@ui' }, () => {
  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check form elements
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-button')).toBeVisible();
    
    // Check form labels/headers using the actual text from the component
    await expect(page.getByTestId('login-title')).toBeVisible();
    await expect(page.getByTestId('login-submit-button')).toBeVisible();
  });

  test('should handle successful login with mocked response', async ({ page }) => {
    // Mock successful login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.auth.success)
      });
    });

    await page.goto('/login');
    
    // Fill and submit form
    await page.getByTestId('email-input').fill('lecturer@example.com');
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('login-submit-button').click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error message for failed login', async ({ page }) => {
    // Mock failed login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' })
      });
    });

    await page.goto('/login');
    
    await page.getByTestId('email-input').fill('invalid@example.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('login-submit-button').click();
    
    // Should show error message
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText('Invalid credentials');
    
    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');
    
    // Submit button should be disabled when fields are empty
    const submitButton = page.getByTestId('login-submit-button');
    await expect(submitButton).toBeDisabled();
    
    // Fill email only
    await page.getByTestId('email-input').fill('test@example.com');
    await expect(submitButton).toBeDisabled();
    
    // Fill password too
    await page.getByTestId('password-input').fill('password');
    await expect(submitButton).toBeEnabled();
  });

  test('should show loading state during login', async ({ page }) => {
    // Mock delayed response
    await page.route('**/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.auth.success)
      });
    });

    await page.goto('/login');
    
    await page.getByTestId('email-input').fill('lecturer@example.com');
    await page.getByTestId('password-input').fill('password123');
    
    const submitButton = page.getByTestId('login-submit-button');
    await submitButton.click();
    
    // Should show loading text
    await expect(submitButton).toContainText('Signing in...');
    await expect(submitButton).toBeDisabled();
  });
});