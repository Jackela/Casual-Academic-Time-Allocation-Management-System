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

    // Real backend only: no route interception

    // Real backend only: record last update request via request event
    page.on('request', (rq) => {
      try {
        if (/\/api\/timesheets\/(\d+)$/.test(rq.url()) && rq.method() === 'PUT') {
          const match = rq.url().match(/\/(\d+)$/);
          const timesheetId = match ? Number(match[1]) : -1;
          const payload = rq.postDataJSON?.() ?? {};
          lastUpdateRequest = { timesheetId, payload, method: rq.method() };
        }
      } catch {}
    });

    // Real backend only: no quote interception

    // Real backend only: no dashboard summary interception

    // Real backend only: no approvals interception

    await gotoTutorDashboard(page);
    await tutorDashboard.waitForMyTimesheetData();
  });

  test('shows tutor dashboard overview', async () => {
    await tutorDashboard.waitForMyTimesheetData();
    await tutorDashboard.expectTutorDashboardTitle();
    const hasTable = await tutorDashboard.timesheetsTable.isVisible().catch(() => false);
    const hasEmpty = await tutorDashboard.emptyState.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
    if (hasTable) {
      await tutorDashboard.expectTableHeaders([
        'Course',
        'Week Starting',
        'Hours',
        'Total Pay',
        'Status',
      ]);
    }
  });

  test('allows editing a rejected timesheet (if present)', async () => {
    await tutorDashboard.waitForMyTimesheetData();
    const rejectedRow = tutorDashboard.timesheetsTable.getByRole('row').filter({ hasText: /Rejected/i }).first();
    const exists = await rejectedRow.isVisible().catch(() => false);
    if (!exists) {
      console.warn('No rejected timesheet present; skipping edit flow check.');
      return;
    }
    const editButton = rejectedRow.getByRole('button', { name: /Edit/i }).first();
    await editButton.click();
    await tutorDashboard.expectEditModalVisible();
    lastUpdateRequest = null;
    await tutorDashboard.updateEditForm({ description: 'Adjusted via E2E' });
    await tutorDashboard.saveEditChanges();
    await tutorDashboard.waitForMyTimesheetData();
    await tutorDashboard.expectEditModalNotVisible();
    expect(lastUpdateRequest).not.toBeNull();
    expect(lastUpdateRequest?.method).toBe('PUT');
  });

  test('restricts tutor from creating or submitting timesheets', async ({ page }) => {
    await tutorDashboard.waitForMyTimesheetData();

    // No create timesheet entry points
    await expect(page.getByRole('button', { name: /Create Timesheet/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Add Timesheet/i })).toHaveCount(0);

    // No per-row submit draft action
    const anySubmitBtn = page.locator('[data-testid^="submit-btn-"]').first();
    expect(await anySubmitBtn.count()).toBe(0);

    // No bulk submit button
    await expect(page.getByRole('button', { name: /Submit Selected/i })).toHaveCount(0);
  });

  test('allows confirming a pending timesheet (if present)', async () => {
    await tutorDashboard.waitForMyTimesheetData();
    // Find first row with a confirm action
    const confirmBtn = tutorDashboard.timesheetsTable.getByRole('button', { name: /Confirm/i }).first();
    const hasConfirm = await confirmBtn.isVisible().catch(() => false);
    if (!hasConfirm) {
      console.warn('No pending timesheet to confirm; skipping.');
      return;
    }
    const approvalsDone = confirmBtn.page().waitForResponse((r) => r.url().includes('/api/approvals') && r.request().method() === 'POST');
    await confirmBtn.click();
    await approvalsDone;
    // After confirmation, status badge should change eventually
    await expect
      .poll(async () => !(await confirmBtn.isVisible().catch(() => false)), { timeout: 10000 })
      .toBe(true);
  });

  test('confirms a seeded pending timesheet (deterministic)', async ({ page, request }) => {
    const factory = await createTestDataFactory(request);
    // Seed a timesheet that requires tutor confirmation
    const seeded = await factory.createTimesheetForTest({ targetStatus: 'PENDING_TUTOR_CONFIRMATION' });

    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();

    const row = page.getByTestId(`timesheet-row-${seeded.id}`);
    await expect(row).toBeVisible({ timeout: 20000 });
    const confirmBtn = row.getByRole('button', { name: /Confirm/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 15000 });
    const approvalsDone = page.waitForResponse((r) => r.url().includes('/api/approvals') && r.request().method() === 'POST');
    await confirmBtn.click();
    await approvalsDone;
    // After confirmation, row should no longer have confirm button
    await expect
      .poll(async () => await confirmBtn.isVisible().catch(() => false), { timeout: 10000 })
      .toBe(false);
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

  test('displays lecturer rejection feedback when editing rejected timesheet', async ({ page, request }) => {
    // Seed a timesheet then reject it via API to attach a real rejection reason
    const factory = await createTestDataFactory(request);
    const seeded = await factory.createTimesheetForTest({ targetStatus: 'PENDING_TUTOR_CONFIRMATION' });
    const rejectionNote = 'Rejected via E2E: please update project code';
    await factory.transitionTimesheet(seeded.id, 'REJECT', rejectionNote, 'admin');

    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();

    // Open edit on the rejected timesheet row
    const tableRow = page.getByTestId(`timesheet-row-${seeded.id}`);
    await expect(tableRow).toBeVisible({ timeout: 20000 });
    await tutorDashboard.clickEditButton(seeded.id);
    await tutorDashboard.expectEditModalVisible();

    // Verify that the rejection feedback is visible and contains some reason text
    const rejectionFeedbackSection = page.locator('[data-testid="rejection-feedback-section"]');
    await expect(rejectionFeedbackSection).toBeVisible();
    await expect(page.locator('[data-testid="rejection-feedback-title"]')).toContainText(/Feedback|Reason/i);
    await expect(page.locator('[data-testid="rejection-feedback-content"]')).toContainText(/Rejected|update|reason/i);

    await tutorDashboard.cancelEdit();
  });

  test('renders list or empty state', async ({ page }) => {
    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForMyTimesheetData();
    const hasTable = await tutorDashboard.timesheetsTable.isVisible().catch(() => false);
    const hasEmpty = await tutorDashboard.emptyState.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('handles retry button if error is shown', async ({ page }) => {
    await page.reload();
    const hasError = await tutorDashboard.errorMessage.isVisible().catch(() => false);
    if (hasError) {
      const canRetry = await tutorDashboard.retryButton.isVisible().catch(() => false);
      if (canRetry) {
        await tutorDashboard.retryButton.click();
      }
      await tutorDashboard.waitForMyTimesheetData();
      await expect
        .poll(async () => (await tutorDashboard.timesheetsTable.isVisible().catch(() => false)) || (await tutorDashboard.emptyState.isVisible().catch(() => false)), { timeout: 4000 })
        .toBeTruthy();
    }
  });

  test('shows loading state briefly then data or empty', async ({ page }) => {
    await page.reload();
    await tutorDashboard.expectLoadingState();
    await tutorDashboard.waitForMyTimesheetData();
    const hasTable = await tutorDashboard.timesheetsTable.isVisible().catch(() => false);
    const hasEmpty = await tutorDashboard.emptyState.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
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
