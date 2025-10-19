import { memo } from 'react';
import TimesheetTable from '../../../shared/TimesheetTable/TimesheetTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../ui/card';
import type { ApprovalAction, Timesheet } from '../../../../types/api';
import type { ActionState } from '../../../../types/dashboard/admin-dashboard';

interface AdminPendingReviewPanelProps {
  timesheets: Timesheet[];
  loading: boolean;
  actionState: ActionState;
  selectedTimesheets: number[];
  onSelectionChange: (ids: number[]) => void;
  onApprovalAction: (timesheetId: number, action: ApprovalAction) => Promise<void>;
}

const AdminPendingReviewPanel = memo<AdminPendingReviewPanelProps>(({
  timesheets,
  loading,
  actionState,
  selectedTimesheets,
  onSelectionChange,
  onApprovalAction,
}) => (
  <section role="region" aria-label="Pending Review" className="w-full">
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pending Admin Review</CardTitle>
        <CardDescription>
          Review and finalize timesheets that have been approved by lecturers.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-x-auto">
            <TimesheetTable
              timesheets={timesheets}
              loading={loading}
              actionLoading={actionState.loadingId}
              showActions
              showTutorInfo
              showCourseInfo
              showSelection
              selectedIds={selectedTimesheets}
              onSelectionChange={onSelectionChange}
              onApprovalAction={onApprovalAction}
              className="admin-timesheet-table"
              approvalRole="ADMIN"
              actionsDisabled={actionState.isSubmitting}
              actionsDisabledReason="An approval action is already in progress. Please wait."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
));

AdminPendingReviewPanel.displayName = 'AdminPendingReviewPanel';

export default AdminPendingReviewPanel;
