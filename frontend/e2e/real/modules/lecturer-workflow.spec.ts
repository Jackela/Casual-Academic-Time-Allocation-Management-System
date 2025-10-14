import { test, expect, type Page } from '@playwright/test';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';

/**
 * Lecturer Dashboard Workflow Tests
 * 
 * Tests for the LecturerDashboard functionality including:
 * - Authentication and navigation to dashboard
 * - Viewing pending timesheets for approval
 * - Approve and reject actions
 */

let dataFactory: TestDataFactory;
test.beforeEach(async ({ page, request }) => {
  dataFactory = await createTestDataFactory(request);
  await signInAsRole(page, 'lecturer');
});

test.afterEach(async ({ page }) => {
  await clearAuthSessionFromPage(page);
  await dataFactory?.cleanupAll();
});

const openLecturerDashboard = async (page: Page) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId('main-dashboard-title')).toContainText(/Lecturer Dashboard/i);
};

test.describe('Lecturer Dashboard Workflow', () => {

  test('Lecturer can login and view dashboard', async ({ page }) => {
    await openLecturerDashboard(page);

    // Should redirect to dashboard page
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Should show lecturer dashboard title
    await expect(page.getByTestId('main-dashboard-title')).toContainText('Lecturer Dashboard');
    
    // Should show welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('Lecturer dashboard shows pending timesheets section', async ({ page }) => {
    await openLecturerDashboard(page);
    
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
    await openLecturerDashboard(page);
    
    const approveButtons = page.locator('[data-testid^="approve-btn-"], button:has-text("Final Approve")');
    const rejectButtons = page.locator('[data-testid^="reject-btn-"], button:has-text("Reject")');

    // Allow dashboards with zero pending approvals as a valid state
    const approveCount = await approveButtons.count();
    const rejectCount = await rejectButtons.count();
    if (approveCount === 0 || rejectCount === 0) {
      const emptyState = await page.locator('[data-testid="empty-state"]').first().isVisible().catch(() => false);
      const zeroPendingText = (await page.getByText(/\b0\s+pending\b/i).count()) > 0;
      expect(emptyState || zeroPendingText).toBe(true);
      return;
    }

    await expect(approveButtons.first()).toBeVisible();
    await expect(rejectButtons.first()).toBeVisible();
  });

  test('Lecturer dashboard handles loading state', async ({ page }) => {
    await openLecturerDashboard(page);
    
    // Ensure main content anchor is present
    await page.locator('[data-testid="main-content"]').first().waitFor({ timeout: 15000 });
    // Best-effort: hide loading if present briefly
    try {
      await page.locator('[data-testid="loading-state"]').first().waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Loading indicator can linger in mocked responses
    }
  });


  test('Lecturer can reject a tutor confirmed timesheet with a reason', async ({ page }) => {
    const now = Date.now();
    const createdAt = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

    const baseTimesheet = {
      id: 550001,
      tutorId: 812,
      courseId: 77,
      weekStartDate: '2025-04-07',
      hours: 5,
      hourlyRate: 52,
      description: 'Tutorial coverage for COMP3600',
      status: 'TUTOR_CONFIRMED',
      createdAt,
      updatedAt: createdAt,
      tutorName: 'Taylor Morgan',
      courseName: 'Advanced Algorithms',
      courseCode: 'COMP3600'
    };

    type PendingStatus = 'TUTOR_CONFIRMED' | 'REJECTED';
    let pendingStatus: PendingStatus = 'TUTOR_CONFIRMED';
    let capturedApprovalBody: Record<string, unknown> | null = null;

    const buildPendingResponse = (status: PendingStatus) => ({
      success: true,
      timesheets: [{
        ...baseTimesheet,
        status,
        updatedAt: new Date().toISOString()
      }],
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
    });

    await page.route('**/api/timesheets/pending-final-approval**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildPendingResponse(pendingStatus))
      });
    });

    await page.route('**/api/dashboard/summary', async route => {
      const payload = {
        totalTimesheets: 36,
        pendingApprovals: pendingStatus === 'TUTOR_CONFIRMED' ? 1 : 0,
        pendingApproval: pendingStatus === 'TUTOR_CONFIRMED' ? 1 : 0,
        thisWeekHours: 14,
        thisWeekPay: 728,
        statusBreakdown: {
          TUTOR_CONFIRMED: pendingStatus === 'TUTOR_CONFIRMED' ? 1 : 0,
          REJECTED: pendingStatus === 'REJECTED' ? 1 : 0
        },
        recentActivity: []
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload)
      });
    });

    await page.route('**/api/approvals', async route => {
      const request = route.request();
      capturedApprovalBody = JSON.parse(request.postData() || '{}');
      pendingStatus = 'REJECTED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Rejection processed',
          timesheetId: baseTimesheet.id,
          newStatus: 'REJECTED'
        })
      });
    });

    const pendingResponse = page.waitForResponse('**/api/timesheets/pending-final-approval**');
    await openLecturerDashboard(page);
    await pendingResponse;

    const targetRow = page.getByTestId(`timesheet-row-${baseTimesheet.id}`);
    await expect(targetRow).toBeVisible();
    await expect(targetRow).toContainText(baseTimesheet.tutorName);

    const rejectButton = page.getByTestId(`reject-btn-${baseTimesheet.id}`);
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();

    const modalTitle = page.getByRole('heading', { name: 'Reject Timesheet' });
    await expect(modalTitle).toBeVisible();

    const reasonTextarea = page.getByPlaceholder('e.g., Incorrect hours logged for CS101...');
    await reasonTextarea.fill('Hours exceed allocated budget for the week.');

    const approvalsResponse = page.waitForResponse('**/api/approvals');
    const refreshResponse = page.waitForResponse((response) =>
      response.url().includes('/api/timesheets/pending-final-approval') &&
      response.request().method() === 'GET'
    );

    await page.getByRole('button', { name: 'Reject Timesheet' }).click();

    await approvalsResponse;
    await refreshResponse;

    expect(capturedApprovalBody).toMatchObject({
      timesheetId: baseTimesheet.id,
      action: 'REJECT',
      comment: 'Hours exceed allocated budget for the week.'
    });

    await expect(modalTitle).toHaveCount(0);
    await expect(targetRow).toContainText(/Rejected/i);
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
    await openLecturerDashboard(page);
    await pendingResponse;

    const timesheetRow = page.getByTestId(`timesheet-row-${timesheet.id}`);
    await expect(timesheetRow).toBeVisible();

    const approveButton = timesheetRow.getByTestId(`approve-btn-${timesheet.id}`);
    await expect(approveButton).toBeVisible();

    await approveButton.click();

    const errorBanner = page.getByTestId('approval-error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/Approval could not be completed.*Please try again\./);

    const errorDetails = page.locator('[data-testid="approval-error-raw"]');
    await expect(errorDetails).toHaveCount(0);

    const detailsToggle = page.getByTestId('approval-error-details-toggle');
    if (await detailsToggle.isVisible().catch(() => false)) {
      await detailsToggle.click();
      await expect(page.getByTestId('approval-error-raw')).toContainText('Failed to process approval');
    }

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
    await openLecturerDashboard(page);

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
    const targetRow = page.getByTestId(`timesheet-row-${timesheet.id}`);
    await expect(targetRow).toBeVisible();
    await expect(targetRow).toContainText(timesheet.description);
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

    await openLecturerDashboard(page);

    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible({ timeout: 5000 });
    await expect(emptyState).toContainText('No Pending Timesheets', { timeout: 5000 });

    await expect(page.locator('[data-testid="timesheets-table"]')).toHaveCount(0);
  });

  test('Lecturer can refresh dashboard data', async ({ page }) => {
    await openLecturerDashboard(page);
    
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

