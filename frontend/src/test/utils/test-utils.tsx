/**
 * Test Utilities
 * 
 * Centralized testing utilities, mocks, and helpers for the refactored
 * CATAMS frontend components following TDD methodology.
 */

import React from 'react';
import type { ReactElement, ReactNode, ComponentType } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { vi, expect } from 'vitest';
import type { 
  User, 
  Timesheet, 
  TimesheetPage, 
  TimesheetStatus, 
  DashboardSummary,
  ApiResponse,
  PageInfo
} from '../../types/api';

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Create a mock user for AuthContext
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    role: 'TUTOR',
    ...overrides
  };
}

/**
 * Create a mock user for AuthContext (simplified interface)
 */
export function createMockAuthUser(overrides: { id?: number; email?: string; name?: string; role?: string } = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'TUTOR',
    ...overrides
  };
}

/**
 * Create a mock timesheet
 */
export function createMockTimesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  return {
    id: 1,
    tutorId: 1,
    courseId: 1,
    weekStartDate: '2024-01-01',
    hours: 10,
    hourlyRate: 35.50,
    description: 'Weekly tutoring sessions',
    status: 'PENDING_TUTOR_CONFIRMATION',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    // Extended fields
    tutorName: 'John Doe',
    courseName: 'Computer Science 101',
    courseCode: 'CS101',
    ...overrides
  };
}

/**
 * Create multiple mock timesheets
 */
export function createMockTimesheets(count: number, baseOverrides: Partial<Timesheet> = {}): Timesheet[] {
  return Array.from({ length: count }, (_, index) => 
    createMockTimesheet({
      id: index + 1,
      tutorId: (index % 3) + 1,
      courseId: (index % 5) + 1,
      hours: 5 + (index % 15),
      status: (['DRAFT', 'PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', 'FINAL_CONFIRMED'] as TimesheetStatus[])[index % 5],
      weekStartDate: new Date(2024, 0, 1 + (index * 7)).toISOString().split('T')[0],
      tutorName: `Tutor ${index + 1}`,
      courseName: `Course ${index + 1}`,
      courseCode: `CS${(index + 101)}`,
      ...baseOverrides
    })
  );
}

/**
 * Create mock page info
 */
export function createMockPageInfo(overrides: Partial<PageInfo> = {}): PageInfo {
  return {
    currentPage: 0,
    pageSize: 20,
    totalElements: 100,
    totalPages: 5,
    first: true,
    last: false,
    numberOfElements: 20,
    empty: false,
    ...overrides
  };
}

/**
 * Create mock timesheet page
 */
export function createMockTimesheetPage(
  timesheetCount: number = 20, 
  pageOverrides: Partial<PageInfo> = {},
  timesheetOverrides: Partial<Timesheet> = {}
): TimesheetPage {
  return {
    success: true,
    timesheets: createMockTimesheets(timesheetCount, timesheetOverrides),
    pageInfo: createMockPageInfo({
      numberOfElements: timesheetCount,
      empty: timesheetCount === 0,
      ...pageOverrides
    })
  };
}

/**
 * Create mock dashboard summary
 */
export function createMockDashboardSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    totalTimesheets: 50,
    pendingApprovals: 10,
    pendingApproval: 10,
    pendingConfirmations: 12,
    approvedTimesheets: 25,
    rejectedTimesheets: 3,
    totalHours: 250.5,
    totalPayroll: 8867.50,
    totalPay: 8867.50,
    thisWeekHours: 40,
    thisWeekPay: 1420,
    statusBreakdown: {
      DRAFT: 5,
      PENDING_TUTOR_CONFIRMATION: 12,
      TUTOR_CONFIRMED: 6,
      LECTURER_CONFIRMED: 8,
      FINAL_CONFIRMED: 10,
      REJECTED: 3,
      MODIFICATION_REQUESTED: 2
    },
    systemMetrics: {
      systemLoad: 0.55,
      activeUsers: 42,
      averageApprovalTime: 2.3,
      alerts: []
    },
    recentActivity: [
      {
        id: 1,
        type: 'SUBMISSION',
        description: 'Timesheet submitted for Week 1',
        timestamp: '2024-01-01T10:00:00Z',
        timesheetId: 1
      },
      {
        id: 2,
        type: 'APPROVAL',
        description: 'Timesheet approved by lecturer',
        timestamp: '2024-01-01T11:00:00Z',
        timesheetId: 2
      }
    ],
    ...overrides
  };
}

/**
 * Create mock API response
 */
export function createMockApiResponse<T>(data: T, overrides: Partial<ApiResponse<T>> = {}): ApiResponse<T> {
  return {
    success: true,
    data,
    message: 'Success',
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

// =============================================================================
// Mock Service Functions
// =============================================================================

/**
 * Mock API client
 */
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(),
  healthCheck: vi.fn(),
  createFormData: vi.fn(),
  createQueryString: vi.fn()
};

/**
 * Mock timesheet service
 */
export const mockTimesheetService = {
  getTimesheets: vi.fn(),
  getPendingTimesheets: vi.fn(),
  getTimesheetsByTutor: vi.fn(),
  getTimesheet: vi.fn(),
  createTimesheet: vi.fn(),
  updateTimesheet: vi.fn(),
  deleteTimesheet: vi.fn(),
  approveTimesheet: vi.fn(),
  batchApproveTimesheets: vi.fn(),
  getDashboardSummary: vi.fn(),
  getAdminDashboardSummary: vi.fn(),
  calculateTotalHours: vi.fn(),
  calculateTotalPay: vi.fn(),
  groupByStatus: vi.fn(),
  filterByDateRange: vi.fn(),
  getActionableTimesheets: vi.fn(),
  validateTimesheet: vi.fn()
};

/**
 * Mock auth context
 */
export const mockAuthContext = {
  user: createMockAuthUser(),
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn()
};

// =============================================================================
// Test Providers
// =============================================================================

/**
 * Mock AuthContext Provider that creates a direct mock context
 */
export const MockAuthProvider: React.FC<{ 
  children: ReactNode;
  value?: Partial<typeof mockAuthContext>;
}> = ({ children, value = {} }) => {
  const contextValue = { ...mockAuthContext, ...value };
  
  // Create a mock AuthContext
  const MockAuthContext = React.createContext(contextValue);
  
  // Mock the useAuth hook to return our mock context
  React.useLayoutEffect(() => {
    // Mock the useAuth hook by overriding module
    const mockUseAuth = () => contextValue;
    vi.doMock('../../contexts/AuthContext', () => ({
      useAuth: mockUseAuth,
      AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>
    }));
  }, [contextValue]);
  
  return (
    <MockAuthContext.Provider value={contextValue}>
      {children}
    </MockAuthContext.Provider>
  );
};

/**
 * Test wrapper with all providers
 */
export const TestWrapper: React.FC<{
  children: ReactNode;
  authContext?: Partial<typeof mockAuthContext>;
}> = ({ children, authContext = {} }) => {
  return (
    <MockAuthProvider value={authContext}>
      {children}
    </MockAuthProvider>
  );
};

// =============================================================================
// Custom Render Function
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<typeof mockAuthContext>;
}

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { authContext, ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return <TestWrapper authContext={authContext}>{children}</TestWrapper>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock IntersectionObserver for virtualization tests
 */
export function mockIntersectionObserver() {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.IntersectionObserver = mockIntersectionObserver;
  window.IntersectionObserverEntry = vi.fn();
}

/**
 * Mock ResizeObserver for responsive tests
 */
export function mockResizeObserver() {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.ResizeObserver = mockResizeObserver;
}

/**
 * Mock window.matchMedia for responsive tests
 */
export function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  return localStorageMock;
}

/**
 * Mock console methods for test cleanup
 */
export function mockConsole() {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  return originalConsole;
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that element has accessible name
 */
export function expectAccessibleName(element: HTMLElement, name: string | RegExp) {
  if (typeof name === 'string') {
    expect(element).toHaveAccessibleName(name);
  } else {
    expect(element.getAttribute('aria-label')).toMatch(name);
  }
}

/**
 * Assert that element has proper loading state
 */
export function expectLoadingState(element: HTMLElement, loading: boolean) {
  if (loading) {
    expect(element).toHaveAttribute('aria-busy', 'true');
    expect(element.querySelector('[role="status"]')).toBeInTheDocument();
  } else {
    expect(element).not.toHaveAttribute('aria-busy', 'true');
    expect(element.querySelector('[role="status"]')).not.toBeInTheDocument();
  }
}

/**
 * Assert that timesheet data is properly formatted
 */
export function expectFormattedTimesheet(element: HTMLElement, timesheet: Timesheet) {
  expect(element).toHaveTextContent(timesheet.tutorName || `Tutor ${timesheet.tutorId}`);
  expect(element).toHaveTextContent(timesheet.courseCode || `Course ${timesheet.courseId}`);
  expect(element).toHaveTextContent(`${timesheet.hours}h`);
  expect(element).toHaveTextContent(`$${timesheet.hourlyRate.toFixed(2)}`);
}

// =============================================================================
// Performance Testing Helpers
// =============================================================================

/**
 * Measure render performance
 */
export function measureRenderTime(renderFn: () => void): number {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
}

/**
 * Test component with many items for performance
 */
export function testPerformanceWithManyItems<T>(
  Component: ComponentType<{ items: T[] }>,
  createItem: (index: number) => T,
  itemCount: number = 1000,
  maxRenderTime: number = 100
) {
  const items = Array.from({ length: itemCount }, (_, i) => createItem(i));
  
  const renderTime = measureRenderTime(() => {
    render(<Component items={items} />);
  });
  
  expect(renderTime).toBeLessThan(maxRenderTime);
}

// =============================================================================
// Export Everything
// =============================================================================

export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { vi, expect } from 'vitest';

// Re-export render with providers as default render
export { renderWithProviders as render };

// Make the original render available as renderRaw if needed
export { render as renderRaw } from '@testing-library/react';




