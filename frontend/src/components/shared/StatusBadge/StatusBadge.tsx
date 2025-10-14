/**
 * Status Badge Component
 *
 * Reusable status badge with consistent styling and accessibility.
 * Supports all timesheet statuses with appropriate visual indicators.
 */

import { memo } from 'react';
import type { TimesheetStatus } from '../../../types/api';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import { getStatusConfig } from '../../../lib/config/statusMap';

const STATUS_BADGE_BASE_CLASS = 'status-badge';

const SIZE_CLASS_MAP: Record<NonNullable<StatusBadgeProps['size']>, string> = {
  small: 'px-2.5 py-1 text-xs',
  medium: 'px-3 py-1.5 text-sm',
  large: 'px-3.5 py-1.5 text-base',
};

const ICON_SIZE_CLASS_MAP: Record<NonNullable<StatusBadgeProps['size']>, string> = {
  small: 'text-[0.55rem]',
  medium: 'text-[0.65rem]',
  large: 'text-[0.75rem]',
};
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
  const config = getStatusConfig(status);
  const testId = dataTestId ?? `status-badge-${status.toLowerCase()}`;
  const sizeClassName = SIZE_CLASS_MAP[size] ?? SIZE_CLASS_MAP.medium;
  const iconSizeClassName = ICON_SIZE_CLASS_MAP[size] ?? ICON_SIZE_CLASS_MAP.medium;
  const composedClassName = cn(
    STATUS_BADGE_BASE_CLASS,
    `${STATUS_BADGE_BASE_CLASS}--${size}`,
    'inline-flex items-center gap-1 rounded-md border font-medium leading-tight tracking-normal whitespace-nowrap select-none cursor-default transition-none shadow-none',
    'max-w-none min-w-0',
    sizeClassName,
    className,
  );

  // Use SSOT colors and styles
  const customStyle = {
    backgroundColor: config.bgColor,
    borderColor: config.color,
    color: config.textColor,
  };

  return (
    <Badge
      variant={config.variant}
      className={composedClassName}
      style={customStyle}
      title={config.description}
      data-testid={testId}
      aria-label={`Status: ${config.label}. ${config.description}`}
    >
      {showIcon ? (
        <span
          aria-hidden="true"
          className={cn(`${STATUS_BADGE_BASE_CLASS}__icon text-current`, iconSizeClassName)}
        >
          •
        </span>
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

  const overflowClassName = cn(
    STATUS_BADGE_BASE_CLASS,
    `${STATUS_BADGE_BASE_CLASS}--${size}`,
    `${STATUS_BADGE_BASE_CLASS}--more`,
    'inline-flex items-center justify-center rounded-md border border-dashed border-border/40 bg-muted/30 text-muted-foreground whitespace-nowrap select-none cursor-default transition-none shadow-none',
    SIZE_CLASS_MAP[size] ?? SIZE_CLASS_MAP.small,
  );

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
