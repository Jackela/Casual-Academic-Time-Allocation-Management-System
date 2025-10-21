/**
 * LecturerDashboard Component
 *
 * Optimized lecturer dashboard with pending approval management,
 * bulk actions, and comprehensive statistics overview.
 */

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useLecturerDashboardData } from "./hooks/useLecturerDashboardData";
import LecturerSummaryBanner from "./components/LecturerSummaryBanner";
import LecturerFiltersPanel from "./components/LecturerFiltersPanel";
import LecturerPendingTable from "./components/LecturerPendingTable";
import GlobalErrorBanner from "../../shared/feedback/GlobalErrorBanner";
import PageLoadingIndicator from "../../shared/feedback/PageLoadingIndicator";
import StatusBadge from "../../shared/StatusBadge/StatusBadge";
import type { TimesheetStatus } from '../../../types/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../ui/card";
import { Button } from "../../ui/button";
import { formatters } from "../../../utils/formatting";
import "../../../styles/dashboard-shell.css";

export interface LecturerDashboardShellProps {
  className?: string;
}

const StatusBreakdown = memo<{ statusBreakdown: Partial<Record<TimesheetStatus, number>> }>(
  ({ statusBreakdown }) => {
    const total = Object.values(statusBreakdown).reduce(
      (sum: number, count: number | undefined) => sum + (count ?? 0),
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

            const safeCount = count ?? 0;
            const percentage = total > 0 ? (safeCount / total) * 100 : 0;

            return (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status as TimesheetStatus} />
                <div className="text-right">
                  <p className="font-semibold">{count}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatters.percentage(percentage)}
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

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter((element) =>
    !element.hasAttribute('disabled') &&
    element.tabIndex !== -1 &&
    element.getAttribute('aria-hidden') !== 'true',
  );
}

const LecturerDashboardShell = memo<LecturerDashboardShellProps>(({ className = "" }) => {
  const {
    sessionStatus,
    welcomeMessage,
    pageLoading,
    pageErrors,
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
    handleBatchRejection,
    handleRejectionSubmit,
    handleRejectionCancel,
    rejectionModal,
    refreshPending,
    refetchDashboard,
    resetApproval,
  } = useLecturerDashboardData();

  const rejectionDialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  useEffect(() => {
    if (!errors.approval) {
      setShowErrorDetails(false);
    }
  }, [errors.approval]);

  const handleSelectionChange = useCallback((ids: number[]) => {
    setSelectedTimesheets(ids);
  }, [setSelectedTimesheets]);

  const handleRefreshClick = useCallback(() => {
    refreshPending();
    refetchDashboard();
  }, [refreshPending, refetchDashboard]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handlePageErrorRetry = useCallback((source: 'pending' | 'dashboard') => {
    if (source === 'pending') {
      refreshPending();
    } else {
      refetchDashboard();
    }
  }, [refreshPending, refetchDashboard]);

  useEffect(() => {
    if (!rejectionModal.open) {
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus({ preventScroll: true });
        previouslyFocusedElementRef.current = null;
      }
      return;
    }

    const dialog = rejectionDialogRef.current;
    if (!dialog) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusFirstElement = () => {
      const focusTargets = getFocusableElements(dialog);
      if (focusTargets.length > 0) {
        focusTargets[0].focus({ preventScroll: true });
      } else {
        dialog.focus({ preventScroll: true });
      }
    };

    focusFirstElement();
    const rafId = window.requestAnimationFrame(focusFirstElement);

    function handleKeyDown(event: KeyboardEvent) {
      if (!rejectionDialogRef.current) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        handleRejectionCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(rejectionDialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        focusFirstElement();
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const currentIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;

      if (event.shiftKey) {
        const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        event.preventDefault();
        focusableElements[nextIndex].focus({ preventScroll: true });
      } else {
        const nextIndex =
          currentIndex >= focusableElements.length - 1 || currentIndex === -1
            ? 0
            : currentIndex + 1;
        event.preventDefault();
        focusableElements[nextIndex].focus({ preventScroll: true });
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleRejectionCancel, rejectionModal.open]);

  if (pageLoading) {
    return (
      <div className="layout-container">
        <div className={`layout-grid ${className}`}>
          <div className="layout-hero">
            <PageLoadingIndicator
              message="Loading pending timesheets…"
              subMessage="Fetching lecturer metrics and approval queue."
            />
          </div>
        </div>
      </div>
    );
  }

  const displayTimesheets = filteredTimesheets;
  const hasFilteredResults = displayTimesheets.length > 0;
  const showFilteredEmptyState = !noPendingTimesheets && !hasFilteredResults;
  const isRefreshing = loading.pending || loading.dashboard;

  return (
    <div className="layout-container">
      <div
        className={`layout-grid ${className}`}
        data-testid="lecturer-dashboard"
        role="main"
        aria-label={`Lecturer Dashboard (${sessionStatus})`}
      >
        <header className="layout-hero">
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

          {pageErrors.length > 0 && (
            <div className="space-y-3">
              {pageErrors.map(({ source, message }) => (
                <GlobalErrorBanner
                  key={source}
                  title={source === 'pending' ? 'Failed to fetch pending timesheets' : 'Failed to fetch dashboard summary'}
                  message={message}
                  actionLabel="Retry"
                  onAction={() => handlePageErrorRetry(source)}
                />
              ))}
            </div>
          )}

          {errors.approval && (
            <div>
              <GlobalErrorBanner
                title="Approval could not be completed"
                message={
                  <div className="space-y-2">
                    <span>Please try again.</span>
                    {showErrorDetails && (
                      <pre
                        className="rounded-md bg-black/10 p-2 text-xs"
                        data-testid="approval-error-raw"
                      >
                        {errors.approval}
                      </pre>
                    )}
                  </div>
                }
                severity="warning"
                actionLabel={showErrorDetails ? 'Hide details' : 'Details'}
                onAction={() => setShowErrorDetails((prev) => !prev)}
                onDismiss={() => {
                  setShowErrorDetails(false);
                  resetApproval();
                }}
                data-testid="approval-error-banner"
              />
            </div>
          )}
        </header>

        <main className="layout-content">
          <section
            className="layout-main"
            role="region"
            aria-label="Pending Approvals"
          >
            {Object.keys(metrics.statusBreakdown).length > 0 && (
              <div className="mb-6">
                <StatusBreakdown statusBreakdown={metrics.statusBreakdown} />
              </div>
            )}
            
            <LecturerPendingTable
              timesheets={displayTimesheets}
              hasNoPendingTimesheets={noPendingTimesheets}
              showFilteredEmptyState={showFilteredEmptyState}
              loading={loading.pending}
              approvalLoading={loading.approval}
              canPerformApprovals={canPerformApprovals}
              selectedTimesheets={selectedTimesheets}
              onSelectionChange={handleSelectionChange}
              onApprovalAction={handleApprovalAction}
              onApproveSelected={handleBatchApproval}
              onRejectSelected={handleBatchRejection}
              actionLoadingId={actionLoadingId}
              onClearFilters={handleClearFilters}
            />
          </section>
        </main>
      </div>

      {rejectionModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 elevation-modal">
          <Card
            ref={rejectionDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lecturer-rejection-modal-title"
            aria-describedby="lecturer-rejection-modal-description"
            tabIndex={-1}
            className="w-full max-w-md focus:outline-none"
          >
            <CardHeader>
              <CardTitle id="lecturer-rejection-modal-title">Reject Timesheet</CardTitle>
              <CardDescription id="lecturer-rejection-modal-description">
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
                  if (!loading.approval && reason.trim()) {
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!loading.approval) {
                        handleRejectionCancel();
                      }
                    }}
                    disabled={loading.approval}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={loading.approval}
                    title={loading.approval ? 'Processing rejection request…' : undefined}
                  >
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
