/**
 * Notification Router
 * 
 * Centralized notification state management and routing logic for the dual-track
 * notification system. Handles notification visibility, priority, and action dispatch.
 */

import type { DashboardDeadline } from '../../types/api';

export interface NotificationState {
  visibleDraftCount: number;
  visibleRejectedCount: number;
  visibleDeadlines: DashboardDeadline[];
  dismissedNotifications: Set<string>;
}

export interface NotificationAction {
  type: 'DISMISS' | 'RESET' | 'UPDATE_COUNTS' | 'UPDATE_DEADLINES';
  payload?: any;
}

export type NotificationDispatch = (action: NotificationAction) => void;

export interface NotificationContext {
  state: NotificationState;
  dispatch: NotificationDispatch;
}

/**
 * Determines the priority level of notifications based on current state
 */
export const getNotificationPriority = (state: NotificationState): 'critical' | 'high' | 'medium' | 'none' => {
  if (state.visibleRejectedCount > 0) return 'critical';
  if (state.visibleDraftCount > 0) return 'high';
  if (state.visibleDeadlines.length > 0) return 'medium';
  return 'none';
};

/**
 * Determines if the banner notification should be shown
 */
export const shouldShowBannerNotification = (state: NotificationState): boolean => {
  return state.visibleDraftCount > 0 || state.visibleRejectedCount > 0;
};

/**
 * Generates the notification configuration for the banner
 */
export const getBannerNotificationConfig = (state: NotificationState) => {
  const priority = getNotificationPriority(state);
  
  if (state.visibleRejectedCount > 0) {
    return {
      variant: 'page-banner--error' as const,
      title: 'Action required',
      message: `${state.visibleRejectedCount} timesheet${state.visibleRejectedCount === 1 ? '' : 's'} require revision before approval.`,
      icon: '⛔',
      priority: 'critical' as const,
      showSubmitAction: false
    };
  }
  
  if (state.visibleDraftCount > 0) {
    return {
      variant: 'page-banner--warning' as const,
      title: 'Draft timesheets pending',
      message: `${state.visibleDraftCount} draft timesheet${state.visibleDraftCount === 1 ? ' needs' : 's need'} submission.`,
      icon: '⚠️',
      priority: 'high' as const,
      showSubmitAction: true
    };
  }
  
  return null;
};

/**
 * Notification router reducer function
 */
export const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'DISMISS':
      return {
        ...state,
        dismissedNotifications: new Set([...state.dismissedNotifications, action.payload])
      };
      
    case 'RESET':
      return {
        ...state,
        dismissedNotifications: new Set()
      };
      
    case 'UPDATE_COUNTS':
      return {
        ...state,
        visibleDraftCount: action.payload.draftCount || 0,
        visibleRejectedCount: action.payload.rejectedCount || 0
      };
      
    case 'UPDATE_DEADLINES':
      return {
        ...state,
        visibleDeadlines: action.payload || []
      };
      
    default:
      return state;
  }
};

/**
 * Initial notification state
 */
export const initialNotificationState: NotificationState = {
  visibleDraftCount: 0,
  visibleRejectedCount: 0,
  visibleDeadlines: [],
  dismissedNotifications: new Set()
};

/**
 * Utility to create notification dismissal handler
 */
export const createNotificationDismissHandler = (dispatch: NotificationDispatch) => {
  return (notificationId: string) => {
    dispatch({
      type: 'DISMISS',
      payload: notificationId
    });
  };
};

/**
 * Utility to determine if a notification should be visible based on dismissal state
 */
export const isNotificationVisible = (notificationId: string, dismissedNotifications: Set<string>): boolean => {
  return !dismissedNotifications.has(notificationId);
};