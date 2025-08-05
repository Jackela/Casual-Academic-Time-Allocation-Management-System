import { test as base, expect, Page, APIRequestContext } from '@playwright/test';
import { STORAGE_KEYS } from '../../src/utils/storage-keys';
import { E2E_CONFIG, API_ENDPOINTS } from '../config/e2e.config';

// Test credentials
export const testCredentials = {
  lecturer: {
    email: 'lecturer@example.com',
    password: 'Lecturer123!',
    expectedRole: 'LECTURER',
    expectedName: 'Dr. Jane Smith'
  },
  tutor: {
    email: 'tutor@example.com',
    password: 'Tutor123!',
    expectedRole: 'TUTOR',
    expectedName: 'John Doe'
  },
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    expectedRole: 'ADMIN',
    expectedName: 'Admin User'
  }
};

// Mock API responses
export const mockResponses = {
  auth: {
    success: {
      success: true,
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsZWN0dXJlckBleGFtcGxlLmNvbSIsInJvbGUiOiJMRUNUVVJFUiJ9.mock-token',
      user: testCredentials.lecturer,
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
  authenticatedPage: Page;
  mockedPage: Page;
};

export const test = base.extend<TestFixtures>({
  // API client for authentication
  authAPI: async ({ request }, use) => {
    await use(new AuthAPI(request));
  },

  // API client for timesheets with authentication
  timesheetAPI: async ({ request }, use) => {
    const authAPI = new AuthAPI(request);
    const auth = await authAPI.login(testCredentials.lecturer.email, testCredentials.lecturer.password);
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

  // Page with mocked API responses - enhanced with realistic delays
  mockedPage: async ({ page }, use) => {
    // Mock authentication endpoints with realistic delays
    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN}`, async route => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Realistic API delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.auth.success)
      });
    });

    // Mock timesheet endpoints with realistic delays
    await page.route(`**${E2E_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS_PENDING}*`, async route => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Realistic API delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.timesheets.withData)
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

    // Setup mock auth state
    await page.addInitScript((authData, storageKeys) => {
      localStorage.setItem(storageKeys.TOKEN, authData.token);
      localStorage.setItem(storageKeys.USER, JSON.stringify(authData.user));
    }, mockResponses.auth.success, STORAGE_KEYS);

    await use(page);
  }
});

export { expect } from '@playwright/test';