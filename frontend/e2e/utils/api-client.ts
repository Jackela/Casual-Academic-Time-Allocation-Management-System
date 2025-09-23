import { SecureApiClient } from '../../src/services/api-secure';
import type {
  LoginRequest,
  LoginResponse,
  TimesheetPage,
  Timesheet,
  ApprovalRequest,
  ApprovalResponse
} from '../../src/types/api';

interface PaginationOptions {
  page?: number;
  size?: number;
}

export class TimesheetApiClient {
  private readonly client: SecureApiClient;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.client = new SecureApiClient(baseURL, { environment: 'server' });
  }

  private getAuthHeaders() {
    return this.authToken ? { Authorization: `Bearer ${this.authToken}` } : undefined;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    this.client.setAuthToken(token);
  }

  async authenticate(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/auth/login', credentials);
    if (response.success && response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data!;
  }

  async getPendingTimesheets(page = 0, size = 20): Promise<TimesheetPage> {
    const query = this.client.createQueryString({ page, size });
    const response = await this.client.get<TimesheetPage>(`/api/timesheets/pending-final-approval?${query}`, { headers: this.getAuthHeaders() });
    return response.data!;
  }

  async getUserTimesheets(tutorId?: number, options: PaginationOptions = {}): Promise<TimesheetPage> {
    const { page = 0, size = 20 } = options;
    const params: Record<string, any> = { page, size };

    if (typeof tutorId === 'number') {
      params.tutorId = tutorId;
      const query = this.client.createQueryString(params);
      const response = await this.client.get<TimesheetPage>(`/api/timesheets?${query}`, { headers: this.getAuthHeaders() });
      return response.data!;
    }

    const query = this.client.createQueryString(params);
    const response = await this.client.get<TimesheetPage>(`/api/timesheets?${query}`, { headers: this.getAuthHeaders() });
    return response.data!;
  }

  async getTimesheetById(id: number): Promise<Timesheet> {
    const response = await this.client.get<Timesheet>(`/api/timesheets/${id}`, { headers: this.getAuthHeaders() });
    return response.data!;
  }

  async processApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    const response = await this.client.post<ApprovalResponse>('/api/approvals', request, { headers: this.getAuthHeaders() });
    return response.data!;
  }

  async approveTimesheet(timesheetId: number, comment?: string): Promise<ApprovalResponse> {
    return this.processApproval({
      timesheetId,
      action: 'APPROVE',
      comment
    });
  }

  async rejectTimesheet(timesheetId: number, comment?: string): Promise<ApprovalResponse> {
    return this.processApproval({
      timesheetId,
      action: 'REJECT',
      comment
    });
  }

  async getMyTimesheets(options: PaginationOptions = {}): Promise<TimesheetPage> {
    return this.getUserTimesheets(undefined, options);
  }
}
