import { test, expect } from '../../fixtures/base';
import { E2E_CONFIG } from '../../config/e2e.config';
import { DashboardPage } from '../../shared/pages/DashboardPage';
import { NavigationPage } from '../../shared/pages/NavigationPage';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { setupMockAuth } from '../../shared/mock-backend/auth';

test.describe('P1 Tutor Confirmation (mock-only)', () => {
  test('Tutor confirms a pending timesheet (UI only)', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const navigationPage = new NavigationPage(page);
    const tutorDashboardPage = new TutorDashboardPage(page);

    const pendingTimesheet = {
      id: 90210,
      tutorId: 201,
      courseId: 42,
      weekStartDate: '2025-02-10',
      hours: 8,
      hourlyRate: 48.5,
      description: 'CS101 tutorial delivery and marking',
      status: 'PENDING_TUTOR_CONFIRMATION',
      createdAt: '2025-02-10T09:00:00Z',
      updatedAt: '2025-02-10T09:00:00Z',
      tutorName: 'John Doe',
      courseName: 'Introduction to Computer Science',
      courseCode: 'COMP1001'
    };

    let currentStatus: 'PENDING_TUTOR_CONFIRMATION' | 'TUTOR_CONFIRMED' = 'PENDING_TUTOR_CONFIRMATION';

    await page.route('**/api/timesheets*', async route => {
      const responseBody = {
        success: true,
        timesheets: [{ ...pendingTimesheet, status: currentStatus }],
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
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseBody) });
    });

    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`, async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        const payload = request.postDataJSON() as { timesheetId: number; action: string };
        expect(payload.timesheetId).toBe(pendingTimesheet.id);
        expect(payload.action).toBe('TUTOR_CONFIRM');
        currentStatus = 'TUTOR_CONFIRMED';
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, newStatus: 'TUTOR_CONFIRMED' }) });
        return;
      }
      await route.continue();
    });

    await setupMockAuth(page, 'tutor');
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');
    await dashboardPage.expectToBeLoaded('TUTOR');
    await navigationPage.expectUserInfo('John Doe', 'Tutor');

    // Verify initial state, click Approve, verify updated state and toast
    await tutorDashboardPage.waitForMyTimesheetData();
    await tutorDashboardPage.expectTimesheetsTable();

    const statusBadge = page.getByTestId(`status-badge-${pendingTimesheet.id}`);
    await expect(statusBadge).toContainText(/Awaiting Tutor|Pending Tutor Confirmation/);

    const confirmButton = page.getByTestId(`confirm-btn-${pendingTimesheet.id}`);
    await expect(confirmButton).toBeVisible();
    await Promise.all([
      page.waitForResponse('**/api/approvals'),
      confirmButton.click()
    ]);

    await tutorDashboardPage.waitForMyTimesheetData();
    await expect(statusBadge).toContainText('Tutor Confirmed');
  });
});




