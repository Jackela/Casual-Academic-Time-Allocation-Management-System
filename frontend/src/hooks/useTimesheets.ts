/**
 * Enhanced Timesheet Hooks
 * 
 * Optimized React hooks for timesheet operations with caching,
 * automatic refetching, and performance optimizations.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TimesheetService } from '../services/timesheets';
import { useAuth } from '../contexts/AuthContext';
import type {
  Timesheet,
  TimesheetPage,
  TimesheetQuery,
  TimesheetCreateRequest,
  TimesheetUpdateRequest,
  ApprovalRequest,
  ApprovalResponse,
  DashboardSummary
} from '../types/api';

// =============================================================================
// Base Hook Types
// =============================================================================

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface PaginatedState<T> extends AsyncState<T> {
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}

interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook for fetching timesheets with pagination and filtering
 */
export function useTimesheets(initialQuery: TimesheetQuery = {}) {
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState<TimesheetQuery>(initialQuery);
  const [state, setState] = useState<PaginatedState<TimesheetPage>>({
    data: null,
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
    currentPage: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: TimesheetPage; timestamp: number }>>(new Map());
  const queryRef = useRef(query);
  const skipEffectRef = useRef(false);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Update query ref when query changes
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Generate cache key
  const cacheKey = useMemo(() => {
    return JSON.stringify({ ...query, userId: user?.id });
  }, [query, user?.id]);

  // Fetch function with caching
  const fetchTimesheets = useCallback(async (newQuery: TimesheetQuery = {}) => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const key = JSON.stringify({ ...newQuery, userId: user?.id });
    
    // Check cache first
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setState({
        data: cached.data,
        loading: false,
        error: null,
        hasMore: !cached.data.pageInfo.last,
        totalCount: cached.data.pageInfo.totalElements,
        currentPage: cached.data.pageInfo.currentPage
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await TimesheetService.getTimesheets(newQuery);
      
      // Cache the result
      cacheRef.current.set(key, { data, timestamp: Date.now() });
      
      setState({
        data,
        loading: false,
        error: null,
        hasMore: !data.pageInfo.last,
        totalCount: data.pageInfo.totalElements,
        currentPage: data.pageInfo.currentPage
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err.message || 'Failed to fetch timesheets'
        }));
      }
    }
  }, [isAuthenticated, user?.id]);

  // Update query and refetch
  const updateQuery = useCallback((newQuery: Partial<TimesheetQuery>) => {
    const updatedQuery = { ...queryRef.current, ...newQuery };
    skipEffectRef.current = true; // Skip the effect trigger
    setQuery(updatedQuery);
    fetchTimesheets(updatedQuery);
  }, [fetchTimesheets]);

  // Load next page
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      updateQuery({ page: (queryRef.current.page || 0) + 1 });
    }
  }, [state.hasMore, state.loading, updateQuery]);

  // Refresh data
  const refresh = useCallback(() => {
    // Clear cache for this query
    const currentCacheKey = JSON.stringify({ ...queryRef.current, userId: user?.id });
    cacheRef.current.delete(currentCacheKey);
    fetchTimesheets(queryRef.current);
  }, [fetchTimesheets, user?.id]);

  // Reset to first page
  const reset = useCallback(() => {
    const resetQuery = { ...queryRef.current, page: 0 };
    setQuery(resetQuery);
    fetchTimesheets(resetQuery);
  }, [fetchTimesheets]);

  // Effect to fetch data when authenticated and query changes
  useEffect(() => {
    if (skipEffectRef.current) {
      skipEffectRef.current = false;
      return;
    }
    
    if (isAuthenticated && user?.id) {
      fetchTimesheets(queryRef.current);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, user?.id, JSON.stringify(query)]);

  // Cleanup cache periodically (reduce frequency to avoid timeouts)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cache = cacheRef.current;
      
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          cache.delete(key);
        }
      }
    }, CACHE_DURATION * 2); // Clean up less frequently

    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    query,
    updateQuery,
    loadMore,
    refresh,
    reset,
    // Computed values
    timesheets: state.data?.timesheets || [],
    pageInfo: state.data?.pageInfo || null,
    isEmpty: state.data === null || state.data.timesheets.length === 0
  };
}

/**
 * Hook for fetching pending timesheets (lecturer-specific)
 */
export function usePendingTimesheets() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<AsyncState<TimesheetPage>>({
    data: null,
    loading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPendingTimesheets = useCallback(async () => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await TimesheetService.getPendingTimesheets();
      setState({ data, loading: false, error: null });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err.message || 'Failed to fetch pending timesheets'
        }));
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingTimesheets();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPendingTimesheets, isAuthenticated]);

  return {
    ...state,
    refetch: fetchPendingTimesheets,
    timesheets: state.data?.timesheets || [],
    pageInfo: state.data?.pageInfo || null,
    isEmpty: !state.loading && (!state.data?.timesheets || state.data.timesheets.length === 0)
  };
}

/**
 * Hook for fetching dashboard summary
 */
export function useDashboardSummary(isAdmin: boolean = false) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<AsyncState<DashboardSummary>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchSummary = useCallback(async () => {
    if (!isAuthenticated) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = isAdmin 
        ? await TimesheetService.getAdminDashboardSummary()
        : await TimesheetService.getDashboardSummary();
      
      setState({ data, loading: false, error: null });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch dashboard summary'
      }));
    }
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary();
    }
  }, [fetchSummary, isAuthenticated]);

  return {
    ...state,
    refetch: fetchSummary
  };
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for approval actions
 */
export function useApprovalAction() {
  const [state, setState] = useState<MutationState<ApprovalResponse>>({
    data: null,
    loading: false,
    error: null
  });

  const approveTimesheet = useCallback(async (request: ApprovalRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await TimesheetService.approveTimesheet(request);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err: any) {
      const error = err.message || 'Failed to process approval';
      setState({ data: null, loading: false, error });
      throw new Error(error);
    }
  }, []);

  const batchApprove = useCallback(async (requests: ApprovalRequest[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const responses = await TimesheetService.batchApproveTimesheets(requests);
      setState({ data: responses[0], loading: false, error: null }); // Return first response
      return responses;
    } catch (err: any) {
      const error = err.message || 'Failed to process batch approval';
      setState({ data: null, loading: false, error });
      throw new Error(error);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    approveTimesheet,
    batchApprove,
    reset
  };
}

/**
 * Hook for creating timesheets
 */
export function useCreateTimesheet() {
  const [state, setState] = useState<MutationState<Timesheet>>({
    data: null,
    loading: false,
    error: null
  });

  const createTimesheet = useCallback(async (data: TimesheetCreateRequest) => {
    // Validate data first
    const validationErrors = TimesheetService.validateTimesheet(data);
    if (validationErrors.length > 0) {
      const error = validationErrors.join(', ');
      setState({ data: null, loading: false, error });
      throw new Error(error);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const timesheet = await TimesheetService.createTimesheet(data);
      setState({ data: timesheet, loading: false, error: null });
      return timesheet;
    } catch (err: any) {
      const error = err.message || 'Failed to create timesheet';
      setState({ data: null, loading: false, error });
      throw new Error(error);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    createTimesheet,
    reset
  };
}

/**
 * Hook for updating timesheets
 */
export function useUpdateTimesheet() {
  const [state, setState] = useState<MutationState<Timesheet>>({
    data: null,
    loading: false,
    error: null
  });

  const updateTimesheet = useCallback(async (id: number, data: TimesheetUpdateRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const timesheet = await TimesheetService.updateTimesheet(id, data);
      setState({ data: timesheet, loading: false, error: null });
      return timesheet;
    } catch (err: any) {
      const error = err.message || 'Failed to update timesheet';
      setState({ data: null, loading: false, error });
      throw new Error(error);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    updateTimesheet,
    reset
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook for timesheet statistics
 */
export function useTimesheetStats(timesheets: Timesheet[]) {
  return useMemo(() => {
    const totalHours = TimesheetService.calculateTotalHours(timesheets);
    const totalPay = TimesheetService.calculateTotalPay(timesheets);
    const groupedByStatus = TimesheetService.groupByStatus(timesheets);
    
    const statusCounts = Object.entries(groupedByStatus).reduce((acc, [status, sheets]) => {
      acc[status] = sheets.length;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalHours,
      totalPay,
      totalCount: timesheets.length,
      groupedByStatus,
      statusCounts,
      averageHoursPerTimesheet: timesheets.length > 0 ? totalHours / timesheets.length : 0,
      averagePayPerTimesheet: timesheets.length > 0 ? totalPay / timesheets.length : 0
    };
  }, [timesheets]);
}

/**
 * Hook for actionable timesheets based on user role
 */
export function useActionableTimesheets(timesheets: Timesheet[], userRole?: string) {
  return useMemo(() => {
    if (!userRole) return [];
    return TimesheetService.getActionableTimesheets(timesheets, userRole);
  }, [timesheets, userRole]);
}