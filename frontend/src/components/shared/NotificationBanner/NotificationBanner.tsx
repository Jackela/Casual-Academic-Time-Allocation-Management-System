/**
 * NotificationBanner Component
 * 
 * A unified banner component for page-level notifications that appears above
 * the main content area. Replaces the sidebar NotificationsPanel to provide
 * better visibility and consolidated action buttons.
 */

import { memo } from 'react';
import { Button } from '../../ui/button';

export interface NotificationBannerProps {
  /** Banner variant determining visual style */
  variant: 'page-banner--warning' | 'page-banner--error' | 'page-banner--info';
  /** Primary notification title */
  title: string;
  /** Detailed notification message */
  message: string;
  /** Icon to display (emoji or unicode) */
  icon: string;
  /** Whether to show the primary action button */
  showAction?: boolean;
  /** Text for the primary action button */
  actionText?: string;
  /** Handler for primary action button */
  onAction?: () => void;
  /** Whether the action is currently loading */
  actionLoading?: boolean;
  /** Whether the action button should be disabled */
  actionDisabled?: boolean;
  /** Tooltip/title for disabled action button */
  actionDisabledReason?: string;
  /** Whether to show dismiss button */
  showDismiss?: boolean;
  /** Handler for dismiss action */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for the banner */
  testId?: string;
}

const NotificationBanner = memo<NotificationBannerProps>(({
  variant,
  title,
  message,
  icon,
  showAction = false,
  actionText = 'Take Action',
  onAction,
  actionLoading = false,
  actionDisabled = false,
  actionDisabledReason,
  showDismiss = false,
  onDismiss,
  className = '',
  testId = 'notification-banner'
}) => {
  return (
    <div className="notification-banner-container">
      <div
        className={`notification-banner ${variant} ${className}`}
        data-testid={testId}
        role="alert"
        aria-live="polite"
      >
        <span className="notification-banner__icon" aria-hidden="true">
          {icon}
        </span>
        
        <div className="notification-banner__content">
          <span className="notification-banner__title">{title}</span>
          <p className="notification-banner__description">{message}</p>
        </div>
        
        {showAction && onAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAction}
            disabled={actionDisabled || actionLoading}
            title={actionDisabled && actionDisabledReason ? actionDisabledReason : undefined}
            className="notification-banner__action shrink-0"
            data-testid={`${testId}-action`}
          >
            {actionLoading ? 'Processing...' : actionText}
          </Button>
        )}
        
        {showDismiss && onDismiss && (
          <button
            type="button"
            className="notification-banner__dismiss"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            data-testid={`${testId}-dismiss`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
});

NotificationBanner.displayName = 'NotificationBanner';

export default NotificationBanner;