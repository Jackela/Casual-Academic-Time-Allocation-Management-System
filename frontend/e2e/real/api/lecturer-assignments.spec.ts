import { test, expect, APIRequestContext } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';

let dataFactory: TestDataFactory;

const getAssignmentsUrl = (lecturerId: number) => `${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/${lecturerId}/assignments`;
const postAssignmentsUrl = () => `${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/assignments`;

async function getWithAuth(request: APIRequestContext, url: string, token: string) {
  return request.get(url, { headers: { Authorization: `Bearer ${token}` } });
}

async function postWithAuth(request: APIRequestContext, url: string, token: string, data: unknown) {
  return request.post(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } as Record<string,string>, data });
}

test.describe('@api Lecturer assignments admin API', () => {
  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async () => {
    await dataFactory?.cleanupAll();
  });

  test('Admin can POST and GET lecturer assignments @api', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const lecturerId = sessions.lecturer.user.id;
    const courseIds = [1, 2];

    const postRes = await postWithAuth(request, postAssignmentsUrl(), tokens.admin.token, { lecturerId, courseIds });
    const postText = await postRes.text();
    if (postRes.status() !== 200) throw new Error(`POST expected 200, got ${postRes.status()} body=${postText}`);
    const postPayload = JSON.parse(postText);
    expect(Array.isArray(postPayload.courseIds)).toBe(true);

    const getRes = await getWithAuth(request, getAssignmentsUrl(lecturerId), tokens.admin.token);
    const getText = await getRes.text();
    if (getRes.status() !== 200) throw new Error(`GET expected 200, got ${getRes.status()} body=${getText}`);
    const getPayload = JSON.parse(getText);
    expect(Array.isArray(getPayload.courseIds)).toBe(true);
  });

  test('Non-admin cannot manage lecturer assignments @api', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const lecturerId = sessions.lecturer.user.id;
    const urlGet = getAssignmentsUrl(lecturerId);
    const urlPost = postAssignmentsUrl();

    const badGet = await getWithAuth(request, urlGet, tokens.tutor.token);
    expect([401,403]).toContain(badGet.status());

    const badPost = await postWithAuth(request, urlPost, tokens.tutor.token, { lecturerId, courseIds: [1] });
    expect([401,403]).toContain(badPost.status());
  });

  test('Unknown lecturer returns 404 or empty @api', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const invalidId = 999999;
    const res = await getWithAuth(request, getAssignmentsUrl(invalidId), tokens.admin.token);
    const status = res.status();
    if (status === 200) {
      const payload = JSON.parse(await res.text());
      expect(Array.isArray(payload.courseIds)).toBe(true);
    } else {
      expect([404]).toContain(status);
    }
  });
});
