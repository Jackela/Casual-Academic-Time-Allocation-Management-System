/**
 * LecturerDashboard Component
 * 
 * Optimized lecturer dashboard with pending approval management,
 * bulk actions, and comprehensive statistics overview.
 */

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  usePendingTimesheets,
  useDashboardSummary,
  useApprovalAction
} from '../../../hooks/useTimesheets';
import { useAuth } from '../../../contexts/AuthContext';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { formatters } from '../../../utils/formatting';
import { secureLogger } from '../../../utils/secure-logger';
import type { ApprovalAction } from '../../../types/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import StatusBadge from '../../shared/StatusBadge/StatusBadge';

export interface LecturerDashboardProps {
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
}

const StatCard = memo<StatCardProps>(({
  title,
  value,
  subtitle,
  trend = 'stable',
  icon
}) => (
  <Card data-testid="stat-card">
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

StatCard.displayName = 'StatCard';

const StatusBreakdown = memo<{ statusBreakdown: Record<string, number> }>(({ statusBreakdown }) => {
  const total = Object.values(statusBreakdown).reduce((sum, count) => sum + count, 0);
  
  return (
    <Card data-testid="status-breakdown-chart">
      <CardHeader>
        <CardTitle>Status Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(statusBreakdown).map(([status, count]) => {
          if (count === 0) return null;
          
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={status} className="flex items-center justify-between">
              <StatusBadge status={status as any} />
              <div className="text-right">
                <p className="font-semibold">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

StatusBreakdown.displayName = 'StatusBreakdown';

const LecturerDashboard = memo<LecturerDashboardProps>(({ className = '' }) => {
  const { user } = useAuth();
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [rejectionModal, setRejectionModal] = useState<{ timesheetId: number; open: boolean }>({
    timesheetId: 0,
    open: false
  });

  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const {
    loading: pendingLoading,
    error: pendingError,
    timesheets: pendingTimesheets,
    isEmpty: noPendingTimesheets,
    refetch: refetchPending
  } = usePendingTimesheets();

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useDashboardSummary(false); // Lecturer dashboard, not admin

  const {
    loading: approvalLoading,
    error: approvalError,
    approveTimesheet,
    batchApprove,
    reset: resetApproval
  } = useApprovalAction();

  useEffect(() => {
    if (!approvalError) {
      setShowErrorDetails(false);
    }
  }, [approvalError]);

  const welcomeMessage = useMemo(() => {
    const firstName = user?.firstName || user?.name || 'Lecturer';
    return `Welcome back, ${firstName}`;
  }, [user?.firstName, user?.name]);

  const urgentCount = useMemo(() => {
    return pendingTimesheets.filter(t => {
      const submittedDate = new Date(t.createdAt);
      const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSubmission > 3; // Urgent if submitted more than 3 days ago
    }).length;
  }, [pendingTimesheets]);

  const handleApprovalAction = useCallback(async (timesheetId: number, action: ApprovalAction) => {
    try {
      if (action === 'REJECT') {
        setRejectionModal({ timesheetId, open: true });
        return;
      }

      if (action !== 'LECTURER_CONFIRM') {
        return;
      }

      await approveTimesheet({
        timesheetId,
        action: 'LECTURER_CONFIRM',
        comment: 'Approved for processing'
      });

      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets(prev => prev.filter(id => id !== timesheetId));
    } catch (error) {
      secureLogger.error('Failed to process approval', error);
    }
  }, [approveTimesheet, refetchPending, refetchDashboard]);

  const handleBatchApproval = useCallback(async () => {
    if (selectedTimesheets.length === 0) return;

    try {
      const requests = selectedTimesheets.map(timesheetId => ({
        timesheetId,
        action: 'LECTURER_CONFIRM' as const
      }));

      await batchApprove(requests);
      
      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets([]);
    } catch (error) {
      secureLogger.error('Failed to batch approve', error);
    }
  }, [selectedTimesheets, batchApprove, refetchPending, refetchDashboard]);

  const handleRejectionSubmit = useCallback(async (reason: string) => {
    try {
      await approveTimesheet({
        timesheetId: rejectionModal.timesheetId,
        action: 'REJECT',
        comment: reason
      });

      setRejectionModal({ timesheetId: 0, open: false });
      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets(prev => prev.filter(id => id !== rejectionModal.timesheetId));
    } catch (error) {
      secureLogger.error('Failed to reject timesheet', error);
    }
  }, [rejectionModal.timesheetId, approveTimesheet, refetchPending, refetchDashboard]);

  if (pendingLoading || dashboardLoading) {
    return (
      <div className={`p-4 sm:p-6 lg:p-8 ${className}`}>
        <div className="flex items-center justify-center" data-testid="loading-state">
          <LoadingSpinner size="large" />
          <p className="ml-4 text-muted-foreground" data-testid="loading-text">Loading pending timesheets...</p>
        </div>
      </div>
    );
  }

  const hasErrors = pendingError || dashboardError || approvalError;
  
  return (
    <div 
      className={`p-4 sm:p-6 lg:p-8 ${className}`}
      data-testid="lecturer-dashboard"
      role="main"
      aria-label="Lecturer Dashboard"
    >
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="main-welcome-message">{welcomeMessage}</h1>
          <p className="text-muted-foreground">Lecturer Dashboard</p>
          {urgentCount > 0 && (
            <div className="mt-2 flex items-center text-sm font-semibold text-destructive">
              <span className="relative mr-2 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
              </span>
              {urgentCount} urgent approvals needed
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => {
          refetchPending();
          refetchDashboard();
        }}>
          Refresh
        </Button>
      </header>

      {hasErrors && (
        <div className="mb-6 space-y-4">
          {pendingError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
              <span>Failed to fetch pending timesheets: {pendingError}</span>
              <Button variant="destructive" size="sm" className="ml-4" onClick={() => refetchPending()}>Retry</Button>
            </div>
          )}
          {dashboardError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to fetch dashboard summary: {dashboardError}</span>
              <Button variant="destructive" size="sm" className="ml-4" onClick={() => refetchDashboard()}>Retry</Button>
            </div>
          )}
          {approvalError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert" data-testid="approval-error-banner">
              <div className="flex items-center justify-between">
                <span>Approval could not be completed. Please try again.</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowErrorDetails(prev => !prev)}
                  >
                    {showErrorDetails ? 'Hide details' : 'Details'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowErrorDetails(false);
                      resetApproval();
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              {showErrorDetails && (
                <pre className="mt-2 rounded-md bg-black/10 p-2 text-xs">{approvalError}</pre>
              )}
            </div>
          )}
        </div>
      )}

      <section 
        className="mb-8"
        role="region"
        aria-label="Dashboard Summary"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="statistics-cards">
          <StatCard
            title="Pending Approvals"
            value={dashboardData?.pendingApproval || 0}
            subtitle={urgentCount > 0 ? `${urgentCount} urgent` : 'All current'}
            trend={urgentCount > 0 ? 'up' : 'stable'}
            icon="📋"
          />
          <StatCard
            title="Total Timesheets"
            value={dashboardData?.totalTimesheets || 0}
            subtitle="This semester"
            icon="📊"
          />
          <StatCard
            title="This Week Hours"
            value={`${dashboardData?.thisWeekHours || 0}h`}
            subtitle={`$${formatters.currencyValue(dashboardData?.thisWeekPay || 0)}`}
            icon="⏰"
          />
          <StatCard
            title="Approved by You"
            value={dashboardData?.statusBreakdown?.LECTURER_CONFIRMED || 0}
            subtitle="Lecturer approvals"
            trend="up"
            icon="✅"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section 
          className="lg:col-span-2"
          role="region"
          aria-label="Pending Approvals"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Approvals</CardTitle>
                  <CardDescription>
                    Review and approve timesheets submitted by tutors.
                  </CardDescription>
                </div>
                {selectedTimesheets.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleBatchApproval}
                      disabled={approvalLoading}
                    >
                      {approvalLoading ? <LoadingSpinner size="small" /> : 'Batch Approve'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedTimesheets.length} selected
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {noPendingTimesheets ? (
                <div className="py-12 text-center">
                  <div className="mx-auto max-w-xs">
                    <h3 className="text-lg font-semibold">No Pending Timesheets</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      All caught up! No timesheets are waiting for your review.
                    </p>
                    <Button asChild variant="link" className="mt-4">
                      <Link to="/approvals/history">View Approval History</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <TimesheetTable
                  timesheets={pendingTimesheets}
                  loading={pendingLoading}
                  loadingMessage="Loading pending approvals..."
                  onApprovalAction={handleApprovalAction}
                  actionLoading={approvalLoading ? pendingTimesheets[0]?.id : null}
                  showActions={true}
                  showTutorInfo={true}
                  showCourseInfo={true}
                  showSelection={true}
                  selectedIds={selectedTimesheets}
                  onSelectionChange={setSelectedTimesheets}
                  className="lecturer-timesheet-table"
                  approvalRole="LECTURER"
                />
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6 lg:col-span-1" data-testid="dashboard-sidebar">
          {dashboardData?.statusBreakdown && (
            <StatusBreakdown statusBreakdown={dashboardData.statusBreakdown} />
          )}
        </aside>
      </div>

      {rejectionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Timesheet</CardTitle>
              <CardDescription>
                Please provide a clear reason for rejection. This will be sent to the tutor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const reason = formData.get('reason') as string;
                if (reason.trim()) {
                  handleRejectionSubmit(reason);
                }
              }}>
                <textarea
                  id="reason"
                  name="reason"
                  required
                  placeholder="e.g., Incorrect hours logged for CS101..."
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setRejectionModal({ timesheetId: 0, open: false })}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive">
                    Reject Timesheet
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {approvalLoading && 'Processing approval...'}
        {pendingLoading && 'Loading pending timesheets...'}
      </div>
    </div>
  );
});

LecturerDashboard.displayName = 'LecturerDashboard';

export default LecturerDashboard;









