import { http, HttpResponse } from 'msw';
import type { ApprovalRequest, LoginRequest } from '../types/api';

// Lightweight MSW handlers to stabilize e2e/mobile runs by mocking auth and tutor timesheets.
// These handlers only activate when explicitly started from entrypoint in e2e mode.

const parseJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

const isLoginRequest = (value: unknown): value is LoginRequest => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<LoginRequest>;
  return typeof candidate.email === 'string';
};

const isApprovalRequest = (value: unknown): value is ApprovalRequest => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ApprovalRequest>;
  return typeof candidate.timesheetId === 'number' && typeof candidate.action === 'string';
};

export const handlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const payload = await parseJson(request);
    const loginRequest = isLoginRequest(payload) ? payload : undefined;
    const email = loginRequest?.email ?? '';

    let role = 'LECTURER';
    if (email.includes('tutor')) role = 'TUTOR';
    if (email.includes('admin')) role = 'ADMIN';

    return HttpResponse.json({
      success: true,
      token: `${role.toLowerCase()}-mock-token`,
      user: {
        id: role === 'TUTOR' ? 201 : role === 'LECTURER' ? 101 : 1,
        email,
        name: role === 'TUTOR' ? 'John Doe' : role === 'LECTURER' ? 'Dr. Jane Smith' : 'Admin User',
        role,
      },
      errorMessage: null,
    });
  }),

  // Lecturer pending final approvals (TUTOR_CONFIRMED)
  http.get('*/api/timesheets/pending-final-approval', () => {
    return HttpResponse.json({
      content: [
        {
          id: 101,
          tutorId: 201,
          courseId: 1,
          courseCode: 'COMP1001',
          tutorName: 'John Doe',
          hours: 10,
          hourlyRate: 45.0,
          status: 'TUTOR_CONFIRMED',
          description: 'Review tutorial sessions',
        },
      ],
      pageInfo: { totalElements: 1 },
    });
  }),

  // Approvals endpoint
  http.post('*/api/approvals', async ({ request }) => {
    const payload = await parseJson(request);
    const approvalRequest = isApprovalRequest(payload) ? payload : undefined;

    return HttpResponse.json({
      success: true,
      message: 'Approval processed',
      request: approvalRequest ?? null,
    });
  }),

  http.get('*/api/timesheets/me', () => {
    return HttpResponse.json({
      content: [
        { id: 1, courseId: 1, courseCode: 'COMP1001', hours: 10, hourlyRate: 45.0, status: 'REJECTED', description: 'Tutorial sessions' },
        { id: 2, courseId: 2, courseCode: 'DATA2001', hours: 8, hourlyRate: 50.0, status: 'DRAFT', description: 'Labs' },
      ],
      pageInfo: { totalElements: 2 },
    });
  }),

  http.get('*/api/timesheets', () => {
    return HttpResponse.json({
      content: [
        { id: 201, tutorId: 201, courseId: 1, courseCode: 'COMP1001', tutorName: 'Alex Rivers', hours: 12, hourlyRate: 45, status: 'TUTOR_CONFIRMED', description: 'Week 5 tutorials' },
        { id: 202, tutorId: 202, courseId: 2, courseCode: 'DATA2001', tutorName: 'Morgan Lee', hours: 9, hourlyRate: 50, status: 'LECTURER_CONFIRMED', description: 'Data lab support' },
        { id: 203, tutorId: 203, courseId: 3, courseCode: 'STAT3004', tutorName: 'Taylor Kim', hours: 7.5, hourlyRate: 48, status: 'MODIFICATION_REQUESTED', description: 'Assignment marking' },
        { id: 204, tutorId: 3, courseId: 4, courseCode: 'MATH2002', tutorName: 'Jamie Chen', hours: 5, hourlyRate: 42, status: 'DRAFT', description: 'Tutorial prep notes' },
      ],
      pageInfo: {
        currentPage: 0,
        pageSize: 50,
        totalElements: 3,
        totalPages: 1,
        first: true,
        last: true,
        numberOfElements: 3,
        empty: false,
      },
    });
  }),

  http.get('*/api/dashboard/summary', () => {
    return HttpResponse.json({
      totalTimesheets: 42,
      pendingApprovals: 3,
      totalHours: 128,
      totalPayroll: 5400,
      tutorCount: 18,
      statusBreakdown: {
        DRAFT: 5,
        PENDING_TUTOR_CONFIRMATION: 4,
        TUTOR_CONFIRMED: 6,
        LECTURER_CONFIRMED: 10,
        FINAL_CONFIRMED: 12,
        REJECTED: 2,
        MODIFICATION_REQUESTED: 3,
      },
      recentActivity: [],
      upcomingDeadlines: [],
      systemMetrics: {
        uptime: '99.9%',
        averageApprovalTime: '6h',
        escalationsThisWeek: 1,
      },
    });
  }),
];


