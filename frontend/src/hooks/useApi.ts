/**
 * Custom Hooks for API Operations
 * 
 * Centralized API logic with built-in error handling, loading states,
 * and performance optimizations.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type DependencyList } from 'react';
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
  PageInfo,
  ApiErrorResponse,
} from '../types/api';
type RawTimesheetCollection = Partial<TimesheetPage> & {
  content?: Timesheet[];
  data?: Timesheet[];
  page?: PageInfo;
};

interface UseApiOptions<TResponse, TData> {
  immediate?: boolean;
  dependencies?: DependencyList;
  transform?: (data: TResponse) => TData;
}

interface ApiState<TData> {
  data: TData | null;
  loading: boolean;
  error: string | null;
}

interface ApiActions {
  refetch: () => Promise<void>;
  reset: () => void;
}

type UseApiResult<TData> = ApiState<TData> & ApiActions;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: string; name?: string };
    return candidate.name === 'AbortError' || candidate.code === 'ERR_CANCELED';
  }
  return false;
};

const isApiErrorResponse = (error: unknown): error is ApiErrorResponse => {
  if (!isRecord(error)) {
    return false;
  }
  return error.success === false && 'error' in error;
};


// =============================================================================
// Base API Hook
// =============================================================================

function useApi<TResponse, TData = TResponse>(
  endpoint: string,
  options: UseApiOptions<TResponse, TData> = {},
): UseApiResult<TData> {
  const { token } = useAuth();
  const {
    immediate = true,
    dependencies = [] as DependencyList,
    transform,
  } = options;

  const [state, setState] = useState<ApiState<TData>>({
    data: null,
    loading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const transformRef = useRef<((data: TResponse) => TData) | undefined>(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const fetchData = useCallback(async () => {
    if (!token) {
      setState((previous) => ({ ...previous, error: 'No authentication token available' }));
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      secureLogger.debug('API Request', { endpoint });
      const response = await secureApiClient.get<TResponse>(endpoint, { signal: controller.signal });
      const transformFn = transformRef.current;
      const rawData = response.data;
      const nextData = transformFn ? transformFn(rawData) : (rawData as unknown as TData);

      setState({
        data: nextData,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      let errorMessage = 'An unexpected error occurred';

      if (isApiErrorResponse(error)) {
        errorMessage = error.message || error.error.message || errorMessage;
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });

      secureLogger.error(`API Error for ${endpoint}`, error);
    }
  }, [endpoint, token]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (!immediate) {
      return;
    }

    void fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate, dependencies]);

  return {
    ...state,
    refetch: fetchData,
    reset,
  };
}

// =============================================================================
// Specialized API Hooks
// =============================================================================

const transformPendingTimesheets = (data: RawTimesheetCollection): TimesheetPage => {
  const timesheets = data.timesheets ?? data.content ?? data.data ?? [];
  const fallbackPageInfo: PageInfo = {
    currentPage: 0,
    pageSize: 20,
    totalElements: timesheets.length,
    totalPages: 1,
    first: true,
    last: true,
    numberOfElements: timesheets.length,
    empty: timesheets.length === 0,
  };

  const pageInfo = data.pageInfo ?? data.page ?? fallbackPageInfo;

  return {
    success: data.success ?? true,
    timesheets,
    pageInfo,
  };
};

/**
 * Hook for fetching timesheet data with pagination and filtering
 */
export function useTimesheets(query: TimesheetQuery = {}) {
  const stringifiedQuery = useMemo(() => JSON.stringify(query), [query]);

  const normalizedQuery = useMemo<TimesheetQuery>(() => JSON.parse(stringifiedQuery), [stringifiedQuery]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: (normalizedQuery.page ?? 0).toString(),
      size: (normalizedQuery.size ?? 20).toString(),
      ...(normalizedQuery.status && { status: normalizedQuery.status }),
      ...(normalizedQuery.tutorId && { tutorId: normalizedQuery.tutorId.toString() }),
      ...(normalizedQuery.courseId && { courseId: normalizedQuery.courseId.toString() }),
      ...(normalizedQuery.weekStartDate && { weekStartDate: normalizedQuery.weekStartDate }),
      ...(normalizedQuery.sortBy && { sortBy: normalizedQuery.sortBy }),
      ...(normalizedQuery.sortDirection && { sortDirection: normalizedQuery.sortDirection }),
    });

    return params.toString();
  }, [normalizedQuery]);

  const transformTimesheets = useMemo<(payload: RawTimesheetCollection) => TimesheetPage>(() => {
    return (data) => {
      const timesheets = data.timesheets ?? data.content ?? data.data ?? [];
      const fallbackPageInfo: PageInfo = {
        currentPage: normalizedQuery.page ?? 0,
        pageSize: normalizedQuery.size ?? 20,
        totalElements: timesheets.length,
        totalPages: 1,
        first: true,
        last: true,
        numberOfElements: timesheets.length,
        empty: timesheets.length === 0,
      };

      const pageInfo = data.pageInfo ?? data.page ?? fallbackPageInfo;

      return {
        success: data.success ?? true,
        timesheets,
        pageInfo,
      };
    };
  }, [normalizedQuery]);

  return useApi<RawTimesheetCollection, TimesheetPage>(`/api/timesheets?${queryString}`, {
    dependencies: [stringifiedQuery],
    transform: transformTimesheets,
  });
}

/**
 * Hook for fetching pending timesheets for lecturer approval
 */
export function usePendingTimesheets() {
  return useApi<RawTimesheetCollection, TimesheetPage>('/api/timesheets/pending-final-approval', {
    transform: transformPendingTimesheets,
  });
}

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
      return response.data;
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
      return response.data;
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
      return response.data;
    },
    options
  );
}








