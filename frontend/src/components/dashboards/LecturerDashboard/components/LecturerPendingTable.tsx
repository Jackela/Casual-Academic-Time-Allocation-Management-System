import { Fragment, memo } from 'react';
import { Link } from 'react-router-dom';
import TimesheetTable from '../../../shared/TimesheetTable/TimesheetTable';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../ui/card';
import type { ApprovalAction, Timesheet } from '../../../../types/api';

interface LecturerPendingTableProps {
  timesheets: Timesheet[];
  hasNoPendingTimesheets: boolean;
  showFilteredEmptyState: boolean;
  loading: boolean;
  approvalLoading: boolean;
  canPerformApprovals: boolean;
  selectedTimesheets: number[];
  onSelectionChange: (ids: number[]) => void;
  onApprovalAction: (timesheetId: number, action: ApprovalAction) => Promise<void>;
  onApproveSelected?: () => Promise<void>;
  onRejectSelected?: () => Promise<void>;
  actionLoadingId: number | null;
  onClearFilters: () => void;
}

const LecturerPendingTable = memo<LecturerPendingTableProps>(({
  timesheets,
  hasNoPendingTimesheets,
  showFilteredEmptyState,
  loading,
  approvalLoading,
  canPerformApprovals,
  selectedTimesheets,
  onSelectionChange,
  onApprovalAction,
  onApproveSelected,
  onRejectSelected,
  actionLoadingId,
  onClearFilters,
}) => {
  const showBatchBar = canPerformApprovals && selectedTimesheets.length > 0;
  const disableActions = approvalLoading || !canPerformApprovals;

  const handleApproveSelected = async () => {
    if (!onApproveSelected || disableActions) {
      return;
    }
    await onApproveSelected();
  };

  const handleRejectSelected = async () => {
    if (!onRejectSelected || disableActions) {
      return;
    }
    await onRejectSelected();
  };

  return (
    <Fragment>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Review and approve timesheets submitted by tutors.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasNoPendingTimesheets ? (
            <div className="py-12 text-center" data-testid="empty-state">
              <div className="mx-auto max-w-xs">
                <h3 className="text-lg font-semibold" data-testid="empty-state-title">
                  No Pending Timesheets
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  All caught up! No timesheets are waiting for your review.
                </p>
                <Button asChild variant="link" className="mt-4">
                  <Link to="/approvals/history" data-testid="cta-view-approval-history">
                    View Approval History
                  </Link>
                </Button>
              </div>
            </div>
          ) : showFilteredEmptyState ? (
            <div className="py-12 text-center" data-testid="filtered-empty-state">
              <div className="mx-auto max-w-xs">
                <h3 className="text-lg font-semibold">No matches found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Adjust your filters to view additional timesheets.
                </p>
                <Button variant="link" className="mt-4" onClick={onClearFilters}>
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <TimesheetTable
              timesheets={timesheets}
              loading={loading}
              loadingMessage="Loading pending approvals..."
              onApprovalAction={canPerformApprovals ? onApprovalAction : undefined}
              actionLoading={canPerformApprovals ? actionLoadingId : null}
              showActions
              showTutorInfo
              showCourseInfo
              showSelection={canPerformApprovals}
              selectedIds={canPerformApprovals ? selectedTimesheets : []}
              onSelectionChange={canPerformApprovals ? onSelectionChange : undefined}
              className="lecturer-timesheet-table"
              approvalRole="LECTURER"
              actionsDisabled={!canPerformApprovals || approvalLoading}
              actionsDisabledReason={!canPerformApprovals
                ? 'You do not have permission to approve timesheets.'
                : 'Processing approval. Please wait before taking another action.'}
            />
          )}
        </CardContent>
      </Card>

      {showBatchBar && (
        <div
          className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:px-6"
          data-testid="lecturer-batch-action-bar"
        >
          <div className="flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex-row sm:items-center sm:justify-between">
            <span
              className="text-sm font-medium text-foreground"
              aria-live="polite"
              data-testid="lecturer-batch-count"
            >
              {selectedTimesheets.length} selected
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleApproveSelected}
                disabled={disableActions || !onApproveSelected}
                aria-label="Approve selected timesheets"
                className="h-11 min-w-[2.75rem] px-6"
              >
                Approve Selected
              </Button>
              <Button
                onClick={handleRejectSelected}
                disabled={disableActions || !onRejectSelected}
                aria-label="Reject selected timesheets"
                variant="outline"
                className="h-11 min-w-[2.75rem] px-6"
              >
                Reject Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
});

LecturerPendingTable.displayName = 'LecturerPendingTable';

export default LecturerPendingTable;
