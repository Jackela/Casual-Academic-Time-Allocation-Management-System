import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useTimesheetQuery } from './useTimesheetQuery';
import { TimesheetService } from '../../services/timesheets';
import { useAuth } from '../../contexts/AuthContext';
import { createMockTimesheetPage, createMockUser, waitForAsync } from '../../test/utils/test-utils';
import type { TimesheetQuery } from '../../types/api';

vi.mock('../../services/timesheets', () => ({
  TimesheetService: {
    getTimesheets: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockTimesheetService = TimesheetService as unknown as {
  getTimesheets: ReturnType<typeof vi.fn>;
};

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

const baseUser = createMockUser({ id: 1, role: 'TUTOR' });

const renderUseTimesheetQuery = (initialQuery: TimesheetQuery = {}) =>
  renderHook(() => useTimesheetQuery(initialQuery));

describe('useTimesheetQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: baseUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });
    mockTimesheetService.getTimesheets.mockResolvedValue(createMockTimesheetPage(5));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches timesheets on mount when authenticated', async () => {
    renderUseTimesheetQuery();

    await waitFor(() => expect(mockTimesheetService.getTimesheets).toHaveBeenCalled());

    const [query, signal] = mockTimesheetService.getTimesheets.mock.calls[0] as [TimesheetQuery, AbortSignal];
    expect(query).toMatchObject({
      page: 0,
      size: 10,
      sort: 'createdAt,DESC',
      tutorId: baseUser.id,
    });
    expect(signal).toHaveProperty('aborted', false);
  });

  it('derives pagination metadata from responses', async () => {
    const page = createMockTimesheetPage(5, {
      totalElements: 125,
      last: false,
    });
    mockTimesheetService.getTimesheets.mockResolvedValueOnce(page);

    const { result } = renderUseTimesheetQuery();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalCount).toBe(125);
    expect(result.current.hasMore).toBe(true);
  });

  it('does not fetch when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });

    renderUseTimesheetQuery();

    await waitForAsync(50);
    expect(mockTimesheetService.getTimesheets).not.toHaveBeenCalled();
  });

  it('surfaces fetch errors', async () => {
    mockTimesheetService.getTimesheets.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderUseTimesheetQuery();

    await waitFor(() => expect(result.current.error).toBe('Network error'));
    expect(result.current.loading).toBe(false);
  });

  it('updates query and refetches data', async () => {
    const { result } = renderUseTimesheetQuery();

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockTimesheetService.getTimesheets.mockClear();

    act(() => {
      result.current.updateQuery({ status: 'LECTURER_CONFIRMED' });
    });

    await waitFor(() => expect(mockTimesheetService.getTimesheets).toHaveBeenCalled());
    const [query] = mockTimesheetService.getTimesheets.mock.calls[0] as [TimesheetQuery];
    expect(query).toMatchObject({ status: 'LECTURER_CONFIRMED' });
  });

  it('serves cached results for identical queries', async () => {
    const { result } = renderUseTimesheetQuery();

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockTimesheetService.getTimesheets.mockClear();

    act(() => {
      result.current.updateQuery({});
    });

    await waitForAsync(50);
    expect(mockTimesheetService.getTimesheets).not.toHaveBeenCalled();
  });

  it('refresh clears cache and triggers a new request', async () => {
    const { result } = renderUseTimesheetQuery();

    await waitFor(() => expect(result.current.loading).toBe(false));
    const refreshedPage = createMockTimesheetPage(3);
    mockTimesheetService.getTimesheets.mockResolvedValueOnce(refreshedPage);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.data).toEqual(refreshedPage));
  });

  it('clears cached data when refetching', async () => {
    const { result } = renderUseTimesheetQuery();

    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCalls = mockTimesheetService.getTimesheets.mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(mockTimesheetService.getTimesheets.mock.calls.length).toBe(initialCalls + 1));
  });

  it('handles authentication changes gracefully', async () => {
    const { result, rerender } = renderHook(() => useTimesheetQuery());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });

    rerender();

    await waitFor(() => expect(result.current.error).toBe('Not authenticated'));
    expect(result.current.timesheets).toEqual([]);
  });

  it('ignores aborted requests', async () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    mockTimesheetService.getTimesheets.mockRejectedValueOnce(abortError);

    const { result } = renderUseTimesheetQuery();

    await waitForAsync(50);
    expect(result.current.error).toBeNull();
  });

  it('omits tutorId for non-tutor roles', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, role: 'ADMIN' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    });

    renderUseTimesheetQuery();

    await waitFor(() => expect(mockTimesheetService.getTimesheets).toHaveBeenCalled());
    const [query] = mockTimesheetService.getTimesheets.mock.calls[0] as [TimesheetQuery];
    expect(query).not.toHaveProperty('tutorId');
  });
});
