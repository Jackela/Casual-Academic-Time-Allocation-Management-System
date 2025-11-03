import React from 'react';
import ApprovalHistory from './ApprovalHistory';

export interface TimesheetDetailViewProps {
  timesheetId: number;
}

const TimesheetDetailView: React.FC<TimesheetDetailViewProps> = ({ timesheetId }) => {
  return (
    <div data-testid="timesheet-detail-view">
      {/* Other detail sections would render here */}
      <ApprovalHistory timesheetId={timesheetId} />
    </div>
  );
};

export default TimesheetDetailView;

