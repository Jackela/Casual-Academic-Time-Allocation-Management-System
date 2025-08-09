import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './TutorDashboard.css';

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
  createdBy: number;
  isEditable: boolean;
  canBeApproved: boolean;
  // Additional fields that might come from backend
  tutorName?: string;
  courseName?: string;
  courseCode?: string;
}

interface TimesheetsResponse {
  content: Timesheet[];
  pageInfo: {
    currentPage: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
  };
}

interface EditTimesheetData {
  hours: number;
  hourlyRate: number;
  description: string;
}

const TutorDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [editFormData, setEditFormData] = useState<EditTimesheetData>({
    hours: 0,
    hourlyRate: 0,
    description: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    // Only fetch timesheets if the authentication token is available
    if (token) {
      fetchMyTimesheets();
    }
  }, [token]); // Re-run this effect when the token changes

  const fetchMyTimesheets = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get<TimesheetsResponse>(
        `${API_BASE_URL}/api/timesheets/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('API Response:', response.data);
      console.log('Timesheets received:', response.data.content?.length || 0);
      
      setTimesheets(response.data.content || []);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else if (err.response?.status === 403) {
          setError('You do not have permission to view your timesheets.');
        } else {
          setError(err.response?.data?.message || 'Failed to fetch your timesheets.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error fetching timesheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (timesheetId: number) => {
    try {
      setActionLoading(timesheetId);
      setError('');

      await axios.post(
        `${API_BASE_URL}/api/approvals`,
        {
          timesheetId: timesheetId,
          action: 'SUBMIT_FOR_APPROVAL',
          comment: 'Submitted for approval by tutor'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Refresh the timesheets list after successful submission
      await fetchMyTimesheets();
      
      console.log('Timesheet submitted for approval successfully');
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to submit timesheet for approval.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error submitting timesheet for approval:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditTimesheet = (timesheet: Timesheet) => {
    setEditingTimesheet(timesheet);
    setEditFormData({
      hours: timesheet.hours,
      hourlyRate: timesheet.hourlyRate,
      description: timesheet.description
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTimesheet) return;
    
    try {
      setActionLoading(editingTimesheet.id);
      setError('');

      await axios.put(
        `${API_BASE_URL}/api/timesheets/${editingTimesheet.id}`,
        editFormData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Refresh the timesheets list after successful update
      await fetchMyTimesheets();
      setEditingTimesheet(null);
      
      console.log('Timesheet updated successfully');
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to update timesheet.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error updating timesheet:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTimesheet = async (timesheetId: number) => {
    try {
      setActionLoading(timesheetId);
      setError('');

      await axios.delete(
        `${API_BASE_URL}/api/timesheets/${timesheetId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Refresh the timesheets list after successful deletion
      await fetchMyTimesheets();
      setShowDeleteConfirm(null);
      
      console.log('Timesheet deleted successfully');
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to delete timesheet.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error deleting timesheet:', err);
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'status-badge draft';
      case 'PENDING_TUTOR_REVIEW':
        return 'status-badge pending';
      case 'TUTOR_APPROVED':
        return 'status-badge approved';
      case 'PENDING_HR_REVIEW':
        return 'status-badge pending';
      case 'HR_APPROVED':
      case 'FINAL_APPROVED':
        return 'status-badge approved';
      case 'REJECTED':
        return 'status-badge rejected';
      case 'MODIFICATION_REQUESTED':
        return 'status-badge modification';      default:
        return 'status-badge';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'PENDING_TUTOR_REVIEW':
        return 'Pending Tutor Review';
      case 'TUTOR_APPROVED':
        return 'Tutor Approved';
      case 'PENDING_HR_REVIEW':
        return 'Pending HR Review';
      case 'HR_APPROVED':
        return 'HR Approved';
      case 'FINAL_APPROVED':
        return 'Final Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'MODIFICATION_REQUESTED':
        return 'Modification Requested';      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="tutor-dashboard">
        <div className="dashboard-header" data-testid="dashboard-header">
          <h1 data-testid="dashboard-title">Tutor Dashboard</h1>
          <p data-testid="welcome-message">Welcome back, {user?.name}</p>
        </div>
        <div className="loading-state" data-testid="loading-state">
          <div className="spinner" data-testid="spinner"></div>
          <p data-testid="loading-text">Loading your timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-dashboard">
      <div className="dashboard-header" data-testid="main-dashboard-header">
        <div className="header-content">
          <div>
            <h1 data-testid="main-dashboard-title">Tutor Dashboard</h1>
            <p data-testid="main-welcome-message">Welcome back, {user?.name}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" data-testid="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          {error}
          <button onClick={fetchMyTimesheets} className="retry-button" data-testid="retry-button">
            Retry
          </button>
        </div>
      )}

      <div className="timesheets-section">
        <div className="section-header">
          <h2>My Timesheets</h2>
          <span className="count-badge" data-testid="count-badge">{timesheets.length} total</span>
        </div>

        {timesheets.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="#ccc">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <h3 data-testid="empty-state-title">No Timesheets Found</h3>
            <p data-testid="empty-state-description">You haven't created any timesheets yet. Contact your lecturer to create timesheets for you.</p>
          </div>
        ) : (
          <div className="timesheets-table-container" data-testid="timesheets-table-container">            <table className="timesheets-table" data-testid="timesheets-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Week Starting</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Total Pay</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id} data-testid={`timesheet-row-${timesheet.id}`}>
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
                    <td>
                      <span 
                        className={getStatusBadgeClass(timesheet.status)} 
                        data-testid={`status-badge-${timesheet.id}`}
                      >
                        {getStatusDisplayName(timesheet.status)}
                      </span>
                    </td>
                    <td>{formatDate(timesheet.updatedAt)}</td>
                    <td>
                      <div className="action-buttons" data-testid="action-buttons">                        {/* Show Submit button for DRAFT timesheets */}
                        {timesheet.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSubmitForApproval(timesheet.id)}
                            disabled={actionLoading === timesheet.id}
                            className="submit-btn"
                            data-testid={`submit-btn-${timesheet.id}`}
                            title="Submit for approval"
                          >
                            {actionLoading === timesheet.id ? (
                              <div className="button-spinner" data-testid={`submit-spinner-${timesheet.id}`}></div>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                                Submit
                              </>
                            )}
                          </button>
                        )}

                        {/* Show Edit and Delete buttons for REJECTED timesheets */}
                        {timesheet.status === 'REJECTED' && (
                          <>
                            <button
                              onClick={() => handleEditTimesheet(timesheet)}
                              disabled={actionLoading === timesheet.id}
                              className="edit-btn"
                              data-testid={`edit-btn-${timesheet.id}`}
                              title="Edit timesheet"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(timesheet.id)}
                              disabled={actionLoading === timesheet.id}
                              className="delete-btn"
                              data-testid={`delete-btn-${timesheet.id}`}
                              title="Delete timesheet"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                              </svg>
                              Delete
                            </button>
                          </>
                        )}

                        {/* Show status for other states */}
                        {timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED' && (
                          <span className="no-actions">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTimesheet && (
        <div className="modal-overlay" data-testid="edit-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Timesheet</h3>
              <button 
                onClick={() => setEditingTimesheet(null)}
                className="modal-close"
                data-testid="modal-close-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-hours">Hours</label>
                <input
                  type="number"
                  id="edit-hours"
                  min="0.1"
                  max="40"
                  step="0.1"
                  value={editFormData.hours}
                  onChange={(e) => setEditFormData({...editFormData, hours: parseFloat(e.target.value) || 0})}
                  data-testid="edit-hours-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-rate">Hourly Rate (AUD)</label>
                <input
                  type="number"
                  id="edit-rate"
                  min="10"
                  max="200"
                  step="0.01"
                  value={editFormData.hourlyRate}
                  onChange={(e) => setEditFormData({...editFormData, hourlyRate: parseFloat(e.target.value) || 0})}
                  data-testid="edit-rate-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  rows={4}
                  maxLength={1000}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  data-testid="edit-description-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setEditingTimesheet(null)}
                className="cancel-btn"
                data-testid="edit-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={actionLoading === editingTimesheet.id}
                className="save-btn"
                data-testid="edit-save-btn"
              >
                {actionLoading === editingTimesheet.id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" data-testid="delete-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this timesheet? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="cancel-btn"
                data-testid="delete-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteTimesheet(showDeleteConfirm)}
                disabled={actionLoading === showDeleteConfirm}
                className="delete-btn"
                data-testid="delete-confirm-btn"
              >
                {actionLoading === showDeleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorDashboard;