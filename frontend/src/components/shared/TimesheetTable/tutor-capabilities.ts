import type { TimesheetStatus } from '../../../types/api';

export interface TutorCapabilities {
  canEdit: boolean;
  canSubmit: boolean;
  canConfirm: boolean;
}

const DEFAULT_TUTOR_CAPABILITIES: TutorCapabilities = {
  canEdit: false,
  canSubmit: false,
  canConfirm: false,
};

export const TUTOR_CAPABILITIES: Record<TimesheetStatus, TutorCapabilities> = {
  DRAFT: { canEdit: true, canSubmit: true, canConfirm: false },
  PENDING_TUTOR_CONFIRMATION: { canEdit: false, canSubmit: false, canConfirm: true },
  TUTOR_CONFIRMED: { canEdit: false, canSubmit: false, canConfirm: false },
  LECTURER_CONFIRMED: { canEdit: false, canSubmit: false, canConfirm: false },
  FINAL_CONFIRMED: { canEdit: false, canSubmit: false, canConfirm: false },
  REJECTED: { canEdit: true, canSubmit: false, canConfirm: false },
  MODIFICATION_REQUESTED: { canEdit: true, canSubmit: true, canConfirm: false },
};

export const getTutorTimesheetCapabilities = (
  status: TimesheetStatus
): TutorCapabilities => TUTOR_CAPABILITIES[status] ?? DEFAULT_TUTOR_CAPABILITIES;

