/**
 * Timesheet Action Buttons Component
 * 
 * Enforces the "one primary action per row" rule from UI standards
 * and provides consistent action button layout across the application.
 */

import React, { memo, useMemo } from 'react';
import { Button } from '../../ui/button';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import type { Timesheet } from '../../../types/api';
import { getStatusConfig } from '../../../lib/config/statusMap';
import {
  STANDARD_ACTIONS,
  validateActionGroup,
  type ActionConfig,
  ACTION_PRIORITY,
  getRecommendedVariant,
} from '../../../lib/config/ui-standards';

interface TimesheetActionsProps {
  timesheet: Timesheet;
  mode: 'tutor' | 'lecturer' | 'admin';
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onEdit?: () => void;
  onSubmit?: () => void;
  onConfirm?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

interface ActionButton extends ActionConfig {
  id: string;
  onClick?: () => void;
  visible: boolean;
}

const TimesheetActions = memo<TimesheetActionsProps>(({
  timesheet,
  mode,
  loading = false,
  disabled = false,
  disabledReason,
  onEdit,
  onSubmit,
  onConfirm,
  onApprove,
  onReject
}) => {
  const statusConfig = getStatusConfig(timesheet.status);

  // Define all possible actions based on mode and status
  const availableActions = useMemo((): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (mode === 'tutor') {
      // Tutor actions
      const isDraft = ['DRAFT', 'MODIFICATION_REQUESTED', 'REJECTED'].includes(timesheet.status);
      const canConfirm = timesheet.status === 'PENDING_TUTOR_CONFIRMATION';

      // Primary action: Submit (for drafts) or Confirm (for pending)
      if (isDraft && onSubmit) {
        actions.push({
          ...STANDARD_ACTIONS.SUBMIT,
          id: 'submit',
          onClick: onSubmit,
          visible: true
        });
      } else if (canConfirm && onConfirm) {
        actions.push({
          ...STANDARD_ACTIONS.APPROVE,
          label: 'Confirm',
          id: 'confirm',
          onClick: onConfirm,
          visible: true
        });
      }

      // Secondary action: Edit (always available for drafts)
      if (isDraft && onEdit) {
        actions.push({
          ...STANDARD_ACTIONS.EDIT,
          id: 'edit',
          onClick: onEdit,
          visible: true
        });
      }
    } else if (mode === 'lecturer' || mode === 'admin') {
      // Lecturer/Admin actions
      const canApprove = timesheet.status === 'TUTOR_CONFIRMED' || 
                        (mode === 'admin' && timesheet.status === 'LECTURER_CONFIRMED');

      // Primary action: Approve
      if (canApprove && onApprove) {
        actions.push({
          ...STANDARD_ACTIONS.APPROVE,
          label: mode === 'admin' ? 'Final Approve' : 'Approve',
          id: 'approve',
          onClick: onApprove,
          visible: true
        });
      }

      // Destructive action: Reject (always secondary)
      if (canApprove && onReject) {
        actions.push({
          ...STANDARD_ACTIONS.REJECT,
          id: 'reject',
          onClick: onReject,
          visible: true
        });
      }
    }

    return actions.filter(action => action.visible);
  }, [mode, timesheet.status, onEdit, onSubmit, onConfirm, onApprove, onReject]);

  // Validate that we follow the "one primary action per row" rule
  const validationResult = useMemo(() => {
    return validateActionGroup(availableActions, `timesheet-${timesheet.id}-actions`);
  }, [availableActions, timesheet.id]);

  // Log validation errors in development
  if (process.env.NODE_ENV === 'development' && !validationResult.isValid) {
    console.warn('TimesheetActions validation failed:', validationResult.errors);
  }

  // Sort actions by priority (primary first, then secondary, then destructive)
  const sortedActions = useMemo(() => {
    return [...availableActions].sort((a, b) => {
      // Primary actions first
      if (a.priority === ACTION_PRIORITY.PRIMARY && b.priority !== ACTION_PRIORITY.PRIMARY) return -1;
      if (b.priority === ACTION_PRIORITY.PRIMARY && a.priority !== ACTION_PRIORITY.PRIMARY) return 1;
      
      // Then secondary actions
      if (a.priority === ACTION_PRIORITY.SECONDARY && b.priority === ACTION_PRIORITY.DESTRUCTIVE) return -1;
      if (b.priority === ACTION_PRIORITY.SECONDARY && a.priority === ACTION_PRIORITY.DESTRUCTIVE) return 1;
      
      return 0;
    });
  }, [availableActions]);

  // If no actions are available, show placeholder
  if (sortedActions.length === 0) {
    return (
      <div className="flex items-center justify-center min-w-[8rem]" data-testid="no-actions">
        <span className="text-muted-foreground text-sm" aria-hidden="true">—</span>
      </div>
    );
  }

  const isLocked = loading || disabled;
  const lockMessage = loading ? 'Processing request...' : disabledReason || 'Action disabled';

  return (
    <div 
      className="flex items-center gap-2 min-w-fit" 
      data-testid="timesheet-actions"
      data-status={timesheet.status}
      data-mode={mode}
    >
      {sortedActions.map((action) => {
        const isPrimary = action.priority === ACTION_PRIORITY.PRIMARY;
        const isDestructive = action.priority === ACTION_PRIORITY.DESTRUCTIVE;
        const actionDisabled = isLocked || !action.onClick;
        const resolvedVariant = action.variant ?? getRecommendedVariant(action.priority);
        
        const title = actionDisabled 
          ? (isLocked ? lockMessage : `${action.label} is not available`)
          : action.tooltip || `${action.label} timesheet`;

        return (
          <Button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={actionDisabled}
            variant={resolvedVariant}
            size={action.size || 'sm'}
            title={title}
            className={`
              action-button 
              ${isPrimary ? 'action-button--primary' : ''}
              ${isDestructive ? 'action-button--destructive' : ''}
              ${action.priority === ACTION_PRIORITY.SECONDARY ? 'action-button--secondary' : ''}
            `.trim()}
            data-testid={`${action.id}-btn-${timesheet.id}`}
            data-priority={action.priority}
          >
            {loading && isPrimary ? (
              <LoadingSpinner size="small" />
            ) : (
              action.label
            )}
          </Button>
        );
      })}

      {/* Screen reader announcement for action context */}
      <span className="sr-only">
        Available actions for {statusConfig.description} timesheet {timesheet.id}
      </span>
    </div>
  );
});

TimesheetActions.displayName = 'TimesheetActions';

export default TimesheetActions;
