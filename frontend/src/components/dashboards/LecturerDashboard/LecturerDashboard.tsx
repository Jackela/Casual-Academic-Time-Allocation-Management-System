/**
 * LecturerDashboard Component
 * 
 * Optimized lecturer dashboard with pending approval management,
 * bulk actions, and comprehensive statistics overview.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { 
  usePendingTimesheets, 
  useDashboardSummary, 
  useApprovalAction,
  useTimesheetStats 
} from '../../../hooks/useTimesheets';
import { useAuth } from '../../../contexts/AuthContext';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';
import StatusBadge from '../../shared/StatusBadge/StatusBadge';
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { formatters } from '../../../utils/formatting';
import type { Timesheet, ApprovalAction } from '../../../types/api';
import './LecturerDashboard.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export interface LecturerDashboardProps {
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'success' | 'warning' | 'error';
  icon?: string;
}

interface QuickActionProps {
  label: string;
  description: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
}

// =============================================================================
// Statistics Card Component
// =============================================================================

const StatCard = memo<StatCardProps>(({
  title,
  value,
  subtitle,
  trend = 'stable',
  color = 'primary',
  icon
}) => (
  <div className={`stat-card stat-card--${color}`} data-testid="stat-card">
    <div className="stat-card__header">
      {icon && <span className="stat-card__icon">{icon}</span>}
      <h3 className="stat-card__title">{title}</h3>
    </div>
    <div className="stat-card__content">
      <div className="stat-card__value">{value}</div>
      {subtitle && (
        <div className={`stat-card__subtitle stat-card__subtitle--${trend}`}>
          {trend === 'up' && '↗ '}
          {trend === 'down' && '↘ '}
          {subtitle}
        </div>
      )}
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

// =============================================================================
// Quick Action Component
// =============================================================================

const QuickAction = memo<QuickActionProps>(({
  label,
  description,
  icon,
  onClick,
  disabled = false,
  shortcut
}) => (
  <button
    className={`quick-action ${disabled ? 'quick-action--disabled' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={`${description}${shortcut ? ` (${shortcut})` : ''}`}
  >
    <span className="quick-action__icon">{icon}</span>
    <div className="quick-action__content">
      <span className="quick-action__label">{label}</span>
      <span className="quick-action__description">{description}</span>
    </div>
    {shortcut && <span className="quick-action__shortcut">{shortcut}</span>}
  </button>
));

QuickAction.displayName = 'QuickAction';

// =============================================================================
// Recent Activity Component
// =============================================================================

const RecentActivity = memo<{ activities: any[] }>(({ activities }) => (
  <div className="recent-activity">
    <h3>Recent Activity</h3>
    {activities.length === 0 ? (
      <p className="recent-activity__empty">No recent activity</p>
    ) : (
      <ul className="recent-activity__list">
        {activities.map((activity, index) => (
          <li key={activity.id || index} className="recent-activity__item">
            <div className="recent-activity__content">
              <span className="recent-activity__description">{activity.description}</span>
              <span className="recent-activity__time">
                {formatters.relativeTime(activity.timestamp)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
));

RecentActivity.displayName = 'RecentActivity';

// =============================================================================
// Status Breakdown Chart Component
// =============================================================================

const StatusBreakdown = memo<{ statusBreakdown: Record<string, number> }>(({ statusBreakdown }) => {
  const total = Object.values(statusBreakdown).reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="status-breakdown" data-testid="status-breakdown-chart">
      <h3>Status Overview</h3>
      <div className="status-breakdown__chart">
        {Object.entries(statusBreakdown).map(([status, count]) => {
          if (count === 0) return null;
          
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={status} className="status-breakdown__item">
              <StatusBadge status={status as any} size="small" />
              <div className="status-breakdown__stats">
                <span className="status-breakdown__count">{count}</span>
                <span className="status-breakdown__percentage">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StatusBreakdown.displayName = 'StatusBreakdown';

// =============================================================================
// Performance Trends Component
// =============================================================================

const PerformanceTrends = memo(() => (
  <div className="performance-trends" data-testid="performance-trends">
    <h3>Performance Metrics</h3>
    <div className="performance-trends__grid">
      <div className="performance-metric">
        <span className="performance-metric__label">Approval Rate</span>
        <span className="performance-metric__value">94%</span>
        <span className="performance-metric__trend performance-metric__trend--up">
          ↗ +2%
        </span>
      </div>
      <div className="performance-metric">
        <span className="performance-metric__label">Average Processing Time</span>
        <span className="performance-metric__value">1.2 days</span>
        <span className="performance-metric__trend performance-metric__trend--down">
          ↘ -0.3
        </span>
      </div>
      <div className="performance-metric">
        <span className="performance-metric__label">Weekly Throughput</span>
        <span className="performance-metric__value">28</span>
        <span className="performance-metric__trend performance-metric__trend--up">
          ↗ +5
        </span>
      </div>
    </div>
  </div>
));

PerformanceTrends.displayName = 'PerformanceTrends';

// =============================================================================
// Main LecturerDashboard Component
// =============================================================================

const LecturerDashboard = memo<LecturerDashboardProps>(({ className = '' }) => {
  const { user } = useAuth();
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [rejectionModal, setRejectionModal] = useState<{ timesheetId: number; open: boolean }>({
    timesheetId: 0,
    open: false
  });

  // Fetch pending timesheets and dashboard data
  const {
    data: pendingData,
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

  // Calculate statistics for pending timesheets
  const pendingStats = useTimesheetStats(pendingTimesheets);

  // Memoized computed values
  const welcomeMessage = useMemo(() => {
    const firstName = user?.firstName || 'Lecturer';
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                      new Date().getHours() < 18 ? 'afternoon' : 'evening';
    return `Welcome back, ${firstName}`;
  }, [user?.firstName]);

  const urgentCount = useMemo(() => {
    return pendingTimesheets.filter(t => {
      const submittedDate = new Date(t.createdAt);
      const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSubmission > 3; // Urgent if submitted more than 3 days ago
    }).length;
  }, [pendingTimesheets]);

  // Event handlers
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
      console.error('Failed to process approval:', error);
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
      
      // Refresh data and clear selection
      await Promise.all([refetchPending(), refetchDashboard()]);
      setSelectedTimesheets([]);
    } catch (error) {
      console.error('Failed to batch approve:', error);
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
      console.error('Failed to reject timesheet:', error);
    }
  }, [rejectionModal.timesheetId, approveTimesheet, refetchPending, refetchDashboard]);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedTimesheets(selected ? pendingTimesheets.map(t => t.id) : []);
  }, [pendingTimesheets]);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'viewAll':
        // Navigate to all timesheets view
        break;
      case 'export':
        // Export functionality
        break;
      case 'manageCourses':
        // Navigate to course management
        break;
      case 'settings':
        // Navigate to settings
        break;
    }
  }, []);

  // Loading state
  if (pendingLoading || dashboardLoading) {
    return (
      <div className={`lecturer-dashboard loading ${className}`}>
        <div className="dashboard-loading" data-testid="loading-state">
          <LoadingSpinner size="large" />
          <p data-testid="loading-text">Loading pending timesheets...</p>
          <div className="skeleton-cards" data-testid="statistics-cards">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton-card" data-testid="skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error handling
  const hasErrors = pendingError || dashboardError || approvalError;
  
  return (
    <div 
      className={`dashboard-container lecturer-dashboard ${className}`}
      data-testid="lecturer-dashboard"
      role="main"
      aria-label="Lecturer Dashboard"
    >
      {/* Header Section */}
      <header className="dashboard-header" data-testid="main-dashboard-header">
        <div className="dashboard-header__content">
          <h1 className="dashboard-header__title" data-testid="main-welcome-message">{welcomeMessage}</h1>
          <p className="dashboard-header__subtitle" data-testid="main-dashboard-title">Lecturer Dashboard</p>
          
          {urgentCount > 0 && (
            <div className="urgent-notification">
              <span className="count-badge urgent">{urgentCount}</span>
              <span>urgent approvals needed</span>
            </div>
          )}
        </div>
        
        <div className="dashboard-header__actions">
          <button className="refresh-button" onClick={() => {
            refetchPending();
            refetchDashboard();
          }}>
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Error Display */}
      {hasErrors && (
        <div className="dashboard-errors" data-testid="error-message">
          {pendingError && (
            <div className="error-message">
              <span>Failed to fetch pending timesheets: {pendingError}</span>
              <button onClick={refetchPending} data-testid="retry-button">Retry</button>
            </div>
          )}
          {dashboardError && (
            <div className="error-message">
              <span>Failed to fetch dashboard summary: {dashboardError}</span>
              <button onClick={refetchDashboard}>Retry</button>
            </div>
          )}
          {approvalError && (
            <div className="error-message">
              <span>Approval failed: {approvalError}</span>
              <button onClick={resetApproval}>Dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <section 
        className="dashboard-statistics"
        role="region"
        aria-label="Dashboard Summary"
      >
        <div className="statistics-grid" data-testid="statistics-cards">
          <StatCard
            title="Pending Approvals"
            value={dashboardData?.pendingApproval || 0}
            subtitle={urgentCount > 0 ? `${urgentCount} urgent` : 'All current'}
            trend={urgentCount > 0 ? 'up' : 'stable'}
            color={urgentCount > 0 ? 'warning' : 'primary'}
            icon="📋"
          />
          
          <StatCard
            title="Total Timesheets"
            value={dashboardData?.totalTimesheets || 0}
            subtitle="This semester"
            color="success"
            icon="📊"
          />
          
          <StatCard
            title="This Week Hours"
            value={`${dashboardData?.thisWeekHours || 0}h`}
            subtitle={`$${formatters.currencyValue(dashboardData?.thisWeekPay || 0)}`}
            color="primary"
            icon="⏰"
          />
          
          <StatCard
            title="Approved by You"
            value={dashboardData?.statusBreakdown?.LECTURER_CONFIRMED || 0}
            subtitle="Lecturer approvals"
            trend="up"
            color="success"
            icon="✅"
          />
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Pending Approvals Section */}
        <section 
          className="dashboard-section pending-approvals-section"
          role="region"
          aria-label="Pending Approvals"
        >
          <div className="section-header">
            <h2>Pending Approvals</h2>
            <div className="section-header__actions">
              {selectedTimesheets.length > 0 && (
                <>
                  <button 
                    className="batch-action-btn batch-approve"
                    onClick={handleBatchApproval}
                    disabled={approvalLoading}
                  >
                    {approvalLoading ? <LoadingSpinner size="small" /> : 'Batch Approve'}
                  </button>
                  <button 
                    className="batch-action-btn batch-reject"
                    onClick={() => setRejectionModal({ timesheetId: 0, open: true })}
                  >
                    Batch Reject
                  </button>
                  <span className="selection-count">
                    {selectedTimesheets.length} selected
                  </span>
                </>
              )}
            </div>
          </div>

          {noPendingTimesheets ? (
            <div className="empty-state" data-testid="empty-state">
              <div className="empty-state__content">
                <span className="empty-state__icon">🎉</span>
                <h3 data-testid="empty-state-title">No Pending Timesheets</h3>
                <p>All caught up! No timesheets are waiting for your review.</p>
              </div>
            </div>
          ) : (
            <TimesheetTable
              timesheets={pendingTimesheets}
              loading={pendingLoading}
              onApprovalAction={handleApprovalAction}
              actionLoading={approvalLoading ? pendingTimesheets[0]?.id : null}
              showActions={true}
              showTutorInfo={true}
              showCourseInfo={true}
              showSelection={true}
              selectedIds={selectedTimesheets}
              onSelectionChange={setSelectedTimesheets}
              virtualizeThreshold={50}
              className="lecturer-timesheet-table"
              approvalRole="LECTURER"
            />
          )}
        </section>

        {/* Dashboard Summary Sidebar */}
        <aside className="dashboard-sidebar" data-testid="dashboard-sidebar">
          {/* Status Breakdown */}
          {dashboardData?.statusBreakdown && (
            <StatusBreakdown statusBreakdown={dashboardData.statusBreakdown} />
          )}

          {/* Performance Trends */}
          <PerformanceTrends />

          {/* Recent Activity */}
          {dashboardData?.recentActivity && (
            <RecentActivity activities={dashboardData.recentActivity} />
          )}
        </aside>
      </div>

      {/* Quick Actions Section */}
      <section 
        className="dashboard-section quick-actions-section"
        role="region"
        aria-label="Quick Actions"
      >
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <QuickAction
            label="View All Timesheets"
            description="Browse all submitted timesheets"
            icon="📄"
            onClick={() => handleQuickAction('viewAll')}
            shortcut="Ctrl+A"
          />
          
          <QuickAction
            label="Export Reports"
            description="Generate approval reports"
            icon="📊"
            onClick={() => handleQuickAction('export')}
            shortcut="Ctrl+E"
          />
          
          <QuickAction
            label="Manage Courses"
            description="Update course information"
            icon="🎓"
            onClick={() => handleQuickAction('manageCourses')}
          />
          
          <QuickAction
            label="Settings"
            description="Configure dashboard preferences"
            icon="⚙️"
            onClick={() => handleQuickAction('settings')}
          />
        </div>
      </section>

      {/* Rejection Modal */}
      {rejectionModal.open && (
        <div className="modal-overlay" onClick={() => setRejectionModal({ timesheetId: 0, open: false })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reject Timesheet</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const reason = formData.get('reason') as string;
              if (reason.trim()) {
                handleRejectionSubmit(reason);
              }
            }}>
              <label htmlFor="reason">Reason for rejection:</label>
              <textarea
                id="reason"
                name="reason"
                required
                placeholder="Please provide a clear reason for rejection..."
                rows={4}
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setRejectionModal({ timesheetId: 0, open: false })}>
                  Cancel
                </button>
                <button type="submit" className="reject-confirm">
                  Reject Timesheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status announcement for screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {approvalLoading && 'Processing approval...'}
        {pendingLoading && 'Loading pending timesheets...'}
      </div>
    </div>
  );
});

LecturerDashboard.displayName = 'LecturerDashboard';

export default LecturerDashboard;



