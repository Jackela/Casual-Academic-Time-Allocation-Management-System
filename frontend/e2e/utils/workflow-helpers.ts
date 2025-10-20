import { APIRequestContext, APIResponse, expect } from "@playwright/test";
import { E2E_CONFIG } from '../config/e2e.config';

export interface AuthContext {
  admin: { token: string; userId: number };
  lecturer: { token: string; userId: number };
  tutor: { token: string; userId: number };
}

type TimesheetStatus =
  | 'DRAFT'
  | 'PENDING_TUTOR_CONFIRMATION'
  | 'TUTOR_CONFIRMED'
  | 'LECTURER_CONFIRMED'
  | 'FINAL_CONFIRMED'
  | 'REJECTED'
  | 'MODIFICATION_REQUESTED';

export interface TimesheetSeedOptions {
  description?: string;
  hours?: number;
  hourlyRate?: number;
  courseId?: number;
  weekStartDate?: string;
  targetStatus?: TimesheetStatus;
  taskType?: 'TUTORIAL' | 'LECTURE' | 'ORAA' | 'DEMO' | 'MARKING' | 'OTHER';
  qualification?: 'STANDARD' | 'PHD' | 'COORDINATOR';
  repeat?: boolean;
  sessionDate?: string;
  deliveryHours?: number;
}

export interface SeededTimesheet {
  id: number;
  description: string;
  courseId: number;
  weekStartDate: string;
  status?: TimesheetStatus;
}

export type ApprovalTransition =
  | 'SUBMIT_FOR_APPROVAL'
  | 'TUTOR_CONFIRM'
  | 'LECTURER_CONFIRM'
  | 'HR_CONFIRM'
  | 'REJECT'
  | 'REQUEST_MODIFICATION';

const KNOWN_STATUSES: ReadonlyArray<TimesheetStatus> = [
  'DRAFT',
  'PENDING_TUTOR_CONFIRMATION',
  'TUTOR_CONFIRMED',
  'LECTURER_CONFIRMED',
  'FINAL_CONFIRMED',
  'REJECTED',
  'MODIFICATION_REQUESTED'
] as const;

const STATUS_NORMALIZATION_MAP: Record<string, TimesheetStatus> = {
  PENDING_LECTURER_APPROVAL: 'PENDING_TUTOR_CONFIRMATION',
  PENDING_TUTOR_REVIEW: 'PENDING_TUTOR_CONFIRMATION',
  PENDING_HR_REVIEW: 'LECTURER_CONFIRMED',
  HR_APPROVED: 'FINAL_CONFIRMED',
  APPROVED: 'FINAL_CONFIRMED'
};

const ACTION_TARGET_STATUS: Record<ApprovalTransition, TimesheetStatus | null> = {
  SUBMIT_FOR_APPROVAL: 'PENDING_TUTOR_CONFIRMATION',
  TUTOR_CONFIRM: 'TUTOR_CONFIRMED',
  LECTURER_CONFIRM: 'LECTURER_CONFIRMED',
  HR_CONFIRM: 'FINAL_CONFIRMED',
  REJECT: 'REJECTED',
  REQUEST_MODIFICATION: 'MODIFICATION_REQUESTED'
};

const ACTION_ALLOWED_FROM: Record<ApprovalTransition, TimesheetStatus[]> = {
  SUBMIT_FOR_APPROVAL: ['DRAFT', 'MODIFICATION_REQUESTED'],
  TUTOR_CONFIRM: ['PENDING_TUTOR_CONFIRMATION'],
  LECTURER_CONFIRM: ['TUTOR_CONFIRMED'],
  HR_CONFIRM: ['LECTURER_CONFIRMED'],
  REJECT: ['PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED'],
  REQUEST_MODIFICATION: ['PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED']
};

type TransitionStep = {
  action: ApprovalTransition;
  actor: 'tutor' | 'lecturer' | 'admin';
  comment?: string;
};

const STATUS_TRANSITION_PLAN: Record<TimesheetStatus, TransitionStep[]> = {
  DRAFT: [],
  PENDING_TUTOR_CONFIRMATION: [
    { action: 'SUBMIT_FOR_APPROVAL', actor: 'tutor' }
  ],
  TUTOR_CONFIRMED: [
    { action: 'SUBMIT_FOR_APPROVAL', actor: 'tutor' },
    { action: 'TUTOR_CONFIRM', actor: 'tutor' }
  ],
  LECTURER_CONFIRMED: [
    { action: 'SUBMIT_FOR_APPROVAL', actor: 'tutor' },
    { action: 'TUTOR_CONFIRM', actor: 'tutor' },
    { action: 'LECTURER_CONFIRM', actor: 'lecturer' }
  ],
  FINAL_CONFIRMED: [
    { action: 'SUBMIT_FOR_APPROVAL', actor: 'tutor' },
    { action: 'TUTOR_CONFIRM', actor: 'tutor' },
    { action: 'LECTURER_CONFIRM', actor: 'lecturer' },
    { action: 'HR_CONFIRM', actor: 'admin' }
  ],
  REJECTED: [
    { action: 'SUBMIT_FOR_APPROVAL', actor: 'tutor' },
    { action: 'REJECT', actor: 'admin', comment: 'Seeded rejection' }
  ],
  MODIFICATION_REQUESTED: [
    { action: 'SUBMIT_FOR_APPROVAL', actor: 'tutor' },
    { action: 'REQUEST_MODIFICATION', actor: 'lecturer', comment: 'Seeded modification request' }
  ]
};

const backendUrl = E2E_CONFIG.BACKEND.URL;
const approvalsEndpoint = `${backendUrl}${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`;
const timesheetsEndpoint = `${backendUrl}${E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS}`;
const loginEndpoint = `${backendUrl}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`;


const parseNumericEnv = (...values: (string | undefined)[]): number | null => {
  for (const value of values) {
    if (!value) continue;
    const match = value.match(/-?\\d+/);
    if (!match) continue;
    const parsed = Number.parseInt(match[0], 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

const WORKER_WEEK_STRIDE = Math.max(1, parseNumericEnv(process.env.E2E_WORKER_WEEK_STRIDE) ?? 4);
const WORKER_INDEX = parseNumericEnv(process.env.PLAYWRIGHT_WORKER_INDEX, process.env.PLAYWRIGHT_WORKER_ID) ?? 0;
const RUN_SALT = parseNumericEnv(process.env.PLAYWRIGHT_RUN_SALT, process.env.GITHUB_RUN_ID, process.env.CI_JOB_ID, String(process.pid)) ?? process.pid ?? Number(String(Date.now()).slice(-7));
const RUN_WEEK_SHIFT = Math.abs(RUN_SALT % 26);


const toHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeStatus = (value: unknown): TimesheetStatus | null => {
  if (!value) {
    return null;
  }
  const upper = String(value).toUpperCase();
  if (STATUS_NORMALIZATION_MAP[upper]) {
    return STATUS_NORMALIZATION_MAP[upper];
  }
  return KNOWN_STATUSES.find(status => status === upper) ?? null;
};

const getActorToken = (tokens: AuthContext, actor: 'tutor' | 'lecturer' | 'admin'): string => {
  switch (actor) {
    case 'tutor':
      return tokens.tutor.token;
    case 'lecturer':
      return tokens.lecturer.token;
    case 'admin':
    default:
      return tokens.admin.token;
  }
};

const extractStatusField = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const candidate = (payload as Record<string, unknown>);
  return (
    candidate.status ??
    candidate.currentStatus ??
    (candidate.timesheet && extractStatusField(candidate.timesheet)) ??
    (candidate.data && extractStatusField(candidate.data))
  );
};

async function fetchTimesheetStatus(
  request: APIRequestContext,
  token: string,
  timesheetId: number
): Promise<TimesheetStatus | null> {
  const response = await request.get(`${timesheetsEndpoint}/${timesheetId}`, {
    headers: toHeaders(token)
  });

  if (!response.ok()) {
    throw new Error(`Failed to fetch timesheet ${timesheetId} status: ${response.status()} ${await response.text()}`);
  }

  const payload = await response.json().catch(() => null);
  return normalizeStatus(extractStatusField(payload));
}

async function waitForTimesheetStatus(
  request: APIRequestContext,
  tokens: AuthContext,
  timesheetId: number,
  expected: TimesheetStatus,
  timeout = 10000
): Promise<TimesheetStatus> {
  let resolved: TimesheetStatus | null = null;

  await expect(async () => {
    resolved = await fetchTimesheetStatus(request, tokens.admin.token, timesheetId);
    expect(resolved).toBe(expected);
  }).toPass({ timeout });

  if (!resolved) {
    throw new Error(`Unable to resolve status for timesheet ${timesheetId}`);
  }

  return resolved;
}

async function authenticate(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(loginEndpoint, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password }
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${await response.text()}`);
  }

  const body = await response.json();
  if (!body?.token || !body?.user?.id) {
    throw new Error(`Unexpected login response for ${email}`);
  }

  return {
    token: body.token as string,
    userId: body.user.id as number
  };
}

export async function acquireAuthTokens(request: APIRequestContext): Promise<AuthContext> {
  const [admin, lecturer, tutor] = await Promise.all([
    authenticate(request, E2E_CONFIG.USERS.admin.email, E2E_CONFIG.USERS.admin.password),
    authenticate(request, E2E_CONFIG.USERS.lecturer.email, E2E_CONFIG.USERS.lecturer.password),
    authenticate(request, E2E_CONFIG.USERS.tutor.email, E2E_CONFIG.USERS.tutor.password)
  ]);

  return { admin, lecturer, tutor };
}

const usedSeedCombinations = new Set<string>();
let seedSequence = 0;

const mondayReference = new Date(Date.UTC(2010, 0, 4));

const startOfWeek = (date: Date): string => {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = (normalized.getUTCDay() + 6) % 7;
  normalized.setUTCDate(normalized.getUTCDate() - diff);
  return normalized.toISOString().slice(0, 10);
};

const addWeeks = (date: Date, weeks: number) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + weeks * 7);
  return copy;
};

const uniqueDescription = (prefix: string) => `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

async function submitApproval(
  request: APIRequestContext,
  token: string,
  timesheetId: number,
  action: ApprovalTransition,
  comment = 'E2E automation'
) {
  const response = await request.post(approvalsEndpoint, {
    headers: toHeaders(token),
    data: { timesheetId, action, comment }
  });

  if (!response.ok()) {
    throw new Error(`Approval ${action} failed for timesheet ${timesheetId}: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

interface CandidateSeed {
  courseId: number;
  weekStartDate: string;
}

function buildCandidates(options: TimesheetSeedOptions): CandidateSeed[] {
  if (options.weekStartDate) {
    return [{ courseId: options.courseId ?? 1, weekStartDate: options.weekStartDate }];
  }

  const courseIds = options.courseId ? [options.courseId] : [1, 2];
  const baseWeek = startOfWeek(new Date());
  const workerBucket = Math.abs(WORKER_INDEX) % 12;
  const startOffset = workerBucket * WORKER_WEEK_STRIDE + RUN_WEEK_SHIFT + seedSequence;
  const offsets = Array.from({ length: 120 }, (_, index) => startOffset + index);

  return courseIds.flatMap(courseId =>
    offsets.map(offset => ({
      courseId,
      weekStartDate: startOfWeek(addWeeks(baseWeek, -offset))
    }))
  );
}

export async function createTimesheetWithStatus(
  request: APIRequestContext,
  tokens: AuthContext,
  options: TimesheetSeedOptions = {}
): Promise<SeededTimesheet> {
  const description = options.description ?? uniqueDescription('E2E Timesheet');
  const candidates = buildCandidates(options);

  let createResponse: APIResponse | null = null;
  let selectedCourse = candidates[0]?.courseId ?? (options.courseId ?? 1);
  let selectedWeek = candidates[0]?.weekStartDate ?? (options.weekStartDate ?? startOfWeek(mondayReference));
  let lastError: { status: number; body: string } | null = null;

  for (const [index, candidate] of candidates.entries()) {
    const seedKey = `${WORKER_INDEX}-${candidate.courseId}-${candidate.weekStartDate}`;
    if (!options.weekStartDate && usedSeedCombinations.has(seedKey)) {
      continue;
    }

    selectedCourse = candidate.courseId;
    selectedWeek = candidate.weekStartDate;

    const payload = {
      tutorId: tokens.tutor.userId,
      courseId: selectedCourse,
      weekStartDate: selectedWeek,
      hours: options.hours ?? 6,
      hourlyRate: options.hourlyRate ?? 42,
      description,
      taskType: options.taskType ?? 'TUTORIAL',
      qualification: options.qualification ?? 'STANDARD',
      repeat: options.repeat ?? false,
      deliveryHours: options.deliveryHours ?? options.hours ?? 1,
      sessionDate: options.sessionDate ?? selectedWeek
    };

    try {
      createResponse = await request.post(timesheetsEndpoint, {
        headers: toHeaders(tokens.tutor.token),
        data: payload
      });
    } catch (error) {
      lastError = { status: -1, body: String(error) };
      if (!options.weekStartDate) {
        usedSeedCombinations.add(seedKey);
      }
      continue;
    }

    const status = createResponse.status();
    if (status === 201) {
      if (!options.weekStartDate) {
        usedSeedCombinations.add(seedKey);
        seedSequence += index + 1;
      }
      break;
    }

    const errorBody = await createResponse.text().catch(() => '');
    lastError = { status, body: errorBody };

    const duplicate = status === 400 && errorBody.includes('Timesheet already exists');
    const constraintViolation = status === 409 || /constraint|already exists|duplicate/i.test(errorBody);
    const transientServerError = status >= 500;

    if (!options.weekStartDate && (duplicate || constraintViolation || transientServerError)) {
      usedSeedCombinations.add(seedKey);
      continue;
    }

    if (status === 429) {
      await delay(250);
      continue;
    }

    if (index === candidates.length - 1) {
      break;
    }
  }

  if (!createResponse || createResponse.status() !== 201) {
    const message = lastError ? `${lastError.status} ${lastError.body}` : 'unknown error';
    throw new Error(`Failed to create timesheet after exhausting retries (last error: ${message})`);
  }

  const created = await createResponse.json();
  const timesheetId = created?.id ?? created?.timesheet?.id;
  if (!timesheetId) {
    throw new Error('Timesheet creation response missing id');
  }

  const target = (options.targetStatus ?? 'DRAFT') as TimesheetStatus;
  const plan = [...(STATUS_TRANSITION_PLAN[target] ?? [])];

  let currentStatus = (await fetchTimesheetStatus(request, tokens.admin.token, timesheetId)) ?? 'DRAFT';

  for (const step of plan) {
    // Refresh current status to avoid stale state when asynchronous transitions occur
    currentStatus = (await fetchTimesheetStatus(request, tokens.admin.token, timesheetId)) ?? currentStatus;

    const allowedStatuses = ACTION_ALLOWED_FROM[step.action] ?? [];
    const expectedAfterAction = ACTION_TARGET_STATUS[step.action];

    if (allowedStatuses.length && !allowedStatuses.includes(currentStatus)) {
      if (expectedAfterAction && currentStatus === expectedAfterAction) {
        continue;
      }
      throw new Error(`Cannot perform ${step.action} on timesheet ${timesheetId} while in status ${currentStatus}`);
    }

    const actorToken = getActorToken(tokens, step.actor);
    await submitApproval(request, actorToken, timesheetId, step.action, step.comment);

    if (expectedAfterAction) {
      currentStatus = await waitForTimesheetStatus(request, tokens, timesheetId, expectedAfterAction);
    } else {
      currentStatus = (await fetchTimesheetStatus(request, tokens.admin.token, timesheetId)) ?? currentStatus;
    }
  }

  if (currentStatus !== target) {
    currentStatus = await waitForTimesheetStatus(request, tokens, timesheetId, target);
  }

  return {
    id: timesheetId,
    description,
    courseId: selectedCourse,
    weekStartDate: selectedWeek,
    status: currentStatus
  };
}

export async function finalizeTimesheet(
  request: APIRequestContext,
  tokens: AuthContext,
  timesheetId: number
) {
  const shouldIgnore = (error: unknown): boolean => {
    const message = String((error as Error)?.message ?? '').toLowerCase();
    return message.includes('already') || message.includes('cannot final');
  };

  try {
    await submitApproval(request, tokens.lecturer.token, timesheetId, 'LECTURER_CONFIRM', 'Auto-confirm for cleanup');
    await waitForTimesheetStatus(request, tokens, timesheetId, 'LECTURER_CONFIRMED');
  } catch (error) {
    if (!shouldIgnore(error)) {
      throw error;
    }
    await waitForTimesheetStatus(request, tokens, timesheetId, 'LECTURER_CONFIRMED').catch(() => undefined);
  }

  try {
    await submitApproval(request, tokens.admin.token, timesheetId, 'HR_CONFIRM', 'Finalized for cleanup');
    await waitForTimesheetStatus(request, tokens, timesheetId, 'FINAL_CONFIRMED');
  } catch (error) {
    if (!shouldIgnore(error)) {
      throw error;
    }
    await waitForTimesheetStatus(request, tokens, timesheetId, 'FINAL_CONFIRMED').catch(() => undefined);
  }
}

export async function rejectTimesheet(
  request: APIRequestContext,
  tokens: AuthContext,
  timesheetId: number,
  comment = 'Rejected via automation'
) {
  await submitApproval(request, tokens.admin.token, timesheetId, 'REJECT', comment);
  await waitForTimesheetStatus(request, tokens, timesheetId, 'REJECTED');
}

export async function transitionTimesheet(
  request: APIRequestContext,
  tokens: AuthContext,
  timesheetId: number,
  action: ApprovalTransition,
  comment = 'E2E transition',
  actor?: 'tutor' | 'lecturer' | 'admin'
) {
  const resolvedActor = actor ?? (() => {
    switch (action) {
      case 'SUBMIT_FOR_APPROVAL':
        return 'tutor';
      case 'TUTOR_CONFIRM':
        return 'tutor';
      case 'LECTURER_CONFIRM':
        return 'lecturer';
      case 'REQUEST_MODIFICATION':
        return 'lecturer';
      case 'REJECT':
      case 'HR_CONFIRM':
      default:
        return 'admin';
    }
  })();

  const roleToken = getActorToken(tokens, resolvedActor);

  await submitApproval(request, roleToken, timesheetId, action, comment);

  const expectedStatus = ACTION_TARGET_STATUS[action];
  if (expectedStatus) {
    await waitForTimesheetStatus(request, tokens, timesheetId, expectedStatus);
  }
}





