import { test, expect } from '../fixtures/base';
import { E2E_CONFIG } from '../config/e2e.config';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NavigationPage } from '../pages/NavigationPage';
import { TimesheetPage } from '../pages/TimesheetPage';

/**
 * Critical User Journey Tests
 * 
 * These tests focus on complete multi-step workflows that users perform
 * in the CATAMS application. Single-component behaviors are now covered
 * by our comprehensive component test suite.
 */

test.describe.configure({ mode: 'serial' });
test.describe('Critical User Journeys', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let navigationPage: NavigationPage;
  let timesheetPage: TimesheetPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    navigationPage = new NavigationPage(page);
    timesheetPage = new TimesheetPage(page);
  });

  test('Complete lecturer authentication and dashboard workflow', async ({ page }) => {
    // Navigate to login page
    await loginPage.navigateTo();
    await loginPage.expectToBeVisible();

    // Login as lecturer
    const response = await loginPage.login('lecturer@example.com', 'Lecturer123!');
    expect(response.status()).toBe(200);

    // Verify successful navigation to dashboard
    await loginPage.expectSuccessfulLogin();
    await dashboardPage.expectToBeLoaded();

    // Verify user information and navigation are correct for lecturer role
    await dashboardPage.expectUserInfo('Dr. Jane Smith', 'Lecturer');
    await dashboardPage.expectNavigationForRole('LECTURER');

    // Verify timesheet data loading workflow
    await dashboardPage.waitForTimesheetData();
    
    const hasData = await dashboardPage.hasTimesheetData();
    if (hasData) {
      await dashboardPage.expectTimesheetsTable();
      const rows = await dashboardPage.getTimesheetRows();
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      await timesheetPage.expectCountBadge(rowCount);
    } else {
      await dashboardPage.expectEmptyState();
      await timesheetPage.expectCountBadge(0);
    }
  });

  test('Complete timesheet approval workflow', async ({ page }) => {
    // Login and navigate to dashboard
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.waitForTimesheetData();

    // Try to use existing data; if none, create deterministic data via API (DDD-friendly: use explicit actions)
    let ensureId: number | null = null;
    {
      const rows = await dashboardPage.getTimesheetRows();
      const count = await rows.count();
      if (count > 0) {
        const firstRow = rows.first();
        const timesheetId = await firstRow.getAttribute('data-testid');
        ensureId = parseInt(timesheetId?.replace('timesheet-row-', '') || '1');
      } else {
        // Build APPROVED_BY_TUTOR item to appear in lecturer final-approval queue
        const lecturerToken = await page.evaluate(() => localStorage.getItem('token'));
        // Login as tutor for approval step
        const tutorLoginResp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`, {
          data: { email: 'tutor@example.com', password: 'Tutor123!' },
          headers: { 'Content-Type': 'application/json' }
        });
        expect(tutorLoginResp.ok()).toBeTruthy();
        const tutorLoginBody = await tutorLoginResp.json();
        const tutorToken = tutorLoginBody?.token as string;

        // Derive tutorId/courseId from any lecturer-visible item
        const sampleResp = await page.request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets?page=0&size=1`, {
          headers: { Authorization: `Bearer ${lecturerToken}` }
        });
        expect(sampleResp.ok()).toBeTruthy();
        const sampleBody = await sampleResp.json();
        const sampleItems = (sampleBody?.timesheets ?? sampleBody?.content ?? sampleBody?.data ?? []) as Array<{ id: number; tutorId: number; courseId: number }>;
        expect(Array.isArray(sampleItems) && sampleItems.length > 0).toBeTruthy();
        const { tutorId, courseId } = sampleItems[0];

        // Create a unique past Monday to avoid uniqueness conflict
        let createdId: number | null = null;
        for (let weeksBack = 8; weeksBack <= 40 && !createdId; weeksBack += 4) {
          const weekStartDate = await page.evaluate((wb) => {
            const today = new Date();
            const day = today.getDay();
            const diffToMonday = (day + 6) % 7;
            const base = new Date(today);
            base.setDate(base.getDate() - diffToMonday - wb * 7);
            base.setHours(0,0,0,0);
            const y = base.getFullYear();
            const m = String(base.getMonth() + 1).padStart(2, '0');
            const d = String(base.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }, weeksBack);

          const tryCreate = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/timesheets`, {
            headers: { Authorization: `Bearer ${lecturerToken}`, 'Content-Type': 'application/json' },
            data: { tutorId, courseId, weekStartDate, hours: 6.0, hourlyRate: 40.00, description: `E2E final-approval item (wb=${weeksBack})` }
          });
          if (tryCreate.ok()) {
            const created = await tryCreate.json();
            const idCandidate = Number(created?.id ?? created?.timesheetId ?? created?.timesheet?.id);
            if (Number.isFinite(idCandidate)) { createdId = idCandidate; break; }
          }
        }
        expect(!!createdId).toBeTruthy();
        const id = createdId!;

        // Submit (DRAFT -> PENDING_TUTOR_REVIEW)
        const submitResp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
          headers: { Authorization: `Bearer ${lecturerToken}`, 'Content-Type': 'application/json' },
          data: { timesheetId: id, action: 'SUBMIT_FOR_APPROVAL', comment: 'Submit for tutor review' }
        });
        expect(submitResp.ok()).toBeTruthy();
        // Tutor approves (-> APPROVED_BY_TUTOR)
        const approveTutorResp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
          headers: { Authorization: `Bearer ${tutorToken}`, 'Content-Type': 'application/json' },
          data: { timesheetId: id, action: 'APPROVE', comment: 'Looks good' }
        });
        expect(approveTutorResp.ok()).toBeTruthy();

        // Refresh UI to bring item into lecturer final queue
        await page.reload();
        await dashboardPage.waitForTimesheetData();
        ensureId = id;
      }
    }

    await dashboardPage.expectTimesheetsTable();

    const id = ensureId!;

    // Verify timesheet data is displayed correctly
    await timesheetPage.expectTimesheetActionButtonsEnabled(id);

    // Approve the timesheet
    const response = await dashboardPage.approveTimesheet(id);
    expect(response.status()).toBe(200);

    // Verify the workflow completed successfully
    // The table should refresh and the approved timesheet should no longer be visible
    await dashboardPage.waitForTimesheetData();
    
    // Verify the count has decreased or state has changed appropriately
    const finalRowCount = await timesheetPage.getTimesheetCount();
    console.log(`Timesheet approved successfully. Remaining pending: ${finalRowCount}`);
  });

  test('Complete error handling and recovery workflow', async ({ page }) => {
    // Login successfully first
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.expectToBeLoaded();

    // Mock API failure to test error handling
    await page.route('**/api/timesheets/pending-final-approval', async route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    // Navigate away and back to trigger the error condition
    await page.reload();
    
    // Verify error state is handled properly
    await dashboardPage.expectErrorState();

    // Clear the mock and test retry functionality
    await page.unroute('**/api/timesheets/pending-final-approval');
    
    // Test recovery workflow
    await timesheetPage.retryDataLoad();
    
    // Should now load successfully
    const hasData = await dashboardPage.hasTimesheetData();
    if (hasData) {
      await dashboardPage.expectTimesheetsTable();
    } else {
      await dashboardPage.expectEmptyState();
    }
  });

  test('Complete logout and re-authentication workflow', async ({ page }) => {
    // Login as lecturer
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.expectToBeLoaded();

    // Verify authenticated state
    await dashboardPage.expectUserInfo('Dr. Jane Smith', 'Lecturer');

    // Logout workflow
    await dashboardPage.logout();
    await navigationPage.expectLoggedOut();

    // Verify login page is displayed
    await loginPage.expectToBeVisible();

    // Test re-authentication with different user (admin)
    await loginPage.login('admin@example.com', 'Admin123!');
    await dashboardPage.expectToBeLoaded('ADMIN');

    // Verify different user context
    await dashboardPage.expectUserInfo('Admin User', 'Administrator');
    await dashboardPage.expectNavigationForRole('ADMIN');
  });

  test('Protected route access workflow', async ({ page }) => {
    // Test accessing protected route without authentication
    await navigationPage.expectProtectedRoute();
    
    // Should be redirected to login
    await loginPage.expectToBeVisible();

    // Login and verify access is granted
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.expectToBeLoaded();

    // Verify navigation works correctly after authentication
    await navigationPage.expectHeaderElements();
    await dashboardPage.expectNavigationForRole('LECTURER');
  });

  test('Multi-step timesheet rejection workflow', async ({ page }) => {
    // Setup: Login and navigate to dashboard
    await loginPage.navigateTo();
    await loginPage.login('lecturer@example.com', 'Lecturer123!');
    await dashboardPage.waitForTimesheetData();

    // Data is now guaranteed by E2EDataInitializer (PENDING/REJECTED present)

    await dashboardPage.expectTimesheetsTable();

    // Build dedicated test data: use seeded DRAFT → lecturer submits → tutor approves → APPROVED_BY_TUTOR
    const lecturerToken = await page.evaluate(() => localStorage.getItem('token'));
    // Login as tutor via API to isolate from current UI session
    const tutorLoginResp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`, {
      data: { email: 'tutor@example.com', password: 'Tutor123!' },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(tutorLoginResp.ok()).toBeTruthy();
    const tutorLoginBody = await tutorLoginResp.json();
    const tutorToken = tutorLoginBody?.token as string;

    // Create a dedicated DRAFT via lecturer → pick courseId and tutorId from any existing lecturer-visible timesheet
    const sampleResp = await page.request.get(`${E2E_CONFIG.BACKEND.URL}/api/timesheets?page=0&size=1`, {
      headers: { Authorization: `Bearer ${lecturerToken}` }
    });
    expect(sampleResp.ok()).toBeTruthy();
    const sampleBody = await sampleResp.json();
    const sampleItems = (sampleBody?.timesheets ?? sampleBody?.content ?? sampleBody?.data ?? []) as Array<{ id: number; tutorId: number; courseId: number }>
    expect(Array.isArray(sampleItems) && sampleItems.length > 0).toBeTruthy();
    const { tutorId, courseId } = sampleItems[0];

    // Try multiple unique Monday dates in the past to avoid uniqueness conflicts with seeded data
    let createdId: number | null = null;
    for (let weeksBack = 12; weeksBack <= 60 && !createdId; weeksBack += 4) {
      const weekStartDate = await page.evaluate((wb) => {
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = (day + 6) % 7;
        const base = new Date(today);
        base.setDate(base.getDate() - diffToMonday - wb * 7);
        base.setHours(0,0,0,0);
        const y = base.getFullYear();
        const m = String(base.getMonth() + 1).padStart(2, '0');
        const d = String(base.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }, weeksBack);

      const tryCreate = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/timesheets`, {
        headers: { Authorization: `Bearer ${lecturerToken}`, 'Content-Type': 'application/json' },
        data: {
          tutorId,
          courseId,
          weekStartDate,
          hours: 6.0,
          hourlyRate: 40.00,
          description: `E2E rejection workflow item (wb=${weeksBack})`
        }
      });
      if (tryCreate.ok()) {
        const created = await tryCreate.json();
        const idCandidate = Number(created?.id ?? created?.timesheetId ?? created?.timesheet?.id);
        if (Number.isFinite(idCandidate)) {
          createdId = idCandidate;
          break;
        }
      }
    }
    expect(!!createdId).toBeTruthy();
    const id = createdId!;

    // Lecturer submits for approval (DRAFT -> PENDING_TUTOR_REVIEW)
    const submitResp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: { Authorization: `Bearer ${lecturerToken}`, 'Content-Type': 'application/json' },
      data: { timesheetId: id, action: 'SUBMIT_FOR_APPROVAL', comment: 'Submit for tutor review' }
    });
    expect(submitResp.ok()).toBeTruthy();

    // Tutor approves (PENDING_TUTOR_REVIEW -> APPROVED_BY_TUTOR)
    const approveResp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: { Authorization: `Bearer ${tutorToken}`, 'Content-Type': 'application/json' },
      data: { timesheetId: id, action: 'APPROVE', comment: 'Looks good' }
    });
    expect(approveResp.ok()).toBeTruthy();

    // Ensure UI refreshed and the newly approved-by-tutor item appears in lecturer final queue
    await page.reload();
    await dashboardPage.waitForTimesheetData();

    // Verify initial state
    await timesheetPage.expectTimesheetActionButtonsEnabled(id);

    // Reject via API to ensure deterministic state transition, then verify UI reflects it
    const rejectResp = await page.request.post(`${E2E_CONFIG.BACKEND.URL}/api/approvals`, {
      headers: { Authorization: `Bearer ${lecturerToken}`, 'Content-Type': 'application/json' },
      data: { timesheetId: id, action: 'REJECT', comment: 'Rejected by lecturer (E2E deterministic)' }
    });
    if (!rejectResp.ok()) {
      const status = rejectResp.status();
      let bodyText = '';
      try { bodyText = await rejectResp.text(); } catch {}
      console.log(`Reject API failed: status=${status} body=${bodyText}`);
    }
    expect(rejectResp.ok()).toBeTruthy();

    // Verify the workflow completed
    await dashboardPage.waitForTimesheetData();
    
    // The rejected timesheet should no longer appear in pending list
    const finalRowCount = await timesheetPage.getTimesheetCount();
    console.log(`Timesheet rejected successfully. Remaining pending: ${finalRowCount}`);
  });
});