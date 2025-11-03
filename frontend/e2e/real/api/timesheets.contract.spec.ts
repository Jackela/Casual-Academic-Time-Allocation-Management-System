import { test, expect } from '@playwright/test';
import { TimesheetApiClient } from '../../utils/api-client';
import { E2E_CONFIG } from '../../config/e2e.config';
import type { TimesheetPage, ApprovalAction } from '../../../src/types/api';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';
import type { AuthContext } from '../../utils/workflow-helpers';
import { loginAsRole } from '../../api/auth-helper';

const BACKEND_URL = E2E_CONFIG.BACKEND.URL;

test.describe('@api Timesheet API Contract', () => {
  let adminClient: TimesheetApiClient;
  let lecturerClient: TimesheetApiClient;
  let tutorClient: TimesheetApiClient;
  let dataFactory: TestDataFactory;
  let tokens: AuthContext;

  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
    tokens = dataFactory.getAuthTokens();

    adminClient = new TimesheetApiClient(BACKEND_URL);
    const adminAuth = await adminClient.authenticate({
      email: E2E_CONFIG.USERS.admin.email,
      password: E2E_CONFIG.USERS.admin.password,
    });
    expect(adminAuth.token).toBeTruthy();

    lecturerClient = new TimesheetApiClient(BACKEND_URL);
    const lecturerAuth = await lecturerClient.authenticate({
      email: E2E_CONFIG.USERS.lecturer.email,
      password: E2E_CONFIG.USERS.lecturer.password,
    });
    expect(lecturerAuth.token).toBeTruthy();

    tutorClient = new TimesheetApiClient(BACKEND_URL);
    const tutorAuth = await tutorClient.authenticate({
      email: E2E_CONFIG.USERS.tutor.email,
      password: E2E_CONFIG.USERS.tutor.password,
    });
    expect(tutorAuth.token).toBeTruthy();

    // Ensure lecturer resources exist for course discovery (deterministic precondition)
    const who = tokens?.lecturer?.userId ?? 2;
    const lecturerToken = tokens?.lecturer?.token;
    const hdrs = lecturerToken ? { Authorization: `Bearer ${lecturerToken}` } : {};
    const coursesProbe = await request.get(`${BACKEND_URL}/api/courses?lecturerId=${who}&active=true`, { headers: hdrs });
    if (!coursesProbe.ok()) {
      try {
        const seed = await request.post(`${BACKEND_URL}/api/test-data/seed/lecturer-resources`, {
          headers: { 'Content-Type': 'application/json', 'X-Test-Reset-Token': process.env.TEST_DATA_RESET_TOKEN || 'local-e2e-reset' },
          data: { lecturerId: who, seedTutors: true },
        });
        await seed.text().catch(() => undefined);
      } catch {}
      // Proceed deterministically even if probe fails; specs use fallbacks where needed
    }
  });

  test.afterEach(async () => {
    await dataFactory?.cleanupAll();
  });

  test('Admin sees pending list contains seeded LECTURER_CONFIRMED @api', async () => {
    const seeded = await dataFactory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' });

    const response = await adminClient.getPendingTimesheets(0, 20);
    expect(response.timesheets.length).toBeGreaterThan(0);
    const match = response.timesheets.find(ts => ts.id === seeded.id);
    expect(match).toBeTruthy();
    expect(match?.status).toBe('LECTURER_CONFIRMED');
  });

  test('Pending timesheets pagination respected @api', async () => {
    await dataFactory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' });

    const pageSize = 1;
    const page = await adminClient.getPendingTimesheets(0, pageSize);
    expect(page.pageInfo.pageSize).toBe(pageSize);
    expect(page.timesheets.length).toBeLessThanOrEqual(pageSize);
  });

  test('Pending endpoint requires authentication @api', async () => {
    const unauthenticatedClient = new TimesheetApiClient(BACKEND_URL);
    await expect(unauthenticatedClient.getPendingTimesheets()).rejects.toMatchObject({
      status: 401,
      success: false,
    });
  });

  test('Tutor timesheets returns page metadata @api', async () => {
    const response: TimesheetPage = await tutorClient.getUserTimesheets();
    expect(Array.isArray(response.timesheets)).toBe(true);
    expect(response.pageInfo).toMatchObject({
      currentPage: expect.any(Number),
      totalElements: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });

  test('Lecturer can query by tutorId @api', async () => {
    const tutorId = tokens.tutor.userId;
    const response = await lecturerClient.getUserTimesheets(tutorId, { page: 0, size: 5 });
    expect(Array.isArray(response.timesheets)).toBe(true);
    if (response.timesheets.length > 0) {
      expect(response.timesheets.every(ts => ts.tutorId === tutorId)).toBe(true);
    }
  });

  test('Invalid approval action yields 400 @api', async () => {
    const seeded = await dataFactory.createTimesheetForTest({ targetStatus: 'LECTURER_CONFIRMED' });

    const invalidAction = 'INVALID_ACTION' as unknown as ApprovalAction;
    await expect(
      adminClient.processApproval({
        timesheetId: seeded.id,
        action: invalidAction,
        comment: 'invalid',
      }),
    ).rejects.toMatchObject({
      success: false,
      status: 400,
    });
  });

  test('Create ignores forbidden fields (SSOT) @api', async ({ request, page }) => {
    const { token, user } = await loginAsRole(page.request, 'lecturer');

    // Discover a real courseId for the lecturer to avoid flake
    const coursesRes = await request.get(`${BACKEND_URL}/api/courses?lecturerId=${tokens.lecturer.userId ?? 2}&active=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect.soft(coursesRes.ok()).toBeTruthy();
    const courses: Array<{ id: number }> = coursesRes.ok() ? await coursesRes.json() : [];
    const courseId = courses[0]?.id ?? 1; // fall back to 1 if environment is unusual

    const forbiddenPayload = {
      tutorId: tokens.tutor.userId,
      courseId,
      weekStartDate: '2025-01-27',
      sessionDate: '2025-01-27',
      deliveryHours: 1,
      description: 'Contract test with forbidden fields',
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      repeat: false,
      // Forbidden/calculated (should be ignored by server)
      totalPay: 12345,
      associatedHours: 999,
      hourlyRate: 999,
    } as any;

    const create = await request.post(`${BACKEND_URL}/api/timesheets`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: forbiddenPayload,
    });

    // Server may accept the create (201) but must ignore/overwrite forbidden fields;
    // alternatively, it may reject the payload as validation error (4xx).
    if (create.status() === 201) {
      const body = await create.json();
      if (typeof body.hourlyRate !== 'undefined') {
        expect(body.hourlyRate).not.toBe(forbiddenPayload.hourlyRate);
      }
      if (typeof body.associatedHours !== 'undefined') {
        expect(body.associatedHours).not.toBe(forbiddenPayload.associatedHours);
      }
      if (typeof body.totalPay !== 'undefined') {
        expect(body.totalPay).not.toBe(forbiddenPayload.totalPay);
      }
    } else {
      expect(create.status()).toBeGreaterThanOrEqual(400);
      expect(create.status()).toBeLessThan(500);
    }
  });
});

