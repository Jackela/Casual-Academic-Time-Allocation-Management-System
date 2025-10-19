import { memo } from 'react';
import type { DashboardDeadline } from '../../../../types/api';
import { formatDateMonthDay } from '../../../../utils/formatting';

export interface UpcomingDeadlinesProps {
  deadlines: DashboardDeadline[];
}

const UpcomingDeadlines = memo<UpcomingDeadlinesProps>(({ deadlines }) => (
  <div className="w-full max-w-full rounded-lg border bg-card p-4">
    <h3 className="mb-2 font-semibold">Upcoming Deadlines</h3>
    {deadlines.length === 0 ? (
      <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
    ) : (
      <ul className="space-y-2">
        {deadlines.map((deadline, index) => {
          const dateValue = deadline.deadline ?? deadline.dueDate;
          const formattedDate = dateValue
            ? formatDateMonthDay(dateValue)
            : 'TBD';
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
    )}
  </div>
));

UpcomingDeadlines.displayName = 'UpcomingDeadlines';

export default UpcomingDeadlines;
