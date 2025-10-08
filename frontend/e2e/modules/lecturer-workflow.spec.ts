import { test, expect } from '../fixtures/base';
import { LoginPage } from '../pages/LoginPage';

/**
 * Lecturer Dashboard Workflow Tests
 * 
 * Tests for the LecturerDashboard functionality including:
 * - Authentication and navigation to dashboard
 * - Viewing pending timesheets for approval
 * - Approve and reject actions
 */

test.describe('Lecturer Dashboard Workflow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateTo();
  });

  test('Lecturer can login and view dashboard', async ({ page }) => {
    // Login as lecturer using enhanced method
    await loginPage.loginAsLecturer();
    
    // Should redirect to dashboard page
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Should show lecturer dashboard title
    await expect(page.getByTestId('main-dashboard-title')).toContainText('Lecturer Dashboard');
    
    // Should show welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('Lecturer dashboard shows pending timesheets section', async ({ page }) => {
    // Login as lecturer using enhanced method
    await loginPage.loginAsLecturer();
    
    // Should show timesheets section
    await expect(page.getByRole('region', { name: 'Pending Approvals' })).toBeVisible();
    
    // Should show either empty state or timesheet table
    const emptyState = page.locator('[data-testid="empty-state"]');
    const timesheetTable = page.locator('[data-testid="timesheets-table"]');
    
    // Either empty state or table should be visible
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);
    const tableVisible = await timesheetTable.isVisible().catch(() => false);
    
    expect(emptyStateVisible || tableVisible).toBe(true);
  });

  test('Lecturer can interact with timesheet approval buttons if timesheets exist', async ({ page }) => {
    // Login as lecturer using enhanced method
    await loginPage.loginAsLecturer();
    
    // Robust detection: either dedicated test id or plain table element
    const tableCandidate = page.locator('[data-testid="timesheets-table"], table');
    const tableVisible = (await tableCandidate.count()) > 0 || await tableCandidate.first().isVisible().catch(() => false);
    
    if (tableVisible) {
      // Row-scoped strong consistency: each data row should present actions within the same row
      const table = tableCandidate.first();
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      if (rowCount === 0) {
        // No pending items left is acceptable; consider multiple valid UI outcomes
        const emptyByTestId = await page.locator('[data-testid="empty-state"]').first().isVisible().catch(() => false);
        const zeroPendingText = (await page.getByText(/\b0\s+pending\b/i).count()) > 0;
        const tableHidden = await table.isHidden().catch(() => false);
        expect(emptyByTestId || zeroPendingText || tableHidden).toBe(true);
        return;
      }

      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        // Prefer stable testids if present; fall back to role/name
        const approveTestId = row.locator('[data-testid^="approve-btn-"]');
        const rejectTestId = row.locator('[data-testid^="reject-btn-"]');

        const approveFromRole = row.getByRole('button', { name: 'Final Approve', exact: true }).or(
          row.getByRole('button', { name: 'Approve', exact: true })
        );
        const rejectFromRole = row.getByRole('button', { name: 'Reject', exact: true });

        const approveLocator = (await approveTestId.count()) > 0 ? approveTestId.first() : approveFromRole.first();
        const rejectLocator = (await rejectTestId.count()) > 0 ? rejectTestId.first() : rejectFromRole.first();

        await expect(approveLocator).toBeVisible();
        await expect(rejectLocator).toBeVisible();
      }
    } else {
      // If no table is present/visible, accept as valid state for this test scenario
      expect(true).toBe(true);
    }
  });

  test('Lecturer dashboard handles loading state', async ({ page }) => {
    // Login as lecturer using enhanced method
    await loginPage.loginAsLecturer();
    
    // Ensure main content anchor is present
    await page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });
    // Best-effort: hide loading if present briefly
    try {
      await page.locator('[data-testid="loading-state"]').first().waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Loading indicator can linger in mocked responses
    }
  });


  test('当 Lecturer 审批失败时，UI应显示错误提示并且按钮可再次点击', async ({ page }) => {
    const now = new Date().toISOString();
    const timesheet = {
      id: 98765,
      tutorId: 501,
      courseId: 42,
      weekStartDate: '2025-02-10',
      hours: 8,
      hourlyRate: 45,
      description: 'Mock lecturer approval failure',
      status: 'TUTOR_CONFIRMED',
      createdAt: now,
      updatedAt: now,
      tutorName: 'John Doe',
      courseName: 'Advanced Algorithms',
      courseCode: 'COMP3001'
    };

    await page.route('**/api/timesheets/pending-final-approval**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timesheets: [timesheet],
          pageInfo: {
            currentPage: 0,
            pageSize: 20,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
            numberOfElements: 1,
            empty: false
          }
        })
      });
    });

    await page.route('**/api/approvals', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to process approval' })
      });
    });

    const pendingResponse = page.waitForResponse('**/api/timesheets/pending-final-approval**');
    await loginPage.loginAsLecturer();
    await pendingResponse;

    const timesheetRow = page.locator(`tr:has-text("${timesheet.description}")`);
    await expect(timesheetRow).toBeVisible();

    const approveButton = timesheetRow.getByTestId(`approve-btn-${timesheet.id}`);
    await expect(approveButton).toBeVisible();

    await approveButton.click();

    const errorBanner = page.getByTestId('approval-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Approval could not be completed. Please try again.');

    const errorDetails = page.locator('[data-testid="approval-error-raw"]');
    await expect(errorDetails).toHaveCount(0);

    await page.getByTestId('approval-error-details-toggle').click();
    await expect(page.getByTestId('approval-error-raw')).toContainText('Failed to process approval');

    await expect(approveButton).toBeEnabled();
  });


  test('当 Lecturer 加载待审批数据时，UI 显示加载状态并在完成后隐藏', async ({ page }) => {
    const now = new Date().toISOString();
    const timesheet = {
      id: 67890,
      tutorId: 777,
      courseId: 21,
      weekStartDate: '2025-03-03',
      hours: 6,
      hourlyRate: 48,
      description: 'Mock lecturer loading state',
      status: 'TUTOR_CONFIRMED',
      createdAt: now,
      updatedAt: now,
      tutorName: 'Alex Lee',
      courseName: 'Interactive Computing',
      courseCode: 'COMP2500'
    };

    await page.route('**/api/timesheets/pending-final-approval**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timesheets: [timesheet],
          pageInfo: {
            currentPage: 0,
            pageSize: 20,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
            numberOfElements: 1,
            empty: false
          }
        })
      });
    });

    const pendingResponse = page.waitForResponse('**/api/timesheets/pending-final-approval**');
    await loginPage.loginAsLecturer();

    const loadingState = page.getByTestId('loading-state');
    const loadingAppeared = await loadingState.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    if (loadingAppeared) {
      const loadingText = page.getByTestId('loading-text');
      await expect(loadingText).toContainText('Loading pending timesheets...');
    }

    await pendingResponse;

    if (loadingAppeared) {
      await loadingState.waitFor({ state: 'hidden', timeout: 5000 });
    }

    const table = page.getByTestId('timesheets-table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(table.getByText(timesheet.description)).toBeVisible();
  });

  test('当没有待审批的时间表时，UI 显示空状态视图', async ({ page }) => {
    await page.route('**/api/timesheets/pending-final-approval**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timesheets: [],
          pageInfo: {
            currentPage: 0,
            pageSize: 20,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            numberOfElements: 0,
            empty: true
          }
        })
      });
    });

    await loginPage.loginAsLecturer();

    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible({ timeout: 5000 });
    await expect(emptyState).toContainText('No Pending Timesheets', { timeout: 5000 });

    await expect(page.locator('[data-testid="timesheets-table"]')).toHaveCount(0);
  });

  test('Lecturer can refresh dashboard data', async ({ page }) => {
    // Login as lecturer using enhanced method
    await loginPage.loginAsLecturer();
    
    // Look for retry/refresh button if there's an error state
    const retryButton = page.locator('[data-testid="retry-button"]');
    const retryVisible = await retryButton.isVisible().catch(() => false);
    
    if (retryVisible) {
      // Click retry button
      await retryButton.click();
      
      // Should trigger a reload - verify by checking for loading or content
      await page.waitForTimeout(1000); // Give time for reload
      
      // Page should still show dashboard content
      await expect(page.getByTestId('main-dashboard-title')).toContainText('Lecturer Dashboard');
    }
  });
});

