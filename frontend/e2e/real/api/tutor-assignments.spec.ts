import { test, expect, APIRequestContext } from '@playwright/test';
import { E2E_CONFIG } from '../../config/e2e.config';
import { createTestDataFactory, TestDataFactory } from '../../api/test-data-factory';

let dataFactory: TestDataFactory;

const getTutorAssignmentsUrl = (tutorId: number) => `${E2E_CONFIG.BACKEND.URL}/api/admin/tutors/${tutorId}/assignments`;
const postTutorAssignmentsUrl = () => `${E2E_CONFIG.BACKEND.URL}/api/admin/tutors/assignments`;

type TutorAssignmentPayload = {
  tutorId: number;
  courseIds: number[];
};

async function getWithAuth(request: APIRequestContext, url: string, token: string) {
  return request.get(url, { headers: { Authorization: `Bearer ${token}` } });
}

async function postWithAuth(request: APIRequestContext, url: string, token: string, data: TutorAssignmentPayload) {
  return request.post(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data,
  });
}

test.describe('Admin Tutor Assignments endpoint alignment', { tag: ['@api', '@alignment'] }, () => {
  test.beforeEach(async ({ request }) => {
    dataFactory = await createTestDataFactory(request);
  });

  test.afterEach(async () => {
    await dataFactory?.cleanupAll();
  });

  test('GET /api/admin/tutors/{tutorId}/assignments returns { courseIds: number[] }', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const tutorId = sessions.tutor.user.id;
    const url = getTutorAssignmentsUrl(tutorId);
    const res = await getWithAuth(request, url, tokens.admin.token);
    const bodyText = await res.text();
    if (res.status() !== 200) {
      throw new Error(`Expected 200 but got ${res.status()} for GET ${url}. Body: ${bodyText}`);
    }
    const payload = JSON.parse(bodyText);
    expect(payload).toHaveProperty('courseIds');
    expect(Array.isArray(payload.courseIds)).toBe(true);
  });

  test('POST /api/admin/tutors/assignments updates assigned courseIds', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const tutorId = sessions.tutor.user.id;
    const initialGet = await getWithAuth(request, getTutorAssignmentsUrl(tutorId), tokens.admin.token);
    const initialPayload = initialGet.ok() ? await initialGet.json() : { courseIds: [] };
    const defaultCourse = dataFactory.getDefaultCourseIds()[0];
    const nextCourseIds: number[] = Array.isArray(initialPayload.courseIds) && initialPayload.courseIds.length
      ? initialPayload.courseIds.slice(0, 1) // shrink set to force change
      : [defaultCourse];

    const postUrl = postTutorAssignmentsUrl();
    const postRes = await postWithAuth(request, postUrl, tokens.admin.token, { tutorId, courseIds: nextCourseIds });
    const postStatus = postRes.status();
    const postBodyText = await postRes.text();
    console.log('Tutor assignments POST status:', postStatus, 'body:', postBodyText);
    if (![200, 204].includes(postStatus)) {
      throw new Error(`Expected 204/200 but got ${postStatus} for POST ${postUrl}. Body: ${postBodyText}`);
    }
    if (postStatus === 200) {
      try {
        const body = JSON.parse(postBodyText);
        if (Array.isArray(body.courseIds)) {
          expect(body.courseIds).toEqual(nextCourseIds);
          return;
        }
      } catch (error) {
        void error;
      }
    }

    // Allow brief commit/consistency window; poll for up to 1s
    const start = Date.now();
    let lastStatus = 0; let lastBody = '';
    while (Date.now() - start < 1000) {
      const verify = await getWithAuth(request, getTutorAssignmentsUrl(tutorId), tokens.admin.token);
      lastStatus = verify.status();
      lastBody = await verify.text();
      if (lastStatus === 200) {
        try {
          const payload = JSON.parse(lastBody);
          if (Array.isArray(payload.courseIds) && payload.courseIds.length === nextCourseIds.length && payload.courseIds.every((v: number, i: number) => v === nextCourseIds[i])) {
            break;
          }
        } catch (error) {
          void error;
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    const finalRes = await getWithAuth(request, getTutorAssignmentsUrl(tutorId), tokens.admin.token);
    const finalText = await finalRes.text();
    if (finalRes.status() !== 200) {
      throw new Error(`Expected 200 on verify GET but got ${finalRes.status()} for ${getTutorAssignmentsUrl(tutorId)}. Body: ${finalText}`);
    }
    const finalPayload = JSON.parse(finalText);
    expect(finalPayload.courseIds).toEqual(nextCourseIds);
  });

  test('GET with invalid tutorId returns 200 {courseIds: []} or 404', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const invalidTutorId = 999999;
    const url = `${E2E_CONFIG.BACKEND.URL}/api/admin/tutors/${invalidTutorId}/assignments`;
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

  test('POST unauthorized role is forbidden for tutor assignments', async ({ request }) => {
    const tokens = dataFactory.getAuthTokens();
    const sessions = dataFactory.getAuthSessions();
    const defaultCourse = dataFactory.getDefaultCourseIds()[0];
    if (!defaultCourse) {
      throw new Error('No default course id available for tutor assignments negative test');
    }
    const url = `${E2E_CONFIG.BACKEND.URL}/api/admin/tutors/assignments`;
    const res = await request.post(url, {
      headers: { Authorization: `Bearer ${tokens.lecturer.token}`, 'Content-Type': 'application/json' },
      data: { tutorId: sessions.tutor.user.id, courseIds: [defaultCourse] },
    });
    expect([401, 403]).toContain(res.status());
  });
});
