import { APIRequestContext } from '@playwright/test';
import { E2E_CONFIG } from '../config/e2e.config';
import {
  createTimesheetWithStatus,
  finalizeTimesheet,
  transitionTimesheet,
  type ApprovalTransition,
  type AuthContext,
  type SeededTimesheet,
  type TimesheetSeedOptions,
} from '../utils/workflow-helpers';
import {
  loginAllRoles,
  toAuthContext,
  type RoleSessionMap,
} from './auth-helper';
import { getDefaultCourseIds } from '../utils/course-catalog';

type CleanupStep = () => Promise<void>;

export class TestDataFactory {
  private readonly cleanupSteps: CleanupStep[] = [];

  constructor(
    private readonly request: APIRequestContext,
    private readonly tokens: AuthContext,
    private readonly sessions: RoleSessionMap,
    private readonly defaultCourseIds: number[],
    private readonly fallbackTutorIds: number[],
  ) {}

  getAuthTokens(): AuthContext {
    return this.tokens;
  }

  getAuthSessions(): RoleSessionMap {
    return this.sessions;
  }

  getDefaultCourseIds(): number[] {
    return [...this.defaultCourseIds];
  }

  async createTimesheetForTest(options: TimesheetSeedOptions = {}): Promise<SeededTimesheet> {
    const timesheet = await createTimesheetWithStatus(this.request, this.tokens, options);

    this.cleanupSteps.push(async () => {
      let deleted = false;
      try {
        const response = await this.request.delete(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheet.id}`, {
          headers: { Authorization: `Bearer ${this.tokens.admin.token}` },
        });
        deleted = response.status() === 204;
      } catch (error) {
        deleted = false;
        void error;
      }

      if (!deleted) {
        await finalizeTimesheet(this.request, this.tokens, timesheet.id).catch(() => undefined);
        await this.request
          .delete(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheet.id}`, {
            headers: { Authorization: `Bearer ${this.tokens.admin.token}` },
          })
          .catch(() => undefined);
      }
    });

    return timesheet;
  }

  async createTutorialTimesheet(options: TimesheetSeedOptions & {
    weekStartDate: string;
    qualification?: 'STANDARD' | 'PHD' | 'COORDINATOR';
    isRepeat?: boolean;
    sessionDate?: string;
    deliveryHours?: number;
    tutorId?: number;
  }): Promise<SeededTimesheet> {
    const hours = options.hours ?? (options.deliveryHours ?? 1);
    const preferredTutor = options.tutorId ?? this.tokens.tutor.userId;
    const fallbackPool = options.tutorId ? [] : this.fallbackTutorIds;
    const candidateTutors = Array.from(new Set([preferredTutor, ...fallbackPool]));
    let seeded: SeededTimesheet | null = null;
    let lastError: unknown = null;
    for (const tutorId of candidateTutors) {
      try {
        seeded = await this.createTimesheetForTest({
          ...options,
          hours,
          deliveryHours: options.deliveryHours ?? hours,
          taskType: 'TUTORIAL',
          qualification: options.qualification ?? 'STANDARD',
          isRepeat: options.isRepeat ?? false,
          sessionDate: options.sessionDate ?? options.weekStartDate,
          tutorId,
          targetStatus: options.targetStatus ?? 'DRAFT',
        });
        if (seeded) {
          seeded = { ...seeded, tutorId };
        }
        break;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error ?? 'unknown error'));
        const msg = err.message.toLowerCase();
        lastError = err;
        if (msg.includes('already exists') || msg.includes('resource_conflict') || msg.includes('409')) {
          continue; // try next tutor id to avoid collision on (tutor, course, week)
        }
        throw err;
      }
    }
    if (!seeded) {
      throw (lastError instanceof Error ? lastError : new Error('Unable to seed tutorial timesheet'));
    }

    // Verify seed is visible by course/week for determinism in EA tests (fail fast)
    const listCourseId = seeded.courseId ?? options.courseId ?? this.defaultCourseIds[0];
    const list = await this.request.get(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets?courseId=${listCourseId}&size=200`,
      { headers: { Authorization: `Bearer ${this.tokens.admin.token}` } },
    );
    if (!list.ok()) {
      throw new Error(`Admin list timesheets failed: ${list.status()} ${await list.text()}`);
    }
    {
      type TimesheetListResponse = {
        timesheets?: Array<{ weekStartDate?: string | null }>;
      };
      const payload = (await list.json().catch(() => null)) as TimesheetListResponse | null;
      const found = payload?.timesheets?.find(
        (t) => String(t?.weekStartDate) === String(options.weekStartDate),
      );
      if (!found) {
        throw new Error(`Seeded tutorial not found for course=${listCourseId} week=${options.weekStartDate}`);
      }
    }

    return seeded;
  }

  async transitionTimesheet(
    timesheetId: number,
    action: ApprovalTransition,
    comment?: string,
    actor?: Parameters<typeof transitionTimesheet>[4],
  ): Promise<void> {
    await transitionTimesheet(this.request, this.tokens, timesheetId, action, comment, actor);
  }

  async cleanupAll(): Promise<void> {
    while (this.cleanupSteps.length) {
      const step = this.cleanupSteps.pop();
      if (!step) continue;
      await step().catch(() => undefined);
    }
  }
}

export async function createTestDataFactory(request: APIRequestContext): Promise<TestDataFactory> {
  const sessions = await loginAllRoles(request);
  const tokens = toAuthContext(sessions);
  const defaultCourseIds = await getDefaultCourseIds(request, tokens.admin.token, 2);
  const fallbackTutorIds = await resolveTutorPool(request, tokens.admin.token, tokens.tutor.userId);
  // Ensure standard E2E tutors are assigned to common courses
  try {
    const tutorIds = fallbackTutorIds.slice(0, Math.max(1, Math.min(3, fallbackTutorIds.length)));
    if (!tutorIds.length) {
      tutorIds.push(tokens.tutor.userId);
    }
    const courseIds = defaultCourseIds.slice(0, Math.max(1, Math.min(2, defaultCourseIds.length)));
    for (const tutorId of tutorIds) {
      try {
        const resp = await request.post(
          `${E2E_CONFIG.BACKEND.URL}/api/admin/tutors/assignments`,
          {
            headers: {
              Authorization: `Bearer ${tokens.admin.token}`,
              'Content-Type': 'application/json',
            },
            data: { tutorId, courseIds },
          },
        );
        if (!resp.ok() && resp.status() !== 409) {
          // Soft retry once for transient races
          await request.post(
            `${E2E_CONFIG.BACKEND.URL}/api/admin/tutors/assignments`,
            {
              headers: {
                Authorization: `Bearer ${tokens.admin.token}`,
                'Content-Type': 'application/json',
              },
              data: { tutorId, courseIds },
            },
          ).catch(() => undefined);
        }
      } catch (error) {
        // Non-fatal; UI quoting does not strictly require this but improves determinism
        void error;
      }
    }
  } catch (error) {
    void error;
  }
  return new TestDataFactory(request, tokens, sessions, defaultCourseIds, fallbackTutorIds);
}

async function resolveTutorPool(
  request: APIRequestContext,
  adminToken: string,
  preferredTutorId: number,
): Promise<number[]> {
  const unique = new Set<number>();
  if (Number.isFinite(preferredTutorId)) {
    unique.add(Number(preferredTutorId));
  }
  try {
    const resp = await request.get(
      `${E2E_CONFIG.BACKEND.URL}/api/users?role=TUTOR&active=true&size=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (resp.ok()) {
      const payload = await resp.json().catch(() => null as any);
      const entries: Array<{ id?: number }> =
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.content)
            ? payload.content
            : [];
      for (const entry of entries) {
        const id = Number(entry?.id);
        if (Number.isFinite(id)) {
          unique.add(id);
        }
      }
    }
  } catch (error) {
    void error;
  }
  return Array.from(unique);
}
