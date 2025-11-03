import { test, expect, APIRequestContext } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';

let dataFactory: TestDataFactory;

const getLecturerAssignmentsUrl = (lecturerId: number) => `${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/${lecturerId}/assignments`;
const postLecturerAssignmentsUrl = () => `${E2E_CONFIG.BACKEND.URL}/api/admin/lecturers/assignments`;

async function getWithAuth(request: APIRequestContext, url: string, token: string) {
  return request.get(url, { headers: { Authorization: `Bearer ${token}` } });
}

async function postWithAuth(request: APIRequestContext, url: string, token: string, data: any) {
  return request.post(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data,
  });
}

test.describe('Admin Lecturer Assignments endpoint alignment', { tag: ['@api', '@alignment'] }, () => {
  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async () => {
    await dataFactory?.cleanupAll();
  });

  test('GET /api/admin/lecturers/{lecturerId}/assignments returns { courseIds: number[] }', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const lecturerId = sessions.lecturer.user.id;
    const url = getLecturerAssignmentsUrl(lecturerId);
    const res = await getWithAuth(request, url, tokens.admin.token);
    const bodyText = await res.text();
    if (res.status() !== 200) {
      throw new Error(`Expected 200 but got ${res.status()} for GET ${url}. Body: ${bodyText}`);
    }
    const payload = JSON.parse(bodyText);
    expect(payload).toHaveProperty('courseIds');
    expect(Array.isArray(payload.courseIds)).toBe(true);
  });

  test('POST /api/admin/lecturers/assignments updates assigned courseIds', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const lecturerId = sessions.lecturer.user.id;
    const initialGet = await getWithAuth(request, getLecturerAssignmentsUrl(lecturerId), tokens.admin.token);
    const initialPayload = initialGet.ok() ? await initialGet.json() : { courseIds: [] };
    const nextCourseIds: number[] = Array.isArray(initialPayload.courseIds) && initialPayload.courseIds.length
      ? initialPayload.courseIds.slice(0, 1)
      : [1];

    const postUrl = postLecturerAssignmentsUrl();
    const postRes = await postWithAuth(request, postUrl, tokens.admin.token, { lecturerId, courseIds: nextCourseIds });
    const postStatus = postRes.status();
    const postText = await postRes.text();
    if (![200, 204].includes(postStatus)) {
      throw new Error(`Expected 204/200 but got ${postStatus} for POST ${postUrl}. Body: ${postText}`);
    }
    if (postStatus === 200) {
      try {
        const body = JSON.parse(postText);
        if (Array.isArray(body.courseIds)) {
          expect(body.courseIds).toEqual(nextCourseIds);
          return;
        }
      } catch {}
    }

    const verify = await getWithAuth(request, getLecturerAssignmentsUrl(lecturerId), tokens.admin.token);
    const verifyText = await verify.text();
    if (verify.status() !== 200) {
      throw new Error(`Expected 200 on verify GET but got ${verify.status()} for ${getLecturerAssignmentsUrl(lecturerId)}. Body: ${verifyText}`);
    }
    const verifyPayload = JSON.parse(verifyText);
    expect(verifyPayload.courseIds).toEqual(nextCourseIds);
  });

  test('GET with invalid lecturerId returns 200 {courseIds: []} or 404', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const invalidLecturerId = 999999;
    const url = getLecturerAssignmentsUrl(invalidLecturerId);
    const res = await getWithAuth(request, url, tokens.admin.token);
    const status = res.status();
    const text = await res.text();
    if (status === 200) {
      const payload = JSON.parse(text);
      expect(Array.isArray(payload.courseIds)).toBe(true);
    } else if (status === 404) {
      expect(status).toBe(404);
    } else {
      throw new Error(`Expected 200 or 404 but got ${status} for GET ${url}. Body: ${text}`);
    }
  });

  test('POST unauthorized role is forbidden for lecturer assignments', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const postUrl = postLecturerAssignmentsUrl();
    const res = await postWithAuth(request, postUrl, tokens.tutor.token, {
      lecturerId: sessions.lecturer.user.id,
      courseIds: [1],
    });
    expect([401, 403]).toContain(res.status());
  });
});
