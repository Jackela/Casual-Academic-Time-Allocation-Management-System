/**
 * CATAMS API Client - Centralized API layer for all backend interactions
 * Implements API-First testing architecture with comprehensive endpoint coverage
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG, getApiBaseUrl } from '../config/api.config';

// ========================================
// Type Definitions
// ========================================

export interface Credentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'LECTURER' | 'TUTOR' | 'ADMIN';
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  errorMessage?: string;
}

export interface Timesheet {
  id: number;
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  hours: number;
  hourlyRate: number;
  description: string;
  status: 'DRAFT' | 'PENDING_TUTOR_REVIEW' | 'TUTOR_APPROVED' | 'PENDING_HR_REVIEW' | 'HR_APPROVED' | 'FINAL_APPROVED' | 'REJECTED' | 'MODIFICATION_REQUESTED';
  tutorName: string;
  courseName: string;
  courseCode: string;
}

export interface TimesheetPage {
  success: boolean;
  timesheets: Timesheet[];
  pageInfo: {
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
  };
}

export interface ApprovalRequest {
  timesheetId: number;
  action: 'APPROVE' | 'REJECT';
  comment?: string;
}

export interface ApprovalResponse {
  success: boolean;
  message: string;
  timesheetId?: number;
  newStatus?: string;
}

export interface HealthResponse {
  status: string;
  components?: {
    db?: {
      status: string;
      details?: any;
    };
    [key: string]: any;
  };
}

export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

// ========================================
// Main API Client Class
// ========================================

export class CatamsAPIClient {
  private apiClient: AxiosInstance;
  private authToken: string | null = null;

  constructor(baseURL?: string) {
    this.apiClient = axios.create({
      baseURL: baseURL || getApiBaseUrl(),
      timeout: API_CONFIG.BACKEND.TIMEOUTS.API_REQUEST,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.apiClient.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'API request failed',
          status: error.response?.status || 0,
          details: error.response?.data
        };
        return Promise.reject(apiError);
      }
    );
  }

  // ========================================
  // Authentication Endpoints
  // ========================================

  /**
   * Authenticate user with email and password
   */
  async authenticate(credentials: Credentials): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.apiClient.post(
        API_CONFIG.BACKEND.ENDPOINTS.AUTH_LOGIN,
        credentials
      );

      const authData = response.data;
      
      // Store token for future requests
      if (authData.success && authData.token) {
        this.setAuthToken(authData.token);
      }

      return authData;
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        errorMessage: apiError.message
      };
    }
  }

  /**
   * Set authentication token for subsequent requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  // ========================================
  // Timesheet Endpoints
  // ========================================

  /**
   * Get pending timesheets for approval (lecturer view)
   */
  async getPendingTimesheets(page = 0, size = 20): Promise<TimesheetPage> {
    const response: AxiosResponse<TimesheetPage> = await this.apiClient.get(
      `${API_CONFIG.BACKEND.ENDPOINTS.TIMESHEETS_PENDING}?page=${page}&size=${size}`
    );
    return response.data;
  }

  /**
   * Get all timesheets for a specific user
   */
  async getUserTimesheets(userId?: number, page = 0, size = 20): Promise<TimesheetPage> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString()
    });
    
    if (userId) {
      params.append('userId', userId.toString());
    }

    const response: AxiosResponse<TimesheetPage> = await this.apiClient.get(
      `/api/timesheets?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get a specific timesheet by ID
   */
  async getTimesheetById(timesheetId: number): Promise<Timesheet> {
    const response: AxiosResponse<Timesheet> = await this.apiClient.get(
      `/api/timesheets/${timesheetId}`
    );
    return response.data;
  }

  /**
   * Create a new timesheet
   */
  async createTimesheet(timesheetData: Omit<Timesheet, 'id' | 'status' | 'tutorName' | 'courseName' | 'courseCode'>): Promise<Timesheet> {
    const response: AxiosResponse<Timesheet> = await this.apiClient.post(
      '/api/timesheets',
      timesheetData
    );
    return response.data;
  }

  /**
   * Update an existing timesheet
   */
  async updateTimesheet(timesheetId: number, timesheetData: Partial<Timesheet>): Promise<Timesheet> {
    const response: AxiosResponse<Timesheet> = await this.apiClient.put(
      `/api/timesheets/${timesheetId}`,
      timesheetData
    );
    return response.data;
  }

  /**
   * Delete a timesheet
   */
  async deleteTimesheet(timesheetId: number): Promise<void> {
    await this.apiClient.delete(`/api/timesheets/${timesheetId}`);
  }

  // ========================================
  // Approval Endpoints
  // ========================================

  /**
   * Approve or reject a timesheet
   */
  async processApproval(approvalRequest: ApprovalRequest): Promise<ApprovalResponse> {
    const response: AxiosResponse<ApprovalResponse> = await this.apiClient.post(
      API_CONFIG.BACKEND.ENDPOINTS.APPROVALS,
      approvalRequest
    );
    return response.data;
  }

  /**
   * Approve a timesheet (convenience method)
   */
  async approveTimesheet(timesheetId: number, comment?: string): Promise<ApprovalResponse> {
    return this.processApproval({
      timesheetId,
      action: 'APPROVE',
      comment: comment || 'Approved by lecturer'
    });
  }

  /**
   * Reject a timesheet (convenience method)
   */
  async rejectTimesheet(timesheetId: number, comment?: string): Promise<ApprovalResponse> {
    return this.processApproval({
      timesheetId,
      action: 'REJECT',
      comment: comment || 'Rejected by lecturer'
    });
  }

  /**
   * Get approval history for a timesheet
   */
  async getApprovalHistory(timesheetId: number): Promise<any[]> {
    const response: AxiosResponse<any[]> = await this.apiClient.get(
      `/api/approvals/history/${timesheetId}`
    );
    return response.data;
  }

  // ========================================
  // User Management Endpoints
  // ========================================

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await this.apiClient.get('/api/users/me');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userData: Partial<User>): Promise<User> {
    const response: AxiosResponse<User> = await this.apiClient.put('/api/users/me', userData);
    return response.data;
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page = 0, size = 20): Promise<{ content: User[], page: any }> {
    const response = await this.apiClient.get(`/api/users?page=${page}&size=${size}`);
    return response.data;
  }

  // ========================================
  // Course Management Endpoints
  // ========================================

  /**
   * Get all courses
   */
  async getCourses(): Promise<any[]> {
    const response = await this.apiClient.get('/api/courses');
    return response.data;
  }

  /**
   * Get course by ID
   */
  async getCourseById(courseId: number): Promise<any> {
    const response = await this.apiClient.get(`/api/courses/${courseId}`);
    return response.data;
  }

  // ========================================
  // Health and System Endpoints
  // ========================================

  /**
   * Check backend health status
   */
  async getHealthStatus(): Promise<HealthResponse> {
    const response: AxiosResponse<HealthResponse> = await this.apiClient.get(
      API_CONFIG.BACKEND.ENDPOINTS.HEALTH
    );
    return response.data;
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    const response = await this.apiClient.get('/actuator/info');
    return response.data;
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Test connectivity to the backend
   */
  async testConnectivity(): Promise<boolean> {
    try {
      await this.getHealthStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get base URL being used by the client
   */
  getBaseURL(): string {
    return this.apiClient.defaults.baseURL || '';
  }

  /**
   * Set custom timeout for requests
   */
  setTimeout(timeout: number): void {
    this.apiClient.defaults.timeout = timeout;
  }

  // ========================================
  // Contract Test Compatibility Methods
  // ========================================

  /**
   * Login user - alias for authenticate with consistent interface
   * Required for contract tests expecting login() method
   * NOTE: This method throws errors for test compatibility, unlike authenticate()
   */
  async login(credentials: Credentials): Promise<AuthResponse> {
    const result = await this.authenticate(credentials);
    
    // Contract tests expect this method to throw on failure
    if (!result.success) {
      throw new Error(result.errorMessage || 'Authentication failed');
    }
    
    return result;
  }

  /**
   * Health check endpoint - alias for getHealthStatus
   * Required for contract tests expecting checkHealth() method
   */
  async checkHealth(): Promise<HealthResponse> {
    return this.getHealthStatus();
  }

  /**
   * Get timesheets with comprehensive filtering and pagination
   * Supports tutorId, status, page, and size parameters
   * Required for contract tests expecting getTimesheets() method
   */
  async getTimesheets(options: {
    page?: number;
    size?: number; 
    tutorId?: number;
    status?: string;
  } = {}): Promise<TimesheetPage> {
    const params = new URLSearchParams({
      page: (options.page || 0).toString(),
      size: (options.size || 20).toString()
    });
    
    if (options.tutorId) {
      params.append('tutorId', options.tutorId.toString());
    }
    if (options.status) {
      params.append('status', options.status);
    }
    
    const response: AxiosResponse<TimesheetPage> = await this.apiClient.get(
      `/api/timesheets?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get timesheets filtered by status
   * Convenience method for status-specific queries
   * Required for contract tests expecting getTimesheetsByStatus() method
   */
  async getTimesheetsByStatus(status: string): Promise<TimesheetPage> {
    return this.getTimesheets({ status });
  }
}

// ========================================
// Factory Functions and Exports
// ========================================

/**
 * Create a new API client instance
 */
export function createApiClient(baseURL?: string): CatamsAPIClient {
  return new CatamsAPIClient(baseURL);
}

/**
 * Create a pre-authenticated API client
 */
export function createAuthenticatedApiClient(token: string, baseURL?: string): CatamsAPIClient {
  const client = new CatamsAPIClient(baseURL);
  client.setAuthToken(token);
  return client;
}

/**
 * Default API client instance for the application
 * NOTE: Disabled in test environment to avoid module initialization conflicts
 * Production code should create instances as needed: new CatamsAPIClient()
 */
// export const defaultApiClient = new CatamsAPIClient();