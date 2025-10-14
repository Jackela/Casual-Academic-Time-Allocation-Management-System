/**
 * Single Source of Truth (SSOT) for Status Badges
 * 
 * Centralizes all status definitions, variants, colors, and behaviors
 * to ensure complete consistency across the entire application.
 */

import type { TimesheetStatus } from '../../types/api';

// Status Configuration Interface
export interface StatusConfig {
  readonly label: string;
  readonly variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  readonly color: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly priority: number; // For sorting/ordering
  readonly isActionable: boolean; // Can user take action on this status
  readonly description: string;
}

// Complete Status Map - SSOT for all statuses
export const STATUS_MAP: Record<TimesheetStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    variant: 'outline',
    color: 'var(--status-draft-border)',
    bgColor: 'var(--status-draft-bg)',
    textColor: 'var(--status-draft-text)',
    priority: 1,
    isActionable: true,
    description: 'Timesheet in draft state, can be edited'
  },
  PENDING_TUTOR_CONFIRMATION: {
    label: 'Pending Tutor Review',
    variant: 'info',
    color: 'var(--status-pending-border)',
    bgColor: 'var(--status-pending-bg)',
    textColor: 'var(--status-pending-text)',
    priority: 2,
    isActionable: true,
    description: 'Awaiting tutor confirmation'
  },
  TUTOR_CONFIRMED: {
    label: 'Tutor Confirmed',
    variant: 'warning',
    color: 'var(--status-confirmed-border)',
    bgColor: 'var(--status-confirmed-bg)',
    textColor: 'var(--status-confirmed-text)',
    priority: 3,
    isActionable: false,
    description: 'Confirmed by tutor, awaiting lecturer review'
  },
  LECTURER_CONFIRMED: {
    label: 'Lecturer Confirmed',
    variant: 'warning',
    color: 'var(--status-confirmed-border)',
    bgColor: 'var(--status-confirmed-bg)',
    textColor: 'var(--status-confirmed-text)',
    priority: 4,
    isActionable: false,
    description: 'Confirmed by lecturer, awaiting final approval'
  },
  FINAL_CONFIRMED: {
    label: 'Final Approved',
    variant: 'success',
    color: 'var(--status-final-border)',
    bgColor: 'var(--status-final-bg)',
    textColor: 'var(--status-final-text)',
    priority: 5,
    isActionable: false,
    description: 'Fully approved and ready for payment'
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    color: 'var(--status-rejected-border)',
    bgColor: 'var(--status-rejected-bg)',
    textColor: 'var(--status-rejected-text)',
    priority: 6,
    isActionable: true,
    description: 'Rejected, requires revision'
  },
  MODIFICATION_REQUESTED: {
    label: 'Modification Requested',
    variant: 'destructive',
    color: 'var(--status-modification-border)',
    bgColor: 'var(--status-modification-bg)',
    textColor: 'var(--status-modification-text)',
    priority: 7,
    isActionable: true,
    description: 'Modifications requested, requires changes'
  }
} as const;

// Helper Functions
export const getStatusConfig = (status: TimesheetStatus): StatusConfig => {
  return STATUS_MAP[status];
};

export const getStatusLabel = (status: TimesheetStatus): string => {
  return STATUS_MAP[status].label;
};

export const getStatusVariant = (status: TimesheetStatus): StatusConfig['variant'] => {
  return STATUS_MAP[status].variant;
};

export const isStatusActionable = (status: TimesheetStatus): boolean => {
  return STATUS_MAP[status].isActionable;
};

export const getStatusPriority = (status: TimesheetStatus): number => {
  return STATUS_MAP[status].priority;
};

// Status Groups for UI Logic
export const STATUS_GROUPS = {
  PENDING: ['DRAFT', 'PENDING_TUTOR_CONFIRMATION'] as const,
  APPROVED: ['TUTOR_CONFIRMED', 'LECTURER_CONFIRMED', 'FINAL_CONFIRMED'] as const,
  REJECTED: ['REJECTED', 'MODIFICATION_REQUESTED'] as const,
  ACTIONABLE: ['DRAFT', 'PENDING_TUTOR_CONFIRMATION', 'REJECTED', 'MODIFICATION_REQUESTED'] as const,
  FINAL: ['FINAL_CONFIRMED'] as const
} as const;

// Type helpers
export type StatusGroup = keyof typeof STATUS_GROUPS;
export type StatusInGroup<T extends StatusGroup> = typeof STATUS_GROUPS[T][number];

export const isStatusInGroup = <T extends StatusGroup>(
  status: TimesheetStatus,
  group: T
): status is StatusInGroup<T> => {
  return (STATUS_GROUPS[group] as readonly TimesheetStatus[]).includes(status);
};

// Status Sorting Function
export const sortByStatusPriority = (a: TimesheetStatus, b: TimesheetStatus): number => {
  return getStatusPriority(a) - getStatusPriority(b);
};

// Status Transition Rules (for workflow validation)
export const STATUS_TRANSITIONS: Record<TimesheetStatus, TimesheetStatus[]> = {
  DRAFT: ['PENDING_TUTOR_CONFIRMATION'],
  PENDING_TUTOR_CONFIRMATION: ['TUTOR_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'],
  TUTOR_CONFIRMED: ['LECTURER_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'],
  LECTURER_CONFIRMED: ['FINAL_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'],
  FINAL_CONFIRMED: [], // Terminal state
  REJECTED: ['DRAFT'], // Can restart after fixes
  MODIFICATION_REQUESTED: ['PENDING_TUTOR_CONFIRMATION'] // Can resubmit after changes
} as const;

export const canTransitionTo = (
  fromStatus: TimesheetStatus,
  toStatus: TimesheetStatus
): boolean => {
  return STATUS_TRANSITIONS[fromStatus].includes(toStatus);
};

// Export all statuses as type
export type { TimesheetStatus };
