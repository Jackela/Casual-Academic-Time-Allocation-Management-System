import { memo } from 'react';
import { Button } from '../../../ui/button';

export interface QuickActionProps {
  label: string;
  description: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
  disabledReason?: string;
}

const QuickAction = memo<QuickActionProps>(({ label, description, icon, onClick, disabled = false, shortcut, disabledReason }) => {
  const baseTitle = `${description}${shortcut ? ` (${shortcut})` : ''}`;
  const resolvedTitle = disabled ? (disabledReason ?? baseTitle) : baseTitle;

  return (
    <Button
      variant="outline"
      className="h-auto w-full justify-start p-4 text-left"
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
      title={resolvedTitle}
    >
      <span className="mr-4 text-2xl">{icon}</span>
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
