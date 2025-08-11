import { test as base, expect, Page, APIRequestContext } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/utils/storage-keys';
import { E2E_CONFIG, API_ENDPOINTS } from '../config/e2e.config';

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

export const mockResponses = {
  auth: {
    success: {
      success: true,
      token: (() => {
        // Generate a minimal valid-looking JWT with near-future exp to avoid isTokenExpired()
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({ sub: 'lecturer@example.com', role: 'LECTURER', exp: Math.floor(Date.now()/1000) + 3600 }));
        return `${header}.${payload}.signature`;
      })(),
      user: buildUser('lecturer'),
      errorMessage: null
    },
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

// Authentication API client
export class AuthAPI {
  constructor(private request: APIRequestContext) {}

  async login(email: string, password: string) {
    const response = await this.request.post(API_ENDPOINTS.AUTH_LOGIN, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()}`);
    }

    return await response.json();
  }

  async health() {
    const response = await this.request.get(API_ENDPOINTS.HEALTH);
    return { status: response.status(), data: await response.json() };
  }
}

// Timesheet API client
export class TimesheetAPI {
  constructor(private request: APIRequestContext, private token: string) {}

  async getPendingApprovals(page = 0, size = 20) {
    const response = await this.request.get(
      `${API_ENDPOINTS.TIMESHEETS_PENDING}?page=${page}&size=${size}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to get timesheets: ${response.status()}`);
    }

    return await response.json();
  }
}

// Test fixtures with unified authentication
type TestFixtures = {
  authAPI: AuthAPI;
  timesheetAPI: TimesheetAPI;
  tutorTimesheetAPI: TimesheetAPI;
  authenticatedPage: Page;
  tutorAuthenticatedPage: Page;
  mockedPage: Page;
};

export const test = base.extend<TestFixtures>({
  // API client for authentication
  authAPI: async ({ request }, use) => {
    await use(new AuthAPI(request));
  },

  // API client for timesheets with authentication (admin by default for pending-approval access)
  timesheetAPI: async ({ request }, use) => {
    const authAPI = new AuthAPI(request);
    const auth = await authAPI.login(testCredentials.admin.email, testCredentials.admin.password);
    await use(new TimesheetAPI(request, auth.token));
  },

  // Optional: lecturer-authenticated timesheet API (for tests needing lecturer scope)
  lecturerTimesheetAPI: async ({ request }, use) => {
    const authAPI = new AuthAPI(request);
    const auth = await authAPI.login(testCredentials.lecturer.email, testCredentials.lecturer.password);
    await use(new TimesheetAPI(request, auth.token));
  },

  // API client for tutor timesheet operations
  tutorTimesheetAPI: async ({ request }, use) => {
    const authAPI = new AuthAPI(request);
    const auth = await authAPI.login(testCredentials.tutor.email, testCredentials.tutor.password);
    await use(new TimesheetAPI(request, auth.token));
  },

  // Page with real authentication
  authenticatedPage: async ({ page, authAPI }, use) => {
    try {
      const auth = await authAPI.login(testCredentials.lecturer.email, testCredentials.lecturer.password);
      
      await page.addInitScript((authData, storageKeys) => {
        localStorage.setItem(storageKeys.TOKEN, authData.token);
        localStorage.setItem(storageKeys.USER, JSON.stringify(authData.user));
      }, auth, STORAGE_KEYS);

      await use(page);
    } catch (error) {
      console.warn('Authentication failed, using unauthenticated page:', error);
      await use(page);
    }
  },

  // Page with tutor authentication
  tutorAuthenticatedPage: async ({ page, authAPI }, use) => {
    const skipBackend = process.env.E2E_SKIP_BACKEND === 'true' || process.env.E2E_SKIP_BACKEND === '1';
    try {
      if (skipBackend) {
        // Inject mock auth state without hitting backend
        const mockAuth = {
          success: true,
          token: 'tutor-mock-token',
          user: { id: 201, email: testCredentials.tutor.email, name: testCredentials.tutor.expectedName, role: testCredentials.tutor.expectedRole },
          errorMessage: null
        };
        await page.addInitScript((authData, storageKeys) => {
          localStorage.setItem(storageKeys.TOKEN, authData.token);
          localStorage.setItem(storageKeys.USER, JSON.stringify(authData.user));
        }, mockAuth, STORAGE_KEYS);
      } else {
        const auth = await authAPI.login(testCredentials.tutor.email, testCredentials.tutor.password);
        await page.addInitScript((authData, storageKeys) => {
          localStorage.setItem(storageKeys.TOKEN, authData.token);
          localStorage.setItem(storageKeys.USER, JSON.stringify(authData.user));
        }, auth, STORAGE_KEYS);
      }
      await use(page);
    } catch (error) {
      console.warn('Tutor authentication failed, using unauthenticated page:', error);
      await use(page);
    }
  },

  // Page with mocked API responses - enhanced with realistic delays
  mockedPage: async ({ page }, use) => {
    // Mock authentication endpoints with realistic delays
    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`, async (route, request) => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Realistic API delay
      
      const postData = JSON.parse(await request.postData() || '{}');
      let response = { ...mockResponses.auth.success } as any;
      
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
              status: 'FINAL_APPROVED',
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
    await page.route('**/api/dashboard/summary', async route => {
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
    await page.addInitScript((token, user, storageKeys) => {
      try {
        const hasToken = !!localStorage.getItem(storageKeys.TOKEN);
        const hasUser = !!localStorage.getItem(storageKeys.USER);
        if (!hasToken || !hasUser) {
          localStorage.setItem(storageKeys.TOKEN, token);
          localStorage.setItem(storageKeys.USER, JSON.stringify(user));
        }
      } catch {}
    }, mockResponses.auth.success.token, buildUser('lecturer'), STORAGE_KEYS);

    await use(page);
  }
});

// Global test hooks for all tests using this extended fixture
test.beforeEach(async ({ page }, testInfo) => {
  // Apply animation disabling only for mobile project to avoid affecting desktop projects
  if (testInfo.project.name === 'mobile-tests') {
    try { await page.emulateMedia({ reducedMotion: 'reduce' }); } catch {}
    try {
      await page.addStyleTag({ content: '*{transition: none !important; animation: none !important;}' });
    } catch {}
  }
});

export { expect } from '@playwright/test';