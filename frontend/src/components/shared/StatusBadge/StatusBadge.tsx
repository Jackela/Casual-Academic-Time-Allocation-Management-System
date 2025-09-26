/**\r\n * Status Badge Component
 * 
 * Reusable status badge with consistent styling and accessibility.
 * Supports all timesheet statuses with appropriate visual indicators.
 */

import React, { memo } from 'react';
import type { TimesheetStatus } from '../../../types/api';
import { Badge } from '../../ui/badge';
import type { BadgeProps } from '../../ui/badge';
// import './StatusBadge.css'; // REMOVED

// =============================================================================
// Component Props & Types
// =============================================================================

export interface StatusBadgeProps {
  status: TimesheetStatus;
  className?: string;
  dataTestId?: string;
}

// =============================================================================
// Status Configuration & Mapping
// =============================================================================

interface StatusConfig {
  label: string;
  variant: BadgeProps['variant'];
  description: string;
}

const statusConfigs: Record<TimesheetStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    variant: 'draft',
    description: 'Timesheet is in draft status',
  },
  PENDING_TUTOR_CONFIRMATION: {
    label: 'Pending Tutor Confirmation',
    variant: 'info',
    description: 'Awaiting tutor confirmation',
  },
  TUTOR_CONFIRMED: {
    label: 'Tutor Confirmed',
    variant: 'success',
    description: 'Confirmed by tutor, awaiting lecturer confirmation',
  },
  LECTURER_CONFIRMED: {
    label: 'Lecturer Confirmed',
    variant: 'success',
    description: 'Confirmed by lecturer, awaiting HR confirmation',
  },
  FINAL_CONFIRMED: {
    label: 'Final Confirmed',
    variant: 'final',
    description: 'Final confirmation completed, ready for payment',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    description: 'Rejected during confirmation process',
  },
  MODIFICATION_REQUESTED: {
    label: 'Modification Requested',
    variant: 'warning',
    description: 'Modifications requested before confirmation',
  },
};

// =============================================================================
// Status Badge Component
// =============================================================================

const StatusBadge = memo<StatusBadgeProps>(({
  status,
  className = '',
  dataTestId,
}) => {
  const config = statusConfigs[status] || statusConfigs.DRAFT;
  const testId = dataTestId ?? `status-badge-${(status || 'unknown').toLowerCase()}`;

  return (
    <Badge
      variant={config.variant}
      className={className}
      title={config.description}
      data-testid={testId}
      aria-label={`Status: ${config.label}. ${config.description}`}
    >
      {config.label}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// =============================================================================
// Utility Functions (Maintained for business logic)
// =============================================================================

/**
 * Get status badge configuration
 */
export function getStatusConfig(status: TimesheetStatus) {
  return statusConfigs[status] || statusConfigs.DRAFT;
}

/**
 * Get status priority for sorting (higher number = higher priority)
 */
export function getStatusPriority(status: TimesheetStatus): number {
  const priorities: Record<TimesheetStatus, number> = {
    DRAFT: 1,
    PENDING_TUTOR_CONFIRMATION: 5,
    TUTOR_CONFIRMED: 4,
    LECTURER_CONFIRMED: 3,
    FINAL_CONFIRMED: 1,
    REJECTED: 2,
    MODIFICATION_REQUESTED: 4
  };
  
  return priorities[status] || 0;
}

/**
 * Check if status requires action
 */
export function isActionableStatus(status: TimesheetStatus, userRole: string): boolean {
  switch (userRole) {
    case 'LECTURER':
      return status === 'TUTOR_CONFIRMED';
    case 'ADMIN':
      return ['LECTURER_CONFIRMED', 'TUTOR_CONFIRMED'].includes(status);
    case 'TUTOR':
      return ['DRAFT', 'REJECTED', 'MODIFICATION_REQUESTED'].includes(status);
    default:
      return false;
  }
}

/**
 * Get next possible statuses for workflow
 */
export function getNextStatuses(status: TimesheetStatus, userRole: string): TimesheetStatus[] {
  const transitions: Record<string, Record<TimesheetStatus, TimesheetStatus[]>> = {
    TUTOR: {
      DRAFT: ['PENDING_TUTOR_CONFIRMATION'],
      REJECTED: ['PENDING_TUTOR_CONFIRMATION'],
      MODIFICATION_REQUESTED: ['PENDING_TUTOR_CONFIRMATION'],
      PENDING_TUTOR_CONFIRMATION: ['TUTOR_CONFIRMED'],
      TUTOR_CONFIRMED: [],
      LECTURER_CONFIRMED: [],
      FINAL_CONFIRMED: []
    },
    LECTURER: {
      DRAFT: [],
      PENDING_TUTOR_CONFIRMATION: [],
      TUTOR_CONFIRMED: ['LECTURER_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'],
      LECTURER_CONFIRMED: [],
      FINAL_CONFIRMED: [],
      REJECTED: [],
      MODIFICATION_REQUESTED: []
    },
    ADMIN: {
      DRAFT: [],
      PENDING_TUTOR_CONFIRMATION: [],
      TUTOR_CONFIRMED: [],
      LECTURER_CONFIRMED: ['FINAL_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'],
      FINAL_CONFIRMED: [],
      REJECTED: [],
      MODIFICATION_REQUESTED: []
    }
  };

  return transitions[userRole]?.[status] || [];
}

// =============================================================================
// Status Badge Group Component
// =============================================================================

export interface StatusBadgeGroupProps {
  statuses: TimesheetStatus[];
  maxVisible?: number;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadgeGroup = memo<StatusBadgeGroupProps>(({
  statuses,
  maxVisible = 3,
  size = 'small',
  showIcon = false,
  className = ''
}) => {
  const visibleStatuses = statuses.slice(0, maxVisible);
  const hiddenCount = Math.max(0, statuses.length - maxVisible);

  return (
    <div className={`status-badge-group ${className}`} data-testid="status-badge-group">
      {visibleStatuses.map((status, index) => (
        <StatusBadge
          key={`${status}-${index}`}
          status={status}
          size={size}
          showIcon={showIcon}
        />
      ))}
      {hiddenCount > 0 && (
        <span className={`status-badge status-badge--${size} status-badge--more`}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
});

StatusBadgeGroup.displayName = 'StatusBadgeGroup';

export default StatusBadge;



