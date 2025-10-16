import { expect, test, type Page } from '@playwright/test';
import { setupMockAuth } from '../shared/mock-backend/auth';
import type {
  DashboardSummary,
  PageInfo,
  Timesheet,
  TimesheetPage,
} from '../../src/types/api';
import {
  getColumnSelector,
  TABLE_LAYOUT_SELECTORS,
} from '../../src/lib/config/table-config';

const ACTION_ROW_HEIGHT_THRESHOLD = 64;
const TOAST_MIN_Z_INDEX = 1000;
const TOAST_MAX_Z_INDEX = 2000;
const TOAST_MIN_TOP_CLEARANCE = 80;
const DEFAULT_VIEWPORT_HEIGHT = 900;

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
    description: 'Led tutorials and graded quizzes.',
    status: 'DRAFT',
    createdAt: '2025-02-03T08:00:00Z',
    updatedAt: '2025-02-04T09:15:00Z',
    tutorName: 'Michael Chen',
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
    description: 'Updated lab instructions after lecturer feedback.',
    status: 'MODIFICATION_REQUESTED',
    createdAt: '2025-01-27T07:00:00Z',
    updatedAt: '2025-02-01T10:45:00Z',
    tutorName: 'Michael Chen',
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
    description: 'Prepared revision materials and office hours.',
    status: 'PENDING_TUTOR_CONFIRMATION',
    createdAt: '2025-02-10T09:30:00Z',
    updatedAt: '2025-02-11T11:05:00Z',
    tutorName: 'Michael Chen',
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
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2025-01-21T13:20:00Z',
    tutorName: 'Michael Chen',
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
    description: 'Facilitated labs and grading.',
    status: 'FINAL_CONFIRMED',
    createdAt: '2025-01-13T07:30:00Z',
    updatedAt: '2025-01-18T15:40:00Z',
    tutorName: 'Michael Chen',
  },
  {
    id: 106,
    tutorId: 201,
    courseId: 306,
    courseCode: 'COMP3603',
    courseName: 'AI Applications',
    weekStartDate: '2025-01-27',
    hours: 5.5,
    hourlyRate: 54,
    description: 'Clarified assessment rubric notes.',
    status: 'REJECTED',
    createdAt: '2025-01-27T08:10:00Z',
    updatedAt: '2025-02-02T16:45:00Z',
    tutorName: 'Michael Chen',
  },
];

const DEFAULT_SUMMARY: DashboardSummary = (() => {
  const statusBreakdown = BASE_TIMESHEETS.reduce<Record<string, number>>((acc, sheet) => {
    acc[sheet.status] = (acc[sheet.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalHours = BASE_TIMESHEETS.reduce((total, sheet) => total + sheet.hours, 0);
  const totalPay = BASE_TIMESHEETS.reduce(
    (total, sheet) => total + sheet.hours * sheet.hourlyRate,
    0,
  );

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

const buildPageInfo = (items: Timesheet[]): PageInfo => ({
  currentPage: 0,
  pageSize: Math.max(items.length, 1),
  totalElements: items.length,
  totalPages: 1,
  first: true,
  last: true,
  numberOfElements: items.length,
  empty: items.length === 0,
});

const buildTimesheetPage = (items: Timesheet[]): TimesheetPage => ({
  success: true,
  timesheets: items,
  pageInfo: buildPageInfo(items),
});

const SERVER_CONSTRAINTS = {
  hours: { min: 1, max: 25, step: 0.5 },
  weekStart: { mondayOnly: true },
  currency: 'AUD' as const,
};

async function disableAnimations(page: Page): Promise<void> {
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
    // Ignore emulateMedia failures on headless Chromium variants.
  }
}

type RegisterOptions = {
  timesheets?: Timesheet[];
  summary?: DashboardSummary;
};

async function registerTutorRoutes(page: Page, options: RegisterOptions = {}): Promise<void> {
  const timesheets = options.timesheets ?? BASE_TIMESHEETS;
  const summary = options.summary ?? DEFAULT_SUMMARY;
  const timesheetPage = buildTimesheetPage(timesheets);

  await page.route('**/api/config', async (route, request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SERVER_CONSTRAINTS),
    });
  });

  await page.route('**/api/timesheets/config', async (route, request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SERVER_CONSTRAINTS),
    });
  });

  await page.route('**/api/timesheets?**', async (route, request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(timesheetPage),
    });
  });

  await page.route('**/api/timesheets/**', async (route, request) => {
    const method = request.method();
    if (method === 'GET') {
      const url = new URL(request.url());
      const id = Number(url.pathname.split('/').pop());
      const match = timesheets.find((sheet) => sheet.id === id);

      await route.fulfill({
        status: match ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(match ?? { success: false, message: 'Not found' }),
      });
      return;
    }

    if (method === 'POST') {
      const created = {
        ...timesheets[0],
        id: 999,
        status: 'DRAFT' as const,
        description: 'Newly created mock timesheet',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...timesheets[0],
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/dashboard/summary**', async (route, request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summary),
    });
  });

  await page.route('**/api/approvals', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const payload = JSON.parse(request.postData() ?? '{}');
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
}

async function prepareTutorDashboard(page: Page): Promise<void> {
  await disableAnimations(page);
  await setupMockAuth(page, 'tutor', { storage: true, applyImmediately: true });
  await registerTutorRoutes(page);

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  const table = page.locator(TABLE_LAYOUT_SELECTORS.tableContainer).first();
  await table.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
}

const blocksOverlap = (a: DOMRect, b: DOMRect): boolean => {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
};

test.describe('Layout Compliance - Quality Gates', () => {
  test.beforeEach(async ({ page }) => {
    await prepareTutorDashboard(page);
  });

  test('Actions column is always present and does not wrap', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);

    const actionsHeader = page.locator(getColumnSelector('actions', 'header')).first();
    await expect(actionsHeader).toBeVisible();

    const actionsCells = page.locator(getColumnSelector('actions', 'cell'));
    const heights = await actionsCells.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );

    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) {
      expect(height).toBeLessThanOrEqual(ACTION_ROW_HEIGHT_THRESHOLD);
    }
  });

  test('Activity column does not exist', async ({ page }) => {
    const timelineHeaders = page.locator(getColumnSelector('timeline', 'header'));
    await expect(timelineHeaders).toHaveCount(0);
  });

  test('Numeric columns are right-aligned with tabular-nums', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);

    const numericColumns: Array<'hours' | 'hourlyRate' | 'totalPay'> = [
      'hours',
      'hourlyRate',
      'totalPay',
    ];

    for (const column of numericColumns) {
      const locator = page.locator(getColumnSelector(column, 'cell'));
      await expect(locator.first()).toBeVisible();

      const styles = await locator.evaluateAll((elements) =>
        elements.map((element) => {
          const computed = window.getComputedStyle(element);
          return {
            textAlign: computed.textAlign,
            fontVariantNumeric: computed.fontVariantNumeric,
          };
        }),
      );

      expect(styles.length).toBeGreaterThan(0);
      for (const style of styles) {
        expect(style.textAlign).toBe('right');
        expect(style.fontVariantNumeric).toContain('tabular-nums');
      }
    }
  });

  test('Banner does not overlap with table', async ({ page }) => {
    const banner = page.locator(TABLE_LAYOUT_SELECTORS.pageBanner).first();
    await expect(banner).toBeVisible();

    const table = page.locator(TABLE_LAYOUT_SELECTORS.tableContainer).first();
    await expect(table).toBeVisible();

    const [bannerBox, tableBox] = await Promise.all([
      banner.boundingBox(),
      table.boundingBox(),
    ]);

    expect(bannerBox).not.toBeNull();
    expect(tableBox).not.toBeNull();
    if (bannerBox && tableBox) {
      const bannerBottom = bannerBox.y + bannerBox.height;
      expect(bannerBottom).toBeLessThanOrEqual(tableBox.y + 1);
    }
  });

  test('Toast has correct z-index and positioning', async ({ page }) => {
    const submitDrafts = page.getByRole('button', { name: /Submit All Drafts/i });
    if (await submitDrafts.isVisible()) {
      await submitDrafts.click({ force: true });
    }

    const toast = page.locator(TABLE_LAYOUT_SELECTORS.toast).first();
    await expect(toast).toBeVisible({ timeout: 5000 });

    const position = await toast.evaluate((element) => window.getComputedStyle(element).position);
    expect(position).toBe('fixed');

    const zIndex = await toast.evaluate((element) =>
      parseInt(window.getComputedStyle(element).zIndex || '0', 10),
    );
    expect(zIndex).toBeGreaterThan(TOAST_MIN_Z_INDEX);
    expect(zIndex).toBeLessThan(TOAST_MAX_Z_INDEX);
  });

  test('Toast Safe Zone: does not obstruct modal interactive areas', async ({ page }) => {
    const createButton = page
      .getByRole('region', { name: /My Timesheets/i })
      .getByRole('button', { name: /^Create New$/ });
    await expect(createButton).toBeVisible();
    await createButton.click();

    const modal = page.locator(TABLE_LAYOUT_SELECTORS.modalContent).first();
    await expect(modal).toBeVisible();

  const submitDrafts = page.getByRole('button', { name: /Submit All Drafts/i });
  if (await submitDrafts.isVisible()) {
    await submitDrafts.click({ force: true });
  }

  const toast = page.locator(TABLE_LAYOUT_SELECTORS.toast).first();
    await expect(toast).toBeVisible({ timeout: 5000 });

    const [toastBox, modalBox] = await Promise.all([
      toast.boundingBox(),
      modal.boundingBox(),
    ]);

    expect(toastBox).not.toBeNull();
    expect(modalBox).not.toBeNull();
    if (!toastBox || !modalBox) {
      return;
    }

    expect(toastBox.y).toBeGreaterThanOrEqual(TOAST_MIN_TOP_CLEARANCE);

    const modalHeading = page.getByRole('heading', { name: /New Timesheet Form/i }).first();
    await expect(modalHeading).toBeVisible();
    const headingBox = await modalHeading.boundingBox();
    if (headingBox) {
      expect(blocksOverlap(toastBox, headingBox)).toBe(false);
    }

    const closeButton = modal.getByRole('button', { name: /Cancel/i }).first();
    if (await closeButton.isVisible()) {
      const closeBox = await closeButton.boundingBox();
      if (closeBox) {
        expect(blocksOverlap(toastBox, closeBox)).toBe(false);
      }
    }
  });

  test('Absolute time mandate for Last Updated column and status tooltip', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);

    const lastUpdatedCell = page.locator(getColumnSelector('lastUpdated', 'cell')).first();
    if (await lastUpdatedCell.isVisible()) {
      const cellText = (await lastUpdatedCell.textContent()) ?? '';
      expect(cellText).not.toMatch(/\d+\s+(minute|hour|day)s?\s+ago/i);
      expect(cellText).not.toMatch(/in\s+\d+\s+(minute|hour|day)s?/i);
      expect(cellText).toMatch(/\d{1,2}\s+\w{3}\s+\d{4}/);
    }

    await page.setViewportSize({ width: 1200, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);

    const statusBadge = page.locator(TABLE_LAYOUT_SELECTORS.statusBadge).first();
    await expect(statusBadge).toBeVisible();
    await statusBadge.dispatchEvent('pointerenter');
    await page.waitForTimeout(400);

    const tooltip = page.locator(TABLE_LAYOUT_SELECTORS.tooltip).first();
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    const tooltipText = (await tooltip.textContent()) ?? '';

    if (tooltipText.includes('Submitted')) {
      expect(tooltipText).not.toMatch(/\d+\s+(minute|hour|day)s?\s+ago/i);
      expect(tooltipText).toMatch(/\d{1,2}\s+\w{3}\s+\d{4}/);
    }
  });

  test('Responsive column folding at key breakpoints', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);
    await expect(page.locator(getColumnSelector('hourlyRate', 'header'))).toHaveCount(1);
    await expect(page.locator(getColumnSelector('hours', 'header'))).toHaveCount(1);

    await page.setViewportSize({ width: 1280, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);
    await expect(page.locator(getColumnSelector('hourlyRate', 'header'))).toHaveCount(0);
    await expect(page.locator(getColumnSelector('hours', 'header'))).toHaveCount(1);

    await page.setViewportSize({ width: 1024, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);
    await expect(page.locator(getColumnSelector('hours', 'header'))).toHaveCount(0);

    await page.setViewportSize({ width: 768, height: DEFAULT_VIEWPORT_HEIGHT });
    await page.waitForTimeout(200);

    const cardView = page.locator(TABLE_LAYOUT_SELECTORS.tableCardView);
    const tableView = page.locator(TABLE_LAYOUT_SELECTORS.tableContainer);
    const cardViewVisible = await cardView.isVisible().catch(() => false);
    const tableViewVisible = await tableView.isVisible().catch(() => false);
    expect(cardViewVisible || tableViewVisible).toBe(true);

    if (tableViewVisible) {
      const courseHeader = page.locator(getColumnSelector('course', 'header')).first();
      const actionsHeader = page.locator(getColumnSelector('actions', 'header')).first();

      if (await courseHeader.count()) {
        const position = await courseHeader.evaluate(
          (element) => window.getComputedStyle(element).position,
        );
        expect(position).toBe('sticky');
      }

      if (await actionsHeader.count()) {
        const position = await actionsHeader.evaluate(
          (element) => window.getComputedStyle(element).position,
        );
        expect(position).toBe('sticky');
      }
    }
  });

  test('Status badge enforces minimum width', async ({ page }) => {
    const badge = page.locator(TABLE_LAYOUT_SELECTORS.statusBadge).first();
    await expect(badge).toBeVisible();

    const minWidth = await badge.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return parseFloat(computed.minWidth || '0');
    });
    expect(minWidth).toBeGreaterThanOrEqual(100);
  });
});

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await prepareTutorDashboard(page);
  });

  test('Banner has correct ARIA role', async ({ page }) => {
    const banner = page.locator(TABLE_LAYOUT_SELECTORS.pageBanner).first();
    if (await banner.isVisible()) {
      const role = await banner.getAttribute('role');
      expect(role).toBe('alert');
    } else {
      test.skip('Page banner is not visible for current dataset.');
    }
  });

  test('Status badges expose accessible labels', async ({ page }) => {
    const badge = page.locator(TABLE_LAYOUT_SELECTORS.statusBadge).first();
    await expect(badge).toBeVisible();

    const ariaLabel = await badge.getAttribute('aria-label');
    const title = await badge.getAttribute('title');

    expect(ariaLabel || title).toBeTruthy();
  });
});
