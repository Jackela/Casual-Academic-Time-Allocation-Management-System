import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TimesheetService } from '../../services/timesheets';
import { TIMESHEET_CACHE_DURATION_MS, PAGE_SIZE } from './utils';
import type { TimesheetPage, TimesheetQuery } from '../../types/api';

interface PaginatedState {
  data: TimesheetPage | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}

export interface UseTimesheetQueryOptions extends TimesheetQuery {
  staleTimeMs?: number;
}

const derivePaginationMeta = (page: TimesheetPage | null) => {
  const pageInfo = page?.pageInfo;
  const totalCount = pageInfo?.totalElements ?? page?.timesheets?.length ?? 0;
  const hasMore = pageInfo ? !pageInfo.last : false;
  return { hasMore, totalCount };
};

export interface TimesheetQueryResult {
  data: TimesheetPage | null;
  timesheets: TimesheetPage['timesheets'];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
  updateQuery: (update: Partial<TimesheetQuery>) => void;
}

export const useTimesheetQuery = (initialQuery: UseTimesheetQueryOptions = {}): TimesheetQueryResult => {
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState<TimesheetQuery>(initialQuery);
  const [state, setState] = useState<PaginatedState>({
    data: null,
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
    currentPage: initialQuery.page ?? 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: TimesheetPage; timestamp: number }>>(new Map());
  const queryRef = useRef(query);
  const skipEffectRef = useRef(false);
  const staleTimeMs = initialQuery.staleTimeMs ?? TIMESHEET_CACHE_DURATION_MS;

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const fetchTimesheets = useCallback(async (nextQuery: TimesheetQuery = {}) => {
    if (!isAuthenticated) {
      setState({
        data: null,
        loading: false,
        error: 'Not authenticated',
        hasMore: false,
        totalCount: 0,
        currentPage: 0
      });
      cacheRef.current.clear();
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const tutorFilter = user?.role === 'TUTOR' ? { tutorId: user.id } : {};

    const mergedQuery: TimesheetQuery = {
      page: 0,
      size: PAGE_SIZE,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      ...tutorFilter,
      ...queryRef.current,
      ...nextQuery
    };
    setState(prev => ({ ...prev, loading: true, error: null }));

    const cacheKey = JSON.stringify(mergedQuery);
    const cachedValue = cacheRef.current.get(cacheKey);

    if (cachedValue && Date.now() - cachedValue.timestamp < staleTimeMs) {
      const meta = derivePaginationMeta(cachedValue.data);
      setState(prev => ({
        ...prev,
        data: cachedValue.data,
        loading: false,
        error: null,
        hasMore: meta.hasMore,
        totalCount: meta.totalCount,
        currentPage: mergedQuery.page ?? 0
      }));
      return;
    }

    try {
      const response = await TimesheetService.getTimesheets(mergedQuery, controller.signal);
      cacheRef.current.set(cacheKey, { data: response, timestamp: Date.now() });
      const meta = derivePaginationMeta(response);
      setState({
        data: response,
        loading: false,
        error: null,
        hasMore: meta.hasMore,
        totalCount: meta.totalCount,
        currentPage: mergedQuery.page ?? 0
      });
      setQuery(mergedQuery);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch timesheets'
      }));
    }
  }, [isAuthenticated, staleTimeMs, user?.id, user?.role]);

  useEffect(() => {
    if (skipEffectRef.current) {
      skipEffectRef.current = false;
      return;
    }
    fetchTimesheets(queryRef.current).catch(console.error);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchTimesheets]);

  const refetch = useCallback(async () => {
    cacheRef.current.clear();
    await fetchTimesheets(queryRef.current);
  }, [fetchTimesheets]);

  const refresh = useCallback(async () => {
    cacheRef.current.clear();
    await fetchTimesheets({ ...queryRef.current, page: 0 });
  }, [fetchTimesheets]);

  const updateQuery = useCallback((update: Partial<TimesheetQuery>) => {
    const next = { ...queryRef.current, ...update };
    queryRef.current = next;
    skipEffectRef.current = true;
    fetchTimesheets(next).catch(console.error);
  }, [fetchTimesheets]);

  const timesheets = useMemo(() => state.data?.timesheets ?? [], [state.data?.timesheets]);

  return {
    data: state.data,
    timesheets,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    totalCount: state.totalCount,
    currentPage: state.currentPage,
    refetch,
    refresh,
    updateQuery
  };
};
