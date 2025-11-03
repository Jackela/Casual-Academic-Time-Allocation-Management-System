import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApprovalHistory from './ApprovalHistory';
import { TimesheetService } from '../../../services/timesheets';

vi.mock('../../../services/timesheets', () => ({
  TimesheetService: {
    getApprovalHistory: vi.fn(),
  },
}));

const mockSvc = TimesheetService as unknown as {
  getApprovalHistory: ReturnType<typeof vi.fn<[number], Promise<readonly any[]>>>;
};

describe('ApprovalHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no events', async () => {
    mockSvc.getApprovalHistory.mockResolvedValue([]);
    render(<ApprovalHistory timesheetId={123} />);
    await waitFor(() => expect(screen.queryByTestId('history-loading')).not.toBeInTheDocument());
    expect(screen.getByTestId('history-empty')).toBeInTheDocument();
    expect(mockSvc.getApprovalHistory).toHaveBeenCalledWith(123);
  });

  it('renders list of events', async () => {
    mockSvc.getApprovalHistory.mockResolvedValue([
      { actor: 'Tutor A', action: 'TUTOR_CONFIRM', comment: 'Ok', timestamp: '2025-01-01T10:00:00Z' },
      { actor: { name: 'Lecturer B' }, action: 'LECTURER_CONFIRM', comment: 'LGTM', timestamp: '2025-01-02T12:00:00Z' },
    ]);
    render(<ApprovalHistory timesheetId={9} />);
    await waitFor(() => expect(screen.queryByTestId('history-loading')).not.toBeInTheDocument());

    const list = screen.getByTestId('history-list');
    expect(list).toBeInTheDocument();
    expect(screen.getAllByTestId('history-item-0').length || 1).toBeTruthy();
    expect(screen.getAllByTestId('history-actor').map(el => el.textContent)).toContain('Tutor A');
    expect(screen.getAllByTestId('history-action').map(el => el.textContent)).toContain('TUTOR_CONFIRM');
  });

  it('shows error message on failure', async () => {
    mockSvc.getApprovalHistory.mockRejectedValue(new Error('Boom'));
    render(<ApprovalHistory timesheetId={5} />);
    await waitFor(() => expect(screen.queryByTestId('history-loading')).not.toBeInTheDocument());
    expect(screen.getByTestId('history-error')).toHaveTextContent('Boom');
  });
});

