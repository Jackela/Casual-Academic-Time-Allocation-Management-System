import { APIRequestContext, APIResponse } from '@playwright/test';
import { E2E_CONFIG } from '../config/e2e.config';

export interface AuthContext {
  admin: { token: string; userId: number };
  lecturer: { token: string; userId: number };
  tutor: { token: string; userId: number };
}

export interface TimesheetSeedOptions {
  description?: string;
  hours?: number;
  hourlyRate?: number;
  courseId?: number;
  weekStartDate?: string;
  targetStatus?: 'DRAFT' | 'PENDING_TUTOR_CONFIRMATION' | 'TUTOR_CONFIRMED' | 'LECTURER_CONFIRMED' | 'FINAL_CONFIRMED';
}

export interface SeededTimesheet {
  id: number;
  description: string;
  courseId: number;
  weekStartDate: string;
}

export type ApprovalTransition =
  | 'SUBMIT_FOR_APPROVAL'
  | 'TUTOR_CONFIRM'
  | 'LECTURER_CONFIRM'
  | 'HR_CONFIRM'
  | 'REJECT'
  | 'REQUEST_MODIFICATION';

const backendUrl = E2E_CONFIG.BACKEND.URL;
const approvalsEndpoint = `${backendUrl}${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`;
const timesheetsEndpoint = `${backendUrl}${E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS}`;
const loginEndpoint = `${backendUrl}${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`;

const toHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  const courseIds = options.courseId ? [options.courseId] : [1, 2, 3];
  const offsets = Array.from({ length: 200 }, (_, index) => -index - seedSequence - 12);

  return courseIds.flatMap(courseId =>
    offsets.map(offset => ({
      courseId,
      weekStartDate: startOfWeek(addWeeks(mondayReference, offset))
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
    const seedKey = `${candidate.courseId}-${candidate.weekStartDate}`;
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
      description
    };

    try {
      createResponse = await request.post(timesheetsEndpoint, {
        headers: toHeaders(tokens.lecturer.token),
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

  const target = options.targetStatus ?? 'DRAFT';
  const transitions: Array<{ action: ApprovalTransition; actor: 'lecturer' | 'tutor' | 'admin' }> = [];

  if (target === 'PENDING_TUTOR_CONFIRMATION' || target === 'TUTOR_CONFIRMED' || target === 'LECTURER_CONFIRMED' || target === 'FINAL_CONFIRMED') {
    transitions.push({ action: 'SUBMIT_FOR_APPROVAL', actor: 'lecturer' });
  }
  if (target === 'TUTOR_CONFIRMED' || target === 'LECTURER_CONFIRMED' || target === 'FINAL_CONFIRMED') {
    transitions.push({ action: 'TUTOR_CONFIRM', actor: 'tutor' });
  }
  if (target === 'LECTURER_CONFIRMED' || target === 'FINAL_CONFIRMED') {
    transitions.push({ action: 'LECTURER_CONFIRM', actor: 'lecturer' });
  }
  if (target === 'FINAL_CONFIRMED') {
    transitions.push({ action: 'HR_CONFIRM', actor: 'admin' });
  }

  for (const transition of transitions) {
    const actorToken =
      transition.actor === 'lecturer'
        ? tokens.lecturer.token
        : transition.actor === 'tutor'
          ? tokens.tutor.token
          : tokens.admin.token;

    await submitApproval(request, actorToken, timesheetId, transition.action);
  }

  return {
    id: timesheetId,
    description,
    courseId: selectedCourse,
    weekStartDate: selectedWeek
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
  } catch (error) {
    if (!shouldIgnore(error)) {
      throw error;
    }
  }

  try {
    await submitApproval(request, tokens.admin.token, timesheetId, 'HR_CONFIRM', 'Finalized for cleanup');
  } catch (error) {
    if (!shouldIgnore(error)) {
      throw error;
    }
  }
}

export async function rejectTimesheet(
  request: APIRequestContext,
  tokens: AuthContext,
  timesheetId: number,
  comment = 'Rejected via automation'
) {
  await submitApproval(request, tokens.admin.token, timesheetId, 'REJECT', comment);
}

export async function transitionTimesheet(
  request: APIRequestContext,
  tokens: AuthContext,
  timesheetId: number,
  action: ApprovalTransition,
  comment = 'E2E transition',
  actor?: 'tutor' | 'lecturer' | 'admin'
) {
  const resolvedActor = actor ?? (
    action === 'SUBMIT_FOR_APPROVAL'
      ? 'lecturer'
      : action === 'TUTOR_CONFIRM' || action === 'REQUEST_MODIFICATION'
        ? 'tutor'
        : action === 'LECTURER_CONFIRM'
          ? 'lecturer'
          : 'admin'
  );

  const roleToken =
    resolvedActor === 'lecturer'
      ? tokens.lecturer.token
      : resolvedActor === 'tutor'
        ? tokens.tutor.token
        : tokens.admin.token;

  await submitApproval(request, roleToken, timesheetId, action, comment);
}
