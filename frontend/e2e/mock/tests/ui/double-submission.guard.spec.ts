import { test as base, expect } from '../../../fixtures/base';
import { E2E_CONFIG } from '../../../config/e2e.config';
import { DashboardPage } from '../../../shared/pages/DashboardPage';
import { TutorDashboardPage } from '../../../shared/pages/TutorDashboardPage';
import { setupMockAuth } from '../../../shared/mock-backend/auth';

const test = base;

test.describe('Action Button Hardening', () => {
  test('prevents duplicate submission requests on rapid clicks', async ({ mockedPage }) => {
    const page = mockedPage;
    const draftTimesheet = {
      id: 481516,
      tutorId: 201,
      courseId: 42,
      weekStartDate: '2025-03-03',
      hours: 6,
      hourlyRate: 45,
      description: 'CS101 Tutorial prep and delivery',
      courseName: 'Introduction to Computer Science',
      courseCode: 'COMP1001',
    };

    let currentStatus: 'DRAFT' | 'SUBMITTED' = 'DRAFT';
    const approvalRequests: Array<{ action: string; timesheetId: number }> = [];

    await page.route('**/api/timesheets*', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const responseBody = {
        success: true,
        timesheets: [
          {
            ...draftTimesheet,
            status: currentStatus,
            createdAt: '2025-03-03T09:00:00Z',
            updatedAt: '2025-03-03T09:00:00Z',
          },
        ],
        pageInfo: {
          currentPage: 0,
          pageSize: 20,
          totalElements: 1,
          totalPages: 1,
          first: true,
          last: true,
          numberOfElements: 1,
          empty: false,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      });
    });

    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`, async route => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      const payload = request.postDataJSON() as { timesheetId: number; action: string };
      approvalRequests.push({ action: payload.action, timesheetId: payload.timesheetId });
      currentStatus = 'SUBMITTED';

      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const dashboardPage = new DashboardPage(page);
    const tutorDashboardPage = new TutorDashboardPage(page);

    await setupMockAuth(page, 'tutor');
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');

    await dashboardPage.expectToBeLoaded('TUTOR');
    await tutorDashboardPage.waitForMyTimesheetData();
    await tutorDashboardPage.expectTimesheetsTable();

    const submitButton = page.getByTestId(`submit-btn-${draftTimesheet.id}`);
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    await page.evaluate(testId => {
      const button = document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
      if (!button) {
        throw new Error(`Unable to find button with test id ${testId}`);
      }
      button.click();
      button.click();
    }, `submit-btn-${draftTimesheet.id}`);

    await page.waitForResponse(response =>
      response.url().includes(E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS) &&
      response.request().method() === 'POST'
    );

    await page.waitForTimeout(200);

    expect(approvalRequests).toHaveLength(1);
    expect(approvalRequests[0]).toMatchObject({
      timesheetId: draftTimesheet.id,
    });
    expect(approvalRequests[0].action).toBe('SUBMIT_FOR_APPROVAL');

    await expect(submitButton).toBeDisabled();
    const statusBadge = page.getByTestId(`status-badge-${draftTimesheet.id}`);
    await expect(statusBadge).toBeVisible();
  });
});
