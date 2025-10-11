import type { TimesheetStatus } from '../../../types/api';

export const LECTURER_ACTION_UNAVAILABLE_MESSAGE = 'Action not available in current status';

type LecturerStatusKey =
  | 'Draft'
  | 'TutorConfirmed'
  | 'LecturerConfirmed'
  | 'FinalApproved'
  | 'Rejected';

export type LecturerAction =
  | 'LecturerApprove'
  | 'LecturerReject'
  | 'FinalApprove'
  | 'FinalReject';

type LecturerAllowedTransitions = Record<LecturerStatusKey, readonly LecturerAction[]>;

const LECTURER_ALLOWED_TRANSITIONS: LecturerAllowedTransitions = {
  Draft: [],
  TutorConfirmed: ['LecturerApprove', 'LecturerReject'],
  LecturerConfirmed: ['FinalApprove', 'FinalReject'],
  FinalApproved: [],
  Rejected: [],
};

const STATUS_NORMALIZATION: Record<string, LecturerStatusKey> = {
  Draft: 'Draft',
  draft: 'Draft',
  DRAFT: 'Draft',
  TutorConfirmed: 'TutorConfirmed',
  'TUTOR_CONFIRMED': 'TutorConfirmed',
  'APPROVED_BY_TUTOR': 'TutorConfirmed',
  'PENDING_TUTOR_CONFIRMATION': 'Draft',
  'PENDING_LECTURER_APPROVAL': 'Draft',
  LecturerConfirmed: 'LecturerConfirmed',
  'LECTURER_CONFIRMED': 'LecturerConfirmed',
  'APPROVED_BY_LECTURER_AND_TUTOR': 'LecturerConfirmed',
  FinalApproved: 'FinalApproved',
  'FINAL_APPROVED': 'FinalApproved',
  'FINAL_CONFIRMED': 'FinalApproved',
  FinalConfirmed: 'FinalApproved',
  Rejected: 'Rejected',
  REJECTED: 'Rejected',
  'MODIFICATION_REQUESTED': 'Rejected',
};

const normalizeStatus = (status: TimesheetStatus | string): LecturerStatusKey => {
  if (!status) {
    return 'Draft';
  }

  return STATUS_NORMALIZATION[status] ?? 'Draft';
};

const getAllowedTransitions = (status: TimesheetStatus | string): readonly LecturerAction[] => {
  const normalized = normalizeStatus(status);
  return LECTURER_ALLOWED_TRANSITIONS[normalized];
};

const getApproveTransition = (status: TimesheetStatus | string): LecturerAction | null => {
  const transitions = getAllowedTransitions(status);
  if (transitions.includes('LecturerApprove')) {
    return 'LecturerApprove';
  }
  if (transitions.includes('FinalApprove')) {
    return 'FinalApprove';
  }
  return null;
};

const getRejectTransition = (status: TimesheetStatus | string): LecturerAction | null => {
  const transitions = getAllowedTransitions(status);
  if (transitions.includes('LecturerReject')) {
    return 'LecturerReject';
  }
  if (transitions.includes('FinalReject')) {
    return 'FinalReject';
  }
  return null;
};

export interface LecturerActionPermission {
  canApprove: boolean;
  canReject: boolean;
  approveReason?: string;
  rejectReason?: string;
  approveTransition: LecturerAction | null;
  rejectTransition: LecturerAction | null;
}

export const getLecturerActionPermission = (
  status: TimesheetStatus | string,
): LecturerActionPermission => {
  const approveTransition = getApproveTransition(status);
  const rejectTransition = getRejectTransition(status);

  return {
    canApprove: Boolean(approveTransition),
    canReject: Boolean(rejectTransition),
    approveReason: approveTransition ? undefined : LECTURER_ACTION_UNAVAILABLE_MESSAGE,
    rejectReason: rejectTransition ? undefined : LECTURER_ACTION_UNAVAILABLE_MESSAGE,
    approveTransition,
    rejectTransition,
  };
};

interface BatchEvaluationResult {
  allowed: boolean;
  transition: LecturerAction | null;
}

const evaluateBatch = (
  statuses: Array<TimesheetStatus | string>,
  resolver: (status: TimesheetStatus | string) => LecturerAction | null,
): BatchEvaluationResult => {
  if (statuses.length === 0) {
    return { allowed: false, transition: null };
  }

  const transitions = new Set<LecturerAction>();
  for (const status of statuses) {
    const transition = resolver(status);
    if (!transition) {
      return { allowed: false, transition: null };
    }
    transitions.add(transition);
  }

  if (transitions.size !== 1) {
    return { allowed: false, transition: null };
  }

  const [transition] = Array.from(transitions);
  return { allowed: true, transition };
};

export interface BatchLecturerActionPermission {
  canApprove: boolean;
  canReject: boolean;
  approveReason?: string;
  rejectReason?: string;
  approveTransition: LecturerAction | null;
  rejectTransition: LecturerAction | null;
}

export const getBatchLecturerActionPermission = (
  statuses: Array<TimesheetStatus | string>,
): BatchLecturerActionPermission => {
  const approveResult = evaluateBatch(statuses, getApproveTransition);
  const rejectResult = evaluateBatch(statuses, getRejectTransition);

  return {
    canApprove: approveResult.allowed,
    canReject: rejectResult.allowed,
    approveReason: approveResult.allowed ? undefined : LECTURER_ACTION_UNAVAILABLE_MESSAGE,
    rejectReason: rejectResult.allowed ? undefined : LECTURER_ACTION_UNAVAILABLE_MESSAGE,
    approveTransition: approveResult.transition,
    rejectTransition: rejectResult.transition,
  };
};
