/**
 * Single Source of Truth for Timesheet Approval Logic
 * 
 * This module defines the complete state machine for timesheet actions based on:
 * - User role (TUTOR, LECTURER, ADMIN/HR)
 * - Timesheet status (DRAFT, PENDING_TUTOR_CONFIRMATION, etc.)
 * 
 * Benefits:
 * - Centralized business logic prevents drift between components
 * - Always shows what actions are available and WHY they're disabled
 * - Backend and frontend can share the same state transition rules
 * - Easy to extend with new statuses or roles
 */

import type { TimesheetStatus } from '../../types/api';

export type UserRole = 'TUTOR' | 'LECTURER' | 'ADMIN' | 'HR';

export type ActionType =
    | 'EDIT'
    | 'SUBMIT_DRAFT'
    | 'TUTOR_CONFIRM'
    | 'LECTURER_CONFIRM'
    | 'HR_CONFIRM'
    | 'REJECT'
    | 'REQUEST_MODIFICATION';

export interface TimesheetAction {
    type: ActionType;
    label: string;
    isEnabled: boolean;
    disabledReason?: string;
    isPrimary: boolean;
    isDestructive: boolean;
    priority: 'primary' | 'secondary' | 'destructive';
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
}

/**
 * Status Groups for cleaner logic
 */
const STATUS_GROUPS = {
    DRAFT_LIKE: ['DRAFT', 'REJECTED', 'MODIFICATION_REQUESTED'] as const,
    TERMINAL: ['FINAL_CONFIRMED'] as const,
    IN_REVIEW: ['PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED'] as const,
} as const;

/**
 * Check if a status is in a group
 */
function isInGroup(status: TimesheetStatus, group: readonly TimesheetStatus[]): boolean {
    return (group as readonly string[]).includes(status);
}

/**
 * Get all possible actions for a timesheet based on role and status
 * 
 * @param role - The current user's role
 * @param status - The timesheet's current status
 * @returns Array of actions with enabled/disabled state and reasons
 */
export function getTimesheetActions(role: UserRole, status: TimesheetStatus): TimesheetAction[] {
    const actions: TimesheetAction[] = [];

    // Terminal state - no actions available
    if (isInGroup(status, STATUS_GROUPS.TERMINAL)) {
        return [];
    }

    switch (role) {
        case 'TUTOR':
            actions.push(...getTutorActions(status));
            break;

        case 'LECTURER':
            actions.push(...getLecturerActions(status));
            break;

        case 'ADMIN':
        case 'HR':
            actions.push(...getAdminActions(status));
            break;
    }

    return actions;
}

/**
 * Tutor-specific actions
 */
function getTutorActions(status: TimesheetStatus): TimesheetAction[] {
    const isDraftLike = isInGroup(status, STATUS_GROUPS.DRAFT_LIKE);
    const canConfirm = status === 'PENDING_TUTOR_CONFIRMATION';
    const inReview = isInGroup(status, STATUS_GROUPS.IN_REVIEW);

    return [
        {
            type: 'EDIT',
            label: 'Edit',
            isEnabled: isDraftLike,
            disabledReason: isDraftLike ? undefined : 'Can only edit draft or rejected timesheets',
            isPrimary: false,
            isDestructive: false,
            priority: 'secondary',
        },
        {
            type: 'SUBMIT_DRAFT',
            label: 'Submit',
            isEnabled: isDraftLike,
            disabledReason: isDraftLike ? undefined : 'Can only submit draft, rejected, or modification-requested timesheets',
            isPrimary: isDraftLike,
            isDestructive: false,
            priority: 'primary',
        },
        {
            type: 'TUTOR_CONFIRM',
            label: 'Confirm',
            isEnabled: canConfirm,
            disabledReason: canConfirm ? undefined : status === 'TUTOR_CONFIRMED'
                ? 'Already confirmed by tutor'
                : inReview
                    ? 'Timesheet is under review'
                    : 'Tutor can only confirm pending timesheets',
            isPrimary: canConfirm,
            isDestructive: false,
            priority: 'primary',
        },
    ];
}

/**
 * Lecturer-specific actions
 */
function getLecturerActions(status: TimesheetStatus): TimesheetAction[] {
    const canApprove = status === 'TUTOR_CONFIRMED';

    let disabledReason: string | undefined;
    if (!canApprove) {
        switch (status) {
            case 'DRAFT':
            case 'REJECTED':
            case 'MODIFICATION_REQUESTED':
                disabledReason = 'Timesheet must be confirmed by tutor first';
                break;
            case 'PENDING_TUTOR_CONFIRMATION':
                disabledReason = 'Waiting for tutor confirmation';
                break;
            case 'LECTURER_CONFIRMED':
                disabledReason = 'Already confirmed by lecturer';
                break;
            case 'FINAL_CONFIRMED':
                disabledReason = 'Timesheet is finalized';
                break;
            default:
                disabledReason = 'Lecturer can only approve tutor-confirmed timesheets';
        }
    }

    return [
        {
            type: 'LECTURER_CONFIRM',
            label: 'Approve',
            isEnabled: canApprove,
            disabledReason,
            isPrimary: true,
            isDestructive: false,
            priority: 'primary',
        },
        {
            type: 'REJECT',
            label: 'Reject',
            isEnabled: canApprove,
            disabledReason: canApprove ? undefined : disabledReason,
            isPrimary: false,
            isDestructive: true,
            priority: 'destructive',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to reject this timesheet? You will need to provide a reason.',
        },
        {
            type: 'REQUEST_MODIFICATION',
            label: 'Request Changes',
            isEnabled: canApprove,
            disabledReason: canApprove ? undefined : disabledReason,
            isPrimary: false,
            isDestructive: false,
            priority: 'destructive',
            requiresConfirmation: true,
            confirmationMessage: 'Request modifications to this timesheet? The tutor will be notified.',
        },
    ];
}

/**
 * Admin/HR-specific actions
 */
function getAdminActions(status: TimesheetStatus): TimesheetAction[] {
    const canFinalApprove = status === 'LECTURER_CONFIRMED';
    const canApproveEarly = status === 'TUTOR_CONFIRMED';

    let disabledReason: string | undefined;
    if (!canFinalApprove && !canApproveEarly) {
        switch (status) {
            case 'DRAFT':
            case 'REJECTED':
            case 'MODIFICATION_REQUESTED':
                disabledReason = 'Timesheet must be confirmed by tutor and lecturer first';
                break;
            case 'PENDING_TUTOR_CONFIRMATION':
                disabledReason = 'Waiting for tutor confirmation';
                break;
            case 'FINAL_CONFIRMED':
                disabledReason = 'Already finalized';
                break;
            default:
                disabledReason = 'Admin can only approve lecturer-confirmed timesheets';
        }
    }

    return [
        {
            type: 'HR_CONFIRM',
            label: canFinalApprove ? 'Final Approve' : 'Approve',
            isEnabled: canFinalApprove || canApproveEarly,
            disabledReason: (canFinalApprove || canApproveEarly) ? undefined : disabledReason,
            isPrimary: true,
            isDestructive: false,
            priority: 'primary',
        },
        {
            type: 'REJECT',
            label: 'Reject',
            isEnabled: canFinalApprove || canApproveEarly,
            disabledReason: (canFinalApprove || canApproveEarly) ? undefined : disabledReason,
            isPrimary: false,
            isDestructive: true,
            priority: 'destructive',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to reject this timesheet? You will need to provide a reason.',
        },
        {
            type: 'REQUEST_MODIFICATION',
            label: 'Request Changes',
            isEnabled: canFinalApprove || canApproveEarly,
            disabledReason: (canFinalApprove || canApproveEarly) ? undefined : disabledReason,
            isPrimary: false,
            isDestructive: false,
            priority: 'destructive',
            requiresConfirmation: true,
            confirmationMessage: 'Request modifications to this timesheet? The tutor will be notified.',
        },
    ];
}

/**
 * Get a human-readable description of the current status
 */
export function getStatusDescription(status: TimesheetStatus): string {
    switch (status) {
        case 'DRAFT':
            return 'Draft - can be edited and submitted';
        case 'PENDING_TUTOR_CONFIRMATION':
            return 'Submitted - awaiting tutor confirmation';
        case 'TUTOR_CONFIRMED':
            return 'Tutor confirmed - awaiting lecturer approval';
        case 'LECTURER_CONFIRMED':
            return 'Lecturer approved - awaiting final approval';
        case 'FINAL_CONFIRMED':
            return 'Finalized - no further changes allowed';
        case 'REJECTED':
            return 'Rejected - can be edited and resubmitted';
        case 'MODIFICATION_REQUESTED':
            return 'Changes requested - can be edited and resubmitted';
        default:
            return 'Unknown status';
    }
}

/**
 * Check if a role can perform batch operations
 */
export function canPerformBatchOperations(role: UserRole): boolean {
    return role === 'LECTURER' || role === 'ADMIN' || role === 'HR';
}

/**
 * Get batch action availability for selected timesheets
 * Returns the intersection of available actions across all selected items
 */
export function getBatchActions(
    role: UserRole,
    statuses: TimesheetStatus[]
): { action: TimesheetAction; unavailableCount: number }[] {
    if (statuses.length === 0) {
        return [];
    }

    // Get actions for the first status as the baseline
    const firstActions = getTimesheetActions(role, statuses[0]);

    // For each action, check how many selected items support it
    return firstActions.map(action => {
        let unavailableCount = 0;

        for (const status of statuses) {
            const statusActions = getTimesheetActions(role, status);
            const matchingAction = statusActions.find(a => a.type === action.type);

            if (!matchingAction || !matchingAction.isEnabled) {
                unavailableCount++;
            }
        }

        // The batch action is only enabled if ALL selected items support it
        const isEnabled = unavailableCount === 0;

        return {
            action: {
                ...action,
                isEnabled,
                disabledReason: isEnabled
                    ? undefined
                    : `${unavailableCount} of ${statuses.length} selected timesheet(s) cannot be ${action.label.toLowerCase()}d`,
            },
            unavailableCount,
        };
    });
}

