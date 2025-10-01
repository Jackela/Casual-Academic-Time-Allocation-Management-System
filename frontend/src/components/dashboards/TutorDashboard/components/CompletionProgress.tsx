import { memo } from 'react';

export interface CompletionProgressProps {
  completionRate: number;
}

const CompletionProgress = memo<CompletionProgressProps>(({ completionRate }) => (
  <div className="rounded-lg border bg-card p-4" data-testid="completion-progress">
    <h4 className="mb-2 font-semibold">Semester Progress</h4>
    <div className="flex items-center gap-2">
      <div className="h-2 w-full flex-1 rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${completionRate * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {Math.round(completionRate * 100)}%
      </span>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">
      Keep up the great work! You're on track for this semester.
    </p>
  </div>
));

CompletionProgress.displayName = 'CompletionProgress';

export default CompletionProgress;