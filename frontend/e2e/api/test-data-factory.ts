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

type CleanupStep = () => Promise<void>;

export class TestDataFactory {
  private readonly cleanupSteps: CleanupStep[] = [];

  constructor(
    private readonly request: APIRequestContext,
    private readonly tokens: AuthContext,
    private readonly sessions: RoleSessionMap,
  ) {}

  getAuthTokens(): AuthContext {
    return this.tokens;
  }

  getAuthSessions(): RoleSessionMap {
    return this.sessions;
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
      } catch {
        deleted = false;
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
    const candidateTutors = Array.from(new Set([preferredTutor, 3, 4, 5]));
    let seeded: SeededTimesheet | null = null;
    let lastErr: any = null;
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
      } catch (e) {
        const msg = String((e as Error)?.message ?? '').toLowerCase();
        lastErr = e;
        if (msg.includes('already exists') || msg.includes('resource_conflict') || msg.includes('409')) {
          continue; // try next tutor id to avoid collision on (tutor, course, week)
        }
        throw e;
      }
    }
    if (!seeded) {
      throw lastErr ?? new Error('Unable to seed tutorial timesheet');
    }

    // Verify seed is visible by course/week for determinism in EA tests (fail fast)
    const list = await this.request.get(
      `${E2E_CONFIG.BACKEND.URL}/api/timesheets?courseId=${options.courseId ?? 1}&size=200`,
      { headers: { Authorization: `Bearer ${this.tokens.admin.token}` } },
    );
    if (!list.ok()) {
      throw new Error(`Admin list timesheets failed: ${list.status()} ${await list.text()}`);
    }
    {
      const payload = await list.json().catch(() => null as any);
      const found = Array.isArray(payload?.timesheets)
        ? payload.timesheets.find((t: any) => String(t.weekStartDate) === String(options.weekStartDate))
        : null;
      if (!found) {
        throw new Error(`Seeded tutorial not found for course=${options.courseId ?? 1} week=${options.weekStartDate}`);
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
  // Ensure standard E2E tutors are assigned to common courses (1 and 2)
  try {
    const tutorIds = [3, 4, 5];
    const courseIds = [1, 2];
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
      } catch {
        // Non-fatal; UI quoting does not strictly require this but improves determinism
      }
    }
  } catch {
    // ignore
  }
  return new TestDataFactory(request, tokens, sessions);
}
