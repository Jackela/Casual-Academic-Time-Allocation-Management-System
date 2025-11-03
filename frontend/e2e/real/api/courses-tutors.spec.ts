import { test, expect, APIRequestContext } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';

let dataFactory: TestDataFactory;

const getTutorsUrl = (courseId: number) => `${E2E_CONFIG.BACKEND.URL}/api/courses/${courseId}/tutors`;

async function getWithAuth(request: APIRequestContext, url: string, token: string) {
  return request.get(url, { headers: { Authorization: `Bearer ${token}` } });
}

test.describe('@api Courses → Tutors endpoint alignment', () => {
  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async () => {
    await dataFactory?.cleanupAll();
  });

  test('Admin GET /api/courses/{id}/tutors returns { tutorIds } @api', async ({ request }) => {
    const { admin } = dataFactory.getAuthTokens();
    const courseId = 1;
    const url = getTutorsUrl(courseId);
    const res = await getWithAuth(request, url, admin.token);
    const text = await res.text();
    if (res.status() !== 200) throw new Error(`Expected 200 but got ${res.status()} for GET ${url}. Body: ${text}`);
    const payload = JSON.parse(text);
    expect(Array.isArray(payload.tutorIds)).toBe(true);
  });

  test('Assigned lecturer can GET tutors list @api', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const courseId = 1;
    await request.post(`${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/assignments`, {
      headers: { Authorization: `Bearer ${tokens.admin.token}`, 'Content-Type': 'application/json' },
      data: { lecturerId: sessions.lecturer.user.id, courseIds: [courseId] },
    });
    const res = await getWithAuth(request, getTutorsUrl(courseId), tokens.lecturer.token);
    const text = await res.text();
    if (res.status() !== 200) throw new Error(`Expected 200 but got ${res.status()} Body: ${text}`);
    const payload = JSON.parse(text);
    expect(Array.isArray(payload.tutorIds)).toBe(true);
  });

  test('Non-assigned lecturer forbidden @api', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const url = getTutorsUrl(1);
    await request.post(`${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/assignments`, {
      headers: { Authorization: `Bearer ${tokens.admin.token}`, 'Content-Type': 'application/json' },
      data: { lecturerId: sessions.lecturer.user.id, courseIds: [2] },
    });
    const res = await getWithAuth(request, url, tokens.lecturer.token);
    expect([401, 403]).toContain(res.status());
  });

  test('Tutor forbidden for tutors list @api', async ({ request }) => {
    const { tutor } = dataFactory.getAuthTokens();
    const res = await getWithAuth(request, getTutorsUrl(1), tutor.token);
    expect([401, 403]).toContain(res.status());
  });

  test('Invalid courseId returns 404 or empty @api', async ({ request }) => {
    const { admin } = dataFactory.getAuthTokens();
    const invalidId = 999999;
    const res = await getWithAuth(request, getTutorsUrl(invalidId), admin.token);
    const status = res.status();
    const text = await res.text();
    if (status === 200) {
      const payload = JSON.parse(text);
      expect(Array.isArray(payload.tutorIds)).toBe(true);
      expect(payload.tutorIds.length).toBe(0);
    } else {
      expect([404]).toContain(status);
    }
  });

  test('Unauthenticated forbidden @api', async ({ request }) => {
    const res = await request.get(getTutorsUrl(1));
    expect([401, 403]).toContain(res.status());
  });
});
