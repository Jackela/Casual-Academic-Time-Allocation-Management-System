import { test, expect } from '../fixtures/base';
import { TimesheetApiClient } from '../utils/api-client';
import { E2E_CONFIG } from '../config/e2e.config';
import type { TimesheetPage } from '../../src/types/api';
import { acquireAuthTokens, createTimesheetWithStatus, finalizeTimesheet, type AuthContext } from '../utils/workflow-helpers';

const BACKEND_URL = E2E_CONFIG.BACKEND.URL;

test.describe('Timesheet API Contract', () => {
  let adminClient: TimesheetApiClient;
  let lecturerClient: TimesheetApiClient;
  let tutorClient: TimesheetApiClient;
  let tokens: AuthContext;
  const seededTimesheets: number[] = [];

  test.beforeAll(async ({ request }) => {
    tokens = await acquireAuthTokens(request);

    adminClient = new TimesheetApiClient(BACKEND_URL);
    const adminAuth = await adminClient.authenticate({
      email: E2E_CONFIG.USERS.admin.email,
      password: E2E_CONFIG.USERS.admin.password
    });
    expect(adminAuth.token).toBeTruthy();

    lecturerClient = new TimesheetApiClient(BACKEND_URL);
    const lecturerAuth = await lecturerClient.authenticate({
      email: E2E_CONFIG.USERS.lecturer.email,
      password: E2E_CONFIG.USERS.lecturer.password
    });
    expect(lecturerAuth.token).toBeTruthy();

    tutorClient = new TimesheetApiClient(BACKEND_URL);
    const tutorAuth = await tutorClient.authenticate({
      email: E2E_CONFIG.USERS.tutor.email,
      password: E2E_CONFIG.USERS.tutor.password
    });
    expect(tutorAuth.token).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    for (const id of seededTimesheets.splice(0)) {
      await finalizeTimesheet(request, tokens, id).catch(() => undefined);
    }
  });

  test('should return paginated pending timesheets for admin', async ({ request }) => {
    const seeded = await createTimesheetWithStatus(request, tokens, { targetStatus: 'TUTOR_CONFIRMED' });
    seededTimesheets.push(seeded.id);

    const response = await adminClient.getPendingTimesheets(0, 20);
    expect(response.timesheets.length).toBeGreaterThan(0);
    const match = response.timesheets.find(ts => ts.id === seeded.id);
    expect(match).toBeTruthy();
    expect(match?.status).toBe('TUTOR_CONFIRMED');
  });

  test('should support pagination parameters', async ({ request }) => {
    const seeded = await createTimesheetWithStatus(request, tokens, { targetStatus: 'TUTOR_CONFIRMED' });
    seededTimesheets.push(seeded.id);

    const pageSize = 1;
    const page = await adminClient.getPendingTimesheets(0, pageSize);
    expect(page.pageInfo.pageSize).toBe(pageSize);
    expect(page.timesheets.length).toBeLessThanOrEqual(pageSize);
  });

  test('should require authentication for pending final approval endpoint', async () => {
    const unauthenticatedClient = new TimesheetApiClient(BACKEND_URL);
    await expect(unauthenticatedClient.getPendingTimesheets()).rejects.toMatchObject({
      status: 401,
      success: false
    });
  });

  test('should return tutor timesheets with pagination metadata', async () => {
    const response: TimesheetPage = await tutorClient.getUserTimesheets();
    expect(Array.isArray(response.timesheets)).toBe(true);
    expect(response.pageInfo).toMatchObject({
      currentPage: expect.any(Number),
      totalElements: expect.any(Number),
      pageSize: expect.any(Number),
    });
  });

  test('lecturer can query by tutor id', async () => {
    const tutorId = tokens.tutor.userId;
    const response = await lecturerClient.getUserTimesheets(tutorId, { page: 0, size: 5 });
    expect(Array.isArray(response.timesheets)).toBe(true);
    if (response.timesheets.length > 0) {
      expect(response.timesheets.every(ts => ts.tutorId === tutorId)).toBe(true);
    }
  });

  test('should reject invalid approval actions with validation error', async ({ request }) => {
    const seeded = await createTimesheetWithStatus(request, tokens, { targetStatus: 'LECTURER_CONFIRMED' });
    seededTimesheets.push(seeded.id);

    await expect(adminClient.processApproval({
      timesheetId: seeded.id,
      action: 'INVALID_ACTION' as any,
      comment: 'invalid'
    })).rejects.toMatchObject({
      success: false,
      status: 400
    });
  });
});

