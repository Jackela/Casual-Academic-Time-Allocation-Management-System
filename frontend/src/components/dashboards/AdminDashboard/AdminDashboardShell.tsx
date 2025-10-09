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

  const handleSelectionChange = useCallback((ids: number[]) => setSelectedTimesheets(ids), [setSelectedTimesheets]);

  const handlePageErrorRetry = useCallback((source: 'timesheets' | 'dashboard') => {
    if (source === 'timesheets') {
      refreshTimesheets();
    } else {
      refetchDashboard();
    }
  }, [refreshTimesheets, refetchDashboard]);

  if (pageLoading) {
    return (
      <div className={`p-4 sm:p-6 lg:p-8 ${className}`}>
        <PageLoadingIndicator
          message="Loading admin dashboard…"
          subMessage="Fetching the latest metrics and pending timesheets."
        />
      </div>
    );
  }

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

  return (
    <div
      className={`p-4 sm:p-6 lg:p-8 ${className}`}
      data-testid="admin-dashboard"
      role="main"
      aria-label={`Admin Dashboard (${sessionStatus})`}
    >
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

      {pageErrors.length > 0 && (
        <div className="mb-6 space-y-3">
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
        <div className="mb-6">
          <GlobalErrorBanner
            title="Approval failed"
            message={errors.approval}
            severity="warning"
            onDismiss={resetApproval}
            data-testid="approval-error-banner"
          />
        </div>
      )}

      {currentTab === 'overview' && (
        <AdminMetricsPanel
          metrics={metrics}
          isLoading={loading.dashboard}
        />
      )}

      {currentTab === 'pending' && (
        <AdminPendingReviewPanel
          timesheets={filteredTimesheets}
          loading={loading.timesheets}
          actionState={actionState}
          selectedTimesheets={selectedTimesheets}
          onSelectionChange={handleSelectionChange}
          onApprovalAction={handleApprovalAction}
        />
      )}

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
    </div>
  );
});

AdminDashboardShell.displayName = 'AdminDashboardShell';

export default AdminDashboardShell;
