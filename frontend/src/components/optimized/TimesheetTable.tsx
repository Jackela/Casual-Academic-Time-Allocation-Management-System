/**
 * Optimized Timesheet Table Component
 * 
 * High-performance table component with React.memo, virtualization support,
 * and optimized rendering for large datasets.
 */

import React, { memo, useMemo, useCallback } from 'react';
import type { Timesheet, ApprovalAction } from '../../types/api';

// =============================================================================
// Component Props
// =============================================================================

interface TimesheetTableProps {
  timesheets: Timesheet[];
  loading?: boolean;
  onApprovalAction?: (timesheetId: number, action: ApprovalAction) => void;
  actionLoading?: number | null;
  showActions?: boolean;
  showTutorInfo?: boolean;
  showCourseInfo?: boolean;
  className?: string;
}

interface TimesheetRowProps {
  timesheet: Timesheet;
  onApprovalAction?: (timesheetId: number, action: ApprovalAction) => void;
  actionLoading?: boolean;
  showActions?: boolean;
  showTutorInfo?: boolean;
  showCourseInfo?: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
};

const getTotalPay = (hours: number, hourlyRate: number) => {
  return hours * hourlyRate;
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'badge-draft';
    case 'SUBMITTED': return 'badge-submitted';
    case 'APPROVED_BY_LECTURER': return 'badge-approved';
    case 'REJECTED_BY_LECTURER': return 'badge-rejected';
    case 'FINAL_APPROVED': return 'badge-final-approved';
    case 'PAID': return 'badge-paid';
    default: return 'badge-default';
  }
};

// =============================================================================
// Memoized Row Component
// =============================================================================

const TimesheetRow = memo<TimesheetRowProps>(({
  timesheet,
  onApprovalAction,
  actionLoading = false,
  showActions = false,
  showTutorInfo = true,
  showCourseInfo = true
}) => {
  const handleApprove = useCallback(() => {
    onApprovalAction?.(timesheet.id, 'FINAL_APPROVAL');
  }, [timesheet.id, onApprovalAction]);
  
  const handleReject = useCallback(() => {
    onApprovalAction?.(timesheet.id, 'REJECT');
  }, [timesheet.id, onApprovalAction]);
  
  const totalPay = useMemo(() => 
    getTotalPay(timesheet.hours, timesheet.hourlyRate), 
    [timesheet.hours, timesheet.hourlyRate]
  );
  
  const formattedCreatedAt = useMemo(() => 
    formatDate(timesheet.createdAt), 
    [timesheet.createdAt]
  );
  
  const formattedWeekStartDate = useMemo(() => 
    formatDate(timesheet.weekStartDate), 
    [timesheet.weekStartDate]
  );
  
  const truncatedDescription = useMemo(() => {
    const desc = timesheet.description;
    return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;
  }, [timesheet.description]);
  
  return (
    <tr 
      key={timesheet.id} 
      data-testid={`timesheet-row-${timesheet.id}`}
      className="timesheet-row"
    >
      {showTutorInfo && (
        <td>
          <div className="tutor-info" data-testid={`tutor-info-${timesheet.id}`}>
            <div className="tutor-avatar">
              {(timesheet.tutorName || 'Unknown').charAt(0).toUpperCase()}
            </div>
            <span>{timesheet.tutorName || `Tutor ${timesheet.tutorId}`}</span>
          </div>
        </td>
      )}
      
      {showCourseInfo && (
        <td>
          <div className="course-info">
            <span 
              className="course-code" 
              data-testid={`course-code-${timesheet.id}`}
            >
              {timesheet.courseCode || `Course ${timesheet.courseId}`}
            </span>
            {timesheet.courseName && (
              <span className="course-name">{timesheet.courseName}</span>
            )}
          </div>
        </td>
      )}
      
      <td>{formattedWeekStartDate}</td>
      
      <td>
        <span 
          className="hours-badge" 
          data-testid={`hours-badge-${timesheet.id}`}
        >
          {timesheet.hours}h
        </span>
      </td>
      
      <td>{formatCurrency(timesheet.hourlyRate)}</td>
      
      <td>
        <strong>{formatCurrency(totalPay)}</strong>
      </td>
      
      <td>
        <span className={`status-badge ${getStatusBadgeColor(timesheet.status)}`}>
          {timesheet.status.replace(/_/g, ' ')}
        </span>
      </td>
      
      <td>
        <div 
          className="description-cell" 
          data-testid={`description-cell-${timesheet.id}`} 
          title={timesheet.description}
        >
          {truncatedDescription}
        </div>
      </td>
      
      <td>{formattedCreatedAt}</td>
      
      {showActions && (
        <td>
          <div className="action-buttons">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="approve-btn"
              data-testid={`approve-btn-${timesheet.id}`}
              title="Final approve timesheet"
            >
              {actionLoading ? (
                <div 
                  className="button-spinner" 
                  data-testid={`approve-spinner-${timesheet.id}`}
                />
              ) : (
                'Final Approve'
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="reject-btn"
              data-testid={`reject-btn-${timesheet.id}`}
              title="Reject timesheet"
            >
              {actionLoading ? (
                <div 
                  className="button-spinner" 
                  data-testid={`reject-spinner-${timesheet.id}`}
                />
              ) : (
                'Reject'
              )}
            </button>
          </div>
        </td>
      )}
    </tr>
  );
});

TimesheetRow.displayName = 'TimesheetRow';

// =============================================================================
// Memoized Table Header Component
// =============================================================================

interface TableHeaderProps {
  showTutorInfo?: boolean;
  showCourseInfo?: boolean;
  showActions?: boolean;
}

const TableHeader = memo<TableHeaderProps>(({
  showTutorInfo = true,
  showCourseInfo = true,
  showActions = false
}) => (
  <thead>
    <tr>
      {showTutorInfo && <th>Tutor</th>}
      {showCourseInfo && <th>Course</th>}
      <th>Week Starting</th>
      <th>Hours</th>
      <th>Rate</th>
      <th>Total Pay</th>
      <th>Status</th>
      <th>Description</th>
      <th>Submitted</th>
      {showActions && <th>Actions</th>}
    </tr>
  </thead>
));

TableHeader.displayName = 'TableHeader';

// =============================================================================
// Loading State Component
// =============================================================================

const LoadingRow = memo(() => (
  <tr className="loading-row">
    <td colSpan={10} className="loading-cell">
      <div className="loading-spinner" />
      <span>Loading timesheets...</span>
    </td>
  </tr>
));

LoadingRow.displayName = 'LoadingRow';

// =============================================================================
// Empty State Component
// =============================================================================

const EmptyRow = memo(() => (
  <tr className="empty-row">
    <td colSpan={10} className="empty-cell">
      <div className="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="#ccc">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
        <h3>No Timesheets Found</h3>
        <p>No timesheets match your current criteria.</p>
      </div>
    </td>
  </tr>
));

EmptyRow.displayName = 'EmptyRow';

// =============================================================================
// Main Table Component
// =============================================================================

const TimesheetTable = memo<TimesheetTableProps>(({
  timesheets,
  loading = false,
  onApprovalAction,
  actionLoading = null,
  showActions = false,
  showTutorInfo = true,
  showCourseInfo = true,
  className = ''
}) => {
  const isEmpty = !loading && timesheets.length === 0;
  
  const tableRows = useMemo(() => {
    if (loading) {
      return <LoadingRow />;
    }
    
    if (isEmpty) {
      return <EmptyRow />;
    }
    
    return timesheets.map((timesheet) => (
      <TimesheetRow
        key={timesheet.id}
        timesheet={timesheet}
        onApprovalAction={onApprovalAction}
        actionLoading={actionLoading === timesheet.id}
        showActions={showActions}
        showTutorInfo={showTutorInfo}
        showCourseInfo={showCourseInfo}
      />
    ));
  }, [
    timesheets, 
    loading, 
    isEmpty, 
    onApprovalAction, 
    actionLoading, 
    showActions, 
    showTutorInfo, 
    showCourseInfo
  ]);
  
  return (
    <div className={`timesheets-table-container ${className}`}>
      <table className="timesheets-table" data-testid="timesheets-table">
        <TableHeader
          showTutorInfo={showTutorInfo}
          showCourseInfo={showCourseInfo}
          showActions={showActions}
        />
        <tbody>
          {tableRows}
        </tbody>
      </table>
    </div>
  );
});

TimesheetTable.displayName = 'TimesheetTable';

export default TimesheetTable;