import { memo } from 'react';
import { Link } from 'react-router-dom';
import TimesheetTable from '../../../shared/TimesheetTable/TimesheetTable';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
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
  onBatchApprove: () => Promise<void>;
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
  onBatchApprove,
  actionLoadingId,
  onClearFilters,
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Review and approve timesheets submitted by tutors.
          </CardDescription>
        </div>
        {canPerformApprovals && selectedTimesheets.length > 0 && (
          <div className="flex items-center gap-2">
            <Button onClick={onBatchApprove} disabled={approvalLoading || !canPerformApprovals}>
              {approvalLoading ? <LoadingSpinner size="small" /> : 'Batch Approve'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedTimesheets.length} selected
            </span>
          </div>
        )}
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
          showActions={canPerformApprovals}
          showTutorInfo
          showCourseInfo
          showSelection={canPerformApprovals}
          selectedIds={canPerformApprovals ? selectedTimesheets : []}
          onSelectionChange={canPerformApprovals ? onSelectionChange : undefined}
          className="lecturer-timesheet-table"
          approvalRole={canPerformApprovals ? 'LECTURER' : undefined}
        />
      )}
    </CardContent>
  </Card>
));

LecturerPendingTable.displayName = 'LecturerPendingTable';

export default LecturerPendingTable;
