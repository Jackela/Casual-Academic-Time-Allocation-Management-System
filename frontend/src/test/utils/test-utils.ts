import { render } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { Fragment, createElement, useEffect, type ReactNode, type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type {
  Timesheet,
  TimesheetPage,
  PageInfo,
  DashboardSummary,
  TimesheetStatus,
} from '../../types/api';
import type { User } from '../../types/auth';
import { authManager } from '../../services/auth-manager';

export function createMockUser(overrides: Partial<User> = {}): User {
  const base: User = {
    id: overrides.id ?? Math.floor(Math.random() * 1000) + 1,
    email: overrides.email ?? 'user@example.com',
    name: overrides.name ?? 'Test User',
    role: overrides.role ?? 'TUTOR',
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
    displayName: overrides.displayName ?? undefined,
  };
  return { ...base, ...overrides };
}

export function createMockAuthUser(overrides: Partial<User> = {}): User {
  const defaultFirstName = overrides.firstName ?? overrides.name?.split(' ')[0] ?? 'Test';
  const defaultLastName = overrides.lastName ?? overrides.name?.split(' ')[1] ?? 'User';
  const resolvedName = overrides.name ?? `${defaultFirstName} ${defaultLastName}`.trim();

  return createMockUser({
    firstName: defaultFirstName,
    lastName: defaultLastName,
    name: resolvedName,
    displayName: overrides.displayName ?? resolvedName,
    ...overrides,
  });
}

interface MockAuthProviderValue {
  user?: User | null;
  token?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  isAuthenticated?: boolean;
}

interface MockAuthProviderProps {
  value?: MockAuthProviderValue;
  children: ReactNode;
}

export const MockAuthProvider = ({ value, children }: MockAuthProviderProps) => {
  useEffect(() => {
    const previousState = {
      user: authManager.getUser(),
      token: authManager.getToken(),
      refreshToken: authManager.getRefreshToken(),
      expiresAt: authManager.getTokenExpiry(),
    };

    if (value?.user && value.token && value.isAuthenticated !== false) {
      authManager.setAuth({
        token: value.token,
        user: value.user,
        refreshToken: value.refreshToken ?? null,
        expiresAt: value.expiresAt ?? null,
      });
    } else if (value?.isAuthenticated === false) {
      authManager.clearAuth();
    }

    return () => {
      if (previousState.user && previousState.token) {
        authManager.setAuth({
          token: previousState.token,
          user: previousState.user,
          refreshToken: previousState.refreshToken ?? null,
          expiresAt: previousState.expiresAt ?? null,
        });
      } else {
        authManager.clearAuth();
      }
    };
  }, [value]);

  return createElement(Fragment, null, children);
};

const defaultTimesheetStatus: TimesheetStatus = 'DRAFT';

export function createMockTimesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  const id = overrides.id ?? Math.floor(Math.random() * 10_000) + 1;
  const base: Timesheet = {
    id,
    tutorId: overrides.tutorId ?? 101,
    courseId: overrides.courseId ?? 501,
    weekStartDate: overrides.weekStartDate ?? '2025-01-27',
    hours: overrides.hours ?? 5,
    hourlyRate: overrides.hourlyRate ?? 45,
    description: overrides.description ?? 'Mock tutorial delivery',
    status: overrides.status ?? defaultTimesheetStatus,
    createdAt: overrides.createdAt ?? '2025-01-20T10:00:00Z',
    updatedAt: overrides.updatedAt ?? '2025-01-20T10:00:00Z',
    tutorName: overrides.tutorName ?? 'Tutor Example',
    courseName: overrides.courseName ?? 'COMP1001',
    courseCode: overrides.courseCode ?? 'COMP1001',
    submitterName: overrides.submitterName,
    lecturerName: overrides.lecturerName,
  };
  return { ...base, ...overrides };
}

export function createMockTimesheetPage(
  count = 1,
  pageOverrides: Partial<PageInfo> = {},
  timesheetOverrides: Partial<Timesheet> = {},
): TimesheetPage {
  const timesheets = Array.from({ length: count }, (_, index) =>
    createMockTimesheet({ id: (timesheetOverrides.id ?? index + 1), ...timesheetOverrides }),
  );

  const pageInfo: PageInfo = {
    currentPage: pageOverrides.currentPage ?? 0,
    pageSize: pageOverrides.pageSize ?? count,
    totalElements: pageOverrides.totalElements ?? timesheets.length,
    totalPages: pageOverrides.totalPages ?? 1,
    first: pageOverrides.first ?? true,
    last: pageOverrides.last ?? true,
    numberOfElements: pageOverrides.numberOfElements ?? timesheets.length,
    empty: pageOverrides.empty ?? timesheets.length === 0,
  };

  return {
    success: true,
    timesheets,
    pageInfo,
  };
}

export function createMockDashboardSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    totalTimesheets: overrides.totalTimesheets ?? 0,
    pendingApprovals: overrides.pendingApprovals ?? 0,
    pendingApproval: overrides.pendingApproval ?? 0,
    pendingConfirmations: overrides.pendingConfirmations ?? 0,
    approvedTimesheets: overrides.approvedTimesheets ?? 0,
    rejectedTimesheets: overrides.rejectedTimesheets ?? 0,
    totalHours: overrides.totalHours ?? 0,
    totalPayroll: overrides.totalPayroll ?? 0,
    totalPay: overrides.totalPay ?? 0,
    thisWeekHours: overrides.thisWeekHours ?? 0,
    thisWeekPay: overrides.thisWeekPay ?? 0,
    statusBreakdown: overrides.statusBreakdown ?? {},
    recentActivity: overrides.recentActivity ?? [],
    upcomingDeadlines: overrides.upcomingDeadlines ?? [],
    deadlines: overrides.deadlines ?? [],
    systemMetrics: overrides.systemMetrics ?? undefined,
    lecturerCount: overrides.lecturerCount ?? undefined,
    tutorCount: overrides.tutorCount ?? undefined,
    courseCount: overrides.courseCount ?? undefined,
    activeUsers: overrides.activeUsers ?? undefined,
    systemHealth: overrides.systemHealth ?? undefined,
    supportResources: overrides.supportResources ?? [],
    nextPaymentDate: overrides.nextPaymentDate ?? null,
  };
}

export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createMockTimesheets(
  count = 1,
  overrides: Partial<Timesheet> = {},
): Timesheet[] {
  return Array.from({ length: count }, (_, index) =>
    createMockTimesheet({
      ...overrides,
      id: overrides.id ?? index + 1,
    }),
  );
}

export function mockIntersectionObserver() {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  const mock = vi.fn(() => ({
    observe,
    unobserve,
    disconnect,
    takeRecords: vi.fn(() => []),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: mock,
  });

  return { observe, unobserve, disconnect, mock };
}

export function testPerformanceWithManyItems<T>(
  renderFactory: (args: { items: T[] }) => ReactElement,
  itemFactory: (index: number) => T,
  itemCount = 500,
  maxDurationMs = 1200,
) {
  // Warm up React/rendering path to reduce first-render variance
  const warmupSize = Math.max(10, Math.min(50, Math.floor(itemCount / 10)));
  const warmupItems = Array.from({ length: warmupSize }, (_, index) => itemFactory(index));
  const warmup = render(renderFactory({ items: warmupItems }));
  warmup.unmount();

  const items = Array.from({ length: itemCount }, (_, index) => itemFactory(index));
  const startTime = performance.now();
  const result = render(renderFactory({ items }));
  const duration = performance.now() - startTime;

  const ciFactor = (() => {
    const fromEnv = Number(process.env.PERF_FACTOR);
    if (!Number.isNaN(fromEnv) && fromEnv > 0) return fromEnv;
    return process.env.CI === 'true' ? 1.25 : 1; // allow modest slack in CI/full runs
  })();

  expect(duration).toBeLessThan(maxDurationMs * ciFactor);
  result.unmount();
}

type MockApiResponseOverrides = {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  config?: Record<string, unknown>;
};

export function createMockApiResponse<T>(
  data: T,
  overrides: MockApiResponseOverrides = {},
) {
  return {
    data,
    success: true as const,
    timestamp: new Date().toISOString(),
    status: overrides.status ?? 200,
    statusText: overrides.statusText ?? 'OK',
    headers: overrides.headers ?? {},
    config: overrides.config ?? {},
  };
}

export function renderWithRouter(ui: ReactElement, options: { route?: string } = {}) {
  const route = options.route ?? '/';
  try {
    // Keep history in sync for components reading from location
    window.history.pushState({}, 'Test Page', route);
  } catch {}
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter as unknown as any, { initialEntries: [route] }, children as any);
  return render(ui, { wrapper: Wrapper as unknown as any });
}
