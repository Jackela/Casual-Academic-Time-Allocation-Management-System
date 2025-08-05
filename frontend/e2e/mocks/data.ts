export const mockUsers = {
  lecturer: {
    id: 2,
    email: 'lecturer@example.com',
    name: 'Dr. Jane Smith',
    role: 'LECTURER'
  },
  tutor: {
    id: 3,
    email: 'tutor@example.com',
    name: 'John Doe',
    role: 'TUTOR'
  }
};

export const mockTimesheets = [
  {
    id: 1,
    tutorId: 3,
    courseId: 1,
    weekStartDate: '2025-01-27',
    hours: 10,
    hourlyRate: 45.00,
    description: 'Tutorial sessions and marking for COMP1001',
    status: 'PENDING',
    createdAt: '2025-01-28T10:00:00Z',
    updatedAt: '2025-01-28T10:00:00Z',
    tutorName: 'John Doe',
    courseName: 'Introduction to Programming',
    courseCode: 'COMP1001'
  },
  {
    id: 2,
    tutorId: 3,
    courseId: 2,
    weekStartDate: '2025-01-20',
    hours: 8,
    hourlyRate: 50.00,
    description: 'Lab supervision and student consultations',
    status: 'PENDING',
    createdAt: '2025-01-25T14:30:00Z',
    updatedAt: '2025-01-25T14:30:00Z',
    tutorName: 'Alice Johnson',
    courseName: 'Data Structures and Algorithms',
    courseCode: 'COMP2001'
  }
];

export const mockApiResponses = {
  auth: {
    success: {
      success: true,
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsZWN0dXJlckBleGFtcGxlLmNvbSIsInJvbGUiOiJMRUNUVVJFUiIsImlhdCI6MTUxNjIzOTAyMn0.mock-token',
      user: mockUsers.lecturer,
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
      content: mockTimesheets,
      page: {
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 20,
        first: true,
        last: true,
        numberOfElements: 2,
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
    },
    error: {
      error: 'Internal Server Error',
      message: 'Failed to fetch timesheets',
      status: 500
    }
  }
};