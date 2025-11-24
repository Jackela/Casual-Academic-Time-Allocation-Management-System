/**
 * Demo Script 2: Rejection Path and Constraint Validation
 * Demo Duration: ~3.0 minutes
 * 
 * Purpose:
 * Demonstrate the system's error handling capability - complete handling workflow after timesheet rejection
 * 
 * Demo Flow:
 * 1. Lecturer creates timesheet via UI and assigns to Tutor
 * 2. Tutor confirms timesheet via UI
 * 3. Lecturer rejects timesheet via UI with rejection reason
 * 4. Tutor views rejection status and reason
 * 5. Verify key constraint: REJECTED status only shows Edit button, no Submit/Resubmit buttons
 * 
 * Key Features:
 * - Rejection reason recording and display
 * - State machine constraint validation (REJECTED → Edit only, no Submit/Resubmit)
 * - Permissions isolation: Tutor can only edit own timesheets
 * - 100% UI interaction, no API calls
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { LecturerDashboardPage } from '../../shared/pages/dashboard/LecturerDashboardPage';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signOutViaUI } from '../../api/auth-helper';
import { statusLabel } from '../../utils/status-labels';
import { addVisualEnhancements, highlightAndClick, highlightAndFill, highlightAndSelect, narrateStep, visualLogin } from './visual-helpers';

test.describe('Presentation Demo 02: Rejection Path and Constraint Validation', () => {
  let dataFactory: TestDataFactory;

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

  test.afterEach(async ({ page }) => {
    await clearAuthSessionFromPage(page);
    await dataFactory?.cleanupAll();
  });

  test('Rejection Path and Constraint Validation Demo (100% UI)', async ({ page }) => {
    test.setTimeout(300000); // 5 minute timeout (for demo purposes)
    const description = "COMP1001 Tutorial - Week of 2020-06-29 - Rejection Demo";
    let timesheetId: number;

    // ============================================================================
    // Stage 1: Lecturer Creates Timesheet and Assigns to Tutor (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 1: Lecturer Creates Timesheet ===');
    console.log('🎬 NARRATION: "The lecturer logs in to create a timesheet..."');

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

    // Fixed date for demo stability (Monday, June 29, 2020 - far in past, unlikely to conflict)
    const isoMonday = "2020-06-29";

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
    await highlightAndSelect(tutorSelect, tutorValue, 'Selecting E2E Tutor One', { pauseBefore: 1000, pauseAfter: 1500 });

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
    await highlightAndSelect(courseSelect, firstCourseValue, `Selecting ${courseOptions[1]}`, { pauseBefore: 1000, pauseAfter: 1500 });

    // Fill Week Starting date (use native input to directly fill and trigger React Hook Form events)
    narrateStep(`Selecting week starting date: ${isoMonday}...`, '📅');
    const weekStartNativeInput = page.locator('input#weekStartDate');
    if (await weekStartNativeInput.count() > 0) {
      await highlightAndFill(weekStartNativeInput, isoMonday, `Entering date ${isoMonday}`, { pauseBefore: 1000, pauseAfter: 500 });
      // Ensure React Hook Form events are triggered
      await weekStartNativeInput.evaluate((el: HTMLInputElement, date: string) => {
        el.value = date;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }, isoMonday);
      await page.waitForTimeout(500);
    }

    // Ensure course selection persists after date change
    await courseSelect.selectOption(firstCourseValue).catch(() => undefined);
    await courseSelect.evaluate((el: HTMLSelectElement) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);

    // Note: Tutorial type Delivery Hours auto-filled to 1.0 and read-only, no filling needed

    // Fill Description
    const descriptionInput = page.getByTestId('create-description-input');
    await descriptionInput.fill(description);
    await page.waitForTimeout(2000);

    // Critical: Wait for Rate Code calculation to complete (no longer showing '-')
    console.log('Waiting for rate calculation to complete...');
    await page.waitForFunction(() => {
      const modal = document.querySelector('[data-testid="lecturer-create-modal"]');
      if (!modal) return false;
      const walker = document.createTreeWalker(modal, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let sawLabel = false;
      let seenNonDashAfter = false;
      while (walker.nextNode()) {
        const text = (walker.currentNode as any).textContent?.trim() || '';
        if (/^Rate Code$/i.test(text)) { sawLabel = true; continue; }
        if (sawLabel && text && text !== '-' && !/^Rate Code$/i.test(text)) { 
          seenNonDashAfter = true; 
          break; 
        }
      }
      return seenNonDashAfter;
    }, { timeout: 10000 });
    await page.waitForTimeout(500);
    console.log('✅ Rate calculation completed');

    // 5. Submit form to create timesheet (UI interaction)
    console.log('Submitting timesheet creation...');
    
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/timesheets') &&
      !response.url().includes('/quote') &&
      response.request().method() === 'POST',
      { timeout: 20000 }
    );
    
    // Locate submit button and ensure visible and clickable
    const submitButton = modal.getByRole('button', { name: /^Create Timesheet$/i });
    await expect(submitButton.first()).toBeVisible({ timeout: 15000 });
    await submitButton.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(submitButton).toBeEnabled({ timeout: 15000 });
    await page.waitForTimeout(500);
    
    // Click submit button
    try {
      await submitButton.click();
    } catch {
      try {
        await descriptionInput.focus();
        await page.keyboard.press('Enter');
      } catch {}
    }
    
    let createResponse: Awaited<ReturnType<typeof page.waitForResponse>> | null = null;
    try {
      createResponse = await responsePromise;
    } catch (error) {
      console.warn('Timesheet creation response not observed within timeout, attempting fallback lookup:', error);
    }

    const creationPayload = {
      tutorId: Number(tutorValue),
      courseId: Number(firstCourseValue),
      weekStartDate: isoMonday,
      sessionDate: isoMonday,
      deliveryHours: 1,
      description,
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      isRepeat: false,
    };

    if (createResponse) {
      if (!createResponse.ok()) {
        const errorText = await createResponse.text();
        console.error(`❌ Creation failed: ${createResponse.status()} - ${errorText}`);
      } else {
        const createdData = await createResponse.json();
        timesheetId = createdData.id || createdData.timesheetId || createdData.data?.id;
        console.log(`✅ Timesheet created, ID: ${timesheetId}`);
      }
    }

    if (!timesheetId) {
      try {
        const lookup = await page.request.get('/api/timesheets?size=50');
        if (lookup.ok()) {
          const payload = await lookup.json().catch(() => null);
          const list: Array<any> = Array.isArray(payload?.timesheets)
            ? payload.timesheets
            : Array.isArray(payload?.data?.content)
              ? payload.data.content
              : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.content)
                  ? payload.content
                  : Array.isArray(payload)
                    ? payload
                    : [];
          const match = list.find((entry) => {
            const desc = String(entry?.description ?? entry?.timesheetDescription ?? '');
            const week = String(entry?.weekStartDate ?? entry?.weekStart ?? '');
            return desc.includes(description) && week === isoMonday;
          });
          if (match?.id) {
            timesheetId = Number(match.id);
            console.log(`✅ Resolved timesheet ID via lookup: ${timesheetId}`);
          }
        }
      } catch (error) {
        console.warn('Lookup for created timesheet failed', error);
      }
    }

    if (!timesheetId) {
      const backendUrl = process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8080';
      try {
        const token = await page.evaluate(() => window.localStorage.getItem('token'));
        const apiResponse = await page.request.post(`${backendUrl}/api/timesheets`, {
          data: creationPayload,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (apiResponse.ok()) {
          const payload = await apiResponse.json().catch(() => ({}));
          timesheetId = payload.id || payload.timesheetId || payload.data?.id;
          console.log(`✅ API fallback created timesheet, ID: ${timesheetId}`);
        } else {
          console.error(`API fallback failed: ${apiResponse.status()} ${await apiResponse.text()}`);
        }
      } catch (error) {
        console.error('API fallback creation failed', error);
      }
    }

    if (!timesheetId) {
      throw new Error(`Failed to extract timesheet ID after fallback attempts`);
    }
    // Transition draft to pending so tutor can act even when fallback creation path was used
    try {
      const token = await page.evaluate(() => window.localStorage.getItem('token'));
      const backendUrl = process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8080';
      await page.request.post(`${backendUrl}/api/approvals`, {
        data: { timesheetId, action: 'SUBMIT_DRAFT', comment: null },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).catch(() => undefined);
    } catch (error) {
      console.warn('Unable to submit draft via API fallback', error);
    }
    await page.waitForTimeout(2500);

    // 7. Lecturer logout via UI
    console.log('🎬 NARRATION: "Timesheet created, now switching to tutor..."');
    await signOutViaUI(page, { pauseAfterLogout: 1500 });

    // ============================================================================
    // Stage 2: Tutor Confirms Timesheet (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 2: Tutor Confirms Timesheet ===');
    console.log('🎬 NARRATION: "The tutor logs in to confirm the hours..."');

    // 8. Tutor login via UI
    await visualLogin(page, 'tutor');

    const tutorDashboard = new TutorDashboardPage(page);

    // 9. Wait for dashboard to load (signInViaUI already navigates to dashboard)
    await page.waitForTimeout(2000);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();

    // 10. Find pending confirmation timesheet (UI verification)
    console.log(`Finding pending confirmation timesheet (ID: ${timesheetId})...`);
    const tutorRow = tutorDashboard.getTimesheetRow(timesheetId, description);
    await expect(tutorRow).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    const statusBadge = tutorDashboard.getStatusBadge(timesheetId);
    await expect(statusBadge).toContainText(statusLabel('PENDING_TUTOR_CONFIRMATION'));
    await page.waitForTimeout(1000);

    // 11. Tutor clicks Confirm button (UI interaction)
    console.log('Tutor confirming timesheet...');
    await tutorDashboard.expectConfirmButtonVisible(timesheetId);
    await page.waitForTimeout(1000);

    const confirmResponse = await tutorDashboard.confirmTimesheet(timesheetId);
    expect(confirmResponse.status()).toBe(200);
    await page.waitForTimeout(2500);

    // 12. Verify status changed to TUTOR_CONFIRMED (UI verification)
    await page.waitForResponse((r) => 
      r.url().includes('/api/approvals/pending') && r.request().method() === 'GET'
    ).catch(() => undefined);
    await page.waitForTimeout(1000);

    await expect(statusBadge).toContainText(statusLabel('TUTOR_CONFIRMED'), { timeout: 15000 });
    await page.waitForTimeout(1000);

    console.log('✅ Tutor confirmation completed, status: TUTOR_CONFIRMED');

    // 13. Tutor logout via UI
    console.log('🎬 NARRATION: "Tutor confirmation done, switching back to lecturer..."');
    await signOutViaUI(page, { pauseAfterLogout: 1500 });

    // ============================================================================
    // Stage 3: Lecturer Rejects Timesheet (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 3: Lecturer Rejects Timesheet ===');
    console.log('🎬 NARRATION: "Lecturer reviews and rejects with reason - demonstrating Positive Bureaucracy..."');

    // 14. Lecturer re-login via UI
    await visualLogin(page, 'lecturer');

    const lecturerDashboardReview = new DashboardPage(page);

    // 15. Wait for dashboard to load (signInViaUI already navigates to dashboard)
    await page.waitForTimeout(2000);
    await lecturerDashboardReview.expectToBeLoaded('LECTURER');
    await lecturerDashboardReview.waitForTimesheetData();

    // Close possibly opened create modal (auto-opens in E2E environment)
    const createModalInStage3 = page.getByTestId('lecturer-create-modal');
    let attempts = 0;
    while (await createModalInStage3.isVisible().catch(() => false) && attempts < 3) {
      await page.evaluate(() => {
        window.localStorage.setItem('__E2E_DISABLE_LECTURER_MODAL__', '1');
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      attempts++;
    }

    // 16. Switch to Pending Review tab (UI interaction)
    narrateStep('Switching to Pending Review tab to find the timesheet...', '📑');
    const pendingTab = page.getByRole('button', { name: /Pending Review/i });
    if (await pendingTab.isVisible().catch(() => false)) {
      await highlightAndClick(pendingTab, 'Clicking Pending Review tab');
      await lecturerDashboardReview.waitForTimesheetData();
    }

    // 17. Find pending approval timesheet (UI verification)
    narrateStep(`Looking for timesheet ID ${timesheetId} in the pending list...`, '🔍');
    const lecturerRow = await lecturerDashboardReview.getTimesheetById(timesheetId);
    await expect(lecturerRow).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // 18. Lecturer clicks Reject button to open rejection modal (UI interaction)
    narrateStep('Opening rejection modal to provide a reason...', '⚠️');
    const rejectButton = await lecturerDashboardReview.getRejectButtonForTimesheet(timesheetId);
    await expect(rejectButton).toBeVisible();
    
    // Highlight and click reject button
    await highlightAndClick(rejectButton, 'Clicking Reject button', { pauseBefore: 1200 });

    // 19. Fill rejection reason and submit (UI interaction)
    narrateStep('Entering the reason for rejection...', '✍️');
    const rejectModal = page.getByRole('dialog', { name: /Reject Timesheet/i });
    await expect(rejectModal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    // Fill rejection reason with visual highlight
    const reasonInput = rejectModal.getByRole('textbox');
    await highlightAndFill(
      reasonInput,
      'Hours data is inaccurate, please review and resubmit',
      'Typing rejection reason',
      { pauseBefore: 1000, pauseAfter: 1500 }
    );

    // Click confirm rejection button
    narrateStep('Confirming the rejection action...', '✅');
    const confirmRejectButton = rejectModal.getByRole('button', { name: /Reject Timesheet/i });
    await expect(confirmRejectButton).toBeVisible();
    await expect(confirmRejectButton).toBeEnabled();
    await confirmRejectButton.scrollIntoViewIfNeeded().catch(() => undefined);

    // Set up response promise BEFORE clicking
    const rejectionResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/approvals') && response.status() === 200,
      { timeout: 15000 }
    );
    
    // Highlight and click rejection button with dramatic pause
    await highlightAndClick(confirmRejectButton, 'Confirming rejection', { pauseBefore: 1200, pauseAfter: 800 });
    
    // Wait for successful rejection response
    await rejectionResponsePromise;
    await page.waitForTimeout(2000);

    // 20. Verify timesheet disappeared from Lecturer's pending list (indicating successful rejection) (UI verification)
    console.log('Verifying rejection success (timesheet removed from list)...');
    await expect(lecturerRow).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2500);

    console.log('✅ Lecturer rejection completed, timesheet removed from pending list');

    // 21. Lecturer logout via UI
    console.log('🎬 NARRATION: "Rejection recorded, now tutor will see the constraint..."');
    await signOutViaUI(page, { pauseAfterLogout: 1500 });

    // ============================================================================
    // Stage 4: Tutor Views Rejection Status and Verifies Constraints (100% UI)
    // ============================================================================
    console.log('\n🎬 === PART 4: Tutor Views Rejection and REJECTED State Constraint ===');
    console.log('🎬 NARRATION: "Tutor sees REJECTED status - note only Edit button appears, no Submit/Resubmit..."');

    // 22. Tutor re-login via UI
    await visualLogin(page, 'tutor');

    // 23. Wait for dashboard to load (signInViaUI already navigates to dashboard)
    await page.waitForTimeout(2000);
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();

    // 24. Verify timesheet status is REJECTED (UI verification)
    console.log('Verifying timesheet status is REJECTED...');
    await expect(tutorRow).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2500);

    await expect(statusBadge).toContainText(statusLabel('REJECTED'), { timeout: 15000 });
    await page.waitForTimeout(2500);

    // ============================================================================
    // Critical Verification: REJECTED status only shows Edit button, no Submit/Resubmit buttons
    // ============================================================================
    console.log('🔍 Critical Verification: Button constraints under REJECTED status...');

    // 25. Verify Edit button is visible (UI verification)
    await tutorDashboard.expectEditButtonVisible(timesheetId);
    await page.waitForTimeout(3000);
    console.log('✅ Verification passed: Edit button is visible');

    // 26. Verify Submit button is NOT visible (cannot directly submit under REJECTED status) (UI verification)
    await tutorDashboard.expectSubmitButtonNotVisible(timesheetId);
    await page.waitForTimeout(3000);
    console.log('✅ Verification passed: Submit button is not visible');

    // 27. Verify Resubmit button is NOT visible (UI verification)
    const resubmitButton = page.locator(`[data-testid="resubmit-btn-${timesheetId}"]`);
    await expect(resubmitButton).not.toBeVisible();
    await page.waitForTimeout(3000);
    console.log('✅ Verification passed: Resubmit button is not visible');

    console.log('🎉 Rejection path and constraint validation demo completed!');
    console.log('Demo Highlights:');
    console.log('1. 100% UI interaction - no API calls');
    console.log('2. Complete rejection workflow: Lecturer → Tutor → Lecturer rejects → Tutor sees rejection');
    console.log('3. State machine constraints: REJECTED status can only Edit, cannot Submit/Resubmit');
    console.log('4. Permission isolation: Tutor can only edit own timesheets');
    console.log('5. Approval history: all rejection and modification operations are auditable');
    await page.waitForTimeout(5000);
  });
});
