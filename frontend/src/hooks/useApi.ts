/**
 * Custom Hooks for API Operations
 * 
 * Centralized API logic with built-in error handling, loading states,
 * and performance optimizations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { secureApiClient } from '../services/api-secure';
import { secureLogger } from '../utils/secure-logger';
import type {
  Timesheet,
  TimesheetPage,
  TimesheetQuery,
  DashboardSummary,
  ApprovalRequest,
  ApprovalResponse,
} from '../types/api';

// =============================================================================
// Base Hook Types
// =============================================================================

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiActions {
  refetch: () => Promise<void>;
  reset: () => void;
}

type UseApiResult<T> = ApiState<T> & ApiActions;

// =============================================================================
// Base API Hook
// =============================================================================

function useApi<T>(
  endpoint: string,
  options: {
    immediate?: boolean;
    dependencies?: any[];
    transform?: (data: any) => T;
  } = {}
): UseApiResult<T> {
  const { token } = useAuth();
  const { immediate = true, dependencies = [], transform } = options;
  
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!token) {
      setState(prev => ({ ...prev, error: 'No authentication token available' }));
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      secureLogger.debug('API Request', { endpoint });
      
      const response = await secureApiClient.get<T>(endpoint, {
        signal: abortControllerRef.current.signal
      });
      
      const data = transform ? transform(response.data) : response.data!;
      
      setState({
        data,
        loading: false,
        error: null
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        // Request was cancelled, don't update state
        return;
      }
      
      let errorMessage = 'An unexpected error occurred';
      
      if (err.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (err.status === 403) {
        errorMessage = 'You do not have permission to access this resource.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setState({
        data: null,
        loading: false,
        error: errorMessage
      });
      
      secureLogger.error(`API Error for ${endpoint}`, err);
    }
  }, [endpoint, token, transform]);
  
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      data: null,
      loading: false,
      error: null
    });
  }, []);
  
  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate, ...dependencies]);
  
  return {
    ...state,
    refetch: fetchData,
    reset
  };
}

// =============================================================================
// Specialized API Hooks
// =============================================================================

/**
 * Hook for fetching timesheet data with pagination and filtering
 */
export function useTimesheets(query: TimesheetQuery = {}) {
  const queryString = new URLSearchParams({
    page: (query.page || 0).toString(),
    size: (query.size || 20).toString(),
    ...(query.status && { status: query.status }),
    ...(query.tutorId && { tutorId: query.tutorId.toString() }),
    ...(query.courseId && { courseId: query.courseId.toString() }),
    ...(query.weekStartDate && { weekStartDate: query.weekStartDate }),
    ...(query.sortBy && { sortBy: query.sortBy }),
    ...(query.sortDirection && { sortDirection: query.sortDirection })
  }).toString();
  
  return useApi<TimesheetPage>(`/api/timesheets?${queryString}`, {
    dependencies: [JSON.stringify(query)],
    transform: (data: any) => ({
      success: data.success ?? true,
      timesheets: data.timesheets ?? data.content ?? data.data ?? [],
      pageInfo: data.pageInfo ?? data.page ?? {
        currentPage: query.page || 0,
        pageSize: query.size || 20,
        totalElements: data.timesheets?.length ?? 0,
        totalPages: 1,
        first: true,
        last: true,
        numberOfElements: data.timesheets?.length ?? 0,
        empty: !data.timesheets?.length
      }
    })
  });
}

/**
 * Hook for fetching pending timesheets for lecturer approval
 */
export function usePendingTimesheets() {
  return useApi<TimesheetPage>('/api/timesheets/pending-final-approval', {
    transform: (data: any) => ({
      success: data.success ?? true,
      timesheets: data.timesheets ?? data.content ?? data.data ?? [],
      pageInfo: data.pageInfo ?? data.page ?? {
        currentPage: 0,
        pageSize: 20,
        totalElements: data.timesheets?.length ?? 0,
        totalPages: 1,
        first: true,
        last: true,
        numberOfElements: data.timesheets?.length ?? 0,
        empty: !data.timesheets?.length
      }
    })
  });
}

/**
 * Hook for fetching dashboard summary data
 */
export function useDashboardSummary() {
  return useApi<DashboardSummary>('/api/dashboard/summary');
}

/**
 * Hook for fetching admin dashboard summary
 */
export function useAdminDashboardSummary() {
  return useApi<DashboardSummary>('/api/dashboard/summary');
}

// =============================================================================
// Mutation Hooks
// =============================================================================

interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: string, variables: TVariables) => void;
}

interface MutationState<TData> {
  data: TData | null;
  loading: boolean;
  error: string | null;
}

interface MutationActions<TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  reset: () => void;
}

type UseMutationResult<TData, TVariables> = MutationState<TData> & MutationActions<TVariables>;

function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables, token: string) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { token } = useAuth();
  const { onSuccess, onError } = options;
  
  const [state, setState] = useState<MutationState<TData>>({
    data: null,
    loading: false,
    error: null
  });
  
  const mutate = useCallback(async (variables: TVariables) => {
    if (!token) {
      const error = 'No authentication token available';
      setState({ data: null, loading: false, error });
      onError?.(error, variables);
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await mutationFn(variables, token);
      setState({ data, loading: false, error: null });
      onSuccess?.(data, variables);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'An unexpected error occurred';

      setState({ data: null, loading: false, error: errorMessage });
      onError?.(errorMessage, variables);
      secureLogger.error('Mutation Error', error);
    }
  }, [mutationFn, token, onSuccess, onError]);
  
  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);
  
  return { ...state, mutate, reset };
}

/**
 * Hook for approving/rejecting timesheets
 */
export function useApprovalAction(options: UseMutationOptions<ApprovalResponse, ApprovalRequest> = {}) {
  return useMutation<ApprovalResponse, ApprovalRequest>(
    async (variables) => {
      const response = await secureApiClient.post<ApprovalResponse>(
        '/api/approvals',
        variables
      );
      return response.data!;
    },
    options
  );
}

/**
 * Hook for creating timesheets
 */
export function useCreateTimesheet(options: UseMutationOptions<Timesheet, Omit<Timesheet, 'id' | 'createdAt' | 'updatedAt'>> = {}) {
  return useMutation<Timesheet, Omit<Timesheet, 'id' | 'createdAt' | 'updatedAt'>>(
    async (variables) => {
      const response = await secureApiClient.post<Timesheet>(
        '/api/timesheets',
        variables
      );
      return response.data!;
    },
    options
  );
}

/**
 * Hook for updating timesheets
 */
export function useUpdateTimesheet(options: UseMutationOptions<Timesheet, { id: number } & Partial<Timesheet>> = {}) {
  return useMutation<Timesheet, { id: number } & Partial<Timesheet>>(
    async (variables) => {
      const { id, ...updateData } = variables;
      const response = await secureApiClient.put<Timesheet>(
        `/api/timesheets/${id}`,
        updateData
      );
      return response.data!;
    },
    options
  );
}




