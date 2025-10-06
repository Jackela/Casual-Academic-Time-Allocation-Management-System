/**
 * AdminDashboard Shell
 * 
 * Comprehensive admin dashboard with system oversight, user management,
 * analytics, and administrative controls with advanced filtering and monitoring.
 */

import { memo } from 'react';
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { Button } from '../../ui/button';
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

  if (loading.timesheets || loading.dashboard) {
    return (
      <div className={`p-4 sm:p-6 lg:p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <LoadingSpinner size="large" />
          <p className="ml-4 text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

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
        onRefresh={() => {
          refreshTimesheets();
          refetchDashboard();
        }}
        urgentCount={urgentCount}
        pendingApprovals={metrics.pendingApprovals}
      />

      <AdminNavTabs
        tabs={tabs}
        currentTab={currentTab}
        onTabChange={handleTabChange}
      />

      {errors.hasErrors && (
        <div className="mb-6 space-y-4">
          {errors.timesheets && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to load timesheets: {errors.timesheets}</span>
              <Button variant="destructive" size="sm" className="ml-4" onClick={refreshTimesheets}>Retry</Button>
            </div>
          )}
          {errors.dashboard && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to load admin dashboard data: {errors.dashboard}</span>
              <Button variant="destructive" size="sm" className="ml-4" onClick={refetchDashboard}>Retry</Button>
            </div>
          )}
          {errors.approval && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Approval failed: {errors.approval}</span>
              <Button variant="ghost" size="sm" className="ml-4" onClick={resetApproval}>Dismiss</Button>
            </div>
          )}
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
          onSelectionChange={setSelectedTimesheets}
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
