import { test, expect } from '../fixtures/base';
import { LoginPage } from '../pages/LoginPage';

/**
 * Usability validation for the lecturer journey.
 *
 * This end-to-end scenario focuses on our core UX goals:
 * - reinforce the "positive bureaucracy" cadence with clear next steps
 * - minimise cognitive load with unambiguous feedback during loading, success and empty states
 */

test.describe('Lecturer usability validation', () => {
  test('delivers a smooth approval experience with informative UI states', async ({ page }) => {
    const loginPage = new LoginPage(page);

    const now = Date.now();
    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const initialTimesheets = [
      {
        id: 440001,
        tutorId: 702,
        courseId: 31,
        weekStartDate: '2025-03-03',
        hours: 6,
        hourlyRate: 48,
        description: 'Urgent backlog review for COMP3101',
        status: 'TUTOR_CONFIRMED',
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
        tutorName: 'Alex Lee',
        courseName: 'Advanced Systems Thinking',
        courseCode: 'COMP3101'
      },
      {
        id: 440002,
        tutorId: 703,
        courseId: 19,
        weekStartDate: '2025-03-10',
        hours: 4,
        hourlyRate: 42,
        description: 'Weekly tutorial checks for INFO2002',
        status: 'TUTOR_CONFIRMED',
        createdAt: yesterday,
        updatedAt: yesterday,
        tutorName: 'Jordan Patel',
        courseName: 'Information Modelling',
        courseCode: 'INFO2002'
      }
    ];

    const emptyResponse = {
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
    };

    const buildTimesheetPayload = (timesheets: typeof initialTimesheets) => ({
      success: true,
      timesheets,
      pageInfo: {
        currentPage: 0,
        pageSize: 20,
        totalElements: timesheets.length,
        totalPages: 1,
        first: true,
        last: true,
        numberOfElements: timesheets.length,
        empty: timesheets.length === 0
      }
    });

    let approvalCompleted = false;
    let capturedApprovalBody: Record<string, unknown> | null = null;

    await page.route('**/api/timesheets/pending-final-approval**', async route => {
      await new Promise(resolve => setTimeout(resolve, approvalCompleted ? 800 : 600));
      const payload = approvalCompleted ? emptyResponse : buildTimesheetPayload(initialTimesheets);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload)
      });
    });

    const initialSummary = {
      totalTimesheets: 48,
      pendingApprovals: initialTimesheets.length,
      pendingApproval: initialTimesheets.length,
      thisWeekHours: 18,
      thisWeekPay: 864,
      statusBreakdown: {
        LECTURER_CONFIRMED: 12,
        TUTOR_CONFIRMED: 9,
        FINAL_CONFIRMED: 20
      },
      recentActivity: [
        {
          id: 1,
          description: 'Tutor confirmed COMP3101 submission',
          timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    const postApprovalSummary = {
      ...initialSummary,
      pendingApprovals: 0,
      pendingApproval: 0,
      statusBreakdown: {
        ...initialSummary.statusBreakdown,
        LECTURER_CONFIRMED: initialSummary.statusBreakdown.LECTURER_CONFIRMED + 1
      }
    };

    await page.route('**/api/dashboard/summary', async route => {
      const payload = approvalCompleted ? postApprovalSummary : initialSummary;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload)
      });
    });

    await page.route('**/api/approvals', async route => {
      const request = route.request();
      capturedApprovalBody = JSON.parse(request.postData() || '{}');
      approvalCompleted = true;
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Approval processed',
          timesheetId: capturedApprovalBody?.timesheetId ?? null,
          newStatus: 'LECTURER_CONFIRMED'
        })
      });
    });

    await loginPage.navigateTo();
    await loginPage.expectToBeVisible();
    const pendingResponsePromise = page.waitForResponse('**/api/timesheets/pending-final-approval**');
    await loginPage.fillCredentials('lecturer@example.com', 'Lecturer123!');
    await loginPage.submitForm();

    await page.waitForURL('**/dashboard');

    const loadingState = page.getByTestId('loading-state');
    await expect(loadingState).toBeVisible();
    await expect(page.locator('.dashboard-loading [data-testid="loading-text"]')).toHaveText('Loading pending timesheets...');
    await pendingResponsePromise;
    await expect(loadingState).toBeHidden();

    const header = page.getByTestId('main-dashboard-title');
    await expect(header).toHaveText(/Lecturer Dashboard/);

    const urgentBadge = page.locator('.urgent-notification .count-badge');
    await expect(urgentBadge).toHaveText('1');

    const statCards = page.locator('[data-testid="stat-card"]');
    await expect(statCards.nth(0)).toContainText('Pending Approvals');
    const pendingValue = statCards.nth(0).locator('.stat-card__value');
    await expect(pendingValue).toHaveText(String(initialTimesheets.length));
    await expect(statCards.nth(1)).toContainText('Total Timesheets');
    await expect(statCards.nth(2)).toContainText('This Week Hours');

    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: /View All Timesheets/i })).toBeVisible();

    const primaryRow = page.getByTestId(`timesheet-row-${initialTimesheets[0].id}`);
    await expect(primaryRow).toBeVisible();
    await expect(primaryRow).toContainText(initialTimesheets[0].tutorName);
    await expect(primaryRow).toContainText(initialTimesheets[0].courseCode);

    const approveButton = primaryRow.getByTestId(`approve-btn-${initialTimesheets[0].id}`);
    await expect(approveButton).toBeEnabled();

    const approvalsResponse = page.waitForResponse('**/api/approvals');
    const refreshResponse = page.waitForResponse((response) =>
      response.url().includes('/api/timesheets/pending-final-approval') && response.request().method() === 'GET'
    );
    await approveButton.click();

    await approvalsResponse;
    await refreshResponse;

    expect(capturedApprovalBody).toMatchObject({
      timesheetId: initialTimesheets[0].id,
      action: 'LECTURER_CONFIRM'
    });

    await expect(page.locator('[data-testid="error-message"]')).toHaveCount(0);

    const emptyStateTitle = page.getByTestId('empty-state-title');
    await expect(emptyStateTitle).toHaveText('No Pending Timesheets');
    const historyCta = page.getByTestId('cta-view-approval-history');
    await expect(historyCta).toBeVisible();
    await expect(historyCta).toHaveAttribute('href', '/approvals/history');

    await expect(pendingValue).toHaveText('0');

    await expect(page.locator('.urgent-notification')).toHaveCount(0);
  });
});