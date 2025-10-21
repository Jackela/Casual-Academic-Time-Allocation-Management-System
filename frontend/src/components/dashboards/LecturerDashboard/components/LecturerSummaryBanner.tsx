import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { ClipboardList, FileText, Clock, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { formatters } from '../../../../utils/formatting';
import type { LecturerDashboardMetrics } from '../../../../types/dashboard/lecturer-dashboard';
import type { LucideIcon } from 'lucide-react';

interface LecturerSummaryBannerProps {
  welcomeMessage: string;
  urgentCount: number;
  metrics: LecturerDashboardMetrics;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: LucideIcon;
}

const StatCard = memo<StatCardProps>(({ title, value, subtitle, trend = 'stable', icon: Icon }) => (
  <Card data-testid="stat-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold" data-testid="stat-card-value">
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="h-3 w-3" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3" />}
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
));

StatCard.displayName = 'LecturerStatCard';

const LecturerSummaryBanner = memo<LecturerSummaryBannerProps>(({ welcomeMessage, urgentCount, metrics }) => (
  <div className="mb-8 layout-flush">
    <div>
      <h1 className="text-3xl font-bold tracking-tight" data-testid="main-welcome-message">
        {welcomeMessage}
      </h1>
      <p className="text-muted-foreground" data-testid="main-dashboard-title">
        Lecturer Dashboard
      </p>
      {urgentCount > 0 && (
        <div
          className="mt-2 flex items-center text-sm font-semibold text-destructive"
          data-testid="urgent-alert"
        >
          <span className="relative mr-2 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span data-testid="urgent-count">{urgentCount}</span> urgent approvals needed
        </div>
      )}
    </div>

    <section className="mt-6" role="region" aria-label="Dashboard Summary">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="statistics-cards">
        <StatCard
          title="Pending Approvals"
          value={metrics.pendingApproval}
          subtitle={urgentCount > 0 ? `${urgentCount} urgent` : 'All current'}
          trend={urgentCount > 0 ? 'up' : 'stable'}
          icon={ClipboardList}
        />
        <StatCard
          title="Total Timesheets"
          value={metrics.totalTimesheets}
          subtitle="This semester"
          icon={FileText}
        />
        <StatCard
          title="This Week Hours"
          value={formatters.hours(metrics.thisWeekHours)}
          subtitle={formatters.currency(metrics.thisWeekPay)}
          icon={Clock}
        />
        <StatCard
          title="Approved by You"
          value={metrics.statusBreakdown?.LECTURER_CONFIRMED ?? 0}
          subtitle="Lecturer approvals"
          trend="up"
          icon={CheckCircle2}
        />
      </div>
    </section>
  </div>
));

LecturerSummaryBanner.displayName = 'LecturerSummaryBanner';

export default LecturerSummaryBanner;
