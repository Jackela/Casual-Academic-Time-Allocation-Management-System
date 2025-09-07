import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './LecturerDashboard.css';

interface Timesheet {
  id: number;
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  hours: number;
  hourlyRate: number;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields that might come from backend
  tutorName?: string;
  courseName?: string;
  courseCode?: string;
}

interface PendingTimesheetsResponse {
  // Backend canonical field name per SSOT DTO
  timesheets?: Timesheet[];
  // Backward-compat legacy field names accepted during transition
  content?: Timesheet[];
  data?: Timesheet[];
  pageInfo?: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
  };
  page?: PendingTimesheetsResponse['pageInfo'];
}

const LecturerDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    // Only fetch timesheets if the authentication token is available
    if (token) {
      fetchPendingTimesheets();
    }
  }, [token]); // Re-run this effect when the token changes

  const fetchPendingTimesheets = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get<PendingTimesheetsResponse>(
        `${API_BASE_URL}/api/timesheets/pending-final-approval`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('API Response:', response.data);
      console.log('Timesheets received:', response.data.content?.length || 0);
      
      const body = response.data || ({} as PendingTimesheetsResponse);
      const items = body.timesheets ?? body.content ?? body.data ?? [];
      setTimesheets(items);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else if (err.response?.status === 403) {
          setError('You do not have permission to view pending timesheets.');
        } else {
          setError(err.response?.data?.message || 'Failed to fetch pending timesheets.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error fetching timesheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (timesheetId: number, action: 'LECTURER_CONFIRM' | 'REJECT' | 'HR_CONFIRM') => {
    try {
      setActionLoading(timesheetId);
      setError('');

      await axios.post(
        `${API_BASE_URL}/api/approvals`,
        {
          timesheetId: timesheetId,
          action: action,
          comment: action === 'LECTURER_CONFIRM' ? 'Confirmed by lecturer' : 'Rejected by lecturer'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Force-refresh strategy: always re-fetch list after operation, do not rely on cached state
      await fetchPendingTimesheets();
      
      // Show success message (could be improved with a toast notification)
      console.log(`Timesheet ${action.toLowerCase()}d successfully`);
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || `Failed to ${action.toLowerCase()} timesheet.`);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error(`Error ${action.toLowerCase()}ing timesheet:`, err);
    } finally {
      setActionLoading(null);
    }
  };

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

  if (loading) {
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

      {error && (
        <div className="error-message" data-testid="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {error}
          <button onClick={fetchPendingTimesheets} className="retry-button" data-testid="retry-button">
            Retry
          </button>
        </div>
      )}

      <div className="timesheets-section">
        <div className="section-header">
          <h2>Pending Timesheet Confirmations</h2>
          <span className="count-badge" data-testid="count-badge">{timesheets.length} pending</span>
        </div>

        {timesheets.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="#ccc">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <h3 data-testid="empty-state-title">No Pending Timesheets</h3>
            <p data-testid="empty-state-description">All timesheets have been reviewed. New submissions will appear here.</p>
          </div>
        ) : (
          <div className="timesheets-table-container">
            <table className="timesheets-table" data-testid="timesheets-table">
              <thead>
                <tr>
                  <th>Tutor</th>
                  <th>Course</th>
                  <th>Week Starting</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Total Pay</th>
                  <th>Description</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id} data-testid={`timesheet-row-${timesheet.id}`}>
                    <td>
                      <div className="tutor-info" data-testid={`tutor-info-${timesheet.id}`}>
                        <div className="tutor-avatar">
                          {(timesheet.tutorName || 'Unknown').charAt(0).toUpperCase()}
                        </div>
                        <span>{timesheet.tutorName || `Tutor ${timesheet.tutorId}`}</span>
                      </div>
                    </td>
                    <td>
                      <div className="course-info">
                        <span className="course-code" data-testid={`course-code-${timesheet.id}`}>{timesheet.courseCode || `Course ${timesheet.courseId}`}</span>
                        <span className="course-name">{timesheet.courseName || ''}</span>
                      </div>
                    </td>
                    <td>{formatDate(timesheet.weekStartDate)}</td>
                    <td>
                      <span className="hours-badge" data-testid={`hours-badge-${timesheet.id}`}>{timesheet.hours}h</span>
                    </td>
                    <td>{formatCurrency(timesheet.hourlyRate)}</td>
                    <td>
                      <strong>{formatCurrency(getTotalPay(timesheet.hours, timesheet.hourlyRate))}</strong>
                    </td>
                    <td>
                      <div className="description-cell" data-testid={`description-cell-${timesheet.id}`} title={timesheet.description}>
                        {timesheet.description.length > 50 
                          ? `${timesheet.description.substring(0, 50)}...` 
                          : timesheet.description
                        }
                      </div>
                    </td>
                    <td>{formatDate(timesheet.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleApprovalAction(timesheet.id, 'LECTURER_CONFIRM')}
                          disabled={actionLoading === timesheet.id}
                          className="approve-btn"
                          data-testid={`approve-btn-${timesheet.id}`}
                          title="Confirm timesheet"
                        >
                          {actionLoading === timesheet.id ? (
                            <div className="button-spinner" data-testid={`approve-spinner-${timesheet.id}`}></div>
                          ) : (
                            <>Confirm</>
                          )}
                        </button>
                        <button
                          onClick={() => handleApprovalAction(timesheet.id, 'REJECT')}
                          disabled={actionLoading === timesheet.id}
                          className="reject-btn"
                          data-testid={`reject-btn-${timesheet.id}`}
                          title="Reject timesheet"
                        >
                          {actionLoading === timesheet.id ? (
                            <div className="button-spinner" data-testid={`reject-spinner-${timesheet.id}`}></div>
                          ) : (
                            <>Reject</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;