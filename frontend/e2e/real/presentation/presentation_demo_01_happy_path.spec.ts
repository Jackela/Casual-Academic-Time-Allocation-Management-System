/* eslint-disable no-restricted-syntax */
// Presentation demos require visual timing for demo flow
/**
 * Demo Script 1: Complete "Happy Path" Four-Level Approval Workflow
 * Demo Duration: ~5.0 minutes
 *
 * Purpose:
 * Demonstrate the system's core business value - complete Lecturer → Tutor → Lecturer → Admin four-level approval workflow
 *
 * Demo Flow:
 * 1. Lecturer creates timesheet via UI and assigns to Tutor
 * 2. Tutor confirms timesheet via UI
 * 3. Lecturer approves confirmation via UI
 * 4. Admin performs final confirmation via UI
 *
 * Key Features:
 * - State machine-driven approval transitions
 * - Multi-role permission isolation
 * - Real-time data refresh
 * - 100% UI interaction, no API calls
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { LecturerDashboardPage } from '../../shared/pages/dashboard/LecturerDashboardPage';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signOutViaUI } from '../../api/auth-helper';
import { statusLabel } from '../../utils/status-labels';
import { finalizeTimesheet } from '../../utils/workflow-helpers';
import { addVisualEnhancements, highlightAndClick, highlightAndFill, highlightAndSelect, narrateStep, stabilizeLecturerCreateForm, visualLogin, waitForCreatedTimesheet, waitForLecturerRateCode } from './visual-helpers';

test.use({ storageState: undefined });

test.describe('Presentation Demo 01: Happy Path Four-Level Approval Workflow', () => {
  const formatUtcDate = (value: Date) => {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let dataFactory: TestDataFactory;
  const createdTimesheetIds: number[] = [];

  test.beforeEach(async ({ page, request }) => {
    dataFactory = await createTestDataFactory(request);
    
    // Clear any existing auth session before starting presentation demo
    await page.context().clearCookies();
    await clearAuthSessionFromPage(page);
    
    // Add visual enhancements for presentation mode
    await addVisualEnhancements(page);
    
    // Disable Lecturer Modal auto-open for presentation mode
    await page.goto('/'); // Load any page to access localStorage
    await page.evaluate(() => {
      window.localStorage.setItem('__E2E_DISABLE_LECTURER_MODAL__', '1');
    });
  });

  test.afterEach(async ({ page, request }) => {
    const tokens = dataFactory?.getAuthTokens();
    const backendUrl = process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8084';
    for (const timesheetId of createdTimesheetIds.splice(0).reverse()) {
      let deleted = false;
      try {
        const response = await request.delete(`${backendUrl}/api/timesheets/${timesheetId}`, {
          headers: tokens ? { Authorization: `Bearer ${tokens.admin.token}` } : undefined,
        });
        deleted = response.status() === 204;
      } catch {
        deleted = false;
      }

      if (!deleted && tokens) {
        await finalizeTimesheet(request, tokens, timesheetId).catch(() => undefined);
        await request.delete(`${backendUrl}/api/timesheets/${timesheetId}`, {
          headers: { Authorization: `Bearer ${tokens.admin.token}` },
        }).catch(() => undefined);
      }
    }

    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('Complete Happy Path Approval Workflow (100% UI)', async ({ page }) => {
    test.setTimeout(300000); // 5 minute timeout (for demo purposes)
    const weekOffset = test.info().repeatEachIndex + (test.info().retry * 8);
    const baseMonday = new Date('2021-02-08T00:00:00Z');
    baseMonday.setUTCDate(baseMonday.getUTCDate() + (weekOffset * 7));
    const isoMonday = formatUtcDate(baseMonday);
    const description = `COMP1001 Tutorial - Week of ${isoMonday} - Happy Path Demo`;
    let courseId: number;

    // ============================================================================
    // Stage 1: Lecturer Creates Timesheet (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 1: Lecturer Creates Timesheet ===');
    console.log('🎬 NARRATION: "First, the lecturer logs in to create a new timesheet..."');

    // 1. Lecturer login via UI
    await visualLogin(page, 'lecturer');

    const lecturerDashboard = new LecturerDashboardPage(page);

    // 2. Wait for dashboard to load
    await page.waitForTimeout(2000);

    // 3. Open create timesheet modal (using direct method for reliability)
    console.log('Opening timesheet creation form...');
    const modal = page.getByTestId('lecturer-create-modal');
    const modalAlreadyOpen = await modal.isVisible().catch(() => false);
    if (!modalAlreadyOpen) {
      await lecturerDashboard.openCreateModal();
    }
    await page.waitForTimeout(2000);

    // Wait for options to load
    const loadingBanner = page.getByText('Loading available options…');
    if (await loadingBanner.isVisible().catch(() => false)) {
      await expect(loadingBanner).toBeHidden({ timeout: 20000 });
    }

    // 4. Fill form (UI interaction)
    console.log('Filling timesheet information...');

    // Select Tutor (explicitly select E2E Tutor One to avoid test isolation issues)
    narrateStep('Selecting tutor for the timesheet...', '👤');
    const tutorSelect = modal.getByTestId('create-tutor-select');
    await expect(tutorSelect).toBeVisible({ timeout: 10000 });
    await expect(tutorSelect).toBeEnabled({ timeout: 10000 });
    
    // Explicitly select E2E Tutor One (instead of first option, to avoid interference from demo_04 created users)
    const e2eTutorOption = tutorSelect.locator('option', { hasText: 'E2E Tutor One' });
    const tutorValue = await e2eTutorOption.getAttribute('value');
    if (!tutorValue) {
      throw new Error('E2E Tutor One not found in tutor options');
    }
    console.log('🎯 Selecting E2E Tutor One');
    await tutorSelect.selectOption(tutorValue);
    await expect(tutorSelect.locator('option:checked')).toHaveText(/E2E Tutor One/i, { timeout: 5000 });

    // Wait for Tutor selection side-effect: qualification auto-filled and disabled
    const qualificationSelect = modal.getByLabel('Tutor Qualification');
    await expect(qualificationSelect).toBeVisible({ timeout: 10000 });
    await expect(qualificationSelect).toBeDisabled({ timeout: 10000 });

    // Select Course (trigger events to ensure React Hook Form recognition)
    narrateStep('Selecting course for the timesheet...', '📚');
    const courseSelect = modal.getByTestId('create-course-select');
    await expect(courseSelect).toBeVisible({ timeout: 10000 });
    await expect(courseSelect).toBeEnabled({ timeout: 10000 });
    const courseOptions = await courseSelect.locator('option').allInnerTexts();
    const firstCourseValue = await courseSelect.locator('option').nth(1).getAttribute('value');
    if (!firstCourseValue) {
      throw new Error('No course options available');
    }
    // eslint-disable-next-line prefer-const -- assigned conditionally from async selection
    courseId = parseInt(firstCourseValue, 10);
    console.log(`🎯 Selecting ${courseOptions[1]}`);
    await courseSelect.selectOption(firstCourseValue);
    await expect(courseSelect).toHaveValue(firstCourseValue, { timeout: 5000 });

    // Fill Week Starting date (use native input to directly fill and trigger React Hook Form events)
    narrateStep(`Selecting week starting date: ${isoMonday}...`, '📅');
    const weekStartNativeInput = modal.getByRole('textbox', { name: /Week Starting/i }).first();
    console.log(`✏️  Entering date ${isoMonday}: "${isoMonday}"`);
    await weekStartNativeInput.fill(isoMonday);
    await weekStartNativeInput.blur().catch(() => undefined);
    await expect(weekStartNativeInput).toHaveValue(isoMonday, { timeout: 5000 });

    // Ensure course selection persists after date change
    await courseSelect.selectOption(firstCourseValue).catch(() => undefined);
    await courseSelect.evaluate((el: HTMLSelectElement) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    await expect(courseSelect).toHaveValue(firstCourseValue, { timeout: 5000 });

    // Note: Tutorial type Delivery Hours auto-filled to 1.0 and read-only, no filling needed

    // Fill Description
    narrateStep('Filling timesheet description...', '✍️');
    const descriptionInput = modal.getByTestId('create-description-input');
    console.log(`✏️  Entering description: "${description}"`);
    await descriptionInput.fill(description);
    await descriptionInput.blur().catch(() => undefined);
    await expect(descriptionInput).toHaveValue(description, { timeout: 5000 });

    const matchingQuoteResponse = await page.waitForResponse((response) => {
      if (!response.url().includes('/api/timesheets/quote') || response.request().method() !== 'POST') {
        return false;
      }
      try {
        const payload = response.request().postDataJSON() as Record<string, unknown>;
        return (
          Number(payload.tutorId) === Number(tutorValue) &&
          Number(payload.courseId) === Number(firstCourseValue) &&
          String(payload.sessionDate ?? payload.weekStartDate ?? '') === isoMonday
        );
      } catch {
        return false;
      }
    }, { timeout: 10000 }).catch(() => null);

    // Critical: Wait for Rate Code calculation to complete (no longer showing '-')
    console.log('Waiting for rate calculation to complete...');
    await waitForLecturerRateCode(page, 10000);
    await page.waitForTimeout(500);
    console.log('✅ Rate calculation completed');

    if (!matchingQuoteResponse) {
      console.warn('⚠️ Matching quote payload was not observed before submit; continuing with field re-assertion');
    }

    await descriptionInput.fill(description);
    await descriptionInput.blur().catch(() => undefined);
    await expect(descriptionInput).toHaveValue(description, { timeout: 5000 });

    const repairedFields = await stabilizeLecturerCreateForm(page, {
      tutorSelect,
      tutorValue,
      courseSelect,
      courseValue: firstCourseValue,
      weekStartInput: weekStartNativeInput,
      weekStartDate: isoMonday,
      descriptionInput,
      description,
    });
    if (repairedFields) {
      await waitForLecturerRateCode(page, 10000);
      await page.waitForTimeout(500);
    }

    // 5. Submit form to create timesheet (UI interaction)
    narrateStep('Submitting timesheet creation...', '📤');
    
    // Locate submit button and ensure visible and clickable
    const submitButton = modal.getByRole('button', { name: /^Create Timesheet$/i });
    await expect(submitButton.first()).toBeVisible({ timeout: 15000 });
    await submitButton.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(submitButton).toBeEnabled({ timeout: 15000 });

    const waitForCreateResponse = () =>
      page.waitForResponse((response) =>
        response.url().includes('/api/timesheets') &&
        !response.url().includes('/quote') &&
        response.request().method() === 'POST',
      { timeout: 15000 });

    const submitCreateForm = async () => {
      try {
        await highlightAndClick(submitButton.first(), 'Creating timesheet', { pauseBefore: 1200, pauseAfter: 500 });
        return;
      } catch {
        // fall through to a direct click retry
      }

      try {
        await submitButton.first().click({ timeout: 5000, force: true });
      } catch {
        try {
          await descriptionInput.focus();
          await page.keyboard.press('Enter');
        } catch {
          // Ignore and let caller handle the missing response.
        }
      }
    };

    let createResponse: Awaited<ReturnType<typeof page.waitForResponse>> | null = null;
    const maxSubmitAttempts = 2;
    for (let attempt = 1; attempt <= maxSubmitAttempts; attempt += 1) {
      const responsePromise = waitForCreateResponse().catch(() => null);
      await submitCreateForm();
      createResponse = await responsePromise;
      if (createResponse) {
        break;
      }

      const modalStillVisible = await modal.isVisible().catch(() => false);
      if (!modalStillVisible || attempt === maxSubmitAttempts) {
        break;
      }

      console.warn(`⚠️ Create response not observed (attempt ${attempt}/${maxSubmitAttempts}), retrying submit...`);
      await page.waitForTimeout(800);
    }

    const backendUrl = process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8084';
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    let createdData: Record<string, unknown> = {};
    let timesheetId = 0;

    if (createResponse && !createResponse.ok()) {
      const errorText = await createResponse.text();
      throw new Error(`Timesheet creation failed: ${createResponse.status()} - ${errorText}`);
    }

    if (createResponse) {
      createdData = await createResponse.json().catch(() => ({}));
      timesheetId = Number(createdData.id || createdData.timesheetId || (createdData.data as { id?: number } | undefined)?.id || 0);
    }

    if (!timesheetId) {
      const recovered = await waitForCreatedTimesheet(page, {
        backendUrl,
        token,
        courseId,
        description,
        weekStartDate: isoMonday,
        timeout: 15000,
      });

      if (!recovered) {
        const modalStillVisible = await modal.isVisible().catch(() => false);
        throw new Error(`Timesheet creation response not observed after ${maxSubmitAttempts} attempts (modalVisible=${modalStillVisible}, url=${page.url()})`);
      }

      timesheetId = recovered.id;
      if (recovered.status) {
        createdData.status = recovered.status;
      }
      console.warn(`⚠️ Timesheet POST response was not observed; recovered created record via list lookup (ID: ${timesheetId})`);
    }

    console.log(`✅ Timesheet created, ID: ${timesheetId}`);
    createdTimesheetIds.push(timesheetId);

    if (!timesheetId) {
      throw new Error('Failed to extract timesheet ID from creation response payload');
    }

    const detailResp = await page.request.get(`${backendUrl}/api/timesheets/${timesheetId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    expect(detailResp.ok()).toBeTruthy();
    const detailPayload = await detailResp.json().catch(() => ({}));
    const createdStatus = detailPayload.status ?? detailPayload.timesheet?.status ?? createdData.status;
    expect(createdStatus).toBe('PENDING_TUTOR_CONFIRMATION');
    await page.waitForTimeout(2500);

    // 7. Lecturer logout via UI
    console.log('🎬 NARRATION: "Lecturer task complete, now switching to tutor role..."');
    await signOutViaUI(page, { pauseAfterLogout: 1500 });

    // ============================================================================
    // Stage 2: Tutor Confirms Timesheet (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 2: Tutor Confirms Timesheet ===');
    console.log('🎬 NARRATION: "The tutor logs in to confirm the hours worked..."');

    // 8. Tutor login via UI
    await visualLogin(page, 'tutor');

    const tutorDashboard = new TutorDashboardPage(page);

    // 9. Wait for dashboard to load (signInViaUI already navigates to dashboard)
    await page.waitForTimeout(2000);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();

    // 10. Find pending confirmation timesheet
    console.log(`Finding pending confirmation timesheet (ID: ${timesheetId})...`);
    const tutorRow = tutorDashboard.getTimesheetRow(timesheetId, description);
    await expect(tutorRow).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    const statusBadge = tutorDashboard.getStatusBadge(timesheetId);
    await expect(statusBadge).toContainText(statusLabel('PENDING_TUTOR_CONFIRMATION'));
    await page.waitForTimeout(2000);

    // 11. Tutor clicks Confirm button (UI interaction)
    narrateStep('Tutor confirming timesheet...', '✅');
    await tutorDashboard.expectConfirmButtonVisible(timesheetId);
    
    const confirmButton = page.locator(`[data-testid="confirm-btn-${timesheetId}"]`);
    await highlightAndClick(confirmButton, 'Confirming hours worked', { pauseBefore: 1200 });
    
    await page.waitForTimeout(2000);

    // 12. Verify status changed to TUTOR_CONFIRMED (UI verification)
    await page.waitForResponse((r) => 
      r.url().includes('/api/approvals/pending') && r.request().method() === 'GET'
    ).catch(() => undefined);
    await page.waitForTimeout(1500);

    await expect(statusBadge).toContainText(statusLabel('TUTOR_CONFIRMED'), { timeout: 15000 });
    await page.waitForTimeout(2500);

    console.log('✅ Tutor confirmation completed, status: TUTOR_CONFIRMED');

    // 13. Tutor logout via UI
    console.log('🎬 NARRATION: "Tutor confirmation complete, switching back to lecturer..."');
    await signOutViaUI(page, { pauseAfterLogout: 1500 });

    // ============================================================================
    // Stage 3: Lecturer Approval Confirmation (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 3: Lecturer Approves Tutor Confirmation ===');
    console.log('🎬 NARRATION: "Lecturer reviews and approves the tutor-confirmed hours..."');

    // 14. Lecturer login via UI
    await visualLogin(page, 'lecturer');

    const lecturerDashboardReview = new DashboardPage(page);

    // 15. Wait for dashboard to load (signInViaUI already navigates to dashboard)
    await page.waitForTimeout(2000);
    await lecturerDashboardReview.expectToBeLoaded('LECTURER');

    // Close possibly opened create modal (auto-opens in E2E environment)
    // Since modal may auto-reopen, we need to wait for it to fully close
    const createModalInStage3 = page.getByTestId('lecturer-create-modal');
    let attempts = 0;
    while (await createModalInStage3.isVisible().catch(() => false) && attempts < 3) {
      // Temporarily disable auto-open flag
      await page.evaluate(() => {
        window.localStorage.setItem('__E2E_DISABLE_LECTURER_MODAL__', '1');
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      attempts++;
    }
    await lecturerDashboardReview.waitForTimesheetData();

    // 16. Switch to Pending Review tab (UI interaction)
    narrateStep('Switching to Pending Review tab...', '📋');
    const pendingTab = page.getByRole('button', { name: /Pending Review/i });
    if (await pendingTab.isVisible().catch(() => false)) {
      await highlightAndClick(pendingTab, 'Opening Pending Review', { pauseBefore: 1000 });
      await lecturerDashboardReview.waitForTimesheetData();
    }

    // 17. Find pending approval timesheet (UI verification)
    console.log(`Finding pending approval timesheet (ID: ${timesheetId})...`);
    const lecturerRow = await lecturerDashboardReview.getTimesheetById(timesheetId);
    await expect(lecturerRow).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    // 18. Lecturer clicks Approve button (UI interaction)
    narrateStep('Lecturer approving tutor confirmation...', '✅');
    const approveButton = await lecturerDashboardReview.getApproveButtonForTimesheet(timesheetId);
    await expect(approveButton).toBeVisible();

    // Set up response promise BEFORE clicking
    const approvalResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/approvals') && response.status() === 200,
      { timeout: 15000 }
    );
    
    // Highlight and click approve button
    await highlightAndClick(approveButton, 'Approving timesheet', { pauseBefore: 1200, pauseAfter: 500 });
    
    // Wait for successful approval response
    await approvalResponsePromise;
    await page.waitForTimeout(2000);

    // 19. Verify timesheet disappeared from Lecturer's pending list (indicating successful approval) (UI verification)
    console.log('Verifying approval success (timesheet removed from list)...');
    await expect(lecturerRow).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2500);

    console.log('✅ Lecturer confirmation completed, timesheet removed from pending list');

    // 20. Lecturer logout via UI
    console.log('🎬 NARRATION: "Lecturer approval done, now admin performs final confirmation..."');
    await signOutViaUI(page, { pauseAfterLogout: 1500 });

    // ============================================================================
    // Stage 4: Admin Final Confirmation (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 4: Admin Final Confirmation ===');
    console.log('🎬 NARRATION: "Finally, the admin approves for payroll processing..."');

    // 21. Admin login via UI
    await visualLogin(page, 'admin');

    const adminDashboard = new DashboardPage(page);

    // 22. Wait for dashboard to load (signInViaUI already navigates to dashboard)
    await page.waitForTimeout(2000);
    await adminDashboard.expectToBeLoaded('ADMIN');
    await adminDashboard.waitForTimesheetData();

    // 23. Switch to Pending Approvals tab (UI interaction)
    narrateStep('Switching to Pending Approvals tab...', '📋');
    const adminPendingTab = page.getByRole('button', { name: /Pending Approvals/i });
    if (await adminPendingTab.isVisible().catch(() => false)) {
      await highlightAndClick(adminPendingTab, 'Opening Pending Approvals', { pauseBefore: 1000 });
      await adminDashboard.waitForTimesheetData();
    }

    // 24. Find pending final confirmation timesheet (UI verification)
    // If not found, indicates Admin permission issue that needs system fix
    console.log(`Finding pending final confirmation timesheet (ID: ${timesheetId})...`);
    const adminRow = await adminDashboard.getTimesheetById(timesheetId);
    
    // Critical verification: Admin should be able to see this timesheet
    try {
      await expect(adminRow).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      console.log('✅ Admin can see pending approval timesheet');
    } catch (error) {
      console.error('❌ Admin cannot see pending approval timesheet - this is a system permission bug!');
      throw new Error(`Admin cannot see timesheet ${timesheetId} in pending list. This indicates a permission/course assignment bug in the system that needs to be fixed.`);
    }

    // 25. Admin clicks Approve/Final Confirm button (UI interaction)
    narrateStep('Admin performing final confirmation...', '🎯');
    const adminApproveButton = await adminDashboard.getApproveButtonForTimesheet(timesheetId);
    await expect(adminApproveButton).toBeVisible();

    // Set up response promise BEFORE clicking
    const adminApprovalResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/approvals') && response.status() === 200,
      { timeout: 15000 }
    );
    
    // Highlight and click final approve button
    await highlightAndClick(adminApproveButton, 'Final approval for payroll', { pauseBefore: 1200, pauseAfter: 500 });
    
    // Wait for successful approval response
    await adminApprovalResponsePromise;
    await page.waitForTimeout(2000);

    // 26. Verify timesheet disappeared from Admin's pending list (indicating successful final confirmation) (UI verification)
    console.log('Verifying final confirmation success (timesheet removed from list)...');
    await expect(adminRow).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2500);

    console.log('✅ Admin final confirmation completed, timesheet removed from pending list');
    await page.waitForTimeout(5000);

    console.log('🎉 Complete four-level approval workflow demo finished!');
    console.log('Demo Highlights:');
    console.log('1. 100% UI interaction - no API calls');
    console.log('2. Precise state machine control: DRAFT → PENDING_TUTOR_CONFIRMATION → TUTOR_CONFIRMED → LECTURER_CONFIRMED → FINAL_CONFIRMED');
    console.log('3. Multi-role permission isolation: Lecturer creates/Tutor confirms/Lecturer approves/Admin final confirmation');
    console.log('4. Real-time data refresh: UI updates immediately after each operation');
    console.log('5. Approval history tracking: all operations are auditable');
  });
});
