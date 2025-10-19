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
      <div className="unified-container">
        <div
          className={`macro-grid ${className}`}
          data-testid="admin-dashboard"
          role="main"
          aria-label={`Admin Dashboard (${sessionStatus})`}
        >
          <ErrorBoundary level="component">
            <div className="macro-grid-hero">
              <PageLoadingIndicator
                message="Loading admin dashboard…"
                subMessage="Fetching the latest metrics and pending timesheets."
              />
            </div>
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  const hasPageErrors = pageErrors.length > 0;

  const shouldShowSidebar = false; // No sidebar - each tab shows its own content

  console.info('[AdminDashboardShell] render body ready', {
    currentTab,
    isRefreshingData,
    refreshDisabledReason,
    hasPageErrors: pageErrors.length > 0,
    hasApprovalError: Boolean(errors.approval),
  });

  return (
    <div className="unified-container">
      <div
        className={`macro-grid ${className}`}
        data-testid="admin-dashboard"
        role="main"
        aria-label={`Admin Dashboard (${sessionStatus})`}
      >
        <ErrorBoundary level="component">
          <>
            <header className="macro-grid-hero">
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
            </header>

            <main className={`macro-grid-content ${shouldShowSidebar ? 'has-sidebar' : ''}`}>
              <section
                className="macro-grid-main"
                role="region"
                aria-label={currentTab === 'pending' ? 'Pending approvals' : 'Overview metrics'}
              >
                <div style={{ display: currentTab === 'overview' ? undefined : 'none' }} className="max-w-full">
                  <AdminMetricsPanel
                    metrics={metrics}
                    isLoading={loading.dashboard}
                  />
                </div>

                <div style={{ display: currentTab === 'pending' ? undefined : 'none' }} className="max-w-full">
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
                  className="macro-grid-sidebar"
                  aria-label="Dashboard summary"
                  data-testid="dashboard-sidebar"
                >
                  <AdminMetricsPanel
                    metrics={metrics}
                    isLoading={loading.dashboard}
                  />
                </aside>
              )}
            </main>

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
    </div>
  );
});

AdminDashboardShell.displayName = 'AdminDashboardShell';

export default AdminDashboardShell;
