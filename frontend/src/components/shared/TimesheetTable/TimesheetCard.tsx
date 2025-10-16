import { memo, useMemo } from 'react';
import type { Timesheet } from '../../../types/api';
import StatusBadge from '../StatusBadge/StatusBadge';
import TimesheetActions from './TimesheetActions';
import { formatCurrency, formatWeekDate } from '../../../lib/formatters/date-formatters';
import { cn } from '../../../lib/utils';

export interface TimesheetCardProps {
  timesheet: Timesheet;
  mode?: 'tutor' | 'lecturer' | 'admin';
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onEdit?: (id: number) => void;
  onSubmit?: (id: number) => void;
  onConfirm?: (id: number) => void;
  actionLoading?: boolean;
  actionsDisabled?: boolean;
  actionsDisabledReason?: string;
  className?: string;
}

interface ActionsCellProps {
  timesheet: Timesheet;
  mode: NonNullable<TimesheetCardProps['mode']>;
  actionLoading?: TimesheetCardProps['actionLoading'];
  actionsDisabled?: TimesheetCardProps['actionsDisabled'];
  actionsDisabledReason?: TimesheetCardProps['actionsDisabledReason'];
  onApprove?: TimesheetCardProps['onApprove'];
  onReject?: TimesheetCardProps['onReject'];
  onEdit?: TimesheetCardProps['onEdit'];
  onSubmit?: TimesheetCardProps['onSubmit'];
  onConfirm?: TimesheetCardProps['onConfirm'];
}

const ActionsCell = ({
  timesheet,
  mode,
  actionLoading,
  actionsDisabled,
  actionsDisabledReason,
  onApprove,
  onReject,
  onEdit,
  onSubmit,
  onConfirm,
}: ActionsCellProps) => (
  <TimesheetActions
    timesheet={timesheet}
    mode={mode}
    loading={actionLoading}
    disabled={actionsDisabled}
    disabledReason={actionsDisabledReason}
    onEdit={onEdit ? () => onEdit(timesheet.id) : undefined}
    onSubmit={onSubmit ? () => onSubmit(timesheet.id) : undefined}
    onConfirm={onConfirm ? () => onConfirm(timesheet.id) : undefined}
    onApprove={onApprove ? () => onApprove(timesheet.id) : undefined}
    onReject={onReject ? () => onReject(timesheet.id) : undefined}
  />
);

export const TimesheetCard = memo<TimesheetCardProps>(({
  timesheet,
  mode = 'tutor',
  onApprove,
  onReject,
  onEdit,
  onSubmit,
  onConfirm,
  actionLoading,
  actionsDisabled,
  actionsDisabledReason,
  className,
}) => {
  const totalPay = useMemo(
    () => timesheet.hours * timesheet.hourlyRate,
    [timesheet.hours, timesheet.hourlyRate],
  );

  const courseLabel = useMemo(() => {
    if (timesheet.courseName && timesheet.courseCode) {
      return `${timesheet.courseCode} · ${timesheet.courseName}`;
    }
    return timesheet.courseName ?? timesheet.courseCode ?? `Course ${timesheet.courseId}`;
  }, [timesheet.courseCode, timesheet.courseId, timesheet.courseName]);

  const description = typeof timesheet.description === 'string'
    ? timesheet.description.trim()
    : '';

  return (
    <article
      className={cn(
        'timesheet-card',
        'rounded-lg border border-border bg-card p-4',
        'shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
      data-testid={`timesheet-card-${timesheet.id}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <h3 className="flex-1 min-w-0 text-base font-semibold leading-tight" title={courseLabel}>
          <span className="block truncate">{courseLabel}</span>
        </h3>
        <StatusBadge
          status={timesheet.status}
          size="small"
          lastModified={timesheet.updatedAt}
          submittedAt={timesheet.createdAt}
          showTimestampTooltip
        />
      </header>

      <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="font-medium text-muted-foreground">Week</dt>
          <dd className="font-semibold">{formatWeekDate(timesheet.weekStartDate)}</dd>
        </div>
        <div className="text-right">
          <dt className="font-medium text-muted-foreground">Total Pay</dt>
          <dd className="font-mono font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(totalPay)}
          </dd>
        </div>
      </dl>

      {description && (
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground" title={description}>
          {description}
        </p>
      )}

      <footer className="flex gap-2 border-t border-border pt-3">
        <ActionsCell
          timesheet={timesheet}
          mode={mode}
          actionLoading={actionLoading}
          actionsDisabled={actionsDisabled}
          actionsDisabledReason={actionsDisabledReason}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          onSubmit={onSubmit}
          onConfirm={onConfirm}
        />
      </footer>
    </article>
  );
});

TimesheetCard.displayName = 'TimesheetCard';

