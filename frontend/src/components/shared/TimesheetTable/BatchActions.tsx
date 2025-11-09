/**
 * Batch Actions Component
 * 
 * Enforces the "one primary action per row" rule for batch operations
 * and provides consistent batch action layout across the application.
 */

import React, { memo, useMemo } from 'react';
import { Button } from '../../ui/button';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import { 
  STANDARD_ACTIONS, 
  validateActionGroup, 
  type ActionConfig,
  ACTION_PRIORITY 
} from '../../../lib/config/ui-standards';

interface BatchActionsProps {
  selectedCount: number;
  loading?: boolean;
  disabled?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  approveDisabled?: boolean;
  rejectDisabled?: boolean;
  approveDisabledReason?: string;
  rejectDisabledReason?: string;
  mode: 'lecturer' | 'admin';
  className?: string;
}

interface BatchActionButton extends ActionConfig {
  id: string;
  onClick?: () => void;
  visible: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const BatchActions = memo<BatchActionsProps>(({
  selectedCount,
  loading = false,
  disabled = false,
  onApprove,
  onReject,
  approveDisabled = false,
  rejectDisabled = false,
  approveDisabledReason,
  rejectDisabledReason,
  mode,
  className = ''
}) => {
  // Define available batch actions
  const availableActions = useMemo((): BatchActionButton[] => {
    const actions: BatchActionButton[] = [];

    // Primary action: Approve Selected (highest priority)
    if (onApprove) {
      actions.push({
        ...STANDARD_ACTIONS.APPROVE,
        label: 'Approve Selected',
        id: 'batch-approve',
        onClick: onApprove,
        visible: true,
        disabled: approveDisabled,
        disabledReason: approveDisabledReason
      });
    }

    // Destructive action: Reject Selected (always secondary to approve)
    if (onReject) {
      actions.push({
        ...STANDARD_ACTIONS.REJECT,
        label: 'Reject Selected',
        id: 'batch-reject',
        onClick: onReject,
        visible: true,
        disabled: rejectDisabled,
        disabledReason: rejectDisabledReason
      });
    }

    return actions.filter(action => action.visible);
  }, [onApprove, onReject, approveDisabled, rejectDisabled, approveDisabledReason, rejectDisabledReason]);

  // Validate that we follow the "one primary action per row" rule
  const validationResult = useMemo(() => {
    return validateActionGroup(availableActions, `batch-actions-${mode}`);
  }, [availableActions, mode]);

  // Log validation errors in development
  if (process.env.NODE_ENV === 'development' && !validationResult.isValid) {
    console.warn('BatchActions validation failed:', validationResult.errors);
  }

  // Sort actions by priority (primary first, then destructive)
  const sortedActions = useMemo(() => {
    return availableActions.sort((a, b) => {
      // Primary actions first
      if (a.priority === ACTION_PRIORITY.PRIMARY && b.priority !== ACTION_PRIORITY.PRIMARY) return -1;
      if (b.priority === ACTION_PRIORITY.PRIMARY && a.priority !== ACTION_PRIORITY.PRIMARY) return 1;
      
      // Then secondary actions before destructive
      if (a.priority === ACTION_PRIORITY.SECONDARY && b.priority === ACTION_PRIORITY.DESTRUCTIVE) return -1;
      if (b.priority === ACTION_PRIORITY.SECONDARY && a.priority === ACTION_PRIORITY.DESTRUCTIVE) return 1;
      
      return 0;
    });
  }, [availableActions]);

  if (sortedActions.length === 0) {
    return null;
  }

  const isLocked = loading || disabled;

  return (
    <div 
      className={`flex flex-wrap items-center gap-3 ${className}`}
      data-testid="batch-actions"
      data-selected-count={selectedCount}
      data-mode={mode}
    >
      {sortedActions.map((action, _index) => {
        const isPrimary = action.priority === ACTION_PRIORITY.PRIMARY;
        const isDestructive = action.priority === ACTION_PRIORITY.DESTRUCTIVE;
        const actionDisabled = isLocked || action.disabled || !action.onClick;
        
        const title = actionDisabled 
          ? (isLocked ? 'Processing request...' : action.disabledReason || `${action.label} is not available`)
          : action.tooltip || action.label;

        const helpId = actionDisabled && action.disabledReason
          ? `${action.id}-help`
          : undefined;

        return (
          <React.Fragment key={action.id}>
            <Button
              type="button"
              onClick={action.onClick}
              disabled={actionDisabled}
              variant={action.variant}
              size={action.size || 'default'}
              title={title}
              aria-describedby={helpId}
              aria-label={`${action.label} (${selectedCount} selected)`}
              className={`
                h-11 min-w-[2.75rem] px-6
                action-button 
                ${isPrimary ? 'action-button--primary' : ''}
                ${isDestructive ? 'action-button--danger' : ''}
                ${action.priority === ACTION_PRIORITY.SECONDARY ? 'action-button--secondary' : ''}
              `.trim()}
              data-testid={action.id}
              data-priority={action.priority}
            >
              {loading && isPrimary ? (
                <LoadingSpinner size="small" />
              ) : (
                action.label
              )}
            </Button>
            
            {helpId && action.disabledReason && (
              <span id={helpId} className="sr-only">
                {action.disabledReason}
              </span>
            )}
          </React.Fragment>
        );
      })}

      {/* Screen reader announcement for batch context */}
      <span className="sr-only">
        Batch actions for {selectedCount} selected {selectedCount === 1 ? 'timesheet' : 'timesheets'}
      </span>
    </div>
  );
});

BatchActions.displayName = 'BatchActions';

export default BatchActions;