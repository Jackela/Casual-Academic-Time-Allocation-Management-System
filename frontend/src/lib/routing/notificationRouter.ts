import { clearNotifications, publishNotification } from '../notifications/notificationBus';

export type NotificationChannel = 'banner' | 'toast';

export interface NotificationPayload {
  channel: NotificationChannel;
  message: string;
  title?: string;
  icon?: string;
  cta?: { label: string; action: () => void };
  dismissible?: boolean;
  durationMs?: number;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export type AppEvent =
  | { type: 'TIMESHEET_SUBMIT_SUCCESS'; count: number }
  | { type: 'API_ERROR'; message: string; retry?: () => void }
  | { type: 'DRAFTS_PENDING'; count: number; onSubmitDrafts?: () => void }
  | { type: 'REJECTIONS_PENDING'; count: number }
  | { type: 'CLEAR_CHANNEL'; channel?: NotificationChannel };

export function notificationRouter(event: AppEvent): NotificationPayload | null {
  switch (event.type) {
    case 'TIMESHEET_SUBMIT_SUCCESS':
      return {
        channel: 'toast',
        message: `${event.count} timesheet(s) submitted successfully.`,
        title: 'Submission complete',
        icon: '✅',
        severity: 'success',
        durationMs: 4500,
      };
    case 'API_ERROR':
      return {
        channel: 'banner',
        message: `An error occurred: ${event.message}`,
        title: 'Action required',
        icon: '🚫',
        severity: 'error',
        cta: {
          label: 'Retry',
          action: event.retry ?? (() => window.location.reload()),
        },
        dismissible: true,
      };
    case 'DRAFTS_PENDING': {
      const timesheetSuffix = event.count === 1 ? '' : 's';
      const needsSuffix = event.count === 1 ? 'needs' : 'need';
      return {
        channel: 'banner',
        title: 'Draft timesheets pending',
        message: `${event.count} draft timesheet${timesheetSuffix} ${needsSuffix} submission`,
        severity: 'warning',
        icon: '📝',
        cta: event.onSubmitDrafts
          ? {
              label: 'Submit drafts',
              action: event.onSubmitDrafts,
            }
          : undefined,
        dismissible: true,
      };
    }
    case 'REJECTIONS_PENDING': {
      const timesheetSuffix = event.count === 1 ? '' : 's';
      return {
        channel: 'banner',
        title: 'Action required',
        message: `${event.count} timesheet${timesheetSuffix} require revision before approval`,
        severity: 'error',
        icon: '⚠️',
        dismissible: true,
      };
    }
    default:
      return null;
  }
}

/**
 * Convenience helper that routes an application event and publishes
 * the resulting notification to the shared notification bus.
 */
export function dispatchNotification(event: AppEvent): NotificationPayload | null {
  if (event.type === 'CLEAR_CHANNEL') {
    clearNotifications(event.channel);
    return null;
  }

  const payload = notificationRouter(event);
  if (payload) {
    publishNotification(payload);
  }
  return payload;
}
