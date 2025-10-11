import { AlertOctagon, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../ui/button';

export interface GlobalErrorBannerProps {
  title?: string;
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  severity?: 'error' | 'warning';
  icon?: ReactNode;
  'data-testid'?: string;
}

const iconBySeverity: Record<NonNullable<GlobalErrorBannerProps['severity']>, ReactNode> = {
  error: <AlertOctagon className="h-5 w-5 text-destructive" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />,
};

export function GlobalErrorBanner({
  title = 'Something went wrong',
  message,
  actionLabel,
  onAction,
  onDismiss,
  severity = 'error',
  icon,
  'data-testid': dataTestId = 'global-error-banner',
}: GlobalErrorBannerProps) {
  const baseIcon = icon ?? iconBySeverity[severity];
  const bannerColour =
    severity === 'warning'
      ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-900 dark:border-yellow-400/50 dark:bg-yellow-400/10 dark:text-yellow-100'
      : 'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/10 dark:text-destructive';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:gap-4 ${bannerColour}`}
      data-testid={dataTestId}
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-1" aria-hidden="true">
          {baseIcon}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <div className="text-sm">{message}</div>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        {onAction && actionLabel && (
          <Button
            size="sm"
            variant={severity === 'warning' ? 'outline' : 'destructive'}
            onClick={onAction}
            data-testid={`${dataTestId}-action`}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </Button>
        )}
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            data-testid={`${dataTestId}-dismiss`}
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}

export default GlobalErrorBanner;
