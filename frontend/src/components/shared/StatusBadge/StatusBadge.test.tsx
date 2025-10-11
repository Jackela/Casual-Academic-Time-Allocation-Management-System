import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { TimesheetStatus } from '../../../types/api';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  const statusCases = [
    {
      status: 'DRAFT',
      expectedLabel: 'Draft',
      expectedClassSubstring: 'bg-secondary',
    },
    {
      status: 'PENDING_TUTOR_CONFIRMATION',
      expectedLabel: 'Pending Tutor Review',
      expectedClassSubstring: 'bg-amber-500',
    },
    {
      status: 'TUTOR_CONFIRMED',
      expectedLabel: 'Approved by Tutor',
      expectedClassSubstring: 'bg-emerald-500',
    },
    {
      status: 'LECTURER_CONFIRMED',
      expectedLabel: 'Approved by Lecturer',
      expectedClassSubstring: 'bg-blue-500',
    },
    {
      status: 'FINAL_CONFIRMED',
      expectedLabel: 'Final Approved',
      expectedClassSubstring: 'bg-primary',
    },
    {
      status: 'REJECTED',
      expectedLabel: 'Rejected',
      expectedClassSubstring: 'bg-destructive',
    },
    {
      status: 'MODIFICATION_REQUESTED',
      expectedLabel: 'Modification Requested',
      expectedClassSubstring: 'bg-amber-500',
    },
  ] satisfies Array<{
    status: TimesheetStatus;
    expectedLabel: string;
    expectedClassSubstring: string;
  }>;

  it.each(statusCases)(
    'renders the correct label and variant for %s',
    ({ status, expectedLabel, expectedClassSubstring }) => {
      const testId = `status-badge-${status.toLowerCase()}-test`;
      render(<StatusBadge status={status} dataTestId={testId} />);

      const badge = screen.getByTestId(testId);

      expect(badge).toHaveTextContent(expectedLabel);
      expect(badge.className).toContain(expectedClassSubstring);
      expect(badge).toHaveAttribute(
        'aria-label',
        expect.stringContaining(expectedLabel),
      );
    },
  );
});
