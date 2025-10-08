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
  http.post('http://localhost:8084/api/auth/login', async ({ request }) => {
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

  // Lecturer pending final approvals (APPROVED_BY_TUTOR)
  http.get('http://localhost:8084/api/timesheets/pending-final-approval', () => {
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
          status: 'APPROVED_BY_TUTOR',
          description: 'Review tutorial sessions',
        },
      ],
      pageInfo: { totalElements: 1 },
    });
  }),

  // Approvals endpoint
  http.post('http://localhost:8084/api/approvals', async ({ request }) => {
    const payload = await parseJson(request);
    const approvalRequest = isApprovalRequest(payload) ? payload : undefined;

    return HttpResponse.json({
      success: true,
      message: 'Approval processed',
      request: approvalRequest ?? null,
    });
  }),

  http.get('http://localhost:8084/api/timesheets/me', () => {
    return HttpResponse.json({
      content: [
        { id: 1, courseId: 1, courseCode: 'COMP1001', hours: 10, hourlyRate: 45.0, status: 'REJECTED', description: 'Tutorial sessions' },
        { id: 2, courseId: 2, courseCode: 'DATA2001', hours: 8, hourlyRate: 50.0, status: 'DRAFT', description: 'Labs' },
      ],
      pageInfo: { totalElements: 2 },
    });
  }),
];


