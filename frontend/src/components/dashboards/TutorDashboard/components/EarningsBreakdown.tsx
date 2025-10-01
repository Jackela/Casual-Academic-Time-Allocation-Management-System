import { memo, useMemo } from 'react';
import type { Timesheet } from '../../../../types/api';
import { formatters } from '../../../../utils/formatting';
import { Card, CardContent, CardTitle } from '../../../ui/card';

export interface EarningsBreakdownProps {
  timesheets: Timesheet[];
}

const EarningsBreakdown = memo<EarningsBreakdownProps>(({ timesheets }) => {
  const courseEarnings = useMemo(() => {
    const earnings: Record<string, { hours: number; pay: number }> = {};

    timesheets.forEach(timesheet => {
      const courseName = timesheet.courseName || 'Unknown Course';
      if (!earnings[courseName]) {
        earnings[courseName] = { hours: 0, pay: 0 };
      }
      earnings[courseName].hours += timesheet.hours;
      earnings[courseName].pay += timesheet.hours * timesheet.hourlyRate;
    });

    return Object.entries(earnings).map(([course, data]) => ({
      course,
      ...data
    }));
  }, [timesheets]);

  return (
    <Card className="p-4" data-testid="earnings-breakdown">
      <CardTitle className="mb-2 text-lg font-semibold">Earnings by Course</CardTitle>
      <CardContent className="space-y-2 p-0">
        {courseEarnings.map(({ course, hours, pay }) => (
          <div key={course} className="flex justify-between text-sm">
            <span className="font-medium text-foreground">{course}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{hours}h</span>
              <span>${formatters.currencyValue(pay)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
});

EarningsBreakdown.displayName = 'EarningsBreakdown';

export default EarningsBreakdown;