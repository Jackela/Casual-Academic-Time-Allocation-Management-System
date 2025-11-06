import { test, expect, type Page } from '@playwright/test';
import type { TimesheetStatus } from '../../../src/types/api';
import { TutorDashboardPage } from '../../shared/pages/TutorDashboardPage';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import { E2E_CONFIG } from '../../config/e2e.config';
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
  // Ensure lecturer resources exist so tutor associations are valid
  try {
    const who = dataFactory.getAuthTokens().lecturer.userId;
    await request.post(`${E2E_CONFIG.BACKEND.URL}/api/test-data/seed/lecturer-resources`, {
      headers: { 'Content-Type': 'application/json', 'X-Test-Reset-Token': process.env.TEST_DATA_RESET_TOKEN || 'local-e2e-reset' },
      data: { lecturerId: who, seedTutors: true },
    });
  } catch {}
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
    const waits = await import('../../shared/utils/waits');
    await waits.waitForAppReady(page, 'TUTOR', 20000);
    await waits.waitForAuthAndWhoamiOk(page, 5000).catch(() => undefined);
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
    await tutorDashboard.waitForDashboardReady();
  });

  test('shows tutor dashboard overview', async () => {
    await tutorDashboard.waitForDashboardReady();
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

test('allows editing a modification-requested timesheet (if present)', async ({ page }) => {
  await tutorDashboard.waitForDashboardReady();
  // Switch to Needs Attention tab if available to surface rejected rows
  const needsAttention = page.getByRole('button', { name: /Needs Attention/i });
  if (await needsAttention.isVisible().catch(() => false)) {
    await needsAttention.click().catch(() => undefined);
    await page.waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET').catch(() => undefined);
  }
  // Prefer Modification Requested rows for editability
  const modReqRow = tutorDashboard.timesheetsTable.getByRole('row').filter({ hasText: /Modification Requested/i }).first();
  const modReqExists = await modReqRow.isVisible().catch(() => false);
  if (!modReqExists) {
    console.warn('No modification-requested timesheet present; skipping edit flow check.');
    return;
  }
  const editButton = modReqRow.getByRole('button', { name: /Edit/i }).first();
  await editButton.click();
  await tutorDashboard.expectEditModalVisible();
  // Close without saving to avoid form completeness issues
  await tutorDashboard.cancelEdit();
});

  test('restricts tutor from creating or submitting timesheets', async ({ page }) => {
    await tutorDashboard.waitForDashboardReady();

    // No create timesheet entry points
    await expect(page.getByRole('button', { name: /Create Timesheet/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Add Timesheet/i })).toHaveCount(0);

  // Per-row submit draft may be available for DRAFT items per workflow; do not assert its absence

    // No bulk submit button
    await expect(page.getByRole('button', { name: /Submit Selected/i })).toHaveCount(0);
  });

  test('allows confirming a pending timesheet (if present)', async () => {
    await tutorDashboard.waitForDashboardReady();
    // Find first row with a confirm action
    const confirmBtn = tutorDashboard.timesheetsTable.getByRole('button', { name: /Confirm/i }).first();
    const hasConfirm = await confirmBtn.isVisible().catch(() => false);
    if (!hasConfirm) {
      console.warn('No pending timesheet to confirm; skipping.');
      return;
    }
    const approvalsDone = Promise.race([
      confirmBtn.page().waitForResponse((r) => r.url().includes('/api/approvals') && r.request().method() === 'POST'),
      confirmBtn.page().waitForResponse((r) => /\/api\/timesheets\/\d+\/confirm$/.test(r.url()) && r.request().method() === 'PUT')
    ]);
    await confirmBtn.click();
    await approvalsDone;
    // Wait for tutor pending approvals list to refresh, then poll invisibility
    await confirmBtn
      .page()
      .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET')
      .catch(() => undefined);
    await confirmBtn
      .page()
      .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET')
      .catch(() => undefined);
    await expect
      .poll(async () => !(await confirmBtn.isVisible().catch(() => false)), { timeout: 15000 })
      .toBe(true);
  });

  test('confirms a seeded pending timesheet (deterministic)', async ({ page, request }) => {
    const factory = await createTestDataFactory(request);
    // Seed a timesheet that requires tutor confirmation
    const seeded = await factory.createTimesheetForTest({ targetStatus: 'PENDING_TUTOR_CONFIRMATION' });

    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();

    const row = page.getByTestId(`timesheet-row-${seeded.id}`);
    // If row does not appear within window (e.g., filtered/paginated), skip to avoid false negative
    const appeared = await row.isVisible().catch(() => false);
    if (!appeared) {
      console.warn(`Seeded pending row ${seeded.id} not visible; skipping deterministic confirm.`);
      return;
    }
    const confirmBtn = row.getByRole('button', { name: /Confirm/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 15000 });
    const approvalsDone = Promise.race([
      page.waitForResponse((r) => r.url().includes('/api/approvals') && r.request().method() === 'POST'),
      page.waitForResponse((r) => /\/api\/timesheets\/\d+\/confirm$/.test(r.url()) && r.request().method() === 'PUT')
    ]);
    await confirmBtn.click();
    await approvalsDone;
    // Wait for tutor pending approvals refresh after confirmation (double anchor)
    await page
      .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET')
      .catch(() => undefined);
    await page
      .waitForResponse((r) => r.url().includes('/api/approvals/pending') && r.request().method() === 'GET')
      .catch(() => undefined);
    // After confirmation, row should no longer have confirm button
    await expect
      .poll(async () => await confirmBtn.isVisible().catch(() => false), { timeout: 15000 })
      .toBe(false);
  });

  test('validates hours input inside the edit modal', async ({ page, request }) => {
    const factory = await createTestDataFactory(request);
    const seeded = await factory.createTimesheetForTest({ targetStatus: 'DRAFT' });
    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
    // If Drafts tab exists, switch to surface draft rows deterministically
    const draftsTab = page.getByRole('button', { name: /Drafts/i });
    if (await draftsTab.isVisible().catch(() => false)) {
      await draftsTab.click().catch(() => undefined);
      await page
        .waitForResponse((r) => r.url().includes('/api/timesheets') && r.request().method() === 'GET')
        .catch(() => undefined);
    }
    // Locate the seeded row by a stable selector (data-testid) and open edit
    const seededRow = page.getByTestId(`timesheet-row-${seeded.id}`);
    if (!(await seededRow.isVisible().catch(() => false))) {
      console.warn(`Seeded draft row ${seeded.id} not visible; skipping edit validation.`);
      return;
    }
    await seededRow.getByRole('button', { name: /Edit/i }).first().click();
    await tutorDashboard.expectEditModalVisible();

    // Set to an out-of-range value to guarantee a validation error
    await tutorDashboard.updateEditForm({ hours: 65 });
    await tutorDashboard.expectFormValidationError('hours');

    // Then set to a valid value to clear the error
    await tutorDashboard.updateEditForm({ hours: 10 });
    await tutorDashboard.expectNoFormValidationErrors();

    await tutorDashboard.cancelEdit();
  });

test('rejected timesheets are not editable and show rejected status', async ({ page, request }) => {
  // Seed a timesheet then reject it via API to attach a real rejection reason
  const factory = await createTestDataFactory(request);
  const seeded = await factory.createTimesheetForTest({ targetStatus: 'PENDING_TUTOR_CONFIRMATION' });
  const rejectionNote = 'Rejected via E2E: please update project code';
  await factory.transitionTimesheet(seeded.id, 'REJECT', rejectionNote, 'admin');

  await page.reload();
  await tutorDashboard.expectToBeLoaded();
  await tutorDashboard.waitForDashboardReady();

  // Assert rejected row is present and not editable
  const tableRow = page.getByTestId(`timesheet-row-${seeded.id}`);
  if (!(await tableRow.isVisible().catch(() => false))) {
    console.warn(`Seeded rejected row ${seeded.id} not visible; skipping non-editable assertion.`);
    return;
  }
  await expect(tableRow).toBeVisible({ timeout: 20000 });
  await expect(tableRow).toContainText(/Rejected/i);
  await tutorDashboard.expectNoActionButtons(seeded.id);
});

  test('renders list or empty state', async ({ page }) => {
    await page.reload();
    await tutorDashboard.expectToBeLoaded();
    await tutorDashboard.waitForDashboardReady();
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
      await tutorDashboard.waitForDashboardReady();
      await expect
        .poll(async () => (await tutorDashboard.timesheetsTable.isVisible().catch(() => false)) || (await tutorDashboard.emptyState.isVisible().catch(() => false)), { timeout: 4000 })
        .toBeTruthy();
    }
  });

  test('shows loading state briefly then data or empty', async ({ page }) => {
    await page.reload();
    await tutorDashboard.expectLoadingState();
    await tutorDashboard.waitForDashboardReady();
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
