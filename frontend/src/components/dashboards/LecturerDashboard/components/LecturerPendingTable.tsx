import { Fragment, memo, useMemo } from 'react';
import TimesheetTable from '../../../shared/TimesheetTable/TimesheetTable';
import { Button } from '../../../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../ui/card';
import BatchActions from '../../../shared/TimesheetTable/BatchActions';
import type { ApprovalAction, Timesheet } from '../../../../types/api';
import {
  getBatchLecturerActionPermission,
  LECTURER_ACTION_UNAVAILABLE_MESSAGE,
} from '../../../shared/TimesheetTable/lecturer-action-utils';

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

  const selectedTimesheetEntities = useMemo(() => {
    if (selectedTimesheets.length === 0) {
      return [];
    }

    const timesheetMap = new Map<number, Timesheet>();
    timesheets.forEach((item) => {
      timesheetMap.set(item.id, item);
    });

    return selectedTimesheets
      .map((id) => timesheetMap.get(id))
      .filter((item): item is Timesheet => Boolean(item));
  }, [timesheets, selectedTimesheets]);

  const allItemsSelected = selectedTimesheetEntities.length === selectedTimesheets.length;

  const selectedStatuses = useMemo(
    () => selectedTimesheetEntities.map((item) => item.status),
    [selectedTimesheetEntities],
  );

  const batchPermissions = useMemo(
    () => getBatchLecturerActionPermission(selectedStatuses),
    [selectedStatuses],
  );

  const statusApproveBlocked = !allItemsSelected || (selectedStatuses.length > 0 && !batchPermissions.canApprove);
  const statusRejectBlocked = !allItemsSelected || (selectedStatuses.length > 0 && !batchPermissions.canReject);

  const batchApproveDisabled = disableActions || !onApproveSelected || statusApproveBlocked;
  const batchRejectDisabled = disableActions || !onRejectSelected || statusRejectBlocked;

  const statusApproveReason = statusApproveBlocked
    ? batchPermissions.approveReason ?? LECTURER_ACTION_UNAVAILABLE_MESSAGE
    : undefined;
  const statusRejectReason = statusRejectBlocked
    ? batchPermissions.rejectReason ?? LECTURER_ACTION_UNAVAILABLE_MESSAGE
    : undefined;

  const approveDisabledReason =
    !canPerformApprovals
      ? 'You do not have permission to approve timesheets.'
      : approvalLoading
        ? 'Processing approval. Please wait before taking another action.'
        : !onApproveSelected
          ? 'Approve action is currently unavailable.'
          : statusApproveReason;

  const rejectDisabledReason =
    !canPerformApprovals
      ? 'You do not have permission to approve timesheets.'
      : approvalLoading
        ? 'Processing approval. Please wait before taking another action.'
        : !onRejectSelected
          ? 'Reject action is currently unavailable.'
          : statusRejectReason;


  // Batch action handlers are called directly from BatchActions component
  // These functions are kept for future extensibility

  return (
    <Fragment>
      <Card>
        <CardHeader className="layout-flush">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Review and approve timesheets submitted by tutors.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="layout-flush">
          {hasNoPendingTimesheets ? (
            <div className="py-12 text-center" data-testid="empty-state">
              <div className="mx-auto max-w-xs">
                <h3 className="text-lg font-semibold" data-testid="empty-state-title">
                  No Pending Timesheets
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  All caught up! No timesheets are waiting for your review.
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Approved records remain available in the reporting archive.
                </p>
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
            <div data-testid="lecturer-table">
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
            </div>
          )}
        </CardContent>
      </Card>

      {showBatchBar && (
        <div
          className="fixed inset-x-0 bottom-4 flex justify-center px-4 sm:px-6 elevation-toast"
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
            <BatchActions
              selectedCount={selectedTimesheets.length}
              loading={approvalLoading}
              disabled={!canPerformApprovals}
              onApprove={onApproveSelected}
              onReject={onRejectSelected}
              approveDisabled={batchApproveDisabled}
              rejectDisabled={batchRejectDisabled}
              approveDisabledReason={approveDisabledReason}
              rejectDisabledReason={rejectDisabledReason}
              mode="lecturer"
            />
          </div>
        </div>
      )}
    </Fragment>
  );
});

LecturerPendingTable.displayName = 'LecturerPendingTable';

export default LecturerPendingTable;
