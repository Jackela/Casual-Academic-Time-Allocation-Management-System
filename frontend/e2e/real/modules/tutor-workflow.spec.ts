import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { TimesheetStatus } from '../../../src/types/api';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { TUTOR_STORAGE } from '../utils/auth-storage';
import { statusLabel, statusLabelPattern } from '../../utils/status-labels';

type TimesheetRecord = {
  id: number;
  tutorId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  weekStartDate: string;
  hours: number;
  hourlyRate: number;
  description: string;
  status: TimesheetStatus;
  createdAt: string;
  updatedAt: string;
  tutorName: string;
};

type TimesheetPagePayload = {
  success: boolean;
  timesheets: TimesheetRecord[];
  pageInfo: {
    currentPage: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
  };
};

const TIMESHEETS_LIST_ROUTE = /\/api\/timesheets(?:\?.*)?$/;
const DASHBOARD_SUMMARY_ROUTE = '**/api/dashboard/summary';

const clonePage = (page: TimesheetPagePayload): TimesheetPagePayload =>
  JSON.parse(JSON.stringify(page));

const buildSummary = (timesheets: TimesheetRecord[]) => {
  const totalTimesheets = timesheets.length;
  const totalHours = timesheets.reduce((sum, row) => sum + row.hours, 0);
  const totalPayroll = timesheets.reduce((sum, row) => sum + row.hours * row.hourlyRate, 0);
  const pendingApprovals = timesheets.filter(row => row.status === 'PENDING_TUTOR_CONFIRMATION').length;

  return {
    totalTimesheets,
    pendingApprovals,
    totalHours,
    totalPayroll,
  };
};

const mockTimesheets: { default: TimesheetPagePayload; empty: TimesheetPagePayload } = {
  default: {
    success: true,
    timesheets: [
      {
        id: 1,
        tutorId: 2,
        courseId: 1,
        courseCode: 'COMP1001',
        courseName: 'Introduction to Programming',
        weekStartDate: '2025-01-27',
        hours: 10,
        hourlyRate: 45,
        description: 'Tutorial sessions for COMP1001',
        status: 'REJECTED',
        createdAt: '2025-01-20T10:00:00Z',
        updatedAt: '2025-01-25T14:30:00Z',
        tutorName: 'John Doe',
      },
      {
        id: 2,
        tutorId: 2,
        courseId: 2,
        courseCode: 'DATA2001',
        courseName: 'Data Structures',
        weekStartDate: '2025-02-03',
        hours: 8,
        hourlyRate: 50,
        description: 'Lab sessions for DATA2001',
        status: 'DRAFT',
        createdAt: '2025-01-28T09:00:00Z',
        updatedAt: '2025-02-01T09:15:00Z',
        tutorName: 'John Doe',
      },
      {
        id: 3,
        tutorId: 2,
        courseId: 3,
        courseCode: 'MATH1001',
        courseName: 'Calculus I',
        weekStartDate: '2025-02-10',
        hours: 6,
        hourlyRate: 42,
        description: 'Assignment marking for MATH1001',
        status: 'PENDING_TUTOR_CONFIRMATION',
        createdAt: '2025-02-08T08:00:00Z',
        updatedAt: '2025-02-10T11:00:00Z',
        tutorName: 'John Doe',
      },
      {
        id: 4,
        tutorId: 2,
        courseId: 4,
        courseCode: 'PHYS1001',
        courseName: 'Physics I',
        weekStartDate: '2025-01-20',
        hours: 12,
        hourlyRate: 48,
        description: 'Tutorial prep and delivery for PHYS1001',
        status: 'TUTOR_CONFIRMED',
        createdAt: '2025-01-18T14:00:00Z',
        updatedAt: '2025-01-22T16:45:00Z',
        tutorName: 'John Doe',
      },
    ],
    pageInfo: {
      currentPage: 0,
      pageSize: 20,
      totalElements: 4,
      totalPages: 1,
      first: true,
      last: true,
      numberOfElements: 4,
      empty: false,
    },
  },
  empty: {
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
      empty: true,
    },
  },
};

test.use({ storageState: TUTOR_STORAGE });

test.describe('Tutor dashboard workflow', () => {
  let tutorDashboard: TutorDashboardPage;
  let currentTimesheetPage: TimesheetPagePayload;
  let respondWithError = false;
  let nextResponseDelay = 0;
  let lastUpdateRequest: { timesheetId: number; payload: Partial<TimesheetRecord>; method: string } | null;

  const gotoTutorDashboard = async (page: Page) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await tutorDashboard.expectToBeLoaded();
  };

  const replaceTimesheets = (timesheets: TimesheetRecord[]) => {
    currentTimesheetPage = {
      ...currentTimesheetPage,
      timesheets,
      pageInfo: {
        ...currentTimesheetPage.pageInfo,
        totalElements: timesheets.length,
        numberOfElements: timesheets.length,
        empty: timesheets.length === 0,
      },
    };
  };

  const updateTimesheetInState = (timesheetId: number, changes: Partial<TimesheetRecord>) => {
    const updatedTimesheets = currentTimesheetPage.timesheets.map(timesheet =>
      timesheet.id === timesheetId
        ? {
            ...timesheet,
            ...changes,
            updatedAt: new Date().toISOString(),
          }
        : timesheet
    );
    replaceTimesheets(updatedTimesheets);
  };

  test.beforeEach(async ({ page }) => {
    tutorDashboard = new TutorDashboardPage(page);

    currentTimesheetPage = clonePage(mockTimesheets.default);
    respondWithError = false;
    nextResponseDelay = 0;
    lastUpdateRequest = null;

    await page.route(TIMESHEETS_LIST_ROUTE, async route => {
      const request = route.request();
      if (request.method() !== 'GET') {
        await route.continue();
        return;
      }

      if (nextResponseDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, nextResponseDelay));
        nextResponseDelay = 0;
      }

      if (respondWithError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentTimesheetPage),
      });
    });

    await page.route(/.*\/api\/timesheets\/\d+$/, async route => {
      const request = route.request();
      if (request.method() !== 'PUT') {
        await route.continue();
        return;
      }

      const match = request.url().match(/\/([0-9]+)$/);
      const timesheetId = match ? Number(match[1]) : NaN;
      let payload: Partial<TimesheetRecord> = {};
      const body = request.postData();
      if (body) {
        try {
          payload = JSON.parse(body);
        } catch {
          payload = {};
        }
      }

      lastUpdateRequest = { timesheetId, payload, method: request.method() };

      const normalizedChanges: Partial<TimesheetRecord> = {};
      if (typeof payload.hours === 'number') {
        normalizedChanges.hours = payload.hours;
      }
      if (typeof payload.description === 'string') {
        normalizedChanges.description = payload.description;
      }
      if (typeof payload.weekStartDate === 'string') {
        normalizedChanges.weekStartDate = payload.weekStartDate;
      }
      if (typeof payload.courseId === 'number') {
        normalizedChanges.courseId = payload.courseId;
      }
      if (typeof payload.hourlyRate === 'number') {
        normalizedChanges.hourlyRate = payload.hourlyRate;
      }

      updateTimesheetInState(timesheetId, normalizedChanges);

      const updatedTimesheet = currentTimesheetPage.timesheets.find(timesheet => timesheet.id === timesheetId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updatedTimesheet),
      });
    });

    await page.route(DASHBOARD_SUMMARY_ROUTE, async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const summary = buildSummary(currentTimesheetPage.timesheets);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(summary),
      });
    });

    await page.route('**/api/approvals', async route => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      let payload: { timesheetId?: number; action?: string } = {};
      const body = request.postData();
      if (body) {
        try {
          payload = JSON.parse(body);
        } catch {
          payload = {};
        }
      }

      const timesheetId = payload.timesheetId ?? -1;
      const action = payload.action ?? '';
      let newStatus: TimesheetStatus | undefined;
      if (action === 'SUBMIT_FOR_APPROVAL') {
        newStatus = 'PENDING_TUTOR_CONFIRMATION';
      } else if (action === 'TUTOR_CONFIRM') {
        newStatus = 'TUTOR_CONFIRMED';
      }

      if (newStatus) {
        updateTimesheetInState(timesheetId, { status: newStatus });
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Action processed successfully',
          timesheetId,
          newStatus: newStatus ?? null,
        }),
      });
    });

    await gotoTutorDashboard(page);
    await tutorDashboard.waitForMyTimesheetData();
  });

  test('shows tutor dashboard overview', async () => {
    await tutorDashboard.waitForMyTimesheetData();

    await tutorDashboard.expectTutorDashboardTitle();
    await tutorDashboard.expectWelcomeMessage('John Doe');
    await tutorDashboard.expectTimesheetsTable();

    const rows = await tutorDashboard.getTimesheetRows();
    expect(await rows.count()).toBe(4);

    await tutorDashboard.expectCountBadge(4);
    await tutorDashboard.expectTableHeaders([
      'Course',
      'Week Starting',
      'Hours',
      'Rate',
      'Total Pay',
      'Status',
      'Description',
      'Submitted',
      'Updated',
      'Actions',
    ]);

    await tutorDashboard.expectTimesheetData(1, {
      courseCode: 'COMP1001',
      status: 'Rejected',
      hours: 10,
      hourlyRate: 45,
    });
    await tutorDashboard.expectTimesheetData(2, {
      courseCode: 'DATA2001',
      status: 'Draft',
      hours: 8,
      hourlyRate: 50,
    });
    await tutorDashboard.expectTimesheetData(3, {
      courseCode: 'MATH1001',
      status: statusLabel('PENDING_TUTOR_CONFIRMATION'),
      hours: 6,
      hourlyRate: 42,
    });
    await tutorDashboard.expectTimesheetData(4, {
      courseCode: 'PHYS1001',
      status: statusLabel('TUTOR_CONFIRMED'),
      hours: 12,
      hourlyRate: 48,
    });

    await tutorDashboard.expectSubmitButtonVisible(2);
    await tutorDashboard.expectConfirmButtonVisible(3);
  });

  test('allows editing a rejected timesheet', async () => {
    await tutorDashboard.waitForMyTimesheetData();

    await tutorDashboard.clickEditButton(1);
    await tutorDashboard.expectEditModalVisible();
    await tutorDashboard.expectEditFormValues({
      courseId: 1,
      weekStartDate: '2025-01-27',
      hours: 10,
      description: 'Tutorial sessions for COMP1001',
    });

    await tutorDashboard.updateEditForm({
      hours: 11,
      description: 'Adjusted tutorial sessions for COMP1001',
    });

    lastUpdateRequest = null;
    await tutorDashboard.saveEditChanges();
    await tutorDashboard.waitForMyTimesheetData();
    await tutorDashboard.expectEditModalNotVisible();

    expect(lastUpdateRequest).not.toBeNull();
    expect(lastUpdateRequest?.timesheetId).toBe(1);
    expect(lastUpdateRequest?.payload).toMatchObject({
      hours: 11,
      description: 'Adjusted tutorial sessions for COMP1001',
    });

    await tutorDashboard.expectTimesheetData(1, {
      courseCode: 'COMP1001',
      status: 'Rejected',
      hours: 11,
      hourlyRate: 45,
    });
  });

  test('allows submitting a draft timesheet for approval', async () => {
    await tutorDashboard.waitForMyTimesheetData();

    const response = await tutorDashboard.submitDraft(2);
    expect(response.status()).toBe(200);

    const payload = JSON.parse(response.request().postData() ?? '{}');
    expect(payload).toMatchObject({
      timesheetId: 2,
      action: 'SUBMIT_FOR_APPROVAL',
    });

    await tutorDashboard.expectTimesheetData(2, {
      courseCode: 'DATA2001',
      status: statusLabel('PENDING_TUTOR_CONFIRMATION'),
      hours: 8,
      hourlyRate: 50,
    });
  });

  test('allows bulk submitting draft timesheets', async ({ page }) => {
    const now = new Date('2025-03-15T10:00:00Z').toISOString();
    const draftTimesheets: TimesheetRecord[] = [
      {
        id: 201,
        tutorId: 2,
        courseId: 21,
        courseCode: 'COMP2101',
        courseName: 'Data Pipelines',
        weekStartDate: '2025-03-10',
        hours: 6,
        hourlyRate: 46,
        description: 'Draft: Lab supervision for COMP2101',
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
        tutorName: 'John Doe',
      },
      {
        id: 202,
        tutorId: 2,
        courseId: 22,
        courseCode: 'INFO2300',
        courseName: 'Information Design',
        weekStartDate: '2025-03-10',
        hours: 7.5,
        hourlyRate: 47,
        description: 'Draft: Workshop prep for INFO2300',
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
        tutorName: 'John Doe',
      },
      {
        id: 203,
        tutorId: 2,
        courseId: 23,
        courseCode: 'MATH2501',
        courseName: 'Discrete Mathematics',
        weekStartDate: '2025-03-10',
        hours: 5.5,
        hourlyRate: 44,
        description: 'Draft: Tutorial coverage for MATH2501',
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
        tutorName: 'John Doe',
      },
    ];

    const additionalTimesheets: TimesheetRecord[] = [
      {
        ...mockTimesheets.default.timesheets[0],
        id: 204,
        status: 'TUTOR_CONFIRMED',
        updatedAt: now,
      },
    ];

    replaceTimesheets([...draftTimesheets, ...additionalTimesheets]);

    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();

    const draftsTab = page.getByRole('button', { name: new RegExp('^Drafts \\(') });
    await draftsTab.click();
    await tutorDashboard.waitForMyTimesheetData();

    const draftIds = draftTimesheets.map(timesheet => timesheet.id);
    for (const id of draftIds) {
      await tutorDashboard.selectTimesheet(id);
    }

    const submitSelectedButton = page.getByRole('button', { name: /Submit Selected/i });
    await expect(submitSelectedButton).toContainText(`Submit Selected (${draftIds.length})`);
    await expect(page.locator('.submission-preview')).toContainText(`${draftIds.length} timesheets will be submitted`);

    const approvalResponses = draftIds.map(timesheetId =>
      page.waitForResponse(response => {
        if (!response.url().includes('/api/approvals')) return false;
        if (response.request().method() !== 'POST') return false;
        const body = response.request().postData();
        if (!body) return false;
        try {
          const payload = JSON.parse(body);
          return payload.timesheetId === timesheetId;
        } catch {
          return false;
        }
      })
    );

    const timesheetRefresh = page.waitForResponse(response =>
      TIMESHEETS_LIST_ROUTE.test(response.url()) && response.request().method() === 'GET'
    );
    const summaryRefresh = page.waitForResponse(response =>
      response.url().includes('/api/dashboard/summary') && response.request().method() === 'GET'
    );

    await tutorDashboard.clickSubmitSelectedButton();

    const approvals = await Promise.all(approvalResponses);
    await Promise.all([timesheetRefresh, summaryRefresh]);
    await tutorDashboard.waitForMyTimesheetData();

    const submittedIds = approvals.map(response => {
      const body = response.request().postData();
      if (!body) return null;
      try {
        return JSON.parse(body).timesheetId ?? null;
      } catch {
        return null;
      }
    }).filter((value): value is number => typeof value === 'number');

    expect(new Set(submittedIds)).toEqual(new Set(draftIds));

    for (const id of draftIds) {
      const updated = currentTimesheetPage.timesheets.find(timesheet => timesheet.id === id);
      expect(updated?.status).toBe('PENDING_TUTOR_CONFIRMATION');
    }

    await expect(page.getByRole('button', { name: new RegExp('^Drafts \\(0\\)') })).toBeVisible();

    await page.getByRole('button', { name: /All Timesheets/i }).click();
    for (const id of draftIds) {
      await expect(tutorDashboard.getStatusBadge(id)).toContainText(statusLabelPattern('PENDING_TUTOR_CONFIRMATION'));
    }
  });

  test('allows confirming a pending timesheet', async () => {
    await tutorDashboard.waitForMyTimesheetData();

    const response = await tutorDashboard.confirmTimesheet(3);
    expect(response.status()).toBe(200);

    const payload = JSON.parse(response.request().postData() ?? '{}');
    expect(payload).toMatchObject({
      timesheetId: 3,
      action: 'TUTOR_CONFIRM',
    });

    await tutorDashboard.expectTimesheetData(3, {
      courseCode: 'MATH1001',
      status: statusLabel('TUTOR_CONFIRMED'),
      hours: 6,
      hourlyRate: 42,
    });
  });

  test('validates hours input inside the edit modal', async () => {
    await tutorDashboard.waitForMyTimesheetData();

    await tutorDashboard.clickEditButton(1);
    await tutorDashboard.expectEditModalVisible();

    await tutorDashboard.updateEditForm({ hours: 0 });
    await tutorDashboard.expectFormValidationError('hours');

    await tutorDashboard.updateEditForm({ hours: 65 });
    await tutorDashboard.expectFormValidationError('hours');

    await tutorDashboard.updateEditForm({ hours: 10 });
    await tutorDashboard.expectNoFormValidationErrors();

    await tutorDashboard.cancelEdit();
  });

  test('renders empty state when there are no timesheets', async ({ page }) => {
    currentTimesheetPage = clonePage(mockTimesheets.empty);

    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();

    await tutorDashboard.expectEmptyState();
    await tutorDashboard.expectCountBadge(0);
  });

  test('handles API errors and recovers after retry', async ({ page }) => {
    respondWithError = true;

    await page.reload();
    await tutorDashboard.expectErrorState();

    respondWithError = false;
    currentTimesheetPage = clonePage(mockTimesheets.default);

    await page.unroute(TIMESHEETS_LIST_ROUTE).catch(() => undefined);
    await page.route(TIMESHEETS_LIST_ROUTE, async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentTimesheetPage),
      });
    });

    await tutorDashboard.retryDataLoad();
    await tutorDashboard.waitForMyTimesheetData();

    await page.waitForTimeout(500);
    const hasTable = await tutorDashboard.timesheetsTable.isVisible().catch(() => false);
    const hasEmpty = await tutorDashboard.emptyState.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('shows loading state while fetching data', async ({ page }) => {
    nextResponseDelay = 2000;

    await page.reload();
    await tutorDashboard.expectLoadingState();

    await tutorDashboard.waitForMyTimesheetData();
    await tutorDashboard.expectTimesheetsTable();
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.afterAll(async () => {
    console.log('🧹 Tutor workflow tests completed - cleanup protocol executed');
  });
});
