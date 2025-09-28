/**
 * AdminDashboard Component
 * 
 * Comprehensive admin dashboard with system oversight, user management,
 * analytics, and administrative controls with advanced filtering and monitoring.
 */

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { 
  useTimesheets,
  useDashboardSummary, 
  useApprovalAction,
  useTimesheetStats 
} from '../../../hooks/useTimesheets';
import { useAuth } from '../../../contexts/AuthContext';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { formatters } from '../../../utils/formatting';
import type { 
  ApprovalAction, 
  TimesheetQuery,
} from '../../../types/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import StatusBadge from '../../shared/StatusBadge/StatusBadge';

export interface AdminDashboardProps {
  className?: string;
}

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
  onClick
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

const AdminDashboard = memo<AdminDashboardProps>(({ className = '' }) => {
  const { user } = useAuth();
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [currentTab, setCurrentTab] = useState<'overview' | 'pending' | 'users' | 'analytics' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState<TimesheetQuery>({});
  const [rejectionModal, setRejectionModal] = useState<{ open: boolean; timesheetId: number | null }>({
    open: false,
    timesheetId: null
  });
  const [rejectionComment, setRejectionComment] = useState('');
  const [rejectionValidationError, setRejectionValidationError] = useState<string | null>(null);
  
  const {
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    isEmpty: noTimesheets,
    updateQuery,
    refresh: refreshTimesheets
  } = useTimesheets({ 
    ...filterQuery,
    size: 50
  });

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useDashboardSummary(true);

  const {
    loading: approvalLoading,
    error: approvalError,
    approveTimesheet,
    batchApprove,
    reset: resetApproval
  } = useApprovalAction();

  const adminStats = useTimesheetStats(allTimesheets);

  const filteredTimesheets = useMemo(() => {
    let filtered = allTimesheets;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(timesheet => 
        timesheet.tutorName?.toLowerCase().includes(query) ||
        timesheet.courseName?.toLowerCase().includes(query)
      );
    }
    if (currentTab === 'pending') {
      filtered = filtered.filter(t => 
        t.status === 'LECTURER_CONFIRMED'
      );
    }
    return filtered;
  }, [allTimesheets, searchQuery, currentTab]);

  const welcomeMessage = useMemo(() => {
    if (user) {
      const name = user.firstName || user.name || 'Admin';
      return `Welcome back, ${name}`;
    }
    return 'Welcome back, Administrator';
  }, [user]);

  const urgentCount = useMemo(() => {
    return filteredTimesheets.filter(t => {
      const submittedDate = new Date(t.createdAt);
      const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSubmission > 5;
    }).length;
  }, [filteredTimesheets]);

  const handleTabChange = useCallback((tab: typeof currentTab) => {
    setCurrentTab(tab);
    setSelectedTimesheets([]);
  }, []);

  const handleApprovalAction = useCallback(async (timesheetId: number, action: ApprovalAction) => {
    if (action === 'REJECT') {
      setRejectionModal({ open: true, timesheetId });
      setRejectionComment('');
      setRejectionValidationError(null);
      return;
    }

    setActionLoadingId(timesheetId);
    try {
      await approveTimesheet({ timesheetId, action });
      setSelectedTimesheets(prev => prev.filter(id => id !== timesheetId));
      refreshTimesheets();
      await refetchDashboard();
    } catch (error) {
      // Intentionally let existing error handling surface via approvalError
    } finally {
      setActionLoadingId(null);
    }
  }, [approveTimesheet, refreshTimesheets, refetchDashboard]);

  const rejectionTargetTimesheet = useMemo(() => {
    if (!rejectionModal.open || !rejectionModal.timesheetId) {
      return null;
    }
    return allTimesheets.find(timesheet => timesheet.id === rejectionModal.timesheetId) ?? null;
  }, [allTimesheets, rejectionModal]);

  const handleRejectionCancel = useCallback(() => {
    setRejectionModal({ open: false, timesheetId: null });
    setRejectionComment('');
    setRejectionValidationError(null);
    resetApproval();
  }, [resetApproval]);

  const handleRejectionSubmit = useCallback(async () => {
    if (!rejectionModal.open || !rejectionModal.timesheetId) {
      return;
    }

    const trimmedComment = rejectionComment.trim();
    if (trimmedComment.length < 3) {
      setRejectionValidationError('Please provide a short justification before rejecting the timesheet.');
      return;
    }

    setRejectionValidationError(null);
    setActionLoadingId(rejectionModal.timesheetId);
    try {
      await approveTimesheet({
        timesheetId: rejectionModal.timesheetId,
        action: 'REJECT',
        comment: trimmedComment
      });
      setSelectedTimesheets(prev => prev.filter(id => id !== rejectionModal.timesheetId));
      refreshTimesheets();
      await refetchDashboard();
      setRejectionModal({ open: false, timesheetId: null });
      setRejectionComment('');
    } catch (error) {
      // Error banner is handled via approvalError state
    } finally {
      setActionLoadingId(null);
    }
  }, [approveTimesheet, refetchDashboard, refreshTimesheets, rejectionComment, rejectionModal]);

  const handleGlobalSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  if (timesheetsLoading || dashboardLoading) {
    return (
      <div className={`p-4 sm:p-6 lg:p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <LoadingSpinner size="large" />
          <p className="ml-4 text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const hasErrors = timesheetsError || dashboardError || approvalError;
  const totalTimesheetCount = dashboardData?.totalTimesheets ?? 0;
  const pendingApprovalsCount = dashboardData?.pendingApprovals ?? 0;
  const totalHoursValue = dashboardData?.totalHours ?? 0;
  const totalPayrollValue = dashboardData?.totalPayroll ?? 0;
  const tutorCountValue = dashboardData?.tutorCount ?? 0;


  return (
    <div 
      className={`p-4 sm:p-6 lg:p-8 ${className}`}
      data-testid="admin-dashboard"
      role="main"
      aria-label="Admin Dashboard"
    >
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="main-welcome-message">{welcomeMessage}</h1>
            <p className="text-muted-foreground" data-testid="main-dashboard-title">System Administrator Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <Input 
              placeholder="Search timesheets, users..."
              value={searchQuery}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={() => {
              refreshTimesheets();
              refetchDashboard();
            }}>
              Refresh
            </Button>
          </div>
        </div>
        {urgentCount > 0 && (
          <div className="mt-4 flex items-center text-sm font-semibold text-destructive" data-testid="urgent-notifications">
            <span className="relative mr-2 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
            </span>
            {urgentCount + (dashboardData?.pendingApproval || 0)} urgent items
          </div>
        )}
      </header>

      <nav className="mb-8 border-b">
        <div className="-mb-px flex space-x-6" data-testid="filters-section">
          {[
            { id: 'overview', label: 'System Overview' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'users', label: 'User Management' },
            { id: 'analytics', label: 'Reports & Analytics' },
            { id: 'settings', label: 'System Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                currentTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
              }`}
              onClick={() => handleTabChange(tab.id as typeof currentTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {hasErrors && (
        <div className="mb-6 space-y-4">
          {timesheetsError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to load timesheets: {timesheetsError}</span>
              <Button variant="destructive" size="sm" className="ml-4" onClick={refreshTimesheets}>Retry</Button>
            </div>
          )}
          {dashboardError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to load admin dashboard data: {dashboardError}</span>
              <Button variant="destructive" size="sm" className="ml-4" onClick={refetchDashboard}>Retry</Button>
            </div>
          )}
          {approvalError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Approval failed: {approvalError}</span>
              <Button variant="ghost" size="sm" className="ml-4" onClick={resetApproval}>Dismiss</Button>
            </div>
          )}
        </div>
      )}

      {currentTab === 'overview' && (
        <section 
          role="region"
          aria-label="System Overview"
        >
          <div className="mb-4">
            <h2 className="text-xl font-semibold" data-testid="system-overview-title">System Overview</h2>
            <p className="text-sm text-muted-foreground">Key metrics tracking the health of the allocation programme.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="statistics-cards">
            <AdminStatCard
              title="Total Timesheets"
              value={totalTimesheetCount}
              subtitle="All time records"
              icon="📊"
              testId="total-timesheets-card"
            />
            <AdminStatCard
              title="Pending Approvals"
              value={pendingApprovalsCount}
              subtitle="Awaiting admin review"
              icon="⏳"
              testId="pending-approvals-card"
            />
            <AdminStatCard
              title="Total Hours"
              value={formatters.hours(totalHoursValue)}
              subtitle="Tracked across all tutors"
              icon="⏰"
              testId="total-hours-card"
            />
            <AdminStatCard
              title="Total Payroll"
              value={formatters.currency(totalPayrollValue)}
              subtitle="Approved payouts"
              icon="💰"
              testId="total-pay-card"
            />
            <AdminStatCard
              title="Tutor Coverage"
              value={tutorCountValue}
              subtitle="Active tutors this term"
              icon="👥"
              testId="tutors-card"
            />
          </div>
        </section>
      )}

      {currentTab === 'pending' && (
        <section
          role="region"
          aria-label="Pending Review"
        >
          <Card>
            <CardHeader>
              <CardTitle>Pending Admin Review</CardTitle>
              <CardDescription>
                Review and finalize timesheets that have been approved by lecturers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimesheetTable
                timesheets={filteredTimesheets}
                loading={timesheetsLoading}
                actionLoading={actionLoadingId}
                showActions={true}
                showTutorInfo={true}
                showCourseInfo={true}
                showSelection={true}
                selectedIds={selectedTimesheets}
                onSelectionChange={setSelectedTimesheets}
                onApprovalAction={handleApprovalAction}
                className="admin-timesheet-table"
                approvalRole="ADMIN"
              />
            </CardContent>
          </Card>
        </section>
      )}

      {rejectionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Confirm Emergency Action</CardTitle>
              <CardDescription>
                Provide a brief justification before rejecting this timesheet. Your note will be shared with the tutor and lecturer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rejectionTargetTimesheet && (
                <div className="mb-4 rounded-md border border-muted bg-muted/40 p-4 text-sm">
                  <p className="font-semibold">{rejectionTargetTimesheet.tutorName ?? 'Tutor'} · {rejectionTargetTimesheet.courseName ?? 'Course'}</p>
                  <p className="text-muted-foreground">
                    Week starting {rejectionTargetTimesheet.weekStartDate} · {rejectionTargetTimesheet.description}
                  </p>
                </div>
              )}
              <label htmlFor="admin-rejection-comment" className="block text-sm font-medium text-foreground">
                Reason for rejection:
              </label>
              <textarea
                id="admin-rejection-comment"
                name="admin-rejection-comment"
                rows={4}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g., Adjust the recorded hours to match the signed log sheet."
                value={rejectionComment}
                onChange={(event) => setRejectionComment(event.target.value)}
                disabled={actionLoadingId === rejectionModal.timesheetId}
              />
              {rejectionValidationError && (
                <p className="mt-2 text-sm text-destructive">{rejectionValidationError}</p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={handleRejectionCancel}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectionSubmit}
                  disabled={actionLoadingId === rejectionModal.timesheetId}
                >
                  {actionLoadingId === rejectionModal.timesheetId ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="small" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Confirm Action'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;

