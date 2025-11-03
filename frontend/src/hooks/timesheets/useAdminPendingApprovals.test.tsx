import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminPendingApprovals } from './useAdminPendingApprovals';
import { TimesheetService } from '../../services/timesheets';
import { useAuth } from '../../contexts/AuthContext';
import { createMockTimesheetPage, createMockUser } from '../../test/utils/test-utils';

vi.mock('../../services/timesheets', () => ({
  TimesheetService: {
    getPendingApprovals: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

const svc = TimesheetService as unknown as {
  getPendingApprovals: ReturnType<typeof vi.fn<[AbortSignal?], Promise<ReturnType<typeof createMockTimesheetPage>>>>;
};
const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

describe('useAdminPendingApprovals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: createMockUser({ role: 'ADMIN' }), isAuthenticated: true });
    svc.getPendingApprovals.mockResolvedValue(createMockTimesheetPage(2));
  });

  it('calls getPendingApprovals on mount', async () => {
    const { result } = renderHook(() => useAdminPendingApprovals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(svc.getPendingApprovals).toHaveBeenCalled();
  });
});

