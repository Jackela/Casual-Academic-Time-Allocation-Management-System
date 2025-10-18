import { expect, test as baseTest, type Page } from '@playwright/test';
import { setupMockAuth } from '../../e2e/shared/mock-backend/auth';
import type { DashboardSummary, Timesheet } from '../../src/types/api';

type LecturerMockOptions = {
  timesheets?: Timesheet[];
  summary?: DashboardSummary;
  failApprovals?: boolean;
  pendingError?: boolean;
};

const SCREENSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  fullPage: true,
  scale: 'device' as const,
};

const BASE_TIMESHEETS: Timesheet[] = [
  {
    id: 501,
    tutorId: 301,
    courseId: 4101,
    courseCode: 'COMP2011',
    courseName: 'Algorithms & Data Structures',
    weekStartDate: '2025-02-03',
    hours: 7.5,
    hourlyRate: 58,
    description: 'Midterm review tutorials with grading follow-up.',
    status: 'TUTOR_CONFIRMED',
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-02-09T10:15:00Z',
    tutorName: 'Sasha Green',
  },
  {
    id: 502,
    tutorId: 302,
    courseId: 4202,
    courseCode: 'DATA2201',
    courseName: 'Relational Databases',
    weekStartDate: '2025-02-10',
    hours: 6,
    hourlyRate: 55,
    description: 'Delivered lab workshops; awaiting lecturer sign-off.',
    status: 'TUTOR_CONFIRMED',
    createdAt: '2025-02-06T09:00:00Z',
    updatedAt: '2025-02-10T12:00:00Z',
    tutorName: 'Priya Nair',
  },
  {
    id: 503,
    tutorId: 303,
    courseId: 4303,
    courseCode: 'COMP3603',
    courseName: 'Applied Machine Learning',
    weekStartDate: '2025-01-27',
    hours: 8,
    hourlyRate: 62,
    description: 'Capstone guidance and analytics workshop.',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-01-20T07:30:00Z',
    updatedAt: '2025-02-08T14:45:00Z',
    tutorName: 'Jamie Lawson',
  },
  {
    id: 504,
    tutorId: 304,
    courseId: 4404,
    courseCode: 'INFO2222',
    courseName: 'Systems Design Studio',
    weekStartDate: '2025-02-17',
    hours: 5.5,
    hourlyRate: 57,
    description: 'Draft submitted with lecturer feedback pending.',
    status: 'MODIFICATION_REQUESTED',
    createdAt: '2025-02-11T08:30:00Z',
    updatedAt: '2025-02-12T16:20:00Z',
    tutorName: 'Alex Rivera',
  },
];

const buildPageInfo = (items: Timesheet[]) => ({
  currentPage: 0,
  pageSize: Math.max(items.length, 1),
  totalElements: items.length,
  totalPages: 1,
  first: true,
  last: true,
  numberOfElements: items.length,
  empty: items.length === 0,
});

const buildStatusBreakdown = (items: Timesheet[]) =>
  items.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.status] = (accumulator[entry.status] ?? 0) + 1;
    return accumulator;
  }, {});

const defaultSummary: DashboardSummary = (() => {
  const totalHours = BASE_TIMESHEETS.reduce((total, sheet) => total + sheet.hours, 0);
  const totalPay = BASE_TIMESHEETS.reduce((total, sheet) => total + sheet.hours * sheet.hourlyRate, 0);
  const statusBreakdown = buildStatusBreakdown(BASE_TIMESHEETS);

  return {
    pendingApproval: 4,
    totalTimesheets: 28,
    thisWeekHours: 18,
    thisWeekPay: 864,
    totalPay,
    totalHours,
    pendingApprovals: 4,
    statusBreakdown,
    recentActivity: [
      {
        id: 'lecturer-activity-1',
        type: 'APPROVAL',
        description: 'Approved COMP3603 machine learning lab submission.',
        timestamp: '2025-02-10T11:30:00Z',
      },
      {
        id: 'lecturer-activity-2',
        type: 'REJECTION',
        description: 'Requested changes for INFO2222 systems design workshop.',
        timestamp: '2025-02-09T09:20:00Z',
      },
    ],
    upcomingDeadlines: [
      {
        id: 'deadline-lecturer-1',
        courseId: 4101,
        courseCode: 'COMP2011',
        courseName: 'Algorithms & Data Structures',
        description: 'Approve Week 3 tutorial logs before payroll run.',
        deadline: '2025-02-18T23:59:59Z',
        priority: 'HIGH',
      },
      {
        id: 'deadline-lecturer-2',
        courseId: 4202,
        courseCode: 'DATA2201',
        courseName: 'Relational Databases',
        description: 'Confirm database lab hours for Week 4.',
        deadline: '2025-02-21T17:00:00Z',
        priority: 'MEDIUM',
      },
    ],
  };
})();

const test = baseTest.extend({});

test.use({
  viewport: { width: 1280, height: 900 },
  colorScheme: 'light',
});

const disableAnimations = async (page: Page) => {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.setAttribute('data-visual-regression', 'disable-animations');
    style.textContent = `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  });

  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  } catch {
    // Ignore emulateMedia failures in unsupported browsers.
  }
};

const registerLecturerRoutes = async (page: Page, options: LecturerMockOptions) => {
  const timesheets = options.timesheets ?? BASE_TIMESHEETS;
  const summary = options.summary ?? defaultSummary;
  const pageInfo = buildPageInfo(timesheets);

  await page.route('**/api/timesheets/pending-final-approval**', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    if (options.pendingError) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Mock pending fetch failure' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, timesheets, pageInfo }),
    });
  });

  await page.route('**/api/dashboard/summary**', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summary),
    });
  });

  await page.route('**/api/approvals', async route => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    if (options.failApprovals) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Mock approval failure' }),
      });
      return;
    }

    const payload = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Approval processed',
        timesheetId: payload.timesheetId ?? timesheets[0]?.id ?? 0,
        newStatus: payload.action ?? 'LECTURER_CONFIRM',
      }),
    });
  });
};

const prepareLecturerDashboard = async (page: Page, options: LecturerMockOptions = {}) => {
  await disableAnimations(page);
  await setupMockAuth(page, 'lecturer', { storage: true, applyImmediately: true });
  await registerLecturerRoutes(page, options);

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  if (options.pendingError) {
    await page.getByTestId('error-message').waitFor({ state: 'visible' });
  } else if ((options.timesheets ?? BASE_TIMESHEETS).length === 0) {
    await page.getByTestId('empty-state').waitFor({ state: 'visible' });
  } else {
    await page.getByTestId('main-dashboard-title').waitFor({ state: 'visible' });
    await page.getByRole('region', { name: /Pending Approvals/i }).waitFor({ state: 'visible' });
  }

  await page.waitForTimeout(200);
};

const capture = async (page: Page, name: string) => {
  await expect(page).toHaveScreenshot(name, SCREENSHOT_OPTIONS);
};

test.describe('Lecturer Dashboard Visual Regression', () => {
  test('default overview state', async ({ page }) => {
    await prepareLecturerDashboard(page);
    await capture(page, 'lecturer-dashboard-overview.png');
  });

  test('urgent-only filter applied', async ({ page }) => {
    await prepareLecturerDashboard(page);
    await page.getByTestId('toggle-urgent-filter').click();
    await page.waitForTimeout(200);
    await capture(page, 'lecturer-dashboard-urgent-filter.png');
  });

  test('filtered empty state guidance', async ({ page }) => {
    await prepareLecturerDashboard(page);
    await page.getByPlaceholder('Search tutor or course').fill('nonexistent cohort');
    await page.waitForTimeout(200);
    await capture(page, 'lecturer-dashboard-filtered-empty.png');
  });

  test('batch action bar with mixed selections', async ({ page }) => {
    await prepareLecturerDashboard(page);
    await page.getByLabel('Select timesheet 501').check();
    await page.getByLabel('Select timesheet 502').check();
    await page.waitForTimeout(200);
    await capture(page, 'lecturer-dashboard-batch-selection.png');
  });

  test('rejection modal appearance', async ({ page }) => {
    await prepareLecturerDashboard(page);
    const rejectButton = page.getByTestId('reject-btn-501');
    await rejectButton.waitFor({ state: 'visible' });
    await rejectButton.click();
    const dialog = page.getByRole('dialog', { name: /Reject Timesheet/i });
    await dialog.waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await expect(dialog).toHaveScreenshot('lecturer-dashboard-rejection-modal.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    });
  });

  test('empty state call-to-action', async ({ page }) => {
    const summary: DashboardSummary = {
      ...defaultSummary,
      pendingApproval: 0,
      pendingApprovals: 0,
      totalTimesheets: 0,
      thisWeekHours: 0,
      thisWeekPay: 0,
      statusBreakdown: {},
    };
    await prepareLecturerDashboard(page, { timesheets: [], summary });
    await capture(page, 'lecturer-dashboard-empty.png');
  });

  test('approval error banner with remediation controls', async ({ page }) => {
    await prepareLecturerDashboard(page, { failApprovals: true });
    await page.getByTestId('approve-btn-501').click();
    await page.getByTestId('approval-error-banner').waitFor({ state: 'visible' });
    await capture(page, 'lecturer-dashboard-error.png');
  });
});
