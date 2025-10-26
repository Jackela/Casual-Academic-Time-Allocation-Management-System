import type { APIRequestContext } from '@playwright/test';
import { createTestDataFactory } from '../../api/test-data-factory';

export async function seedTutorDraftTimesheet(request: APIRequestContext, opts: {
  lecturerId?: number;
  tutorId?: number;
  courseId?: number;
  weekStartDate?: string;
  taskType?: string;
} = {}) {
  const factory = await createTestDataFactory(request);
  // Validate environment by seeding a deterministic draft the UI can edit
  const seeded = await factory.createTimesheetForTest({ targetStatus: 'DRAFT', ...opts });
  return seeded;
}

