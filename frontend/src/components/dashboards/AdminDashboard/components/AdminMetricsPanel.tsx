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
    totalPay,
    tutorCount,
    statusBreakdown,
    systemMetrics,
  } = metrics;
  const tutorCountValue = typeof tutorCount === 'number' ? tutorCount : 'N/A';
  const tutorSubtitle =
    typeof tutorCount === 'number' ? 'Active tutors this term' : 'Data not available yet';

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
          value={formatters.currency(totalPay)}
          subtitle="Approved payouts"
          icon="💰"
          testId="total-pay-card"
        />
        <AdminStatCard
          title="Tutor Coverage"
          value={tutorCountValue}
          subtitle={tutorSubtitle}
          icon="👥"
          testId="tutors-card"
        />
      </div>

      {/* Extended system health panel used in tests */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4" data-testid="system-health-indicator">
          <h3 className="mb-2 text-sm font-semibold">System Health</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">System Load</dt>
              <dd>{(systemMetrics?.systemLoad ?? 0).toString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active Users</dt>
              <dd>{systemMetrics?.activeUsers ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active Courses</dt>
              <dd>{systemMetrics?.activeCourses ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg Approval Time</dt>
              <dd>{systemMetrics?.averageApprovalTime ?? 0}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border p-4" data-testid="status-distribution-chart">
          <h3 className="mb-2 text-sm font-semibold">Status Distribution</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statusBreakdown ?? {}).map(([status, count]) => {
              const n = Number(count) || 0;
              if (n <= 0) return null;
              const key = String(status).toLowerCase();
              return (
                <div key={key} className="distribution-item flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-primary/60" aria-hidden="true" />
                    <span data-testid={`status-badge-${key}`}>{status}</span>
                  </span>
                  <span className="distribution-count font-mono">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});

AdminMetricsPanel.displayName = 'AdminMetricsPanel';

export default AdminMetricsPanel;
