/**
 * LecturerDashboard Component
 *
 * Optimized lecturer dashboard with pending approval management,
 * bulk actions, and comprehensive statistics overview.
 */

import { memo, useCallback, useEffect, useState } from "react";
import { useLecturerDashboardData } from "./hooks/useLecturerDashboardData";
import LecturerSummaryBanner from "./components/LecturerSummaryBanner";
import LecturerFiltersPanel from "./components/LecturerFiltersPanel";
import LecturerPendingTable from "./components/LecturerPendingTable";
import LoadingSpinner from "../../shared/LoadingSpinner/LoadingSpinner";
import StatusBadge from "../../shared/StatusBadge/StatusBadge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../ui/card";
import { Button } from "../../ui/button";

export interface LecturerDashboardShellProps {
  className?: string;
}

const StatusBreakdown = memo<{ statusBreakdown: Record<string, number> }>(
  ({ statusBreakdown }) => {
    const total = Object.values(statusBreakdown).reduce(
      (sum, count) => sum + count,
      0,
    );

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
  },
);

StatusBreakdown.displayName = "StatusBreakdown";

const LecturerDashboardShell = memo<LecturerDashboardShellProps>(({ className = "" }) => {
  const {
    sessionStatus,
    welcomeMessage,
    canPerformApprovals,
    metrics,
    urgentCount,
    filteredTimesheets,
    noPendingTimesheets,
    selectedTimesheets,
    setSelectedTimesheets,
    filters,
    updateFilters,
    clearFilters,
    courseOptions,
    loading,
    errors,
    actionLoadingId,
    handleApprovalAction,
    handleBatchApproval,
    handleRejectionSubmit,
    handleRejectionCancel,
    rejectionModal,
    refreshPending,
    refetchDashboard,
    resetApproval,
  } = useLecturerDashboardData();

  const [showErrorDetails, setShowErrorDetails] = useState(false);

  useEffect(() => {
    if (!errors.approval) {
      setShowErrorDetails(false);
    }
  }, [errors.approval]);

  const handleRefreshClick = useCallback(() => {
    refreshPending();
    refetchDashboard();
  }, [refreshPending, refetchDashboard]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  if (loading.pending || loading.dashboard) {
    return (
      <div className={`p-4 sm:p-6 lg:p-8 ${className}`}>
        <div
          className="flex items-center justify-center"
          data-testid="loading-state"
        >
          <LoadingSpinner size="large" />
          <p className="ml-4 text-muted-foreground" data-testid="loading-text">
            Loading pending timesheets...
          </p>
        </div>
      </div>
    );
  }

  const displayTimesheets = filteredTimesheets;
  const hasFilteredResults = displayTimesheets.length > 0;
  const showFilteredEmptyState = !noPendingTimesheets && !hasFilteredResults;
  const isRefreshing = loading.pending || loading.dashboard;

  return (
    <div
      className={`p-4 sm:p-6 lg:p-8 ${className}`}
      data-testid="lecturer-dashboard"
      role="main"
      aria-label={`Lecturer Dashboard (${sessionStatus})`}
    >
      <LecturerSummaryBanner
        welcomeMessage={welcomeMessage}
        urgentCount={urgentCount}
        metrics={metrics}
      />

      <LecturerFiltersPanel
        filters={filters}
        courseOptions={courseOptions}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshClick}
        onUpdateFilters={updateFilters}
        onClearFilters={handleClearFilters}
      />

      {errors.hasErrors && (
        <div className="mb-6 space-y-4">
          {errors.pending && (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
              data-testid="error-message"
            >
              <span>Failed to fetch pending timesheets: {errors.pending}</span>
              <Button
                variant="destructive"
                size="sm"
                className="ml-4"
                data-testid="retry-button-pending"
                onClick={() => refreshPending()}
              >
                Retry
              </Button>
            </div>
          )}
          {errors.dashboard && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <span>Failed to fetch dashboard summary: {errors.dashboard}</span>
              <Button
                variant="destructive"
                size="sm"
                className="ml-4"
                data-testid="retry-button-dashboard"
                onClick={() => refetchDashboard()}
              >
                Retry
              </Button>
            </div>
          )}
          {errors.approval && (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
              data-testid="approval-error-banner"
            >
              <div className="flex items-center justify-between">
                <span>Approval could not be completed. Please try again.</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="approval-error-details-toggle"
                    onClick={() => setShowErrorDetails((prev) => !prev)}
                  >
                    {showErrorDetails ? "Hide details" : "Details"}
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
                <pre
                  className="mt-2 rounded-md bg-black/10 p-2 text-xs"
                  data-testid="approval-error-raw"
                >
                  {errors.approval}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section
          className="lg:col-span-2"
          role="region"
          aria-label="Pending Approvals"
        >
          <LecturerPendingTable
            timesheets={displayTimesheets}
            hasNoPendingTimesheets={noPendingTimesheets}
            showFilteredEmptyState={showFilteredEmptyState}
            loading={loading.pending}
            approvalLoading={loading.approval}
            canPerformApprovals={canPerformApprovals}
            selectedTimesheets={selectedTimesheets}
            onSelectionChange={setSelectedTimesheets}
            onApprovalAction={handleApprovalAction}
            onBatchApprove={handleBatchApproval}
            actionLoadingId={actionLoadingId}
            onClearFilters={handleClearFilters}
          />
        </section>

        <aside
          className="space-y-6 lg:col-span-1"
          data-testid="dashboard-sidebar"
        >
          {Object.keys(metrics.statusBreakdown).length > 0 && (
            <StatusBreakdown statusBreakdown={metrics.statusBreakdown} />
          )}
        </aside>
      </div>

      {rejectionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Timesheet</CardTitle>
              <CardDescription>
                Please provide a clear reason for rejection. This will be sent
                to the tutor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const reason = (formData.get("reason") as string) ?? '';
                  if (reason.trim()) {
                    handleRejectionSubmit(reason);
                  }
                }}
              >
                <textarea
                  id="reason"
                  name="reason"
                  required
                  placeholder="e.g., Incorrect hours logged for CS101..."
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleRejectionCancel}>
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
        {loading.approval && "Processing approval..."}
        {loading.pending && "Loading pending timesheets..."}
      </div>
    </div>
  );
});

LecturerDashboardShell.displayName = "LecturerDashboardShell";

export default LecturerDashboardShell;
