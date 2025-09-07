import { test, expect } from '@playwright/test';
import { E2E_CONFIG } from '../config/e2e.config';

/**
 * Real Backend Authentication Tests
 * These tests interact with the actual Spring Boot backend without mocks
 */

test.describe('Real Backend Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // No mocks - direct backend interaction
    await page.goto(E2E_CONFIG.FRONTEND.URL);
  });

  test('Complete authentication flow with real backend', async ({ page }) => {
    // Test real login flow
    await page.getByRole('heading', { name: /login/i }).waitFor();
    
    // Use actual test credentials from E2EDataInitializer
    await page.fill('input[name="email"]', 'tutor@example.com');
    await page.fill('input[name="password"]', 'Tutor123!');
    
    // Monitor real API call
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login') && response.status() === 200
    );
    
    await page.getByRole('button', { name: /login/i }).click();
    const response = await responsePromise;
    
    // Verify real response structure
    const responseData = await response.json();
    expect(responseData).toHaveProperty('token');
    expect(responseData).toHaveProperty('user');
    expect(responseData.user.role).toBe('TUTOR');
    
    // Verify navigation to dashboard
    await page.waitForURL('**/dashboard/**');
    
    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    // Verify session persists on reload
    await page.reload();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('Invalid credentials handled correctly', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPass123!');
    
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login')
    );
    
    await page.getByRole('button', { name: /login/i }).click();
    const response = await responsePromise;
    
    // Backend should return 401
    expect(response.status()).toBe(401);
    
    // Error message should be displayed
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('Logout clears session completely', async ({ page }) => {
    // First login
    await page.fill('input[name="email"]', 'lecturer@example.com');
    await page.fill('input[name="password"]', 'Lecturer123!');
    await page.getByRole('button', { name: /login/i }).click();
    
    await page.waitForURL('**/dashboard/**');
    
    // Perform logout
    await page.getByRole('button', { name: /logout/i }).click();
    
    // Verify redirected to login
    await expect(page).toHaveURL(/.*login.*/);
    
    // Verify token is cleared
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
    
    // Verify cannot access protected route
    await page.goto(`${E2E_CONFIG.FRONTEND.URL}/dashboard`);
    await expect(page).toHaveURL(/.*login.*/);
  });
});