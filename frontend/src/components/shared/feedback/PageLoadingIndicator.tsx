import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

export interface PageLoadingIndicatorProps {
  message?: string;
  subMessage?: string;
  icon?: ReactNode;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function PageLoadingIndicator({
  message = 'Loading…',
  subMessage,
  icon,
  'aria-label': ariaLabel = 'Page loading indicator',
  'data-testid': dataTestId = 'page-loading-indicator',
}: PageLoadingIndicatorProps) {
  const resolvedIcon = icon ?? <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />;

  return (
    <section
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background/60 p-6 text-center shadow-sm"
      data-testid={dataTestId}
    >
      <div>{resolvedIcon}</div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {subMessage ? <p className="text-xs text-muted-foreground">{subMessage}</p> : null}
    </section>
  );
}

export default PageLoadingIndicator;
