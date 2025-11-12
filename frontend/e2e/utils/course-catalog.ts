import type { APIRequestContext } from '@playwright/test';
import { E2E_CONFIG } from '../config/e2e.config';

type CourseSummary = {
  id: number;
  code?: string | null;
  name?: string | null;
  lecturerId?: number | null;
  isActive?: boolean | null;
};

let cachedCourseIds: number[] | null = null;
let inflightRequest: Promise<number[]> | null = null;

async function fetchCourseIds(request: APIRequestContext, token: string): Promise<number[]> {
  const response = await request.get(`${E2E_CONFIG.BACKEND.URL}/api/courses?active=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to fetch courses for E2E setup: ${response.status()} ${await response.text()}`);
  }

  const payload = (await response.json().catch(() => [])) as CourseSummary[] | null;
  const ids = (payload ?? [])
    .map((course) => course?.id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));

  if (!ids.length) {
    throw new Error('Course catalog request returned no valid course IDs');
  }

  return ids;
}

/**
 * Resolve the canonical list of course IDs used across the E2E suite.
 * The first two entries are treated as the default {1,2} replacements.
 */
export async function getDefaultCourseIds(
  request: APIRequestContext,
  token: string,
  minimum = 1,
): Promise<number[]> {
  if (cachedCourseIds) {
    return cachedCourseIds.slice(0);
  }

  if (!inflightRequest) {
    inflightRequest = fetchCourseIds(request, token);
  }

  cachedCourseIds = await inflightRequest;
  inflightRequest = null;

  if (cachedCourseIds.length < minimum) {
    throw new Error(`Course catalog only returned ${cachedCourseIds.length} course(s); expected at least ${minimum}`);
  }

  return cachedCourseIds.slice(0);
}

export async function getPrimaryCourseId(
  request: APIRequestContext,
  token: string,
): Promise<number> {
  const ids = await getDefaultCourseIds(request, token, 1);
  return ids[0];
}

