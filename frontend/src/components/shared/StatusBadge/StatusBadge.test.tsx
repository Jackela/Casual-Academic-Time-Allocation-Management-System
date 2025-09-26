/**
 * StatusBadge Component Tests
 *
 * Validates the SSOT lifecycle statuses and supporting helpers.
 */

import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event'; // No longer interactive
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusBadge, {
  // StatusBadgeGroup, // Group component removed for simplicity in refactor
  getStatusConfig,
  getStatusPriority,
  isActionableStatus,
  getNextStatuses,
} from './StatusBadge';
import { badgeVariants } from '../../ui/badge';
import type { TimesheetStatus } from '../../../types/api';

const ssotStatuses = [
  'DRAFT',
  'PENDING_TUTOR_CONFIRMATION',
  'TUTOR_CONFIRMED',
  'LECTURER_CONFIRMED',
  'FINAL_CONFIRMED',
  'REJECTED',
  'MODIFICATION_REQUESTED',
] as const;

type SsotStatus = typeof ssotStatuses[number];

const statusLabels: Record<SsotStatus, string> = {
  DRAFT: 'Draft',
  PENDING_TUTOR_CONFIRMATION: 'Pending Tutor Confirmation',
  TUTOR_CONFIRMED: 'Tutor Confirmed',
  LECTURER_CONFIRMED: 'Lecturer Confirmed',
  FINAL_CONFIRMED: 'Final Confirmed',
  REJECTED: 'Rejected',
  MODIFICATION_REQUESTED: 'Modification Requested',
};

describe('StatusBadge Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(ssotStatuses)('renders %s with the correct label and variant', (status) => {
    render(<StatusBadge status={status} />);
    // The data-testid is now dynamic based on the status, not hardcoded.
    const badge = screen.getByTestId(`status-badge-${status.toLowerCase()}`);
    const config = getStatusConfig(status);

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(statusLabels[status]);
    
    const variantClass = badgeVariants({ variant: config.variant });
    expect(badge.className).toEqual(expect.stringContaining(variantClass.split(' ')[0]));
  });

  it('follows the SSOT lifecycle in order', () => {
    const { rerender } = render(<StatusBadge status="DRAFT" />);
    expect(screen.getByTestId('status-badge-draft')).toHaveTextContent('Draft');

    rerender(<StatusBadge status="PENDING_TUTOR_CONFIRMATION" />);
    expect(screen.getByTestId('status-badge-pending_tutor_confirmation')).toHaveTextContent('Pending Tutor Confirmation');

    rerender(<StatusBadge status="TUTOR_CONFIRMED" />);
    expect(screen.getByTestId('status-badge-tutor_confirmed')).toHaveTextContent('Tutor Confirmed');

    rerender(<StatusBadge status="LECTURER_CONFIRMED" />);
    expect(screen.getByTestId('status-badge-lecturer_confirmed')).toHaveTextContent('Lecturer Confirmed');

    rerender(<StatusBadge status="FINAL_CONFIRMED" />);
    expect(screen.getByTestId('status-badge-final_confirmed')).toHaveTextContent('Final Confirmed');
  });

  it('falls back to draft configuration when status is unknown', () => {
    render(<StatusBadge status={'UNKNOWN' as TimesheetStatus} />);
    // The test ID is now based on the fallback status 'DRAFT'
    const badge = screen.getByTestId('status-badge-unknown');
    const fallbackConfig = getStatusConfig('DRAFT');

    expect(badge).toHaveTextContent('Draft');
    const variantClass = badgeVariants({ variant: fallbackConfig.variant });
    expect(badge.className).toEqual(expect.stringContaining(variantClass.split(' ')[0]));
  });
});

describe('StatusBadge helpers', () => {
  it('returns status configuration for SSOT statuses', () => {
    ssotStatuses.forEach((status) => {
      const config = getStatusConfig(status);
      expect(config.label).toBe(statusLabels[status]);
      expect(config.description.length).toBeGreaterThan(0);
      expect(config.variant).toBeDefined();
    });
  });

  it('prioritises pending confirmations above terminal states', () => {
    expect(getStatusPriority('PENDING_TUTOR_CONFIRMATION')).toBeGreaterThan(getStatusPriority('DRAFT'));
    expect(getStatusPriority('LECTURER_CONFIRMED')).toBeGreaterThan(getStatusPriority('FINAL_CONFIRMED'));
  });

  describe('isActionableStatus()', () => {
    it('marks tutor-editable statuses correctly', () => {
      expect(isActionableStatus('DRAFT', 'TUTOR')).toBe(true);
      expect(isActionableStatus('MODIFICATION_REQUESTED', 'TUTOR')).toBe(true);
      expect(isActionableStatus('REJECTED', 'TUTOR')).toBe(true);
      expect(isActionableStatus('LECTURER_CONFIRMED', 'TUTOR')).toBe(false);
    });

    it('marks lecturer action as only waiting on tutor confirmation', () => {
      expect(isActionableStatus('TUTOR_CONFIRMED', 'LECTURER')).toBe(true);
      expect(isActionableStatus('PENDING_TUTOR_CONFIRMATION', 'LECTURER')).toBe(false);
    });

    it('marks admin actionable states correctly', () => {
      expect(isActionableStatus('LECTURER_CONFIRMED', 'ADMIN')).toBe(true);
      expect(isActionableStatus('TUTOR_CONFIRMED', 'ADMIN')).toBe(true);
      expect(isActionableStatus('FINAL_CONFIRMED', 'ADMIN')).toBe(false);
    });
  });

  describe('getNextStatuses()', () => {
    it('provides tutor transitions that resubmit to confirmation', () => {
      expect(getNextStatuses('DRAFT', 'TUTOR')).toEqual(['PENDING_TUTOR_CONFIRMATION']);
      expect(getNextStatuses('MODIFICATION_REQUESTED', 'TUTOR')).toEqual(['PENDING_TUTOR_CONFIRMATION']);
      expect(getNextStatuses('TUTOR_CONFIRMED', 'TUTOR')).toEqual([]);
    });

    it('provides lecturer transitions from tutor confirmed', () => {
      expect(getNextStatuses('TUTOR_CONFIRMED', 'LECTURER')).toEqual([
        'LECTURER_CONFIRMED',
        'REJECTED',
        'MODIFICATION_REQUESTED',
      ]);
    });

    it('provides admin transitions for final confirmation', () => {
      expect(getNextStatuses('LECTURER_CONFIRMED', 'ADMIN')).toEqual([
        'FINAL_CONFIRMED',
        'REJECTED',
        'MODIFICATION_REQUESTED',
      ]);
    });
  });
});

/*
// Removing group tests as the component has been simplified.
// A new group component can be created later if needed.
describe('StatusBadgeGroup', () => {
  it('renders limited badges and aggregates the rest', () => {
    render(
      <StatusBadgeGroup
        statuses={[
          'DRAFT',
          'PENDING_TUTOR_CONFIRMATION',
          'TUTOR_CONFIRMED',
          'LECTURER_CONFIRMED',
        ]}
        maxVisible={3}
      />,
    );

    const badges = screen.getAllByTestId(/status-badge-(?!group)/i);
    expect(badges).toHaveLength(3);
    expect(screen.queryByTestId('status-badge-lecturer_confirmed')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
*/



