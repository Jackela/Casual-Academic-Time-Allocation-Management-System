import { APIRequestContext } from '@playwright/test';

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  errorMessage: string | null;
}

export interface TimesheetResponse {
  content: Array<{
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
  }>;
  page: {
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
  };
}

export class AuthAPI {
  constructor(private request: APIRequestContext) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request.post('http://localhost:8084/api/auth/login', {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
    }

    return await response.json();
  }

  async getHealth(): Promise<{ status: string }> {
    const response = await this.request.get('http://localhost:8084/actuator/health');
    return await response.json();
  }
}

export class TimesheetAPI {
  constructor(private request: APIRequestContext, private token: string) {}

  async getPendingApprovals(page = 0, size = 20): Promise<TimesheetResponse> {
    const response = await this.request.get(
      `http://localhost:8084/api/timesheets/pending-approval?page=${page}&size=${size}`,
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

  async approveTimesheet(id: number): Promise<void> {
    const response = await this.request.post(
      `http://localhost:8084/api/timesheets/${id}/approve`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to approve timesheet: ${response.status()}`);
    }
  }

  async rejectTimesheet(id: number, reason: string): Promise<void> {
    const response = await this.request.post(
      `http://localhost:8084/api/timesheets/${id}/reject`,
      {
        data: { reason },
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to reject timesheet: ${response.status()}`);
    }
  }
}