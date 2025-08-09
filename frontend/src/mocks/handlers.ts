import { http, HttpResponse } from 'msw';

// Lightweight MSW handlers to stabilize e2e/mobile runs by mocking auth and tutor timesheets.
// These handlers only activate when explicitly started from entrypoint in e2e mode.

export const handlers = [
  http.post('http://localhost:8084/api/auth/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const email = body?.email ?? '';
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
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({ success: true, message: 'Approval processed', request: body });
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


