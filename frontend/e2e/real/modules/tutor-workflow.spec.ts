import { test, expect, type Page } from '@playwright/test';
import type { TimesheetStatus } from '../../../src/types/api';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { clearAuthSessionFromPage, signInAsRole } from '../../api/auth-helper';
import { statusLabel, statusLabelPattern } from '../../utils/status-labels';

type TimesheetRecord = {
  id: number;
  tutorId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  weekStartDate: string;
  hours: number;
  deliveryHours: number;
  hourlyRate: number;
  qualification: string;
  taskType: string;
  repeat: boolean;
  rateCode?: string | null;
  calculationFormula?: string | null;
  clauseReference?: string | null;
  sessionDate?: string | null;
  description: string;
  status: TimesheetStatus;
  createdAt: string;
  updatedAt: string;
  tutorName: string;
  rejectionReason?: string;
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
        deliveryHours: 10,
        hourlyRate: 45,
        qualification: 'STANDARD',
        taskType: 'TUTORIAL',
        repeat: false,
        rateCode: 'TU1',
        calculationFormula: '1h delivery + 2h associated',
        clauseReference: 'Schedule 1',
        sessionDate: '2025-01-27',
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
        deliveryHours: 8,
        hourlyRate: 50,
        qualification: 'STANDARD',
        taskType: 'TUTORIAL',
        repeat: false,
        rateCode: 'TU1',
        calculationFormula: '1h delivery + 2h associated',
        clauseReference: 'Schedule 1',
        sessionDate: '2025-02-03',
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
        deliveryHours: 6,
        hourlyRate: 42,
        qualification: 'STANDARD',
        taskType: 'TUTORIAL',
        repeat: false,
        rateCode: 'TU1',
        calculationFormula: '1h delivery + 2h associated',
        clauseReference: 'Schedule 1',
        sessionDate: '2025-02-10',
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
        deliveryHours: 12,
        hourlyRate: 48,
        qualification: 'STANDARD',
        taskType: 'TUTORIAL',
        repeat: false,
        rateCode: 'TU1',
        calculationFormula: '1h delivery + 2h associated',
        clauseReference: 'Schedule 1',
        sessionDate: '2025-01-20',
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

let dataFactory: TestDataFactory;
test.beforeEach(async ({ page, request }) => {
  dataFactory = await createTestDataFactory(request);
  await signInAsRole(page, 'tutor');
});

test.afterEach(async ({ page }) => {
  await clearAuthSessionFromPage(page);
  await dataFactory?.cleanupAll();
});

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
      if (typeof payload.deliveryHours === 'number') {
        normalizedChanges.deliveryHours = payload.deliveryHours;
      }
      if (typeof payload.description === 'string') {
        normalizedChanges.description = payload.description;
      }
      if (typeof payload.weekStartDate === 'string') {
        normalizedChanges.weekStartDate = payload.weekStartDate;
      }
      if (typeof payload.sessionDate === 'string') {
        normalizedChanges.sessionDate = payload.sessionDate;
      }
      if (typeof payload.courseId === 'number') {
        normalizedChanges.courseId = payload.courseId;
      }
      if (typeof payload.hourlyRate === 'number') {
        normalizedChanges.hourlyRate = payload.hourlyRate;
      }
      if (typeof payload.qualification === 'string') {
        normalizedChanges.qualification = payload.qualification;
      }
      if (typeof payload.taskType === 'string') {
        normalizedChanges.taskType = payload.taskType;
      }
      if (typeof payload.repeat === 'boolean') {
        normalizedChanges.repeat = payload.repeat;
      }

      updateTimesheetInState(timesheetId, normalizedChanges);

      const updatedTimesheet = currentTimesheetPage.timesheets.find(timesheet => timesheet.id === timesheetId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updatedTimesheet),
      });
    });

    await page.route('**/api/timesheets/quote', async route => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      let payload: {
        tutorId?: number;
        courseId?: number;
        deliveryHours?: number;
        qualification?: string;
        taskType?: string;
        repeat?: boolean;
        sessionDate?: string;
      } = {};

      try {
        payload = JSON.parse(request.postData() ?? '{}');
      } catch {
        payload = {};
      }

      const baseTimesheet =
        currentTimesheetPage.timesheets.find(sheet => sheet.courseId === payload.courseId) ??
        currentTimesheetPage.timesheets[0];

      const deliveryHours = typeof payload.deliveryHours === 'number' ? payload.deliveryHours : baseTimesheet?.deliveryHours ?? 1;
      const associatedHours = Math.min(Math.max(deliveryHours * 2, 0), 10);
      const payableHours = deliveryHours + associatedHours;
      const hourlyRate = baseTimesheet?.hourlyRate ?? 45;

      const quoteResponse = {
        taskType: payload.taskType ?? baseTimesheet?.taskType ?? 'TUTORIAL',
        rateCode: baseTimesheet?.rateCode ?? 'TU1',
        qualification: payload.qualification ?? baseTimesheet?.qualification ?? 'STANDARD',
        repeat: Boolean(payload.repeat ?? baseTimesheet?.repeat ?? false),
        deliveryHours,
        associatedHours,
        payableHours,
        hourlyRate,
        amount: Number((payableHours * hourlyRate).toFixed(2)),
        formula: `${deliveryHours}h delivery + ${associatedHours}h associated`,
        clauseReference: baseTimesheet?.clauseReference ?? 'Schedule 1',
        sessionDate: payload.sessionDate ?? baseTimesheet?.sessionDate ?? baseTimesheet?.weekStartDate ?? '2025-01-01',
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(quoteResponse),
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
      'Total Pay',
      'Status',
      'Description',
      'Actions',
      'Details',
    ]);

  await tutorDashboard.expectTimesheetData(1, {
      courseCode: 'COMP1001',
      status: 'Rejected',
      hours: 10,
      totalPay: 450,
    });
    await tutorDashboard.expectTimesheetData(2, {
      courseCode: 'DATA2001',
      status: 'Draft',
      hours: 8,
      totalPay: 400,
    });
    await tutorDashboard.expectTimesheetData(3, {
      courseCode: 'MATH1001',
      status: statusLabel('PENDING_TUTOR_CONFIRMATION'),
      hours: 6,
      totalPay: 252,
    });
    await tutorDashboard.expectTimesheetData(4, {
      courseCode: 'PHYS1001',
      status: statusLabel('TUTOR_CONFIRMED'),
      hours: 12,
      totalPay: 576,
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
    const expectedPayableHours = 11 + Math.min(11 * 2, 10);
    expect(lastUpdateRequest?.payload).toMatchObject({
      hours: expectedPayableHours,
      deliveryHours: 11,
      description: 'Adjusted tutorial sessions for COMP1001',
      qualification: 'STANDARD',
      taskType: 'TUTORIAL',
      repeat: false,
      weekStartDate: '2025-01-27',
      sessionDate: '2025-01-27',
    });

    const expectedPayablePostUpdate = expectedPayableHours;
    await tutorDashboard.expectTimesheetData(1, {
      courseCode: 'COMP1001',
      status: 'Rejected',
      hours: expectedPayablePostUpdate,
      totalPay: expectedPayablePostUpdate * 45,
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
      totalPay: 400,
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
        deliveryHours: 6,
        hourlyRate: 46,
        qualification: 'STANDARD',
        taskType: 'TUTORIAL',
        repeat: false,
        rateCode: 'TU1',
        calculationFormula: '1h delivery + 2h associated',
        clauseReference: 'Schedule 1',
        sessionDate: '2025-03-10',
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
        deliveryHours: 7.5,
        hourlyRate: 47,
        qualification: 'STANDARD',
        taskType: 'TUTORIAL',
        repeat: false,
        rateCode: 'TU1',
        calculationFormula: '1h delivery + 2h associated',
        clauseReference: 'Schedule 1',
        sessionDate: '2025-03-10',
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
        deliveryHours: 5.5,
        hourlyRate: 44,
        qualification: 'STANDARD',
        taskType: 'TUTORIAL',
        repeat: false,
        rateCode: 'TU1',
        calculationFormula: '1h delivery + 2h associated',
        clauseReference: 'Schedule 1',
        sessionDate: '2025-03-10',
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
      totalPay: 252,
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

  test('displays lecturer rejection feedback when editing rejected timesheet', async ({ page }) => {
    // Create a timesheet with rejection feedback
    const rejectedTimesheetWithFeedback: TimesheetRecord = {
      id: 999,
      tutorId: 2,
      courseId: 1,
      courseCode: 'COMP1001',
      courseName: 'Introduction to Programming',
      weekStartDate: '2025-01-27',
      hours: 10,
      deliveryHours: 10,
      hourlyRate: 45,
      qualification: 'STANDARD',
      taskType: 'TUTORIAL',
      repeat: false,
      rateCode: 'TU1',
      calculationFormula: '1h delivery + 2h associated',
      clauseReference: 'Schedule 1',
      sessionDate: '2025-01-27',
      description: 'Tutorial sessions for COMP1001',
      status: 'REJECTED',
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-25T14:30:00Z',
      tutorName: 'John Doe',
      rejectionReason: 'Correction required: Please update the project code and provide more detailed description of tasks completed.'
    };

    // Update the timesheet data to include rejection feedback
    const updatedTimesheets = [...currentTimesheetPage.timesheets];
    updatedTimesheets[0] = rejectedTimesheetWithFeedback;
    replaceTimesheets(updatedTimesheets);

    // Navigate to dashboard and wait for data
    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();

    // Click edit on the rejected timesheet (ID 999 from our updated data)
    await tutorDashboard.clickEditButton(999);
    await tutorDashboard.expectEditModalVisible();

    const tableRows = page.locator('[data-testid^="timesheet-row-"]');
    const tableRow = page.locator('[data-testid="timesheet-row-999"]');
    await expect(tableRows.first()).toHaveAttribute('data-testid', 'timesheet-row-999');
    await expect(tableRow).toBeVisible();
    
    // Verify that the rejection feedback is clearly visible in the edit form
    const rejectionFeedbackSection = page.locator('[data-testid="rejection-feedback-section"]');
    await expect(rejectionFeedbackSection).toBeVisible();
    
    const feedbackTitle = page.locator('[data-testid="rejection-feedback-title"]');
    await expect(feedbackTitle).toContainText('Lecturer Feedback');
    
    const feedbackContent = page.locator('[data-testid="rejection-feedback-content"]');
    await expect(feedbackContent).toContainText('Correction required: Please update the project code and provide more detailed description of tasks completed.');

    // Verify the feedback section is positioned directly before the edit form
    const feedbackPrecedesForm = await rejectionFeedbackSection.evaluate(section => {
      const nextElement = section.nextElementSibling;
      return nextElement?.getAttribute('data-testid') === 'edit-timesheet-form';
    });
    expect(feedbackPrecedesForm).toBe(true);

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
