import { memo } from 'react';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { formatters } from '../../../../utils/formatting';
import type { AdminSummaryMetrics } from '../../../../types/dashboard/admin-dashboard';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
  testId?: string;
  onClick?: () => void;
}

const AdminStatCard = memo<AdminStatCardProps>(({
  title,
  value,
  subtitle,
  trend = 'stable',
  icon,
  testId,
  onClick,
}) => (
  <Card
    data-testid={testId ?? 'stat-card'}
    onClick={onClick}
    className={onClick ? 'cursor-pointer hover:bg-accent' : ''}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon && <span className="text-2xl text-muted-foreground">{icon}</span>}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground">
          {trend === 'up' && '↗ '}
          {trend === 'down' && '↘ '}
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
));

AdminStatCard.displayName = 'AdminStatCard';

interface AdminMetricsPanelProps {
  metrics: AdminSummaryMetrics;
  isLoading: boolean;
}

const AdminMetricsPanel = memo<AdminMetricsPanelProps>(({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <section role="region" aria-label="System Overview">
        <div className="flex items-center gap-3 rounded-md border border-muted/40 bg-background/70 p-4 text-sm text-muted-foreground">
          <LoadingSpinner size="small" />
          <span>Refreshing admin metrics...</span>
        </div>
      </section>
    );
  }

  const {
    totalTimesheets,
    pendingApprovals,
    totalHours,
    totalPayroll,
    tutorCount,
  } = metrics;

  return (
    <section role="region" aria-label="System Overview">
      <div className="mb-4">
        <h2 className="text-xl font-semibold" data-testid="system-overview-title">System Overview</h2>
        <p className="text-sm text-muted-foreground">Key metrics tracking the health of the allocation programme.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="statistics-cards">
        <AdminStatCard
          title="Total Timesheets"
          value={totalTimesheets}
          subtitle="All time records"
          icon="📊"
          testId="total-timesheets-card"
        />
        <AdminStatCard
          title="Pending Approvals"
          value={pendingApprovals}
          subtitle="Awaiting admin review"
          icon="⏳"
          testId="pending-approvals-card"
        />
        <AdminStatCard
          title="Total Hours"
          value={formatters.hours(totalHours)}
          subtitle="Tracked across all tutors"
          icon="⏰"
          testId="total-hours-card"
        />
        <AdminStatCard
          title="Total Payroll"
          value={formatters.currency(totalPayroll)}
          subtitle="Approved payouts"
          icon="💰"
          testId="total-pay-card"
        />
        <AdminStatCard
          title="Tutor Coverage"
          value={tutorCount}
          subtitle="Active tutors this term"
          icon="👥"
          testId="tutors-card"
        />
      </div>
    </section>
  );
});

AdminMetricsPanel.displayName = 'AdminMetricsPanel';

export default AdminMetricsPanel;
