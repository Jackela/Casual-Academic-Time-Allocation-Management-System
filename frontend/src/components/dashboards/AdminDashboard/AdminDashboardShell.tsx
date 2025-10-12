/**
 * AdminDashboard Shell
 * 
 * Comprehensive admin dashboard with system oversight, user management,
 * analytics, and administrative controls with advanced filtering and monitoring.
 */

import { memo, useCallback } from 'react';
import GlobalErrorBanner from '../../shared/feedback/GlobalErrorBanner';
import PageLoadingIndicator from '../../shared/feedback/PageLoadingIndicator';
import { useAdminDashboardData } from './hooks/useAdminDashboardData';
import AdminDashboardHeader from './components/AdminDashboardHeader';
import AdminNavTabs from './components/AdminNavTabs';
import AdminMetricsPanel from './components/AdminMetricsPanel';
import AdminPendingReviewPanel from './components/AdminPendingReviewPanel';
import AdminRejectionModal from './components/AdminRejectionModal';
import ErrorBoundary from '../../ErrorBoundary';
import '../../../styles/dashboard-shell.css';

export interface AdminDashboardProps {
  className?: string;
}

const AdminDashboardShell = memo<AdminDashboardProps>(({ className = '' }) => {
  const {
    sessionStatus,
    welcomeMessage,
    pageLoading,
    pageErrors,
    searchQuery,
    handleSearch,
    tabs,
    currentTab,
    handleTabChange,
    metrics,
    urgentCount,
    filteredTimesheets,
    selectedTimesheets,
    setSelectedTimesheets,
    actionState,
    loading,
    errors,
    handleApprovalAction,
    handleRejectionSubmit,
    handleRejectionCancel,
    rejectionModal,
    rejectionTargetTimesheet,
    rejectionComment,
    setRejectionComment,
    rejectionValidationError,
    refreshTimesheets,
    refetchDashboard,
    resetApproval,
  } = useAdminDashboardData();

  console.info('[AdminDashboardShell] render start', {
    sessionStatus,
    pageLoading,
    pageErrors,
    currentTab,
    loading,
    actionState,
  });

  const handleSelectionChange = useCallback((ids: number[]) => setSelectedTimesheets(ids), [setSelectedTimesheets]);

  const handlePageErrorRetry = useCallback((source: 'timesheets' | 'dashboard') => {
    if (source === 'timesheets') {
      refreshTimesheets();
    } else {
      refetchDashboard();
    }
  }, [refreshTimesheets, refetchDashboard]);

  const isRefreshingData = loading.timesheets || loading.dashboard;
  const refreshDisabledReason = actionState.isSubmitting
    ? 'An approval action is currently processing. Please wait before refreshing.'
    : (isRefreshingData ? 'Data is already refreshing.' : undefined);

  const handleRefresh = useCallback(() => {
    if (loading.timesheets || loading.dashboard || actionState.isSubmitting) {
      return;
    }
    refreshTimesheets();
    refetchDashboard();
  }, [actionState.isSubmitting, loading.dashboard, loading.timesheets, refreshTimesheets, refetchDashboard]);

  if (pageLoading) {
    return (
      <div
        className={`dashboard-shell p-4 sm:p-6 lg:p-8 ${className}`}
        data-testid="admin-dashboard"
        role="main"
        aria-label={`Admin Dashboard (${sessionStatus})`}
      >
        <ErrorBoundary level="component">
          <PageLoadingIndicator
            message="Loading admin dashboard…"
            subMessage="Fetching the latest metrics and pending timesheets."
          />
        </ErrorBoundary>
      </div>
    );
  }

  const hasPageErrors = pageErrors.length > 0;

  const shouldShowSidebar = currentTab !== 'overview';

  console.info('[AdminDashboardShell] render body ready', {
    currentTab,
    isRefreshingData,
    refreshDisabledReason,
    hasPageErrors: pageErrors.length > 0,
    hasApprovalError: Boolean(errors.approval),
  });

  return (
    <div
      className={`dashboard-shell p-4 sm:p-6 lg:p-8 ${className}`}
      data-testid="admin-dashboard"
      role="main"
      aria-label={`Admin Dashboard (${sessionStatus})`}
    >
      <ErrorBoundary level="component">
        <>
          <div className="dashboard-header">
            <AdminDashboardHeader
              welcomeMessage={welcomeMessage}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshingData}
              refreshDisabledReason={refreshDisabledReason}
              urgentCount={urgentCount}
              pendingApprovals={metrics.pendingApprovals}
            />

            <AdminNavTabs
              tabs={tabs}
              currentTab={currentTab}
              onTabChange={handleTabChange}
            />

            {hasPageErrors && (
              <div className="space-y-3">
                {pageErrors.map(({ source, message }) => (
                  <GlobalErrorBanner
                    key={source}
                    title={source === 'timesheets' ? 'Failed to load timesheets' : 'Failed to load admin dashboard data'}
                    message={message}
                    actionLabel="Retry"
                    onAction={() => handlePageErrorRetry(source)}
                  />
                ))}
              </div>
            )}

            {errors.approval && (
              <GlobalErrorBanner
                title="Approval failed"
                message={errors.approval}
                severity="warning"
                onDismiss={resetApproval}
                data-testid="approval-error-banner"
              />
            )}
          </div>

          <div className="dashboard-body">
            <section
              className="body-main"
              role="region"
              aria-label={currentTab === 'pending' ? 'Pending approvals' : 'Overview metrics'}
            >
              <div style={{ display: currentTab === 'overview' ? undefined : 'none' }}>
                <AdminMetricsPanel
                  metrics={metrics}
                  isLoading={loading.dashboard}
                />
              </div>

              <div style={{ display: currentTab === 'pending' ? undefined : 'none' }}>
                <ErrorBoundary level="component">
                  <AdminPendingReviewPanel
                    timesheets={filteredTimesheets}
                    loading={loading.timesheets}
                    actionState={actionState}
                    selectedTimesheets={selectedTimesheets}
                    onSelectionChange={handleSelectionChange}
                    onApprovalAction={handleApprovalAction}
                  />
                </ErrorBoundary>
              </div>
            </section>

            {shouldShowSidebar && (
              <aside
                className="body-sidebar"
                aria-label="Dashboard summary"
                data-testid="dashboard-sidebar"
              >
                <AdminMetricsPanel
                  metrics={metrics}
                  isLoading={loading.dashboard}
                />
              </aside>
            )}
          </div>

          <AdminRejectionModal
            open={rejectionModal.open}
            timesheetId={rejectionModal.timesheetId}
            targetTimesheet={rejectionTargetTimesheet}
            comment={rejectionComment}
            validationError={rejectionValidationError}
            onCancel={handleRejectionCancel}
            onSubmit={handleRejectionSubmit}
            onCommentChange={setRejectionComment}
            actionState={actionState}
          />
        </>
      </ErrorBoundary>
    </div>
  );
});

AdminDashboardShell.displayName = 'AdminDashboardShell';

export default AdminDashboardShell;
