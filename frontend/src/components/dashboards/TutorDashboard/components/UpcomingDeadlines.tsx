import { memo } from 'react';
import type { DashboardDeadline } from '../../../../types/api';
import { formatDateMonthDay } from '../../../../utils/formatting';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';

export interface UpcomingDeadlinesProps {
  deadlines: DashboardDeadline[];
  isLoading?: boolean;
  errorMessage?: string | null;
}

const UpcomingDeadlines = memo<UpcomingDeadlinesProps>(({ deadlines, isLoading = false, errorMessage = null }) => {
  const content = (() => {
    if (isLoading) {
      return (
        <div
          className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
          role="status"
        >
          <LoadingSpinner size="small" />
          <span>Loading upcoming deadlines…</span>
        </div>
      );
    }

    if (errorMessage) {
      return (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      );
    }

    if (deadlines.length === 0) {
      return <p className="text-sm text-muted-foreground">No upcoming deadlines available.</p>;
    }

    return (
      <ul className="space-y-2">
        {deadlines.map((deadline, index) => {
          const dateValue = deadline.deadline ?? deadline.dueDate;
          const formattedDate = dateValue ? formatDateMonthDay(dateValue) : 'TBD';
          const courseLabel = deadline.courseName ?? 'Course';

          return (
            <li key={deadline.id ?? deadline.courseId ?? index} className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {`${courseLabel} - Due`}
              </span>
              <span className="text-muted-foreground">{formattedDate}</span>
            </li>
          );
        })}
      </ul>
    );
  })();

  return (
    <div className="w-full max-w-full rounded-lg border bg-card p-4">
      <h3 className="mb-2 font-semibold">Upcoming Deadlines</h3>
      {content}
    </div>
  );
});

UpcomingDeadlines.displayName = 'UpcomingDeadlines';

export default UpcomingDeadlines;
