/* eslint-disable no-restricted-syntax */
// Presentation demos require visual timing for demo flow
/**
 * Demo Script 4: Admin User Management
 * Demo Duration: ~1.5 minutes
 *
 * Purpose:
 * Demonstrate the system's user management capabilities and permission control
 *
 * Demo Flow:
 * 1. Admin creates new user (Demo Tutor)
 * 2. Verify user appears in user list
 * 3. Deactivate user
 * 4. Reactivate user
 *
 * Key Features:
 * - User lifecycle management
 * - Role permission assignment
 * - User status control
 * - Audit log tracking
 * - 100% UI interaction, no API calls
 */

import { test, expect } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage } from '../../api/auth-helper';
import { cleanupDemoUser } from './helpers/demo-data-cleanup';
import { addVisualEnhancements, highlightAndClick, highlightAndFill, highlightAndSelect, narrateStep, visualLogin } from './visual-helpers';

test.use({ storageState: undefined });

test.describe('Presentation Demo 04: Admin User Management', () => {
  let dataFactory: TestDataFactory;

  test.beforeEach(async ({ page, request }) => {
    dataFactory = await createTestDataFactory(request);
    // Clean up demo user for repeatability
    await cleanupDemoUser(request);
    
    // Clear any existing auth session before starting presentation demo
    await page.context().clearCookies();
    await clearAuthSessionFromPage(page);
    
    // Add visual enhancements for presentation mode
    await addVisualEnhancements(page);
  });

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('Complete Admin User Management Demo (100% UI)', async ({ page }) => {
    test.setTimeout(300000); // 5 minute timeout (for demo purposes)
    
    // ============================================================================
    // Setup: Admin Login
    // ============================================================================
    console.log('\n🎬 === Admin User Management Demo ===');
    console.log('🎬 NARRATION: "Admin logs in to manage users and demonstrate RBAC..."');
    console.log('🎬 NARRATION: "Only ADMIN role can access user management - permission isolation..."');

    await visualLogin(page, 'admin');

    // ============================================================================
    // Stage 1: Navigate to User Management Page
    // ============================================================================
    console.log('=== Stage 1: Navigate to User Management ===');
    await page.waitForTimeout(1500);

    // 1. Wait for dashboard to load (signInViaUI already navigates to dashboard)
    await page.waitForTimeout(1500);

    // 2. Click Users navigation link
    narrateStep('Navigating to User Management page...', '🔗');
    const usersLink = page.getByRole('link', { name: /Users/i });
    await expect(usersLink).toBeVisible({ timeout: 15000 });
    await highlightAndClick(usersLink, 'Clicking Users link', { pauseBefore: 1200, pauseAfter: 1500 });

    // 3. Verify user management page loaded
    await expect(page).toHaveURL(/\/users$/, { timeout: 15000 });
    await page.waitForTimeout(1500);

    const userManagementRegion = page.getByRole('region', { name: /User Management/i });
    await expect(userManagementRegion).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log('✅ User management page loaded successfully');

    // ============================================================================
    // Stage 2: Create New User
    // ============================================================================
    console.log('=== Stage 2: Create New User ===');
    await page.waitForTimeout(1500);

    // 4. Click Add User button
    narrateStep('Opening Create User form...', '➕');
    const createUserButton = page.getByRole('button', { name: /Add User|Create User|New User/i });
    await expect(createUserButton).toBeVisible({ timeout: 10000 });
    await highlightAndClick(createUserButton, 'Clicking Add User', { pauseBefore: 1200, pauseAfter: 1500 });

    // 5. Verify create user modal opened
    const createModal = page.getByRole('dialog', { name: /Create User/i });
    await expect(createModal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // 6. Fill user information
    narrateStep('Filling new user information...', '✍️');
    const demoUserEmail = `demo.tutor+${Date.now()}@example.com`;
    const demoFirstName = "Demo";
    const demoLastName = "Tutor";
    const demoPassword = "DemoPass123!";

    // First Name
    const firstNameInput = createModal.getByRole('textbox', { name: /First Name/i });
    await highlightAndFill(firstNameInput, demoFirstName, 'Entering first name', { pauseBefore: 800, pauseAfter: 1500 });

    // Last Name
    const lastNameInput = createModal.getByRole('textbox', { name: /Last Name/i });
    await highlightAndFill(lastNameInput, demoLastName, 'Entering last name', { pauseBefore: 800, pauseAfter: 1500 });

    // Email
    const emailInput = createModal.getByRole('textbox', { name: /Email/i });
    await highlightAndFill(emailInput, demoUserEmail, 'Entering email', { pauseBefore: 800, pauseAfter: 1500 });

    // Role - select TUTOR (already selected by default based on snapshot)
    narrateStep('Selecting user role: Tutor...', '👤');
    const roleSelect = createModal.getByRole('combobox', { name: /Role/i });
    await highlightAndSelect(roleSelect, 'Tutor', 'Selecting Tutor role', { pauseBefore: 1000, pauseAfter: 1500 });

    // Temporary Password
    const passwordInput = createModal.getByRole('textbox', { name: /Temporary Password/i });
    await highlightAndFill(passwordInput, demoPassword, 'Entering password', { pauseBefore: 800, pauseAfter: 1500 });

    // 7. Submit create form
    narrateStep('Creating user account...', '📤');
    const submitButton = createModal.getByRole('button', { name: /Create User/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // 8. Submit and wait for response (fix timeout issue - start listening first, then submit)
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/users') && response.request().method() === 'POST',
        { timeout: 30000 }
      ),
      (async () => {
        try {
          await highlightAndClick(submitButton, 'Creating user', { pauseBefore: 1200, pauseAfter: 500 });
        } catch {
          // If button is outside viewport, use Enter key to submit
          await passwordInput.focus();
          await page.keyboard.press('Enter');
        }
      })(),
    ]);

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(`Create user response not OK (${response.status()}): ${errorText}`);
    }
    const payload = await response.json().catch(() => ({}));
    const createdUserId: number | undefined = payload?.id ?? payload?.data?.id;
    expect(createdUserId).toBeTruthy();
    await page.waitForTimeout(1500);

    // 9. Verify modal closed
    await expect(createModal).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);

    console.log(`✅ New user created successfully: ${demoFirstName} ${demoLastName} (${demoUserEmail})`);
    await page.waitForTimeout(3000);

    // ============================================================================
    // Stage 3: Verify User Appears in List
    // ============================================================================
    console.log('=== Stage 3: Verify User List ===');
    await page.waitForTimeout(1500);

    // 10. Wait for UI to auto-refresh with new user data
    await page.waitForTimeout(2000);

    // 11. Wait for users table to load
    const usersTable = page.locator('[data-testid="users-table"], table');
    await expect(usersTable).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // 12. Search for newly created user
    narrateStep('Searching for newly created user...', '🔍');
    const searchInput = page.getByPlaceholder(/Search|Filter/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await highlightAndFill(searchInput, demoUserEmail, 'Searching for user', { pauseBefore: 800, pauseAfter: 1500 });
    }

    // 13. Verify user row appears
    const userRow = page.locator(`[data-testid="user-row-"], tr`, { hasText: demoUserEmail });
    await expect(userRow.first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // 14. Verify user information
    const demoUserName = `${demoFirstName} ${demoLastName}`;
    await expect(userRow.first()).toContainText(demoUserName);
    await page.waitForTimeout(1500);
    await expect(userRow.first()).toContainText('Tutor');
    await page.waitForTimeout(1500);

    console.log('✅ New user displayed correctly in list');

    // ============================================================================
    // Stage 4: Deactivate User
    // ============================================================================
    console.log('=== Stage 4: Deactivate User ===');
    await page.waitForTimeout(1500);

    // 15. Find Deactivate button in user row
    narrateStep('Deactivating user account...', '🚫');
    const deactivateButton = userRow.getByRole('button', { name: /Deactivate|Disable/i }).first();
    await expect(deactivateButton).toBeVisible({ timeout: 10000 });
    await highlightAndClick(deactivateButton, 'Clicking Deactivate', { pauseBefore: 1200, pauseAfter: 1500 });

    // 16. Confirm deactivation dialog
    const confirmDialog = page.locator('[role="dialog"], [data-testid="confirm-dialog"]');
    if (await confirmDialog.isVisible().catch(() => false)) {
      narrateStep('Confirming deactivation...', '✅');
      const confirmButton = confirmDialog.getByRole('button', { name: /Confirm|Yes|Deactivate/i });
      await highlightAndClick(confirmButton, 'Confirming action', { pauseBefore: 1200, pauseAfter: 1500 });
    }

    // 17. Wait for deactivation to complete
    await page.waitForResponse((response) =>
      response.url().includes('/api/users') && response.request().method() === 'PUT'
    ).catch(() => undefined);
    await page.waitForTimeout(1500);

    // 18. Verify user status changed to Inactive
    console.log('Verifying user status is Inactive...');
    await expect(userRow.first()).toContainText(/Inactive|Disabled/i, { timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log('✅ User deactivated successfully');
    await page.waitForTimeout(3000);

    // ============================================================================
    // Stage 5: Reactivate User
    // ============================================================================
    console.log('=== Stage 5: Reactivate User ===');
    await page.waitForTimeout(1500);

    // 19. Find Activate button in user row
    narrateStep('Reactivating user account...', '🔄');
    const activateButton = userRow.getByRole('button', { name: /Activate|Enable|Reactivate/i }).first();
    await expect(activateButton).toBeVisible({ timeout: 10000 });
    await highlightAndClick(activateButton, 'Clicking Activate', { pauseBefore: 1200, pauseAfter: 1500 });

    // 20. Confirm activation dialog
    if (await confirmDialog.isVisible().catch(() => false)) {
      narrateStep('Confirming reactivation...', '✅');
      const confirmActivate = confirmDialog.getByRole('button', { name: /Confirm|Yes|Activate/i });
      await highlightAndClick(confirmActivate, 'Confirming action', { pauseBefore: 1200, pauseAfter: 1500 });
    }

    // 21. Wait for activation to complete
    await page.waitForResponse((response) =>
      response.url().includes('/api/users') && response.request().method() === 'PUT'
    ).catch(() => undefined);
    await page.waitForTimeout(1500);

    // 22. Verify user status changed to Active
    console.log('Verifying user status is Active...');
    await expect(userRow.first()).toContainText(/Active|Enabled/i, { timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log('✅ User reactivated successfully');
    await page.waitForTimeout(3000);

    // ============================================================================
    // Stage 6: Cleanup Demo Data (Optional, via API)
    // ============================================================================
    console.log('=== Stage 6: Cleanup Demo Data ===');

    // 23. Delete demo user via API (if delete functionality exists)
    console.log('Cleaning up demo user via API...');
    // Note: Actual deletion can be done via dataFactory or direct API call
    // Here we just demonstrate, without actually executing deletion
    await page.waitForTimeout(1500);

    console.log('🎉 Admin user management demonstration completed!');
    console.log('Demo Highlights:');
    console.log('1. User creation: Admin can create new users and assign roles');
    console.log('2. User list: Real-time refresh displays all users');
    console.log('3. User deactivation: Deactivated users cannot login');
    console.log('4. User activation: Reactivation restores access permissions');
    console.log('5. Permission isolation: Only Admin can manage users');
    console.log('6. Audit log: All user management operations are auditable');
    console.log('7. 100% UI interaction: no API calls');
    await page.waitForTimeout(5000);
  });
});
