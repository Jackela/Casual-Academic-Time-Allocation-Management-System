import { expect, test as baseTest, type Page } from '@playwright/test';
import { setupMockAuth } from '../../e2e/shared/mock-backend/auth';
import type { DashboardSummary, Timesheet } from '../../src/types/api';

type TutorDashboardMockOptions = {
  timesheets?: Timesheet[];
  summary?: DashboardSummary;
  failTimesheets?: boolean;
};

const SCREENSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  fullPage: true,
  scale: 'device' as const,
};

const BASE_TIMESHEETS: Timesheet[] = [
  {
    id: 101,
    tutorId: 201,
    courseId: 301,
    courseCode: 'COMP1001',
    courseName: 'Introduction to Programming',
    weekStartDate: '2025-02-03',
    hours: 6.5,
    hourlyRate: 45,
    description: 'Led on-campus tutorials and graded weekly quizzes.',
    status: 'DRAFT',
    createdAt: '2025-02-03T08:00:00Z',
    updatedAt: '2025-02-04T09:15:00Z',
    tutorName: 'John Doe',
  },
  {
    id: 102,
    tutorId: 201,
    courseId: 302,
    courseCode: 'DATA2001',
    courseName: 'Data Structures',
    weekStartDate: '2025-01-27',
    hours: 5,
    hourlyRate: 48,
    description: 'Updated lab instructions per lecturer feedback.',
    status: 'MODIFICATION_REQUESTED',
    createdAt: '2025-01-27T07:00:00Z',
    updatedAt: '2025-02-01T10:45:00Z',
    tutorName: 'John Doe',
  },
  {
    id: 103,
    tutorId: 201,
    courseId: 303,
    courseCode: 'STAT3002',
    courseName: 'Applied Statistics',
    weekStartDate: '2025-02-10',
    hours: 7,
    hourlyRate: 46,
    description: 'Prepared exam revision materials and office hours.',
    status: 'PENDING_TUTOR_CONFIRMATION',
    createdAt: '2025-02-10T09:30:00Z',
    updatedAt: '2025-02-11T11:05:00Z',
    tutorName: 'John Doe',
  },
  {
    id: 104,
    tutorId: 201,
    courseId: 304,
    courseCode: 'COMP2410',
    courseName: 'Systems Programming',
    weekStartDate: '2025-01-20',
    hours: 4.5,
    hourlyRate: 52,
    description: 'Confirmed marking and consultation sessions.',
    status: 'TUTOR_CONFIRMED',
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2025-01-21T13:20:00Z',
    tutorName: 'John Doe',
  },
  {
    id: 105,
    tutorId: 201,
    courseId: 305,
    courseCode: 'INFO2110',
    courseName: 'Software Engineering',
    weekStartDate: '2025-01-13',
    hours: 8,
    hourlyRate: 50,
    description: 'Pair-programming lab facilitation and grading.',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-01-13T07:30:00Z',
    updatedAt: '2025-01-18T15:40:00Z',
    tutorName: 'John Doe',
  },
  {
    id: 106,
    tutorId: 201,
    courseId: 306,
    courseCode: 'MATH1901',
    courseName: 'Mathematics 1A',
    weekStartDate: '2025-01-06',
    hours: 6,
    hourlyRate: 44,
    description: 'Delivered intensive revision workshops.',
    status: 'FINAL_CONFIRMED',
    createdAt: '2025-01-06T06:45:00Z',
    updatedAt: '2025-01-15T12:10:00Z',
    tutorName: 'John Doe',
  },
  {
    id: 107,
    tutorId: 201,
    courseId: 307,
    courseCode: 'COMP3603',
    courseName: 'AI Applications',
    weekStartDate: '2025-01-27',
    hours: 5.5,
    hourlyRate: 54,
    description: 'Feedback requested: clarify assessment rubric notes.',
    status: 'REJECTED',
    createdAt: '2025-01-27T08:10:00Z',
    updatedAt: '2025-02-02T16:45:00Z',
    tutorName: 'John Doe',
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
    totalTimesheets: BASE_TIMESHEETS.length,
    pendingConfirmations: statusBreakdown.PENDING_TUTOR_CONFIRMATION ?? 0,
    pendingApprovals: statusBreakdown.LECTURER_CONFIRMED ?? 0,
    rejectedTimesheets: statusBreakdown.REJECTED ?? 0,
    totalHours,
    totalPay,
    totalPayroll: totalPay,
    thisWeekHours: 12,
    thisWeekPay: 540,
    statusBreakdown,
    recentActivity: [
      {
        id: 'activity-1',
        type: 'SUBMISSION',
        description: 'Submitted COMP1001 timesheet for lecturer review.',
        timestamp: '2025-02-11T07:45:00Z',
      },
      {
        id: 'activity-2',
        type: 'REJECTION',
        description: 'Lecturer requested revisions for COMP3603 entry.',
        timestamp: '2025-02-10T15:20:00Z',
      },
    ],
    upcomingDeadlines: [
      {
        id: 'deadline-1',
        courseId: 301,
        courseCode: 'COMP1001',
        courseName: 'Introduction to Programming',
        description: 'Submit updated tutorial attendance for Week 3.',
        deadline: '2025-02-20T23:59:59Z',
        priority: 'HIGH',
      },
      {
        id: 'deadline-2',
        courseId: 302,
        courseCode: 'DATA2001',
        courseName: 'Data Structures',
        description: 'Confirm pending lab hours to avoid payroll delays.',
        deadline: '2025-02-25T17:00:00Z',
        priority: 'MEDIUM',
      },
    ],
    tutorCount: 1,
    lecturerCount: 8,
    courseCount: 6,
    systemHealth: 'HEALTHY',
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
    // Ignore if the browser does not support emulateMedia
  }
};

const registerTutorRoutes = async (page: Page, options: TutorDashboardMockOptions) => {
  const timesheets = options.timesheets ?? BASE_TIMESHEETS;
  const summary = options.summary ?? defaultSummary;
  const pageInfo = buildPageInfo(timesheets);

  await page.route('**/api/timesheets?**', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    if (options.failTimesheets) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Mock backend failure' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, timesheets, pageInfo }),
    });
  });

  await page.route('**/api/timesheets/**', async route => {
    const method = route.request().method();

    if (method === 'GET') {
      const url = new URL(route.request().url());
      const id = Number(url.pathname.split('/').pop());
      const match = timesheets.find(entry => entry.id === id);
      await route.fulfill({
        status: match ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(match ?? { success: false, message: 'Not found' }),
      });
      return;
    }

    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ...timesheets[0],
          id: 900,
          status: 'DRAFT',
          description: 'New mock timesheet',
          createdAt: '2025-02-12T09:00:00Z',
          updatedAt: '2025-02-12T09:00:00Z',
        }),
      });
      return;
    }

    if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...timesheets[0],
          updatedAt: '2025-02-12T11:00:00Z',
        }),
      });
      return;
    }

    if (method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.continue();
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

    const payload = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Mock approval processed',
        timesheetId: payload.timesheetId ?? timesheets[0]?.id ?? 0,
        newStatus: payload.action ?? 'SUBMIT_FOR_APPROVAL',
      }),
    });
  });
};

const prepareTutorDashboard = async (page: Page, options: TutorDashboardMockOptions = {}) => {
  await disableAnimations(page);
  await setupMockAuth(page, 'tutor', { storage: true, applyImmediately: true });
  await registerTutorRoutes(page, options);

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  if (options.failTimesheets) {
    await page.getByTestId('error-message').waitFor({ state: 'visible' });
  } else if ((options.timesheets ?? BASE_TIMESHEETS).length === 0) {
    await page.getByTestId('empty-state').waitFor({ state: 'visible' });
  } else {
    await page.locator('[data-testid="timesheet-table"], [data-testid="timesheets-table"]').first().waitFor({ state: 'visible' });
  }

  await page.waitForTimeout(200);
};

const capture = async (page: Page, name: string) => {
  await expect(page).toHaveScreenshot(name, SCREENSHOT_OPTIONS);
};

test.describe('Tutor Dashboard Visual Regression', () => {
  test('default overview state', async ({ page }) => {
    await prepareTutorDashboard(page);
    await capture(page, 'tutor-dashboard-overview.png');
  });

  test('drafts tab with bulk submission preview', async ({ page }) => {
    await prepareTutorDashboard(page);
    await page.getByRole('button', { name: /^Drafts/ }).click();
    await page.getByRole('checkbox', { name: /Select all drafts/i }).check();
    await page.getByRole('button', { name: /Submit Selected/ }).hover();
    await page.waitForTimeout(200);
    await capture(page, 'tutor-dashboard-drafts-selection.png');
  });

  test('in-progress tab highlighting confirmation actions', async ({ page }) => {
    await prepareTutorDashboard(page);
    await page.getByRole('button', { name: /In Progress/i }).click();
    await page.getByTestId('confirm-btn-103').hover();
    await capture(page, 'tutor-dashboard-in-progress.png');
  });

  test('needs action tab with rejection guidance', async ({ page }) => {
    await prepareTutorDashboard(page);
    await page.getByRole('button', { name: /Needs Attention/i }).click();
    await page.getByTestId('edit-btn-102').hover();
    await capture(page, 'tutor-dashboard-need-action.png');
  });

  test('empty state call-to-action', async ({ page }) => {
    const summary: DashboardSummary = {
      ...defaultSummary,
      totalTimesheets: 0,
      totalHours: 0,
      totalPay: 0,
      totalPayroll: 0,
      statusBreakdown: {},
    };
    await prepareTutorDashboard(page, { timesheets: [], summary });
    await capture(page, 'tutor-dashboard-empty.png');
  });

  test('error state with retry affordance', async ({ page }) => {
    await prepareTutorDashboard(page, { failTimesheets: true });
    await capture(page, 'tutor-dashboard-error.png');
  });

  test('create timesheet modal', async ({ page }) => {
    await prepareTutorDashboard(page);
    await page.getByRole('button', { name: /Create New Timesheet/i }).click();
    await page.getByText('New Timesheet Form').waitFor({ state: 'visible' });
    await capture(page, 'tutor-dashboard-create-modal.png');
  });

  test('edit timesheet modal with validation messaging', async ({ page }) => {
    await prepareTutorDashboard(page);
    await page.getByTestId('edit-btn-101').click();
    await page.getByLabel('Hours Worked').fill('0');
    await page.getByLabel('Hours Worked').blur();
    await page.waitForTimeout(150);
    await capture(page, 'tutor-dashboard-edit-validation.png');
  });
});
