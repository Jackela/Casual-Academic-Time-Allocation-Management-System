import { memo } from 'react';
import type { DashboardDeadline } from '../../../../types/api';
import { formatters } from '../../../../utils/formatting';
import { Card, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';

export interface NotificationsPanelProps {
  rejectedCount: number;
  draftCount: number;
  deadlines: DashboardDeadline[];
  onDismiss: (notificationId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

const NotificationsPanel = memo<NotificationsPanelProps>(
  ({
    rejectedCount,
    draftCount,
    deadlines,
    onDismiss,
    isLoading = false,
    emptyMessage = 'No notifications at this time.',
  }) => {
    const hasNotifications =
      rejectedCount > 0 || draftCount > 0 || deadlines.length > 0;

    return (
      <Card className="p-4" data-testid="notifications-panel">
        <CardTitle className="mb-2 text-lg font-semibold">Notifications</CardTitle>

        {isLoading && (
          <div
            className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
            role="status"
          >
            <span className="text-xl" aria-hidden="true">
              ⏳
            </span>
            <span>Loading notifications…</span>
          </div>
        )}

        {!isLoading && !hasNotifications && (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}

        {rejectedCount > 0 && (
          <div
            className="notification mb-2 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            data-testid="action-required"
          >
            <span className="notification-icon text-xl">⚠️</span>
            <div className="notification-content flex-1">
              <strong className="block font-semibold">Action Required</strong>
              <p>{rejectedCount} timesheets need your attention</p>
              <p>{rejectedCount} rejected timesheets need your attention</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss('rejected-reminder')}
              aria-label="Dismiss action required alert"
              className="h-auto p-1 text-muted-foreground hover:bg-red-100 hover:text-red-800"
            >
              ×
            </Button>
          </div>
        )}

        {draftCount > 0 && (
          <div className="notification mb-2 flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <span className="notification-icon text-xl">📝</span>
            <div className="notification-content flex-1">
              <strong className="block font-semibold">Don't forget to submit</strong>
              <p>{draftCount} draft timesheets are waiting</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss('draft-reminder')}
              aria-label="Dismiss draft reminder"
              className="h-auto p-1 text-muted-foreground hover:bg-yellow-100 hover:text-yellow-800"
            >
              ×
            </Button>
          </div>
        )}

        {deadlines.map((deadline, index) => {
          const formattedDate = formatters.date(deadline.deadline ?? '', {
            month: 'short',
            day: 'numeric',
          });
          const dismissLabel =
            index === 0
              ? 'Dismiss notification'
              : `Dismiss ${deadline.courseName} deadline alert`;

          return (
            <div
              key={deadline.courseId || index}
              className="notification mb-2 flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
            >
              <span className="notification-icon text-xl">📅</span>
              <div className="notification-content flex-1">
                <strong className="block font-semibold">
                  Deadline approaching for {deadline.courseName}
                </strong>
                <p>Due {formattedDate}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(`deadline-${deadline.courseId ?? index}`)}
                aria-label={dismissLabel}
                className="h-auto p-1 text-muted-foreground hover:bg-blue-100 hover:text-blue-800"
              >
                ×
              </Button>
            </div>
          );
        })}
      </Card>
    );
  },
);

NotificationsPanel.displayName = 'NotificationsPanel';

export default NotificationsPanel;
