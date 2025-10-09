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
    description: 'Timesheet is still being prepared by the tutor or lecturer.',
    variant: 'secondary',
  },
  PENDING_TUTOR_CONFIRMATION: {
    label: 'Awaiting Tutor',
    description: 'Pending confirmation from the tutor.',
    variant: 'outline',
  },
  TUTOR_CONFIRMED: {
    label: 'Tutor Confirmed',
    description: 'Tutor has confirmed the submitted hours.',
    variant: 'default',
  },
  LECTURER_CONFIRMED: {
    label: 'Lecturer Confirmed',
    description: 'Lecturer has approved the timesheet.',
    variant: 'default',
  },
  FINAL_CONFIRMED: {
    label: 'Fully Approved',
    description: 'HR has given final approval.',
    variant: 'default',
  },
  REJECTED: {
    label: 'Rejected',
    description: 'Timesheet was rejected and requires follow-up.',
    variant: 'destructive',
  },
  MODIFICATION_REQUESTED: {
    label: 'Needs Changes',
    description: 'Updates have been requested before approval can continue.',
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
