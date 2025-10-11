import { expect, test as baseTest, type Page } from '@playwright/test';
import { setupMockAuth } from '../../e2e/shared/mock-backend/auth';
import type { DashboardSummary, Timesheet } from '../../src/types/api';

type AdminMockOptions = {
  timesheets?: Timesheet[];
  summary?: DashboardSummary;
  failApprovals?: boolean;
  pageError?: 'timesheets' | 'dashboard' | null;
};

const SCREENSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  fullPage: true,
  scale: 'device' as const,
};

const BASE_TIMESHEETS: (Timesheet & { priority?: string })[] = [
  {
    id: 701,
    tutorId: 401,
    courseId: 5101,
    courseCode: 'COMP5101',
    courseName: 'Advanced Software Engineering',
    weekStartDate: '2025-02-03',
    hours: 6.5,
    hourlyRate: 65,
    description: 'Capstone supervision and grading support.',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-01-24T08:00:00Z',
    updatedAt: '2025-02-10T10:45:00Z',
    tutorName: 'Jordan Blake',
    priority: 'HIGH',
  },
  {
    id: 702,
    tutorId: 402,
    courseId: 5202,
    courseCode: 'INFO5202',
    courseName: 'Information Systems Strategy',
    weekStartDate: '2025-02-10',
    hours: 5,
    hourlyRate: 60,
    description: 'Executive workshop facilitation and feedback.',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-02-08T09:15:00Z',
    updatedAt: '2025-02-11T14:00:00Z',
    tutorName: 'Morgan Chen',
    priority: 'MEDIUM',
  },
  {
    id: 703,
    tutorId: 403,
    courseId: 5303,
    courseCode: 'DATA5303',
    courseName: 'Ethics in AI',
    weekStartDate: '2025-01-27',
    hours: 7,
    hourlyRate: 58,
    description: 'Guest speaker coordination and assessment review.',
    status: 'FINAL_CONFIRMED',
    createdAt: '2025-01-15T11:30:00Z',
    updatedAt: '2025-02-05T16:10:00Z',
    tutorName: 'Avery Singh',
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

const defaultSummary: DashboardSummary = (() => {
  const totalHours = BASE_TIMESHEETS.reduce((total, sheet) => total + sheet.hours, 0);
  const totalPay = BASE_TIMESHEETS.reduce((total, sheet) => total + sheet.hours * sheet.hourlyRate, 0);

  return {
    totalTimesheets: 142,
    pendingApprovals: 6,
    totalHours,
    totalPayroll: totalPay,
    tutorCount: 48,
    systemHealth: 'HEALTHY',
    recentActivity: [
      {
        id: 'admin-activity-1',
        type: 'APPROVAL',
        description: 'Final approval granted for COMP5101 capstone series.',
        timestamp: '2025-02-11T09:20:00Z',
      },
      {
        id: 'admin-activity-2',
        type: 'REJECTION',
        description: 'Returned INFO5202 submission for missing signatures.',
        timestamp: '2025-02-10T16:05:00Z',
      },
    ],
    upcomingDeadlines: [
      {
        id: 'admin-deadline-1',
        courseId: 5202,
        courseCode: 'INFO5202',
        courseName: 'Information Systems Strategy',
        description: 'Finalize week 4 payroll batch by Feb 20.',
        deadline: '2025-02-20T17:00:00Z',
        priority: 'HIGH',
      },
      {
        id: 'admin-deadline-2',
        courseId: 5101,
        courseCode: 'COMP5101',
        courseName: 'Advanced Software Engineering',
        description: 'Archive capstone logs after approval.',
        deadline: '2025-02-25T12:00:00Z',
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
    const injectStyle = () => {
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
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(style);
      }
    };

    document.addEventListener('DOMContentLoaded', () => {
      injectStyle();
    }, { once: true });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      injectStyle();
    }
  });

  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  } catch {
    // Ignore emulateMedia failures on unsupported browsers.
  }
};

const registerAdminRoutes = async (page: Page, options: AdminMockOptions) => {
  const timesheets = options.timesheets ?? BASE_TIMESHEETS;
  const summary = options.summary ?? defaultSummary;
  const pageInfo = buildPageInfo(timesheets);

  const constraintsPayload = {
    hours: { min: 0.25, max: 60, step: 0.25 },
    weekStart: { mondayOnly: true },
    currency: 'AUD',
  };

  await page.route('**/api/config**', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(constraintsPayload),
    });
  });

  await page.route('**/api/timesheets/config**', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(constraintsPayload),
    });
  });

  await page.route('**/api/timesheets?**', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    if (options.pageError === 'timesheets') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Mock timesheet fetch failure' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, timesheets, pageInfo }),
    });
  });

  await page.route('**/api/timesheets/pending-final-approval**', async route => {
    if (route.request().method() !== 'GET') {
      await route.continue();
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

    if (options.pageError === 'dashboard') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Mock dashboard fetch failure' }),
      });
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
        newStatus: payload.action ?? 'HR_CONFIRM',
      }),
    });
  });
};

const prepareAdminDashboard = async (page: Page, options: AdminMockOptions = {}) => {
  page.on('console', message => {
    // eslint-disable-next-line no-console
    console.log(`[console:${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', error => {
    // eslint-disable-next-line no-console
    console.error(`[pageerror] ${error}`);
  });

  await disableAnimations(page);
  await setupMockAuth(page, 'admin', { storage: true, applyImmediately: true });
  await registerAdminRoutes(page, options);

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.getByTestId('admin-dashboard').waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
};

const capture = async (page: Page, name: string) => {
  await expect(page).toHaveScreenshot(name, SCREENSHOT_OPTIONS);
};

test.describe('Admin Dashboard Visual Regression', () => {
  test('system overview metrics', async ({ page }) => {
    await prepareAdminDashboard(page);
    await capture(page, 'admin-dashboard-overview.png');
  });

  test('pending review actions', async ({ page }) => {
    await prepareAdminDashboard(page);
    await page.getByRole('button', { name: 'Pending Review' }).click();
    await page.getByTestId('approve-btn-701').hover();
    await capture(page, 'admin-dashboard-pending.png');
  });

  test('search empty state', async ({ page }) => {
    await prepareAdminDashboard(page);
    await page.getByRole('button', { name: 'Pending Review' }).click();
    await page.getByPlaceholder('Search timesheets, users...').fill('nonexistent cohort');
    await page.waitForTimeout(250);
    await capture(page, 'admin-dashboard-search-empty.png');
  });

  test('rejection modal focus-trap', async ({ page }) => {
    await prepareAdminDashboard(page);
    await page.getByRole('button', { name: 'Pending Review' }).click();
    await page.getByTestId('reject-btn-701').click();
    await page.getByRole('dialog', { name: /Confirm Emergency Action/i }).waitFor({ state: 'visible' });
    await capture(page, 'admin-dashboard-rejection-modal.png');
  });

  test('approval error banner', async ({ page }) => {
    await prepareAdminDashboard(page, { failApprovals: true });
    await page.getByRole('button', { name: 'Pending Review' }).click();
    await page.getByTestId('approve-btn-701').click();
    await page.getByTestId('approval-error-banner').waitFor({ state: 'visible' });
    await capture(page, 'admin-dashboard-error.png');
  });
});
