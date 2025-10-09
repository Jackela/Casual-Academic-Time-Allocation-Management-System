import { test as base, Page } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/utils/storage-keys';
import { E2E_CONFIG } from '../config/e2e.config';

// Test credentials
export const testCredentials = {
  lecturer: {
    email: process.env.E2E_LECTURER_EMAIL || 'lecturer@example.com',
    password: process.env.E2E_LECTURER_PASSWORD || 'Lecturer123!',
    expectedRole: 'LECTURER',
    expectedName: 'Dr. Jane Smith'
  },
  tutor: {
    email: process.env.E2E_TUTOR_EMAIL || 'tutor@example.com',
    password: process.env.E2E_TUTOR_PASSWORD || 'Tutor123!',
    expectedRole: 'TUTOR',
    expectedName: 'John Doe'
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin123!',
    expectedRole: 'ADMIN',
    expectedName: 'Admin User'
  }
};

// Mock API responses
const buildUser = (role: 'lecturer' | 'tutor' | 'admin') => {
  const creds = testCredentials[role];
  return {
    id: role === 'lecturer' ? 101 : role === 'tutor' ? 201 : 1,
    email: creds.email,
    name: creds.expectedName,
    role: creds.expectedRole,
  };
};

export type MockUserRole = keyof typeof testCredentials;

type MockAuthUser = ReturnType<typeof buildUser>;

const base64Encode = (value: string): string => {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64');
  }
  throw new Error('Base64 encoding is not supported in this environment');
};

const createMockToken = (email: string, role: string): string => {
  const header = base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Encode(
    JSON.stringify({
      sub: email,
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.signature`;
};

export interface MockAuthResponse {
  success: true;
  token: string;
  user: MockAuthUser;
  errorMessage: null;
  refreshToken?: string | null;
  expiresAt?: number;
}

export interface MockAuthSession {
  token: string;
  user: MockAuthUser;
  expiresAt: number;
  refreshToken?: string | null;
}

export interface MockAuthBundle {
  role: MockUserRole;
  response: MockAuthResponse;
  session: MockAuthSession;
}

export const createMockAuthBundle = (role: MockUserRole): MockAuthBundle => {
  const creds = testCredentials[role];
  const user = buildUser(role);
  const token = createMockToken(creds.email, creds.expectedRole);
  const expiresAt = Date.now() + 60 * 60 * 1000;

  return {
    role,
    response: {
      success: true,
      token,
      user,
      errorMessage: null,
      refreshToken: `${token}-refresh`,
      expiresAt,
    },
    session: {
      token,
      user,
      expiresAt,
      refreshToken: `${token}-refresh`,
    },
  };
};

const defaultLecturerAuth = createMockAuthBundle('lecturer');
const defaultTutorAuth = createMockAuthBundle('tutor');
const defaultAdminAuth = createMockAuthBundle('admin');

export const defaultMockAuthBundles = {
  lecturer: defaultLecturerAuth,
  tutor: defaultTutorAuth,
  admin: defaultAdminAuth,
} as const;

export const mockResponses = {
  auth: {
    success: defaultLecturerAuth.response,
    lecturer: defaultLecturerAuth.response,
    tutor: defaultTutorAuth.response,
    admin: defaultAdminAuth.response,
    error: {
      success: false,
      token: null,
      user: null,
      errorMessage: 'Invalid credentials'
    }
  },
  timesheets: {
    withData: {
      content: [
        {
          id: 1,
          tutorId: 2,
          courseId: 1,
          weekStartDate: '2025-01-27',
          hours: 10,
          hourlyRate: 45.00,
          description: 'Tutorial sessions and marking for COMP1001',
          status: 'PENDING',
          tutorName: 'John Doe',
          courseName: 'Introduction to Programming',
          courseCode: 'COMP1001'
        }
      ],
      page: {
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false
      }
    },
    empty: {
      content: [],
      page: {
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 20,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true
      }
    }
  }
};

type AuthSuccessResponse = typeof mockResponses.auth.success;

// ---------------------------------------------------------------------------
// Lightweight mock backend for admin/lecturer flows (used when requests lack auth)
// ---------------------------------------------------------------------------
interface MockTimesheet {
  id: number;
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  hours: number;
  hourlyRate: number;
  description: string;
  status: string;
  tutorName: string;
  courseName: string;
  courseCode: string;
  createdAt: string;
  updatedAt: string;
}

type ApprovalTransition =
  | 'SUBMIT_FOR_APPROVAL'
  | 'TUTOR_CONFIRM'
  | 'LECTURER_CONFIRM'
  | 'HR_CONFIRM'
  | 'REJECT'
  | 'REQUEST_MODIFICATION';

const INITIAL_MOCK_TIMESHEETS: MockTimesheet[] = [
  {
    id: 91001,
    tutorId: 201,
    courseId: 301,
    weekStartDate: '2025-02-03',
    hours: 6,
    hourlyRate: 45,
    description: 'COMP1001 - Tutorial facilitation & grading',
    status: 'LECTURER_CONFIRMED',
    tutorName: 'Amelia Brown',
    courseName: 'Introduction to Computing',
    courseCode: 'COMP1001',
    createdAt: '2025-02-03T09:00:00Z',
    updatedAt: '2025-02-04T15:30:00Z',
  },
  {
    id: 91002,
    tutorId: 202,
    courseId: 302,
    weekStartDate: '2025-02-10',
    hours: 8,
    hourlyRate: 48,
    description: 'COMP2001 - Lab supervision & consultation',
    status: 'LECTURER_CONFIRMED',
    tutorName: 'Noah Patel',
    courseName: 'Data Structures',
    courseCode: 'COMP2001',
    createdAt: '2025-02-10T10:00:00Z',
    updatedAt: '2025-02-12T11:15:00Z',
  },
  {
    id: 91003,
    tutorId: 203,
    courseId: 303,
    weekStartDate: '2025-02-17',
    hours: 5,
    hourlyRate: 40,
    description: 'COMP3002 - Tutorial design review',
    status: 'TUTOR_CONFIRMED',
    tutorName: 'Lara Chen',
    courseName: 'Algorithms & Analysis',
    courseCode: 'COMP3002',
    createdAt: '2025-02-17T08:45:00Z',
    updatedAt: '2025-02-18T14:05:00Z',
  },
  {
    id: 91004,
    tutorId: 204,
    courseId: 304,
    weekStartDate: '2025-02-17',
    hours: 7,
    hourlyRate: 46,
    description: 'COMP2100 - Student consultation sessions',
    status: 'MODIFICATION_REQUESTED',
    tutorName: 'Oliver Smith',
    courseName: 'Software Construction',
    courseCode: 'COMP2100',
    createdAt: '2025-02-17T09:15:00Z',
    updatedAt: '2025-02-18T16:45:00Z',
  },
];

let mockTimesheets: MockTimesheet[] = [...INITIAL_MOCK_TIMESHEETS];

const cloneTimesheet = (timesheet: MockTimesheet): MockTimesheet => ({ ...timesheet });

const resetMockTimesheets = () => {
  mockTimesheets = INITIAL_MOCK_TIMESHEETS.map(cloneTimesheet);
};

const normalizeApprovalAction = (action: string): ApprovalTransition => {
  const map: Record<string, ApprovalTransition> = {
    SUBMIT_DRAFT: 'SUBMIT_FOR_APPROVAL',
    SUBMIT_FOR_APPROVAL: 'SUBMIT_FOR_APPROVAL',
    TUTOR_CONFIRM: 'TUTOR_CONFIRM',
    LECTURER_CONFIRM: 'LECTURER_CONFIRM',
    HR_CONFIRM: 'HR_CONFIRM',
    FINAL_APPROVAL: 'HR_CONFIRM',
    FINAL_CONFIRMED: 'HR_CONFIRM',
    APPROVE: 'HR_CONFIRM',
    REJECT: 'REJECT',
    REJECTED: 'REJECT',
    REQUEST_MODIFICATION: 'REQUEST_MODIFICATION',
  };
  return map[action] ?? 'SUBMIT_FOR_APPROVAL';
};

const applyApprovalToMockStore = (action: string, timesheetId: number) => {
  const normalized = normalizeApprovalAction(action);
  const target = mockTimesheets.find((entry) => entry.id === timesheetId);
  if (!target) {
    return { success: false, newStatus: undefined as string | undefined };
  }

  switch (normalized) {
    case 'SUBMIT_FOR_APPROVAL':
      target.status = 'PENDING_TUTOR_CONFIRMATION';
      break;
    case 'TUTOR_CONFIRM':
      target.status = 'TUTOR_CONFIRMED';
      break;
    case 'LECTURER_CONFIRM':
      target.status = 'LECTURER_CONFIRMED';
      break;
    case 'HR_CONFIRM':
      target.status = 'FINAL_CONFIRMED';
      break;
    case 'REQUEST_MODIFICATION':
      target.status = 'MODIFICATION_REQUESTED';
      break;
    case 'REJECT':
      target.status = 'REJECTED';
      break;
    default:
      break;
  }

  target.updatedAt = new Date().toISOString();
  return { success: true, newStatus: target.status };
};

const toTimesheetPagePayload = (records: MockTimesheet[]) => {
  const timesheets = records.map(cloneTimesheet);
  const pageInfo = {
    currentPage: 0,
    pageSize: timesheets.length,
    totalElements: timesheets.length,
    totalPages: 1,
    first: true,
    last: true,
    numberOfElements: timesheets.length,
    empty: timesheets.length === 0,
  };

  return {
    success: true,
    timesheets,
    pageInfo,
  };
};

const getMockDashboardSummary = () => {
  const totalTimesheets = mockTimesheets.length;
  const totalHours = mockTimesheets.reduce((sum, entry) => sum + entry.hours, 0);
  const totalPayroll = mockTimesheets.reduce((sum, entry) => sum + entry.hours * entry.hourlyRate, 0);
  const statusBreakdown = mockTimesheets.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.status] = (accumulator[entry.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const pendingApprovals = statusBreakdown['LECTURER_CONFIRMED'] ?? 0;

  return {
    totalTimesheets,
    pendingApprovals,
    totalHours,
    totalPayroll,
    totalPay: totalPayroll,
    thisWeekHours: Math.round(totalHours * 0.4),
    thisWeekPay: Math.round(totalPayroll * 0.45),
    statusBreakdown,
    budgetUsage: {
      totalBudget: 12000,
      usedBudget: Number((totalPayroll * 0.9).toFixed(2)),
      remainingBudget: Number((12000 - totalPayroll * 0.9).toFixed(2)),
      utilizationPercentage: Number(((totalPayroll * 0.9) / 12000 * 100).toFixed(1)),
    },
    pendingItems: mockTimesheets
      .filter((entry) => entry.status === 'LECTURER_CONFIRMED')
      .slice(0, 3)
      .map((entry) => ({
        id: entry.id,
        type: 'TIMESHEET_APPROVAL',
        title: `${entry.courseCode} timesheet pending final approval`,
        description: entry.description,
        priority: 'HIGH',
        dueDate: entry.weekStartDate,
        timesheetId: entry.id,
      })),
    workloadAnalysis: {
      currentWeekHours: Number((totalHours / 2).toFixed(1)),
      previousWeekHours: Number((totalHours / 2.8).toFixed(1)),
      averageWeeklyHours: Number((totalHours / 3).toFixed(1)),
      peakWeekHours: Number((totalHours / 1.6).toFixed(1)),
      totalTutors: 18,
      activeTutors: 12,
    },
  };
};

const registerMockBackendRoutes = async (page: Page) => {
  await page.route('**/api/timesheets/pending-final-approval**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 220));
    const actionableStatuses = ['LECTURER_CONFIRMED', 'TUTOR_CONFIRMED', 'MODIFICATION_REQUESTED'];
    const filtered = mockTimesheets.filter((entry) => actionableStatuses.includes(entry.status));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(toTimesheetPagePayload(filtered)),
    });
  });

  await page.route('**/api/timesheets?**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(toTimesheetPagePayload(mockTimesheets)),
    });
  });

  await page.route('**/api/dashboard/summary**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 180));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getMockDashboardSummary()),
    });
  });

  await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    let payload: { action?: string; timesheetId?: number } = {};
    try {
      payload = JSON.parse(route.request().postData() ?? '{}');
    } catch {
      payload = {};
    }

    const timesheetId = Number(payload.timesheetId);
    const action = typeof payload.action === 'string' ? payload.action : 'SUBMIT_FOR_APPROVAL';
    const result = applyApprovalToMockStore(action, timesheetId);

    await new Promise((resolve) => setTimeout(resolve, 250));

    if (!result.success) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Timesheet not found' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Approval processed', newStatus: result.newStatus }),
    });
  });
};


type TestFixtures = {
  mockedPage: Page;
};

export const test = base.extend<TestFixtures>({
  // Page with mocked API responses - enhanced with realistic delays
  mockedPage: async ({ page }, use) => {
    // Mock authentication endpoints with realistic delays
    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`, async (route, request) => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Realistic API delay
      let response: AuthSuccessResponse = { ...mockResponses.auth.success };
      const postData = JSON.parse(await request.postData() || '{}');
      
      // Return different user data based on email
      if (postData.email === 'tutor@example.com') {
        response = {
          success: true,
          token: 'tutor-mock-token',
          user: buildUser('tutor'),
          errorMessage: null
        };
      } else if (postData.email === 'admin@example.com') {
        response = {
          success: true,
          token: 'admin-mock-token',
          user: buildUser('admin'),
          errorMessage: null
        };
      } else if (postData.email === 'lecturer@example.com') {
        response = {
          success: true,
          token: 'lecturer-mock-token',
          user: buildUser('lecturer'),
          errorMessage: null
        };
      }
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Mock timesheet endpoints with realistic delays
    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS_PENDING}*`, async route => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Realistic API delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timesheets: mockResponses.timesheets.withData.content,
          pageInfo: {
            currentPage: mockResponses.timesheets.withData.page.number,
            pageSize: mockResponses.timesheets.withData.page.size,
            totalElements: mockResponses.timesheets.withData.page.totalElements,
            totalPages: mockResponses.timesheets.withData.page.totalPages,
            first: mockResponses.timesheets.withData.page.first,
            last: mockResponses.timesheets.withData.page.last,
            numberOfElements: mockResponses.timesheets.withData.page.numberOfElements,
            empty: mockResponses.timesheets.withData.page.empty
          }
        })
      });
    });

    // Mock all timesheets endpoint for admin (GET /api/timesheets)
    await page.route('**/api/timesheets?**', async route => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Realistic API delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          timesheets: [
            {
              id: 1,
              tutorId: 2,
              courseId: 1,
              weekStartDate: '2025-01-27',
              hours: 10,
              hourlyRate: 45.00,
              description: 'Tutorial sessions and marking for COMP1001',
              status: 'PENDING',
              createdAt: '2025-01-27T09:00:00Z',
              updatedAt: '2025-01-27T09:00:00Z',
              tutorName: 'John Doe',
              courseName: 'Introduction to Programming',
              courseCode: 'COMP1001'
            },
            {
              id: 2,
              tutorId: 3,
              courseId: 2,
              weekStartDate: '2025-01-27',
              hours: 8,
              hourlyRate: 42.00,
              description: 'Lab assistance and student support',
              status: 'FINAL_CONFIRMED',
              createdAt: '2025-01-26T14:30:00Z',
              updatedAt: '2025-01-27T11:15:00Z',
              tutorName: 'Jane Smith',
              courseName: 'Data Structures',
              courseCode: 'COMP2001'
            }
          ],
          pageInfo: {
            currentPage: 0,
            pageSize: 20,
            totalElements: 2,
            totalPages: 1,
            first: true,
            last: true,
            numberOfElements: 2,
            empty: false
          }
        })
      });
    });

    // Mock approval endpoints
    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.APPROVALS}`, async route => {
      await new Promise(resolve => setTimeout(resolve, 400)); // Realistic API delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Approval processed' })
      });
    });

    // Mock dashboard summary endpoint for admin
    await page.route('**/api/dashboard/summary**', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 250)); // Realistic API delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalTimesheets: 15,
          pendingApprovals: 3,
          totalHours: 120.5,
          totalPay: 5422.50,
          budgetUsage: {
            totalBudget: 10000.00,
            usedBudget: 5422.50,
            remainingBudget: 4577.50,
            utilizationPercentage: 54.2
          },
          recentActivities: [
            {
              id: 1,
              type: 'APPROVAL',
              description: 'Timesheet approved for COMP1001',
              timestamp: '2025-08-05T10:30:00Z',
              timesheetId: 1,
              userId: 2,
              userName: 'John Doe'
            }
          ],
          pendingItems: [
            {
              id: 1,
              type: 'TIMESHEET_APPROVAL',
              title: 'Timesheet Pending Review',
              description: 'COMP1001 - Week of Jan 27, 2025',
              priority: 'HIGH',
              dueDate: '2025-08-07T23:59:59Z',
              timesheetId: 1
            }
          ],
          workloadAnalysis: {
            currentWeekHours: 45.0,
            previousWeekHours: 38.5,
            averageWeeklyHours: 42.3,
            peakWeekHours: 55.0,
            totalTutors: 12,
            activeTutors: 8
          }
        })
      });
    });

    // Setup mock auth state (idempotent): only set if not present
    await page.addInitScript((session, storageKeys) => {
      try {
        const shouldSkip = (() => {
          try {
            if ((window as unknown as { __E2E_DISABLE_AUTO_AUTH?: boolean }).__E2E_DISABLE_AUTO_AUTH) {
              return true;
            }
            const search = window.location?.search ?? '';
            return typeof search === 'string' && search.includes('disableAutoAuth=1');
          } catch {
            return false;
          }
        })();
        if (shouldSkip) {
          return;
        }

        const keys = {
          TOKEN: storageKeys?.TOKEN ?? 'token',
          USER: storageKeys?.USER ?? 'user',
          REFRESH_TOKEN: storageKeys?.REFRESH_TOKEN ?? 'refresh_token',
          TOKEN_EXPIRY: storageKeys?.TOKEN_EXPIRY ?? 'token_expires_at',
        };
        const hasToken = !!localStorage.getItem(keys.TOKEN);
        const hasUser = !!localStorage.getItem(keys.USER);
        if (!hasToken || !hasUser) {
          localStorage.setItem(keys.TOKEN, session.token);
          localStorage.setItem(keys.USER, JSON.stringify(session.user));
          localStorage.setItem(keys.TOKEN_EXPIRY, String(session.expiresAt));
          localStorage.setItem(keys.REFRESH_TOKEN, session.refreshToken ?? 'mock-refresh-token');
        }
      } catch {
        // Ignore storage errors during fixture setup
      }
    }, defaultLecturerAuth.session, STORAGE_KEYS);

    await use(page);
  }
});

// Global test hooks for all tests using this extended fixture
test.beforeEach(async ({ page }, testInfo) => {
  resetMockTimesheets();
  await registerMockBackendRoutes(page);

  // Apply animation disabling only for mobile project to avoid affecting desktop projects
  if (testInfo.project.name === 'mobile-tests') {
    try {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    } catch {
      // Ignore media emulation errors on unsupported browsers
    }
    try {
      await page.addStyleTag({ content: '*{transition: none !important; animation: none !important;}' });
    } catch {
      // Ignore routing cleanup errors
    }
  }
});

export { expect } from '@playwright/test';
