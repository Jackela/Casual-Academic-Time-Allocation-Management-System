/**
 * Improved Lecturer Dashboard Component
 * 
 * Refactored version using custom hooks, optimized rendering,
 * and improved code organization.
 */

import React, { useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingTimesheets, useApprovalAction } from '../../hooks/useApi';
import TimesheetTable from '../optimized/TimesheetTable';
import type { ApprovalAction, ApprovalRequest } from '../../types/api';
import './LecturerDashboard.css';

// =============================================================================
// Main Component
// =============================================================================

const LecturerDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // API hooks for data fetching and mutations
  const {
    data: timesheetsData,
    loading: timesheetsLoading,
    error: timesheetsError,
    refetch: refetchTimesheets
  } = usePendingTimesheets();
  
  const {
    mutate: performApprovalAction,
    loading: approvalLoading,
    error: approvalError
  } = useApprovalAction({
    onSuccess: () => {
      // Refresh the timesheets list after successful approval
      refetchTimesheets();
      console.log('Approval action completed successfully');
    },
    onError: (error) => {
      console.error('Approval action failed:', error);
    }
  });
  
  // Memoized data extraction
  const timesheets = useMemo(() => {
    return timesheetsData?.timesheets ?? [];
  }, [timesheetsData]);
  
  const pendingCount = useMemo(() => {
    return timesheets.length;
  }, [timesheets.length]);
  
  // Error state combination
  const error = timesheetsError || approvalError;
  
  // Optimized approval action handler
  const handleApprovalAction = useCallback((timesheetId: number, action: ApprovalAction) => {
    const approvalRequest: ApprovalRequest = {
      timesheetId,
      action,
      comment: action === 'FINAL_APPROVAL' ? 'Approved by lecturer' : 'Rejected by lecturer'
    };
    
    performApprovalAction(approvalRequest);
  }, [performApprovalAction]);
  
  const handleRetry = useCallback(() => {
    refetchTimesheets();
  }, [refetchTimesheets]);
  
  // Loading state
  if (timesheetsLoading) {
    return (
      <div className="lecturer-dashboard">
        <div className="dashboard-header" data-testid="dashboard-header">
          <h1 data-testid="dashboard-title">Lecturer Dashboard</h1>
          <p data-testid="welcome-message">Welcome back, {user?.name}</p>
        </div>
        <div className="loading-state" data-testid="loading-state">
          <div className="spinner" data-testid="spinner"></div>
          <p data-testid="loading-text">Loading pending timesheets...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="lecturer-dashboard">
      {/* Header Section */}
      <div className="dashboard-header" data-testid="main-dashboard-header">
        <div className="header-content">
          <div>
            <h1 data-testid="main-dashboard-title">Lecturer Dashboard</h1>
            <p data-testid="main-welcome-message">Welcome back, {user?.name}</p>
          </div>
          <button className="create-timesheet-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Create New Timesheet
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message" data-testid="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {error}
          <button onClick={handleRetry} className="retry-button" data-testid="retry-button">
            Retry
          </button>
        </div>
      )}

      {/* Timesheets Section */}
      <div className="timesheets-section">
        <div className="section-header">
          <h2>Pending Timesheet Approvals</h2>
          <span className="count-badge" data-testid="count-badge">
            {pendingCount} pending
          </span>
        </div>

        {/* Empty State */}
        {pendingCount === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="#ccc">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <h3 data-testid="empty-state-title">No Pending Timesheets</h3>
            <p data-testid="empty-state-description">
              All timesheets have been reviewed. New submissions will appear here.
            </p>
          </div>
        ) : (
          /* Optimized Timesheet Table */
          <TimesheetTable
            timesheets={timesheets}
            loading={false}
            onApprovalAction={handleApprovalAction}
            actionLoading={approvalLoading ? undefined : null}
            showActions={true}
            showTutorInfo={true}
            showCourseInfo={true}
          />
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;