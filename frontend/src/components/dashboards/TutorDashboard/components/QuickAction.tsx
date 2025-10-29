import { memo, type ReactNode } from 'react';
import { Button } from '../../../ui/button';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';

export interface QuickActionProps {
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  shortcut?: string;
  disabledReason?: string;
}

const QuickAction = memo<QuickActionProps>(({ label, description, icon, onClick, disabled = false, loading = false, shortcut, disabledReason }) => {
  const baseTitle = `${description}${shortcut ? ` (${shortcut})` : ''}`;
  const resolvedTitle = (disabled || loading) ? (disabledReason ?? baseTitle) : baseTitle;
  const isDisabled = disabled || loading;
  const resolvedIcon = loading ? <LoadingSpinner size="small" /> : icon;

  return (
    <Button
      variant="outline"
      className="h-auto w-full justify-start p-4 text-left"
      onClick={() => {
        if (!isDisabled) {
          onClick();
        }
      }}
      disabled={isDisabled}
      title={resolvedTitle}
      aria-busy={loading}
    >
      <span className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {resolvedIcon}
      </span>
      <div className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      {shortcut && <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>}
    </Button>
  );
});

QuickAction.displayName = 'QuickAction';

export default QuickAction;
