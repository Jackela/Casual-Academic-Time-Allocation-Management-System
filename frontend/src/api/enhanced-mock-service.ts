/**
 * Enhanced Mock Service for CATAMS API Testing
 * 
 * Replaces simple-axios-mock.ts with OpenAPI-schema-compliant mock data
 * and comprehensive test scenario generation.
 */

import { vi } from 'vitest';
import axios from 'axios';
import type { AxiosResponse, AxiosError } from 'axios';
import { 
  OpenAPIMockGenerator, 
  MockScenarios
} from './openapi-mock-generator';
import type {
  TimesheetPageResponse
} from './openapi-mock-generator';

// ========================================
// Enhanced Mock Data Repository
// ========================================

export class EnhancedMockService {
  private static currentUser: 'LECTURER' | 'TUTOR' | 'ADMIN' = 'LECTURER';
  private static mockTimesheets = new Map<number, any>();
  private static currentTimesheetId = 1;
  private static isInitialized = false;
  private static expiredToken = 'expired-token';

  /**
   * Initialize mock service with comprehensive OpenAPI-compliant data
   */
  static initialize() {
    if (this.isInitialized) {
      return; // Don't initialize twice
    }
    
    console.log('[MOCK] Initializing Enhanced Mock Service...');
    this.resetData();
    this.setupAxiosMocks();
    this.isInitialized = true;
  }

  /**
   * Reset all mock data to initial state
   */
  static resetData() {
    this.mockTimesheets.clear();
    this.currentTimesheetId = 1;
    this.currentUser = 'LECTURER';
    this.expiredToken = 'valid-token'; // Reset token state

    // Initialize with sample data
    const sampleData = MockScenarios.timesheets.singlePage.timesheets;
    sampleData.forEach(timesheet => {
      this.mockTimesheets.set(timesheet.id, timesheet);
    });
  }

  /**
   * Set current user role for role-based testing
   */
  static setCurrentUser(role: 'LECTURER' | 'TUTOR' | 'ADMIN') {
    this.currentUser = role;
  }

  /**
   * Check if the current token is expired (for 401 testing)
   */
  private static isTokenExpired(): boolean {
    // This would be set by the test when it calls apiClient.setAuthToken('expired-token')
    // For now, we'll simulate this by checking a global test state
    return this.expiredToken === 'expired-token';  // Simple mock logic
  }

  /**
   * Set expired token state for testing
   */
  static setExpiredTokenState(isExpired: boolean) {
    this.expiredToken = isExpired ? 'expired-token' : 'valid-token';
  }

  /**
   * Setup comprehensive axios mocks with complete HTTP method coverage
   */
  static setupAxiosMocks() {
    // Create comprehensive mock axios instance with all required properties
    const mockAxiosInstance = {
      get: vi.fn().mockImplementation((url: string) => {
        console.log(`[MOCK] GET ${url}`);
        return this.handleGetRequest(url);
      }),
      post: vi.fn().mockImplementation((url: string, data: any) => {
        console.log(`[MOCK] POST ${url}`, data);
        return this.handlePostRequest(url, data);
      }),
      put: vi.fn().mockImplementation((url: string, data: any) => {
        console.log(`[MOCK] PUT ${url}`, data);
        return this.handlePutRequest(url, data);
      }),
      delete: vi.fn().mockImplementation((url: string) => {
        console.log(`[MOCK] DELETE ${url}`);
        return this.handleDeleteRequest(url);
      }),
      patch: vi.fn().mockImplementation((url: string, data: any) => {
        console.log(`[MOCK] PATCH ${url}`, data);
        return this.handlePutRequest(url, data);
      }),
      interceptors: {
        request: { 
          use: vi.fn().mockReturnValue(0),
          eject: vi.fn(),
          clear: vi.fn(),
          forEach: vi.fn()
        },
        response: { 
          use: vi.fn().mockReturnValue(0),
          eject: vi.fn(),
          clear: vi.fn(),
          forEach: vi.fn()
        }
      },
      defaults: { 
        headers: { common: {} },
        timeout: 5000,
        baseURL: 'http://localhost:8080'
      },
      request: vi.fn().mockImplementation((config: any) => {
        const method = config.method?.toLowerCase() || 'get';
        const url = config.url;
        const data = config.data;
        
        console.log(`[MOCK] ${method.toUpperCase()} ${url}`, data);
        
        switch (method) {
          case 'get': return this.handleGetRequest(url);
          case 'post': return this.handlePostRequest(url, data);
          case 'put': return this.handlePutRequest(url, data);
          case 'delete': return this.handleDeleteRequest(url);
          default: throw new Error(`Unmocked method: ${method}`);
        }
      })
    };

    // Mock axios.create to return our comprehensive mock instance
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
    
    // Mock direct axios methods as well (critical for fallback)
    vi.mocked(axios.get).mockImplementation((url: string, _config?: any) => {
      console.log(`[MOCK-DIRECT] GET ${url}`);
      return this.handleGetRequest(url);
    });
    
    vi.mocked(axios.post).mockImplementation((url: string, data?: any, _config?: any) => {
      console.log(`[MOCK-DIRECT] POST ${url}`, data);
      return this.handlePostRequest(url, data);
    });
    
    vi.mocked(axios.put).mockImplementation((url: string, data?: any, _config?: any) => {
      console.log(`[MOCK-DIRECT] PUT ${url}`, data);
      return this.handlePutRequest(url, data);
    });
    
    vi.mocked(axios.delete).mockImplementation((url: string, _config?: any) => {
      console.log(`[MOCK-DIRECT] DELETE ${url}`);
      return this.handleDeleteRequest(url);
    });

    // Also mock axios.request for comprehensive coverage
    vi.mocked(axios.request).mockImplementation((config: any) => {
      const method = config.method?.toLowerCase() || 'get';
      const url = config.url;
      const data = config.data;
      
      console.log(`[MOCK-REQUEST] ${method.toUpperCase()} ${url}`, data);
      
      switch (method) {
        case 'get': return this.handleGetRequest(url);
        case 'post': return this.handlePostRequest(url, data);
        case 'put': return this.handlePutRequest(url, data);
        case 'delete': return this.handleDeleteRequest(url);
        default: throw new Error(`Unmocked method: ${method}`);
      }
    });

    console.log('[MOCK] Axios mocks initialized successfully');
  }

  /**
   * Handle POST requests (login, timesheet creation)
   */
  private static async handlePostRequest(url: string, data: any): Promise<AxiosResponse> {
    // Authentication
    if (url.includes('/auth/login')) {
      return this.handleLogin(data);
    }

    // Timesheet creation
    if (url.includes('/timesheets') && !url.includes('/approval')) {
      return this.handleTimesheetCreation(data);
    }

    // Approval actions
    if (url.includes('/approvals')) {
      return this.handleApprovalAction(data);
    }

    throw new Error(`Unmocked POST endpoint: ${url}`);
  }

  /**
   * Handle GET requests (timesheet listing, health checks)  
   */
  private static async handleGetRequest(url: string): Promise<AxiosResponse> {
    // Check for expired token in authorization (simulate 401 error)
    if (url.includes('/timesheets') && this.isTokenExpired()) {
      return this.createErrorResponse(401, 'Unauthorized', 'Token expired');
    }
    // Health check
    if (url.includes('/health')) {
      return Promise.resolve({
        data: { status: 'UP', components: { db: { status: 'UP' } } },
        status: 200,
        statusText: 'OK',
      } as AxiosResponse);
    }

    // Timesheet listings
    if (url.includes('/timesheets')) {
      return this.handleTimesheetListing(url);
    }

    throw new Error(`Unmocked GET endpoint: ${url}`);
  }

  /**
   * Handle PUT requests (timesheet updates, approval actions)
   */
  private static async handlePutRequest(url: string, data: any): Promise<AxiosResponse> {
    // Timesheet updates
    if (url.includes('/timesheets/')) {
      return this.handleTimesheetUpdate(url, data);
    }

    throw new Error(`Unmocked PUT endpoint: ${url}`);
  }

  /**
   * Handle DELETE requests for resource cleanup
   */
  private static async handleDeleteRequest(url: string): Promise<AxiosResponse> {
    if (url.includes('/timesheets/')) {
      const timesheetId = parseInt(url.split('/').pop() || '0');
      
      if (this.mockTimesheets.has(timesheetId)) {
        this.mockTimesheets.delete(timesheetId);
        return Promise.resolve({
          data: { success: true },
          status: 204,
          statusText: 'No Content',
        } as AxiosResponse);
      } else {
        return this.createErrorResponse(404, 'Not Found', 'Timesheet not found');
      }
    }
    
    throw new Error(`Unmocked DELETE endpoint: ${url}`);
  }

  /**
   * Handle login with role-based responses
   */
  private static async handleLogin(credentials: any): Promise<AxiosResponse> {
    const { email, password } = credentials;

    // Simulate validation failure
    if (!email || !password) {
      return this.createErrorResponse(400, 'Validation failed', 'Email and password are required');
    }

    // Simulate authentication failure
    if (password === 'wrong-password') {
      return this.createErrorResponse(401, 'Unauthorized', 'Invalid email or password');
    }

    // Determine role from email
    let role: 'LECTURER' | 'TUTOR' | 'ADMIN' = 'LECTURER';
    if (email.includes('tutor')) role = 'TUTOR';
    if (email.includes('admin')) role = 'ADMIN';

    const authResult = OpenAPIMockGenerator.generateAuthResponse(role, true);
    
    // IMPORTANT: Override generated email to match the login email exactly
    if (authResult.user) {
      authResult.user.email = email;
    }

    return Promise.resolve({
      data: authResult,
      status: 200,
      statusText: 'OK',
    } as AxiosResponse);
  }

  /**
   * Handle timesheet creation with validation
   */
  private static async handleTimesheetCreation(data: any): Promise<AxiosResponse> {
    // Validate using OpenAPI schema
    try {
      // Validate using OpenAPI schema boundary values (available but not currently used)
      // const boundary = OpenAPIMockGenerator.generateTimesheetCreateBoundaryValues();
      
      // Basic validation
      if (!data.tutorId || !data.courseId || !data.hours || !data.hourlyRate || !data.description) {
        return this.createErrorResponse(400, 'Bad Request', 'Missing required fields');
      }

      if (typeof data.description === 'string' && data.description.trim().length === 0) {
        return this.createErrorResponse(400, 'Bad Request', 'Description cannot be empty');
      }

      if (typeof data.description === 'string' && data.description.length > 1000) {
        return this.createErrorResponse(400, 'Bad Request', 'Description too long (maximum 1000 characters)');
      }

      if (data.hours < 0.1 || data.hours > 60.0) {
        return this.createErrorResponse(400, 'Bad Request', 'Hours must be between 0.1 and 60.0');
      }

      if (data.hourlyRate < 0.01 || data.hourlyRate > 200.00) {
        return this.createErrorResponse(400, 'Bad Request', 'Hourly rate must be between 0.01 and 200.00');
      }

      // Create new timesheet
      const newTimesheet = OpenAPIMockGenerator.generateTimesheetResponse({
        id: this.currentTimesheetId++,
        tutorId: data.tutorId,
        courseId: data.courseId,
        hours: data.hours,
        hourlyRate: data.hourlyRate,
        description: data.description,
        status: 'DRAFT',
      });

      this.mockTimesheets.set(newTimesheet.id, newTimesheet);

      return Promise.resolve({
        data: { success: true, timesheet: newTimesheet },
        status: 201,
        statusText: 'Created',
      } as AxiosResponse);

    } catch (error) {
      return this.createErrorResponse(400, 'Bad Request', 'Invalid timesheet data');
    }
  }

  /**
   * Handle timesheet listing with filtering and pagination
   */
  private static async handleTimesheetListing(url: string): Promise<AxiosResponse> {
    const urlParams = new URL(`http://localhost${url}`).searchParams;
    const page = parseInt(urlParams.get('page') || '0');
    const size = parseInt(urlParams.get('size') || '20');
    const status = urlParams.get('status');
    const tutorId = urlParams.get('tutorId');

    let timesheets = Array.from(this.mockTimesheets.values());

    // Apply filters
    if (status) {
      timesheets = timesheets.filter(t => t.status === status);
    }
    if (tutorId) {
      timesheets = timesheets.filter(t => t.tutorId.toString() === tutorId);
    }

    // Apply role-based filtering
    if (this.currentUser === 'TUTOR') {
      timesheets = timesheets.filter(t => t.tutorId === 2); // Assume current tutor ID = 2
    }

    // Apply pagination
    const start = page * size;
    const end = start + size;
    const paginatedTimesheets = timesheets.slice(start, end);

    const response: TimesheetPageResponse = {
      success: true,
      timesheets: paginatedTimesheets,
      pageInfo: {
        totalElements: timesheets.length,
        totalPages: Math.ceil(timesheets.length / size),
        currentPage: page,
        pageSize: size,
        first: page === 0,
        last: end >= timesheets.length,
        numberOfElements: paginatedTimesheets.length,
        empty: timesheets.length === 0,
      },
    };

    return Promise.resolve({
      data: response,
      status: 200,
      statusText: 'OK',
    } as AxiosResponse);
  }

  /**
   * Handle approval actions
   */
  private static async handleApprovalAction(data: any): Promise<AxiosResponse> {
    const { timesheetId, action, comment: _comment } = data;

    // Validate timesheet ID
    if (!timesheetId || timesheetId <= 0) {
      return this.createErrorResponse(400, 'Bad Request', 'Valid timesheet ID is required');
    }

    // Validate action
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return this.createErrorResponse(400, 'Bad Request', 'Valid action (APPROVE or REJECT) is required');
    }

    const timesheet = this.mockTimesheets.get(timesheetId);
    if (!timesheet) {
      return this.createErrorResponse(404, 'Not Found', 'Timesheet not found');
    }

    // Update timesheet status
    const newStatus = action === 'APPROVE' ? 'APPROVED_BY_TUTOR' : 'REJECTED';
    timesheet.status = newStatus;
    this.mockTimesheets.set(timesheetId, timesheet);

    const response = OpenAPIMockGenerator.generateApprovalResponse(action, timesheetId);

    return Promise.resolve({
      data: response,
      status: 200,
      statusText: 'OK',
    } as AxiosResponse);
  }

  /**
   * Handle timesheet updates
   */
  private static async handleTimesheetUpdate(url: string, data: any): Promise<AxiosResponse> {
    const timesheetId = parseInt(url.split('/').pop() || '0');
    const timesheet = this.mockTimesheets.get(timesheetId);

    if (!timesheet) {
      return this.createErrorResponse(404, 'Not Found', 'Timesheet not found');
    }

    // Update timesheet
    const updatedTimesheet = { ...timesheet, ...data, updatedAt: new Date().toISOString() };
    this.mockTimesheets.set(timesheetId, updatedTimesheet);

    return Promise.resolve({
      data: { success: true, timesheet: updatedTimesheet },
      status: 200,
      statusText: 'OK',
    } as AxiosResponse);
  }

  /**
   * Create error response with OpenAPI-compliant structure
   */
  private static createErrorResponse(status: number, error: string, message: string): Promise<AxiosResponse> {
    const errorResponse = OpenAPIMockGenerator.generateErrorResponse(status, error, message);
    
    // Return as rejected promise to simulate axios error
    const axiosError = new Error(message) as AxiosError;
    axiosError.response = {
      data: errorResponse,
      status,
      statusText: error,
    } as AxiosResponse;

    return Promise.reject(axiosError);
  }

  /**
   * Generate test scenarios for specific endpoints
   */
  static getTestScenarios() {
    return {
      // Boundary value scenarios
      timesheetBoundaries: OpenAPIMockGenerator.generateTimesheetCreateBoundaryValues(),
      
      // Realistic data scenarios
      mockScenarios: MockScenarios,
      
      // Error scenarios
      errorScenarios: {
        unauthorized: () => this.createErrorResponse(401, 'Unauthorized', 'Token expired'),
        forbidden: () => this.createErrorResponse(403, 'Forbidden', 'Access denied'),
        validation: () => this.createErrorResponse(400, 'Bad Request', 'Validation failed'),
        serverError: () => this.createErrorResponse(500, 'Internal Server Error', 'Database connection failed'),
      },
    };
  }
}

// ========================================
// Export enhanced mock setup
// ========================================

/**
 * Setup enhanced mocks for testing
 */
export function setupEnhancedMocks() {
  // Initialize enhanced mock service (axios mock should be set up at test file level)
  EnhancedMockService.initialize();
  
  return EnhancedMockService;
}

// Auto-initialize in test environment (detect Vitest environment)
if (typeof vi !== 'undefined') {
  console.log('[MOCK] Auto-initializing in Vitest environment...');
  EnhancedMockService.initialize();
}