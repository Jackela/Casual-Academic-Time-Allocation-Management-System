/**
 * Simple Axios Mock for Contract Tests
 * This is a straightforward axios mock that returns predictable responses
 */

import { vi } from 'vitest';

// Mock response data
const MOCK_RESPONSES = {
  health: {
    status: 'UP',
    components: {
      db: { status: 'UP' }
    }
  },
  timesheets: {
    pendingApproval: {
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
          status: 'PENDING_LECTURER_APPROVAL',
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
          status: 'PENDING_LECTURER_APPROVAL',
          tutorName: 'Jane Smith',
          courseName: 'Data Structures',
          courseCode: 'COMP2001'
        }
      ],
      pageInfo: {
        totalElements: 2,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        first: true,
        last: true,
        numberOfElements: 2,
        empty: false
      }
    },
    userTimesheets: {
      success: true,
      timesheets: [
        {
          id: 3,
          tutorId: 2,
          courseId: 1,
          weekStartDate: '2025-01-20',
          hours: 12,
          hourlyRate: 45.00,
          description: 'Weekly tutorial sessions',
          status: 'APPROVED',
          tutorName: 'John Doe',
          courseName: 'Introduction to Programming',
          courseCode: 'COMP1001'
        }
      ],
      pageInfo: {
        totalElements: 1,
        totalPages: 1,
        currentPage: 0,
        pageSize: 20,
        first: true,
        last: true,
        numberOfElements: 1,
        empty: false
      }
    },
    empty: {
      success: true,
      timesheets: [],
      pageInfo: {
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        pageSize: 20,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true
      }
    },
    singleTimesheet: {
      id: 1,
      tutorId: 2,
      courseId: 1,
      weekStartDate: '2025-01-27',
      hours: 10,
      hourlyRate: 45.00,
      description: 'Tutorial sessions and marking for COMP1001',
      status: 'PENDING_LECTURER_APPROVAL',
      tutorName: 'John Doe',
      courseName: 'Introduction to Programming',
      courseCode: 'COMP1001'
    }
  },
  approvals: {
    success: {
      success: true,
      message: 'Timesheet approved successfully',
      timesheetId: 1,
      newStatus: 'APPROVED'
    },
    reject: {
      success: true,
      message: 'Timesheet rejected successfully',
      timesheetId: 1,
      newStatus: 'REJECTED'
    },
    error: {
      success: false,
      message: 'Invalid approval action'
    }
  },
  authSuccess: {
    lecturer: {
      success: true,
      token: 'mock-jwt-token-lecturer-123',
      user: {
        id: 1,
        email: 'lecturer@example.com',
        name: 'Dr. Jane Smith',
        role: 'LECTURER'
      }
    },
    tutor: {
      success: true,
      token: 'mock-jwt-token-tutor-456',
      user: {
        id: 2,
        email: 'tutor@example.com',
        name: 'John Doe',
        role: 'TUTOR'
      }
    },
    admin: {
      success: true,
      token: 'mock-jwt-token-admin-789',
      user: {
        id: 3,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN'
      }
    }
  },
  authFailure: {
    invalidCredentials: {
      success: false,
      errorMessage: 'Invalid email or password'
    },
    emptyCredentials: {
      success: false,
      errorMessage: 'Email and password are required'
    },
    malformedEmail: {
      success: false,
      errorMessage: 'Invalid email format'
    }
  },
  dashboardSummary: {
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
      },
      {
        id: 2,
        type: 'SUBMISSION',
        description: 'New timesheet submitted for COMP2001',
        timestamp: '2025-08-05T09:15:00Z',
        timesheetId: 2,
        userId: 3,
        userName: 'Jane Smith'
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
  }
};

// Create mock axios instance
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: {
    baseURL: 'http://localhost:8084',
    timeout: 10000,
    headers: {}
  },
  interceptors: {
    request: {
      use: vi.fn().mockReturnValue(0)
    },
    response: {
      use: vi.fn().mockReturnValue(0)
    }
  }
};

// Setup mock implementations
mockAxiosInstance.get.mockImplementation(async (url: string) => {
  console.log(`[MOCK] GET ${url}`);

  if (url.includes('/actuator/health')) {
    return {
      data: MOCK_RESPONSES.health,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' }
    };
  }

  if (url.includes('/api/timesheets/pending-approval')) {
    // Parse pagination parameters from URL
    const urlObj = new URL(url, 'http://localhost');
    const pageSize = parseInt(urlObj.searchParams.get('size') || '20');
    const page = parseInt(urlObj.searchParams.get('page') || '0');
    
    // Create response with correct pageSize
    const response = {
      ...MOCK_RESPONSES.timesheets.pendingApproval,
      pageInfo: {
        ...MOCK_RESPONSES.timesheets.pendingApproval.pageInfo,
        pageSize: pageSize,
        currentPage: page
      }
    };
    
    return {
      data: response,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' }
    };
  }

  if (url.includes('/api/timesheets/') && url.match(/\/api\/timesheets\/\d+$/)) {
    // Handle GET /api/timesheets/{id}
    const timesheetId = parseInt(url.split('/').pop() || '0');
    if (timesheetId === 999999) {
      // Handle non-existent timesheet test case
      throw {
        response: { status: 404, data: { error: 'Timesheet not found' }},
        message: 'Request failed with status code 404'
      };
    }
    return {
      data: MOCK_RESPONSES.timesheets.singleTimesheet,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' }
    };
  }

  if (url.includes('/api/dashboard/summary')) {
    // Handle GET /api/dashboard/summary (admin dashboard)
    return {
      data: MOCK_RESPONSES.dashboardSummary,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' }
    };
  }

  if (url.includes('/api/timesheets')) {
    // Handle GET /api/timesheets (user timesheets)
    return {
      data: MOCK_RESPONSES.timesheets.userTimesheets,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' }
    };
  }

  throw {
    response: { status: 404, data: { error: 'Not Found' }},
    message: 'Request failed with status code 404'
  };
});

mockAxiosInstance.post.mockImplementation(async (url: string, data: any) => {
  console.log(`[MOCK] POST ${url}`, data);

  if (url.includes('/api/auth/login')) {
    if (!data || !data.email || !data.password) {
      throw {
        response: { status: 400, data: MOCK_RESPONSES.authFailure.emptyCredentials },
        message: 'Request failed with status code 400'
      };
    }

    const { email, password } = data;

    if (email === 'lecturer@example.com' && password === 'Lecturer123!') {
      return {
        data: MOCK_RESPONSES.authSuccess.lecturer,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      };
    }

    if (email === 'tutor@example.com' && password === 'Tutor123!') {
      return {
        data: MOCK_RESPONSES.authSuccess.tutor,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      };
    }

    if (email === 'admin@example.com' && password === 'Admin123!') {
      return {
        data: MOCK_RESPONSES.authSuccess.admin,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      };
    }

    if (!email.includes('@') || !email.includes('.')) {
      throw {
        response: { status: 400, data: MOCK_RESPONSES.authFailure.malformedEmail },
        message: 'Request failed with status code 400'
      };
    }

    throw {
      response: { status: 401, data: MOCK_RESPONSES.authFailure.invalidCredentials },
      message: 'Request failed with status code 401'
    };
  }

  if (url.includes('/api/approvals')) {
    if (!data || !data.timesheetId || !data.action) {
      throw {
        response: { status: 400, data: MOCK_RESPONSES.approvals.error },
        message: 'Request failed with status code 400'
      };
    }

    const { action, timesheetId } = data;
    
    if (action === 'APPROVE') {
      return {
        data: { ...MOCK_RESPONSES.approvals.success, timesheetId },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      };
    }

    if (action === 'REJECT') {
      return {
        data: { ...MOCK_RESPONSES.approvals.reject, timesheetId },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      };
    }

    if (action === 'INVALID_ACTION') {
      throw {
        response: { status: 400, data: MOCK_RESPONSES.approvals.error },
        message: 'Request failed with status code 400'
      };
    }

    return {
      data: { ...MOCK_RESPONSES.approvals.success, timesheetId },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' }
    };
  }

  throw {
    response: { status: 404, data: { error: 'Not Found' }},
    message: 'Request failed with status code 404'
  };
});

// Mock axios module
vi.mock('axios', () => ({
  default: {
    create: vi.fn((config?: any) => {
      const instance = { ...mockAxiosInstance };
      if (config?.baseURL) {
        instance.defaults = { ...instance.defaults, baseURL: config.baseURL };
      }
      return instance;
    }),
    ...mockAxiosInstance
  }
}));

export { mockAxiosInstance, MOCK_RESPONSES };