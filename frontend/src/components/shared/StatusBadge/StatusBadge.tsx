/**
 * Status Badge Component
 *
 * Reusable status badge with consistent styling and accessibility.
 * Supports all timesheet statuses with appropriate visual indicators.
 */

import { memo } from 'react';
import type { TimesheetStatus } from '../../../types/api';
import { Badge } from '../../ui/badge';
import { statusConfigs } from './status-badge-utils';

const STATUS_BADGE_BASE_CLASS = 'status-badge';
// =============================================================================
// Component Props & Types
// =============================================================================

export interface StatusBadgeProps {
  status: TimesheetStatus;
  className?: string;
  dataTestId?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

// =============================================================================
// Status Configuration & Mapping
// =============================================================================


// =============================================================================
// Status Badge Component
// =============================================================================

const StatusBadge = memo<StatusBadgeProps>(({
  status,
  className = '',
  dataTestId,
  size = 'medium',
  showIcon = false,
}) => {
  const config = statusConfigs[status] ?? statusConfigs.DRAFT;
  const testId = dataTestId ?? `status-badge-${status.toLowerCase()}`;
  const composedClassName = [
    STATUS_BADGE_BASE_CLASS,
    `${STATUS_BADGE_BASE_CLASS}--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Badge
      variant={config.variant}
      className={composedClassName}
      title={config.description}
      data-testid={testId}
      aria-label={`Status: ${config.label}. ${config.description}`}
    >
      {showIcon ? (
        <span aria-hidden="true" className={`${STATUS_BADGE_BASE_CLASS}__icon`}>•</span>
      ) : null}
      {config.label}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// =============================================================================
// Utility Functions (Maintained for business logic)
// =============================================================================

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
  className = '',
}) => {
  const visibleStatuses = statuses.slice(0, maxVisible);
  const hiddenCount = Math.max(0, statuses.length - maxVisible);

  const groupClassName = [
    `${STATUS_BADGE_BASE_CLASS}-group`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const overflowClassName = [
    STATUS_BADGE_BASE_CLASS,
    `${STATUS_BADGE_BASE_CLASS}--${size}`,
    `${STATUS_BADGE_BASE_CLASS}--more`,
  ].join(' ');

  return (
    <div className={groupClassName} data-testid="status-badge-group">
      {visibleStatuses.map((status, index) => (
        <StatusBadge
          key={`${status}-${index}`}
          status={status}
          size={size}
          showIcon={showIcon}
        />
      ))}
      {hiddenCount > 0 && (
        <span className={overflowClassName}>+{hiddenCount}</span>
      )}
    </div>
  );
});

StatusBadgeGroup.displayName = 'StatusBadgeGroup';

export default StatusBadge;