import type { TimesheetStatus } from '../../src/types/api';
import { getStatusConfig } from '../../src/lib/config/statusMap';

const escapeForRegex = (label: string): string =>
  label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

export const statusLabel = (status: TimesheetStatus): string =>
  getStatusConfig(status).label;

export const statusLabelPattern = (status: TimesheetStatus): RegExp =>
  new RegExp(escapeForRegex(statusLabel(status)), 'i');

export const STATUS_LABELS: Record<TimesheetStatus, string> = {
  DRAFT: statusLabel('DRAFT'),
  PENDING_TUTOR_CONFIRMATION: statusLabel('PENDING_TUTOR_CONFIRMATION'),
  TUTOR_CONFIRMED: statusLabel('TUTOR_CONFIRMED'),
  LECTURER_CONFIRMED: statusLabel('LECTURER_CONFIRMED'),
  FINAL_CONFIRMED: statusLabel('FINAL_CONFIRMED'),
  REJECTED: statusLabel('REJECTED'),
  MODIFICATION_REQUESTED: statusLabel('MODIFICATION_REQUESTED'),
};
