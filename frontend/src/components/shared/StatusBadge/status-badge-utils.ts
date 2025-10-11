import type { TimesheetStatus } from '../../../types/api';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '../../ui/badge-variants';

interface StatusConfig {
  label: string;
  description: string;
  variant: VariantProps<typeof badgeVariants>['variant'];
}

export const statusConfigs: Record<TimesheetStatus, StatusConfig> = {
  DRAFT: {
    label: 'Draft',
    description: 'Timesheet is being prepared and has not been submitted to the workflow yet.',
    variant: 'secondary',
  },
  PENDING_TUTOR_CONFIRMATION: {
    label: 'Pending Tutor Review',
    description: 'Waiting for the tutor to review and respond before lecturer approval.',
    variant: 'warning',
  },
  TUTOR_CONFIRMED: {
    label: 'Approved by Tutor',
    description: 'Tutor has confirmed the submitted hours and approved the timesheet.',
    variant: 'success',
  },
  LECTURER_CONFIRMED: {
    label: 'Approved by Lecturer',
    description: 'Lecturer has completed academic approval after the tutor’s confirmation.',
    variant: 'info',
  },
  FINAL_CONFIRMED: {
    label: 'Final Approved',
    description: 'HR has completed the final review and released the timesheet for payroll.',
    variant: 'default',
  },
  REJECTED: {
    label: 'Rejected',
    description: 'Timesheet was rejected and requires updates before it can proceed.',
    variant: 'destructive',
  },
  MODIFICATION_REQUESTED: {
    label: 'Modification Requested',
    description: 'Updates are needed before the approval process can continue.',
    variant: 'warning',
  },
};

const fallbackStatus: StatusConfig = {
  label: 'Unknown Status',
  description: 'Status not recognized. Please contact support if this persists.',
  variant: 'outline',
};

export const getStatusConfig = (status: TimesheetStatus): StatusConfig => (
  statusConfigs[status] ?? fallbackStatus
);

const STATUS_PRIORITY: Record<TimesheetStatus, number> = {
  DRAFT: 10,
  MODIFICATION_REQUESTED: 25,
  PENDING_TUTOR_CONFIRMATION: 30,
  TUTOR_CONFIRMED: 40,
  LECTURER_CONFIRMED: 50,
  FINAL_CONFIRMED: 5,
  REJECTED: 0,
};

export const getStatusPriority = (status: TimesheetStatus): number => (
  STATUS_PRIORITY[status] ?? 0
);

const ACTIONABLE_STATUS_BY_ROLE: Record<string, ReadonlySet<TimesheetStatus>> = {
  TUTOR: new Set(['DRAFT', 'MODIFICATION_REQUESTED', 'REJECTED']),
  LECTURER: new Set(['TUTOR_CONFIRMED']),
  ADMIN: new Set(['LECTURER_CONFIRMED', 'TUTOR_CONFIRMED']),
};

export const isActionableStatus = (status: TimesheetStatus, role: string): boolean => {
  const normalizedRole = role.toUpperCase();
  const actionableStatuses = ACTIONABLE_STATUS_BY_ROLE[normalizedRole];
  if (!actionableStatuses) {
    return false;
  }
  return actionableStatuses.has(status);
};

const NEXT_STATUS_BY_ROLE: Record<string, Partial<Record<TimesheetStatus, TimesheetStatus[]>>> = {
  TUTOR: {
    DRAFT: ['PENDING_TUTOR_CONFIRMATION'],
    MODIFICATION_REQUESTED: ['PENDING_TUTOR_CONFIRMATION'],
    REJECTED: ['PENDING_TUTOR_CONFIRMATION'],
  },
  LECTURER: {
    TUTOR_CONFIRMED: ['LECTURER_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'],
  },
  ADMIN: {
    LECTURER_CONFIRMED: ['FINAL_CONFIRMED', 'REJECTED', 'MODIFICATION_REQUESTED'],
  },
};

export const getNextStatuses = (status: TimesheetStatus, role: string): TimesheetStatus[] => {
  const normalizedRole = role.toUpperCase();
  const roleConfig = NEXT_STATUS_BY_ROLE[normalizedRole];
  if (!roleConfig) {
    return [];
  }
  return roleConfig[status]?.slice() ?? [];
};
