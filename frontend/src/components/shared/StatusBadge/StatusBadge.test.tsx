import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { TimesheetStatus } from '../../../types/api';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  const statusCases = [
    {
      status: 'DRAFT',
      expectedLabel: 'Draft',
      expectedVariant: 'outline',
    },
    {
      status: 'PENDING_TUTOR_CONFIRMATION',
      expectedLabel: 'Pending Tutor Review',
      expectedVariant: 'info',
    },
    {
      status: 'TUTOR_CONFIRMED',
      expectedLabel: 'Tutor Confirmed',
      expectedVariant: 'warning',
    },
    {
      status: 'LECTURER_CONFIRMED',
      expectedLabel: 'Lecturer Confirmed',
      expectedVariant: 'warning',
    },
    {
      status: 'FINAL_CONFIRMED',
      expectedLabel: 'Final Approved',
      expectedVariant: 'success',
    },
    {
      status: 'REJECTED',
      expectedLabel: 'Rejected',
      expectedVariant: 'destructive',
    },
    {
      status: 'MODIFICATION_REQUESTED',
      expectedLabel: 'Modification Requested',
      expectedVariant: 'destructive',
    },
  ] satisfies Array<{
    status: TimesheetStatus;
    expectedLabel: string;
    expectedVariant: string;
  }>;

  it.each(statusCases)(
    'renders the correct label and variant for %s',
    ({ status, expectedLabel, expectedVariant }) => {
      const testId = `status-badge-${status.toLowerCase()}-test`;
      render(<StatusBadge status={status} dataTestId={testId} />);

      const badge = screen.getByTestId(testId);

      expect(badge).toHaveTextContent(expectedLabel);
      // New StatusBadge uses data-variant attribute from Badge component
      expect(badge).toHaveAttribute('data-variant', expectedVariant);
      expect(badge).toHaveAttribute(
        'aria-label',
        expect.stringContaining(expectedLabel),
      );
    },
  );
});
