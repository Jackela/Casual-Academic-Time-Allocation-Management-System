import { test, expect, APIRequestContext } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';

let dataFactory: TestDataFactory;

const getTutorsUrl = (courseId: number) => `${E2E_CONFIG.BACKEND.URL}/api/courses/${courseId}/tutors`;

async function getWithAuth(request: APIRequestContext, url: string, token: string) {
  const response = await request.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response;
}

test.describe('Courses → Tutors endpoint alignment', { tag: ['@api', '@alignment'] }, () => {
  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async () => {
    await dataFactory?.cleanupAll();
  });

  test('Admin can GET /api/courses/{courseId}/tutors', async ({ request }) => {
    const { admin } = dataFactory.getAuthTokens();
    const courseId = 1;
    const url = getTutorsUrl(courseId);
    const res = await getWithAuth(request, url, admin.token);
    const bodyText = await res.text();
    if (res.status() !== 200) {
      throw new Error(`Expected 200 but got ${res.status()} for GET ${url}. Body: ${bodyText}`);
    }
    let payload: unknown;
    try { payload = JSON.parse(bodyText); } catch { payload = bodyText; }
    expect(Array.isArray(payload)).toBe(true);
  });

  test('Lecturer can GET /api/courses/{courseId}/tutors', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const courseId = 1;
    // Ensure lecturer is assigned to courseId=1
    await request.post(`${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/assignments`, {
      headers: { Authorization: `Bearer ${tokens.admin.token}`, 'Content-Type': 'application/json' },
      data: { lecturerId: sessions.lecturer.user.id, courseIds: [courseId] },
    });
    const url = getTutorsUrl(courseId);
    const res = await getWithAuth(request, url, tokens.lecturer.token);
    if (res.status() !== 200) {
      const body = await res.text();
      throw new Error(`Expected 200 but got ${res.status()} for GET ${url}. Body: ${body}`);
    }
  });

  test('Non-assigned lecturer is forbidden for /api/courses/{courseId}/tutors', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const targetCourseId = 1;
    // Ensure lecturer is NOT assigned to courseId=1 by assigning lecturer to a different course only
    await request.post(`${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/assignments`, {
      headers: {
        Authorization: `Bearer ${tokens.admin.token}`,
        'Content-Type': 'application/json',
      },
      data: { lecturerId: sessions.lecturer.user.id, courseIds: [2] },
    });
    const url = getTutorsUrl(targetCourseId);
    const res = await getWithAuth(request, url, tokens.lecturer.token);
    const status = res.status();
    const body = await res.text();
    if (![401, 403].includes(status)) {
      throw new Error(`Expected 401/403 but got ${status} for GET ${url}. Body: ${body}`);
    }
  });

  test('Tutor should be forbidden for /api/courses/{courseId}/tutors', async ({ request }) => {
    const { tutor } = dataFactory.getAuthTokens();
    const courseId = 1;
    const url = getTutorsUrl(courseId);
    const res = await getWithAuth(request, url, tutor.token);
    const status = res.status();
    const body = await res.text();
    expect([401, 403]).toContain(status);
    if (![401, 403].includes(status)) {
      throw new Error(`Expected 401/403 but got ${status} for GET ${url}. Body: ${body}`);
    }
  });

  test('Invalid courseId returns 404 or 200 []', async ({ request }) => {
    const { admin } = dataFactory.getAuthTokens();
    const invalidId = 999999;
    const url = getTutorsUrl(invalidId);
    const res = await getWithAuth(request, url, admin.token);
    const status = res.status();
    const text = await res.text();
    if (status === 200) {
      let payload: unknown;
      try { payload = JSON.parse(text); } catch { payload = text; }
      expect(Array.isArray(payload)).toBe(true);
      expect((payload as any[]).length === 0).toBe(true);
    } else if (status === 404) {
      expect(status).toBe(404);
    } else {
      throw new Error(`Expected 200 [] or 404 but got ${status} for GET ${url}. Body: ${text}`);
    }
  });

  test('Unauthenticated request is unauthorized for /api/courses/{courseId}/tutors', async ({ request }) => {
    const courseId = 1;
    const url = getTutorsUrl(courseId);
    const res = await request.get(url);
    expect([401, 403]).toContain(res.status());
  });
});
