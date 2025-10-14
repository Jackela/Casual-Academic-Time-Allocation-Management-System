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
      await finalizeTimesheet(this.request, this.tokens, timesheet.id).catch(() => undefined);
      await this.request
        .delete(`${E2E_CONFIG.BACKEND.URL}/api/timesheets/${timesheet.id}`, {
          headers: { Authorization: `Bearer ${this.tokens.admin.token}` },
        })
        .catch(() => undefined);
    });

    return timesheet;
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
  return new TestDataFactory(request, tokens, sessions);
}
