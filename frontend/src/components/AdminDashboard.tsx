import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './AdminDashboard.css';

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
  tutorName?: string;
  courseName?: string;
  courseCode?: string;
}

interface TimesheetsResponse {
  success: boolean;
  timesheets: Timesheet[];
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

interface DashboardSummary {
  totalTimesheets: number;
  pendingApprovals: number;
  totalHours: number;
  totalPay: number;
  budgetUsage: {
    totalBudget: number;
    usedBudget: number;
    remainingBudget: number;
    utilizationPercentage: number;
  };
  recentActivities: Array<{
    id: number;
    type: string;
    description: string;
    timestamp: string;
    timesheetId?: number;
    userId: number;
    userName: string;
  }>;
  pendingItems: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    priority: string;
    dueDate: string;
    timesheetId?: number;
  }>;
  workloadAnalysis: {
    currentWeekHours: number;
    previousWeekHours: number;
    averageWeeklyHours: number;
    peakWeekHours: number;
    totalTutors: number;
    activeTutors: number;
  };
}

interface FilterState {
  tutorName: string;
  courseId: string;
  status: string;
}

const AdminDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timesheetsLoading, setTimesheetsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    tutorName: '',
    courseId: '',
    status: ''
  });

  useEffect(() => {
    if (token) {
      fetchDashboardSummary();
      fetchAllTimesheets();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAllTimesheets();
    }
  }, [currentPage, filters, token]);

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get<DashboardSummary>(
        `${API_BASE_URL}/api/dashboard/summary`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Dashboard Summary Response:', response.data);
      setDashboardSummary(response.data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else if (err.response?.status === 403) {
          setError('You do not have permission to view dashboard summary.');
        } else {
          setError(err.response?.data?.message || 'Failed to fetch dashboard summary.');
        }
      } else {
        setError('An unexpected error occurred while loading dashboard summary.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTimesheets = async () => {
    try {
      setTimesheetsLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: '20',
        sort: 'createdAt,desc'
      });

      // Add filters if they exist
      if (filters.tutorName.trim()) {
        params.append('tutorName', filters.tutorName.trim());
      }
      if (filters.courseId.trim()) {
        params.append('courseId', filters.courseId.trim());
      }
      if (filters.status) {
        params.append('status', filters.status);
      }

      const response = await axios.get<TimesheetsResponse>(
        `${API_BASE_URL}/api/timesheets?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('All Timesheets Response:', response.data);
      setTimesheets(response.data.timesheets || []);
      setTotalPages(response.data.pageInfo?.totalPages || 0);
      setTotalElements(response.data.pageInfo?.totalElements || 0);
    } catch (err) {
      console.error('Error fetching all timesheets:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else if (err.response?.status === 403) {
          setError('You do not have permission to view all timesheets.');
        } else {
          setError(err.response?.data?.message || 'Failed to fetch timesheets.');
        }
      } else {
        setError('An unexpected error occurred while loading timesheets.');
      }
    } finally {
      setTimesheetsLoading(false);
    }
  };

  const handleApprovalAction = async (timesheetId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      setActionLoading(timesheetId);
      setError('');

      await axios.post(
        `${API_BASE_URL}/api/approvals`,
        {
          timesheetId: timesheetId,
          action: action,
          comment: action === 'APPROVE' 
            ? 'Approved by admin override' 
            : 'Rejected by admin override'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Refresh both dashboard summary and timesheets after successful action
      await Promise.all([fetchDashboardSummary(), fetchAllTimesheets()]);
      
      console.log(`Timesheet ${action.toLowerCase()}d successfully by admin`);
      
    } catch (err) {
      console.error(`Error ${action.toLowerCase()}ing timesheet:`, err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || `Failed to ${action.toLowerCase()} timesheet.`);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      tutorName: '',
      courseId: '',
      status: ''
    });
    setCurrentPage(0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'status-badge status-pending';
      case 'APPROVED':
        return 'status-badge status-approved';
      case 'REJECTED':
        return 'status-badge status-rejected';
      case 'DRAFT':
        return 'status-badge status-draft';
      default:
        return 'status-badge';
    }
  };

  const canTakeAction = (status: string) => {
    return status.toUpperCase() === 'PENDING';
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-header" data-testid="dashboard-header">
          <h1 data-testid="dashboard-title">Admin Dashboard</h1>
          <p data-testid="welcome-message">Welcome back, {user?.name}</p>
        </div>
        <div className="loading-state" data-testid="loading-state">
          <div className="spinner" data-testid="spinner"></div>
          <p data-testid="loading-text">Loading system dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header" data-testid="dashboard-header">
        <div className="header-content">
          <div>
            <h1 data-testid="dashboard-title">Admin Dashboard</h1>
            <p data-testid="welcome-message">Welcome back, {user?.name}</p>
          </div>
          <div className="admin-actions">
            <button className="refresh-btn" onClick={() => {
              fetchDashboardSummary();
              fetchAllTimesheets();
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message" data-testid="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {error}
          <button onClick={() => {
            fetchDashboardSummary();
            fetchAllTimesheets();
          }} className="retry-button" data-testid="retry-button">
            Retry
          </button>
        </div>
      )}

      {/* System-wide Summary Stats */}
      {dashboardSummary && (
        <div className="summary-section" data-testid="summary-section">
          <h2>System Overview</h2>
          <div className="summary-cards">
            <div className="summary-card" data-testid="total-timesheets-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{dashboardSummary.totalTimesheets}</h3>
                <p>Total Timesheets</p>
              </div>
            </div>

            <div className="summary-card" data-testid="pending-approvals-card">
              <div className="card-icon pending">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{dashboardSummary.pendingApprovals}</h3>
                <p>Pending Approvals</p>
              </div>
            </div>

            <div className="summary-card" data-testid="total-hours-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                  <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{dashboardSummary.totalHours.toFixed(1)}h</h3>
                <p>Total Hours</p>
              </div>
            </div>

            <div className="summary-card" data-testid="total-pay-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11,8c0,2.21-1.79,4-4,4s-4-1.79-4-4s1.79-4,4-4S11,5.79,11,8z M17,6V4h-2v2h-1.5v6H15v2h2v-2h1.5V6H17z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{formatCurrency(dashboardSummary.totalPay)}</h3>
                <p>Total Payout</p>
              </div>
            </div>

            {dashboardSummary.budgetUsage && (
              <div className="summary-card" data-testid="budget-usage-card">
                <div className="card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7,15H9c0,2.08,1.2,3.88,2.94,4.73L9.82,21.82C7.76,20.53,6.12,18.14,6,15.25L7,15z M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L18.5,7C18.11,6.42 17.65,5.88 17.13,5.39L18.5,4L17,2.5L15.61,3.87C15.12,3.35 14.58,2.89 14,2.5V0H12V2.5C11.42,2.89 10.88,3.35 10.39,3.87L9,2.5L7.5,4L8.87,5.39C8.35,5.88 7.89,6.42 7.5,7H5V9H7.5C7.89,9.58 8.35,10.12 8.87,10.61L7.5,12L9,13.5L10.39,12.13C10.88,12.65 11.42,13.11 12,13.5V16H14V13.5C14.58,13.11 15.12,12.65 15.61,12.13L17,13.5L18.5,12L17.13,10.61C17.65,10.12 18.11,9.58 18.5,9H21Z"/>
                  </svg>
                </div>
                <div className="card-content">
                  <h3>{dashboardSummary.budgetUsage.utilizationPercentage.toFixed(1)}%</h3>
                  <p>Budget Utilized</p>
                  <div className="budget-bar">
                    <div 
                      className="budget-fill" 
                      style={{ 
                        width: `${Math.min(dashboardSummary.budgetUsage.utilizationPercentage, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="summary-card" data-testid="tutors-card">
              <div className="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4.5c0-1.1.9-2 2-2s2 .9 2 2V18h4v-8h2.5l1.5 1.5V15h2v-2.5c0-.8-.7-1.5-1.5-1.5H15v-1.5c0-.6-.4-1-1-1H6c-.6 0-1 .4-1 1V18H4z"/>
                </svg>
              </div>
              <div className="card-content">
                <h3>{dashboardSummary.workloadAnalysis.activeTutors} / {dashboardSummary.workloadAnalysis.totalTutors}</h3>
                <p>Active Tutors</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Filters */}
      <div className="filters-section" data-testid="filters-section">
        <h2>All System Timesheets</h2>
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="tutor-filter">Tutor Name:</label>
            <input
              id="tutor-filter"
              type="text"
              placeholder="Search by tutor name..."
              value={filters.tutorName}
              onChange={(e) => handleFilterChange('tutorName', e.target.value)}
              data-testid="tutor-filter"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="course-filter">Course ID:</label>
            <input
              id="course-filter"
              type="text"
              placeholder="Course ID..."
              value={filters.courseId}
              onChange={(e) => handleFilterChange('courseId', e.target.value)}
              data-testid="course-filter"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              data-testid="status-filter"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="filter-actions">
            <button 
              onClick={clearFilters}
              className="clear-filters-btn"
              data-testid="clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive Timesheet Table */}
      <div className="timesheets-section">
        <div className="section-header">
          <div className="results-info">
            <span className="count-badge" data-testid="total-count-badge">
              {totalElements} total timesheets
            </span>
            {(filters.tutorName || filters.courseId || filters.status) && (
              <span className="filtered-badge" data-testid="filtered-badge">
                (filtered)
              </span>
            )}
          </div>
        </div>

        {timesheetsLoading ? (
          <div className="loading-state" data-testid="timesheets-loading-state">
            <div className="spinner"></div>
            <p>Loading timesheets...</p>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="empty-state" data-testid="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="#ccc">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <h3 data-testid="empty-state-title">No Timesheets Found</h3>
            <p data-testid="empty-state-description">
              {(filters.tutorName || filters.courseId || filters.status) 
                ? 'No timesheets match your current filters. Try adjusting the search criteria.'
                : 'No timesheets have been created yet in the system.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="timesheets-table-container">
              <table className="timesheets-table" data-testid="timesheets-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tutor</th>
                    <th>Course</th>
                    <th>Week Starting</th>
                    <th>Hours</th>
                    <th>Rate</th>
                    <th>Total Pay</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((timesheet) => (
                    <tr key={timesheet.id} data-testid={`timesheet-row-${timesheet.id}`}>
                      <td>
                        <span className="id-badge" data-testid={`id-badge-${timesheet.id}`}>
                          #{timesheet.id}
                        </span>
                      </td>
                      <td>
                        <div className="tutor-info" data-testid={`tutor-info-${timesheet.id}`}>
                          <div className="tutor-avatar">
                            {(timesheet.tutorName || 'Unknown').charAt(0).toUpperCase()}
                          </div>
                          <div className="tutor-details">
                            <span className="tutor-name">{timesheet.tutorName || `Tutor ${timesheet.tutorId}`}</span>
                            <span className="tutor-id">ID: {timesheet.tutorId}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="course-info">
                          <span className="course-code" data-testid={`course-code-${timesheet.id}`}>
                            {timesheet.courseCode || `Course ${timesheet.courseId}`}
                          </span>
                          <span className="course-name">{timesheet.courseName || ''}</span>
                          <span className="course-id">ID: {timesheet.courseId}</span>
                        </div>
                      </td>
                      <td>{formatDate(timesheet.weekStartDate)}</td>
                      <td>
                        <span className="hours-badge" data-testid={`hours-badge-${timesheet.id}`}>
                          {timesheet.hours}h
                        </span>
                      </td>
                      <td>{formatCurrency(timesheet.hourlyRate)}</td>
                      <td>
                        <strong>{formatCurrency(getTotalPay(timesheet.hours, timesheet.hourlyRate))}</strong>
                      </td>
                      <td>
                        <span 
                          className={getStatusBadgeClass(timesheet.status)}
                          data-testid={`status-badge-${timesheet.id}`}
                        >
                          {timesheet.status}
                        </span>
                      </td>
                      <td>
                        <div className="description-cell" data-testid={`description-cell-${timesheet.id}`} title={timesheet.description}>
                          {timesheet.description.length > 40 
                            ? `${timesheet.description.substring(0, 40)}...` 
                            : timesheet.description
                          }
                        </div>
                      </td>
                      <td>{formatDateTime(timesheet.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          {canTakeAction(timesheet.status) ? (
                            <>
                              <button
                                onClick={() => handleApprovalAction(timesheet.id, 'APPROVE')}
                                disabled={actionLoading === timesheet.id}
                                className="approve-btn admin-override"
                                data-testid={`admin-approve-btn-${timesheet.id}`}
                                title="Admin override: Approve timesheet"
                              >
                                {actionLoading === timesheet.id ? (
                                  <div className="button-spinner"></div>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleApprovalAction(timesheet.id, 'REJECT')}
                                disabled={actionLoading === timesheet.id}
                                className="reject-btn admin-override"
                                data-testid={`admin-reject-btn-${timesheet.id}`}
                                title="Admin override: Reject timesheet"
                              >
                                {actionLoading === timesheet.id ? (
                                  <div className="button-spinner"></div>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                    Reject
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="no-actions" data-testid={`no-actions-${timesheet.id}`}>
                              No actions available
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination" data-testid="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="pagination-btn"
                  data-testid="prev-page-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                  Previous
                </button>

                <div className="pagination-info">
                  <span data-testid="pagination-info">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="pagination-btn"
                  data-testid="next-page-btn"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;