/**
 * Status Badge Component
 * 
 * Reusable status badge with consistent styling and accessibility.
 * Supports all timesheet statuses with appropriate visual indicators.
 */

import React, { memo } from 'react';
import type { TimesheetStatus } from '../../../types/api';
import { formatters } from '../../../utils/formatting';
import './StatusBadge.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export interface StatusBadgeProps {
  status: TimesheetStatus;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  dataTestId?: string;
  showIcon?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

// =============================================================================
// Status Configuration
// =============================================================================

interface StatusConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const statusConfigs: Record<TimesheetStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    icon: '📝',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    description: 'Timesheet is in draft status'
  },
  PENDING_TUTOR_CONFIRMATION: {
    label: 'Pending Tutor Confirmation',
    icon: '📤',
    color: '#1D4ED8',
    bgColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    description: 'Awaiting tutor confirmation'
  },
  TUTOR_CONFIRMED: {
    label: 'Tutor Confirmed',
    icon: '✅',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#D1FAE5',
    description: 'Confirmed by tutor, awaiting lecturer confirmation'
  },
  LECTURER_CONFIRMED: {
    label: 'Lecturer Confirmed',
    icon: '✅',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#D1FAE5',
    description: 'Confirmed by lecturer, awaiting HR confirmation'
  },
  FINAL_CONFIRMED: {
    label: 'Final Confirmed',
    icon: '🎉',
    color: '#7C3AED',
    bgColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    description: 'Final confirmation completed, ready for payment'
  },
  REJECTED: {
    label: 'Rejected',
    icon: '❌',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    description: 'Rejected during confirmation process'
  },
  MODIFICATION_REQUESTED: {
    label: 'Modification Requested',
    icon: '🔄',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FED7AA',
    description: 'Modifications requested before confirmation'
  }
};

// =============================================================================
// Status Badge Component
// =============================================================================

const StatusBadge = memo<StatusBadgeProps>(({
  status,
  size = 'medium',
  className = '',
  showIcon = true,
  interactive = false,
  onClick,
  dataTestId
}) => {
  const config = statusConfigs[status] || statusConfigs.DRAFT;

  const handleClick = () => {
    if (interactive && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const badgeClasses = [
    'status-badge',
    `status-badge--${size}`,
    `status-badge--${status.toLowerCase().replace(/_/g, '-')}`,
    interactive ? 'status-badge--interactive' : '',
    className
  ].filter(Boolean).join(' ');

  const badgeStyle = {
    color: config.color,
    backgroundColor: config.bgColor,
    borderColor: config.borderColor
  };

  return (
    <span
      className={badgeClasses}
      style={badgeStyle}
      title={config.description}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Status: ${config.label}. ${config.description}`}
      data-testid={dataTestId ?? `status-badge-${status.toLowerCase()}`}
    >
      {showIcon && (
        <span className="status-badge__icon" aria-hidden="true">
          {config.icon}
        </span>
      )}
      <span className="status-badge__label">
        {config.label}
      </span>
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get status badge configuration
 */
export function getStatusConfig(status: TimesheetStatus): StatusConfig {
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

