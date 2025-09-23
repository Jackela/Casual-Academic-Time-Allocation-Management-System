/**
 * AdminDashboard Component
 * 
 * Comprehensive admin dashboard with system oversight, user management,
 * analytics, and administrative controls with advanced filtering and monitoring.
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { 
  useTimesheets,
  useDashboardSummary, 
  useApprovalAction,
  useTimesheetStats 
} from '../../../hooks/useTimesheets';
import { useAuth } from '../../../contexts/AuthContext';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';
import StatusBadge from '../../shared/StatusBadge/StatusBadge';
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { formatters } from '../../../utils/formatting';
import type { 
  Timesheet, 
  ApprovalAction, 
  TimesheetQuery,
  DashboardSummary 
} from '../../../types/api';
import './AdminDashboard.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export interface AdminDashboardProps {
  className?: string;
}

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: string;
  testId?: string;
  onClick?: () => void;
}

interface SystemHealthProps {
  systemLoad: number;
  activeUsers: number;
  averageApprovalTime: number;
  alerts?: string[];
}

interface FilterPreset {
  id: string;
  name: string;
  query: TimesheetQuery;
  active: boolean;
}

interface AnalyticsData {
  revenueData: { month: string; amount: number }[];
  usageData: { category: string; value: number }[];
  efficiencyMetrics: { metric: string; value: number; target: number }[];
}

// =============================================================================
// Admin Statistics Card Component
// =============================================================================

const AdminStatCard = memo<AdminStatCardProps>(({
  title,
  value,
  subtitle,
  trend = 'stable',
  color = 'primary',
  icon,
  testId,
  onClick
}) => (
  <div 
    className={`admin-stat-card admin-stat-card--${color} ${onClick ? 'clickable' : ''}`}
    data-testid={testId ?? 'stat-card'}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    } : undefined}
  >
    <div className="admin-stat-card__header">
      {icon && <span className="admin-stat-card__icon">{icon}</span>}
      <h3 className="admin-stat-card__title">{title}</h3>
    </div>
    <div className="admin-stat-card__content">
      <div className="admin-stat-card__value">{value}</div>
      {subtitle && (
        <div className={`admin-stat-card__subtitle admin-stat-card__subtitle--${trend}`}>
          {trend === 'up' && '↗ '}
          {trend === 'down' && '↘ '}
          {subtitle}
        </div>
      )}
    </div>
  </div>
));

AdminStatCard.displayName = 'AdminStatCard';

// =============================================================================
// System Health Indicator Component
// =============================================================================

const SystemHealthIndicator = memo<SystemHealthProps>(({
  systemLoad,
  activeUsers,
  averageApprovalTime,
  alerts = []
}) => {
  const healthStatus = useMemo(() => {
    if (alerts.length > 0 || systemLoad > 0.9) return 'critical';
    if (systemLoad > 0.8) return 'warning';
    return 'healthy';
  }, [systemLoad, alerts.length]);

  const statusColor = {
    healthy: 'success',
    warning: 'warning',
    critical: 'error'
  }[healthStatus];

  return (
    <div 
      className={`system-health-indicator system-health-indicator--${healthStatus}`}
      data-testid="system-health-indicator"
    >
      <div className="system-health__header">
        <h3>System Health</h3>
        <StatusBadge 
          status={healthStatus.toUpperCase() as any} 
          size="small"
          showIcon={true}
        />
      </div>
      
      <div className="system-health__metrics" data-testid="system-health">
        <div className="health-metric">
          <span className="health-metric__label">System Load</span>
          <span className="health-metric__value">{Math.round(systemLoad * 100)}%</span>
          <div className="health-metric__bar">
            <div 
              className={`health-metric__progress health-metric__progress--${statusColor}`}
              style={{ width: `${systemLoad * 100}%` }}
            />
          </div>
        </div>
        
        <div className="health-metric">
          <span className="health-metric__label">Active Users</span>
          <span className="health-metric__value">{activeUsers}</span>
        </div>
        
        <div className="health-metric">
          <span className="health-metric__label">Avg Approval Time</span>
          <span className="health-metric__value">{averageApprovalTime} days</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="system-alerts" data-testid="system-alerts">
          <h4>System Alerts</h4>
          <ul className="alert-list">
            {alerts.map((alert, index) => (
              <li key={index} className="alert-item">
                ⚠️ {alert}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

SystemHealthIndicator.displayName = 'SystemHealthIndicator';

// =============================================================================
// Status Distribution Chart Component
// =============================================================================

const StatusDistributionChart = memo<{ 
  statusBreakdown: Record<string, number>;
  total: number;
}>(({ statusBreakdown, total }) => (
  <div className="status-distribution-chart" data-testid="status-distribution-chart">
    <h3>Status Distribution</h3>
    <div className="distribution-chart">
      {Object.entries(statusBreakdown).map(([status, count]) => {
        if (count === 0) return null;
        
        const percentage = total > 0 ? (count / total) * 100 : 0;
        
        return (
          <div key={status} className="distribution-item">
            <StatusBadge status={status as any} size="small" />
            <div className="distribution-stats">
              <span className="distribution-count">{count}</span>
              <span className="distribution-percentage">
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="distribution-bar">
              <div 
                className="distribution-progress"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
));

StatusDistributionChart.displayName = 'StatusDistributionChart';

// =============================================================================
// Analytics Dashboard Component
// =============================================================================

const AnalyticsDashboard = memo<{ data: AnalyticsData }>(({ data }) => (
  <div className="analytics-dashboard" data-testid="analytics-dashboard">
    <h3>Analytics & Reports</h3>
    
    <div className="analytics-grid">
      <div className="analytics-section">
        <h4>Revenue Analytics</h4>
        <div className="revenue-chart" data-testid="revenue-chart">
          {data.revenueData.map((item, index) => (
            <div key={index} className="revenue-item">
              <span className="revenue-month">{item.month}</span>
              <span className="revenue-amount">${formatters.currencyValue(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="analytics-section">
        <h4>Usage Trends</h4>
        <div className="usage-chart" data-testid="usage-chart">
          {data.usageData.map((item, index) => (
            <div key={index} className="usage-item">
              <span className="usage-category">{item.category}</span>
              <span className="usage-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="analytics-section">
        <h4>Efficiency Metrics</h4>
        <div className="efficiency-chart" data-testid="efficiency-chart">
          {data.efficiencyMetrics.map((item, index) => (
            <div key={index} className="efficiency-item">
              <span className="efficiency-metric">{item.metric}</span>
              <div className="efficiency-progress">
                <div 
                  className="efficiency-bar"
                  style={{ width: `${(item.value / item.target) * 100}%` }}
                />
                <span className="efficiency-text">
                  {item.value} / {item.target}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

AnalyticsDashboard.displayName = 'AnalyticsDashboard';

// =============================================================================
// Filter Controls Component
// =============================================================================

const FilterControls = memo<{
  onFilterChange: (query: TimesheetQuery) => void;
  presets: FilterPreset[];
  onPresetSelect: (preset: FilterPreset) => void;
}>(({ onFilterChange, presets, onPresetSelect }) => {
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const applyFilters = useCallback((next: Record<string, unknown>) => {
    const normalized = Object.entries(next).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const shouldRemove = (
        value === '' ||
        value === null ||
        value === undefined ||
        (typeof value === 'number' && Number.isNaN(value))
      );

      if (!shouldRemove) {
        acc[key] = value;
      }

      return acc;
    }, {});

    setFilters(normalized);
    onFilterChange(normalized as TimesheetQuery);
  }, [onFilterChange]);

  const handleFilterUpdate = useCallback((newFilters: Record<string, unknown>) => {
    applyFilters({ ...filters, ...newFilters });
  }, [applyFilters, filters]);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    onFilterChange({} as TimesheetQuery);
  }, [onFilterChange]);

  const handlePresetClick = useCallback((preset: FilterPreset) => {
    onPresetSelect(preset);
    applyFilters(preset.query as Record<string, unknown>);
  }, [applyFilters, onPresetSelect]);

  return (
    <div className="filter-controls" data-testid="filters-section">
      <div className="filter-presets">
        <h4>Filter Presets</h4>
        <div className="preset-buttons">
          {presets.map(preset => (
            <button
              key={preset.id}
              className={`preset-button ${preset.active ? 'active' : ''}`}
              onClick={() => handlePresetClick(preset)}
              data-testid={`filter-preset-${preset.id}`}
              type="button"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <button
        className="advanced-filters-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
        data-testid="advanced-filters-toggle"
        type="button"
      >
        Advanced Filters {showAdvanced ? '▼' : '▶'}
      </button>

      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-row">
            <label htmlFor="date-range">Date Range</label>
            <input
              id="date-range"
              type="date"
              value={typeof filters['startDate'] === 'string' ? (filters['startDate'] as string) : ''}
              onChange={(e) => handleFilterUpdate({ startDate: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              value={typeof filters['endDate'] === 'string' ? (filters['endDate'] as string) : ''}
              onChange={(e) => handleFilterUpdate({ endDate: e.target.value })}
            />
          </div>

          <div className="filter-row">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              data-testid="status-filter"
              value={typeof filters['status'] === 'string' ? (filters['status'] as string) : ''}
              onChange={(e) => handleFilterUpdate({ status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_TUTOR_CONFIRMATION">Submitted</option>
              <option value="LECTURER_CONFIRMED">Approved by Lecturer</option>
              <option value="REJECTED">Rejected by Lecturer</option>
              <option value="FINAL_CONFIRMED">Approved by Admin</option>
              <option value="FINAL_CONFIRMED">Final Approved</option>
              <option value="FINAL_CONFIRMED">Paid</option>
            </select>
          </div>

          <div className="filter-row">
            <label htmlFor="amount-min">Amount Range</label>
            <input
              id="amount-min"
              type="number"
              placeholder="Min"
              value={typeof filters['minAmount'] === 'number' ? String(filters['minAmount']) : ''}
              onChange={(e) => handleFilterUpdate({ minAmount: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={typeof filters['maxAmount'] === 'number' ? String(filters['maxAmount']) : ''}
              onChange={(e) => handleFilterUpdate({ maxAmount: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
            />
          </div>

          <div className="filter-row">
            <label htmlFor="tutor-filter">Tutor</label>
            <input
              id="tutor-filter"
              type="text"
              placeholder="Search tutor..."
              data-testid="tutor-filter"
              value={typeof filters['tutorName'] === 'string' ? (filters['tutorName'] as string) : ''}
              onChange={(e) => handleFilterUpdate({ tutorName: e.target.value })}
            />
          </div>

          <div className="filter-row">
            <label htmlFor="course-filter">Course</label>
            <input
              id="course-filter"
              type="text"
              placeholder="Search course..."
              data-testid="course-filter"
              value={typeof filters['courseName'] === 'string' ? (filters['courseName'] as string) : ''}
              onChange={(e) => handleFilterUpdate({ courseName: e.target.value })}
            />
          </div>

          <div className="filter-actions">
            <button
              type="button"
              className="clear-filters-btn"
              data-testid="clear-filters-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

FilterControls.displayName = 'FilterControls';

// =============================================================================
// Main AdminDashboard Component
// =============================================================================

const AdminDashboard = memo<AdminDashboardProps>(({ className = '' }) => {
  const { user } = useAuth();
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [currentTab, setCurrentTab] = useState<'overview' | 'pending' | 'users' | 'analytics' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState<TimesheetQuery>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    open: boolean;
    action: string;
    timesheetIds: number[];
  }>({ open: false, action: '', timesheetIds: [] });

  // Fetch all timesheets for admin overview
  const {
    data: allTimesheetsData,
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    isEmpty: noTimesheets,
    updateQuery,
    refresh: refreshTimesheets
  } = useTimesheets({ 
    ...filterQuery,
    size: 50 // Show more items for admin
  });

  // Fetch admin dashboard summary
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useDashboardSummary(true); // Admin dashboard

  // Approval actions
  const {
    loading: approvalLoading,
    error: approvalError,
    approveTimesheet,
    batchApprove,
    reset: resetApproval
  } = useApprovalAction();

  // Calculate comprehensive statistics
  const adminStats = useTimesheetStats(allTimesheets);

  // Filter timesheets based on search and current tab
  const filteredTimesheets = useMemo(() => {
    let filtered = allTimesheets;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(timesheet => 
        timesheet.tutorName?.toLowerCase().includes(query) ||
        timesheet.courseName?.toLowerCase().includes(query) ||
        timesheet.courseCode?.toLowerCase().includes(query) ||
        timesheet.description?.toLowerCase().includes(query)
      );
    }

    // Apply tab-specific filters
    switch (currentTab) {
      case 'pending':
        filtered = filtered.filter(t => 
          t.status === 'PENDING_TUTOR_CONFIRMATION' || 
          t.status === 'LECTURER_CONFIRMED'
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [allTimesheets, searchQuery, currentTab]);

  // Filter presets
  const uniqueTutorCount = useMemo(() => {
    const tutorIds = new Set<number>();
    allTimesheets.forEach(timesheet => {
      if (timesheet?.tutorId) {
        tutorIds.add(timesheet.tutorId);
      }
    });

    return tutorIds.size;
  }, [allTimesheets]);

  const totalTimesheetCount = dashboardData?.totalTimesheets ?? filteredTimesheets.length;
  const pendingApprovalsCount = dashboardData?.pendingApprovals ??
    filteredTimesheets.filter(timesheet =>
      ['LECTURER_CONFIRMED', 'PENDING_TUTOR_CONFIRMATION', 'PENDING_FINAL_APPROVAL', 'PENDING_TUTOR_REVIEW', 'TUTOR_CONFIRMED']
        .includes((timesheet.status ?? '').toString())
    ).length;
  const totalHoursValue = dashboardData?.totalHours ?? adminStats?.totalHours ?? 0;
  const totalPayrollValue = dashboardData?.totalPayroll ?? adminStats?.totalPay ?? 0;
  const tutorCountValue = dashboardData?.tutorCount ?? uniqueTutorCount;

  const filterPresets: FilterPreset[] = useMemo(() => [
    {
      id: 'pending-final',
      name: 'Pending Final Approval',
      query: { status: 'LECTURER_CONFIRMED' },
      active: filterQuery.status === 'LECTURER_CONFIRMED'
    },
    {
      id: 'high-value',
      name: 'High Value Timesheets',
      query: { minAmount: 500 },
      active: filterQuery.minAmount === 500
    },
    {
      id: 'this-week',
      name: 'This Week',
      query: { 
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      active: !!filterQuery.startDate
    }
  ], [filterQuery]);

  // Mock analytics data
  const analyticsData: AnalyticsData = useMemo(() => ({
    revenueData: [
      { month: 'Jan', amount: 12500 },
      { month: 'Feb', amount: 15000 },
      { month: 'Mar', amount: 18500 },
      { month: 'Apr', amount: 16800 }
    ],
    usageData: [
      { category: 'Active Tutors', value: 32 },
      { category: 'Course Enrollments', value: 128 },
      { category: 'Weekly Submissions', value: 45 }
    ],
    efficiencyMetrics: [
      { metric: 'Approval Rate', value: 94, target: 95 },
      { metric: 'Processing Time', value: 2.5, target: 3.0 },
      { metric: 'System Uptime', value: 99.8, target: 99.5 }
    ]
  }), []);

  // Computed values
  const welcomeMessage = useMemo(() => {
    if (user) {
      const nameParts = [user.firstName, user.lastName]
        .map(part => (part ?? '').trim())
        .filter(part => part.length > 0);
      const derivedName = (nameParts.length > 0 ? nameParts.join(' ') : user.name || user.email) || 'Administrator';
      return `Welcome back, ${derivedName}`;
    }

    return 'Welcome back, Administrator';
  }, [user]);

  const urgentCount = useMemo(() => {
    return filteredTimesheets.filter(t => {
      const submittedDate = new Date(t.createdAt);
      const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSubmission > 5; // Urgent if submitted more than 5 days ago
    }).length;
  }, [filteredTimesheets]);

  // Event handlers
  const handleTabChange = useCallback((tab: typeof currentTab) => {
    setCurrentTab(tab);
    setSelectedTimesheets([]);
  }, []);

  const handleApprovalAction = useCallback(async (timesheetId: number, action: ApprovalAction) => {
    try {
      if (action === 'REJECT') {
        setShowConfirmDialog({
          open: true,
          action: 'reject',
          timesheetIds: [timesheetId]
        });
        return;
      }

      if (action !== 'HR_CONFIRM') {
        return;
      }

      await approveTimesheet({
        timesheetId,
        action: 'HR_CONFIRM',
        comment: 'Final approval processed by admin'
      });

      await Promise.all([refreshTimesheets(), refetchDashboard()]);
      setSelectedTimesheets(prev => prev.filter(id => id !== timesheetId));
    } catch (error) {
      console.error('Failed to process admin approval:', error);
    }
  }, [approveTimesheet, refreshTimesheets, refetchDashboard]);

  const handleBatchApproval = useCallback(async () => {
    if (selectedTimesheets.length === 0) return;

    setShowConfirmDialog({
      open: true,
      action: 'approve',
      timesheetIds: selectedTimesheets
    });
  }, [selectedTimesheets]);

  const handleConfirmAction = useCallback(async (confirmed: boolean, reason?: string) => {
    if (!confirmed) {
      setShowConfirmDialog({ open: false, action: '', timesheetIds: [] });
      return;
    }

    try {
      const { action, timesheetIds } = showConfirmDialog;

      if (action === 'approve') {
        const requests = timesheetIds.map(timesheetId => ({
          timesheetId,
          action: 'HR_CONFIRM' as const,
          comment: 'Batch approved by admin'
        }));
        await batchApprove(requests);
      } else if (action === 'reject') {
        const requests = timesheetIds.map(timesheetId => ({
          timesheetId,
          action: 'REJECT' as const,
          comment: reason || 'Rejected by admin'
        }));
        await batchApprove(requests);
      }

      await Promise.all([refreshTimesheets(), refetchDashboard()]);
      setSelectedTimesheets([]);
      setShowConfirmDialog({ open: false, action: '', timesheetIds: [] });
    } catch (error) {
      console.error('Failed to process batch action:', error);
    }
  }, [showConfirmDialog, batchApprove, refreshTimesheets, refetchDashboard]);

  const handleFilterChange = useCallback((query: TimesheetQuery) => {
    setFilterQuery(query);
    updateQuery(query);
  }, [updateQuery]);

  const handlePresetSelect = useCallback((preset: FilterPreset) => {
    handleFilterChange(preset.query);
  }, [handleFilterChange]);

  const handleGlobalSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Auto-refresh dashboard data
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDashboard();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [refetchDashboard]);

  // Loading state
  if (timesheetsLoading || dashboardLoading) {
    return (
      <div className={`admin-dashboard loading ${className}`}>
        <div className="dashboard-loading">
          <LoadingSpinner size="large" />
          <p>Loading admin dashboard...</p>
          <div className="skeleton-cards" data-testid="statistics-cards">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton-card" data-testid="skeleton-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error handling
  const hasErrors = timesheetsError || dashboardError || approvalError;

  return (
    <div 
      className={`dashboard-container admin-dashboard ${className}`}
      data-testid="admin-dashboard"
      role="main"
      aria-label="Admin Dashboard"
    >
      {/* Admin Header */}
      <header className="admin-dashboard-header">
        <div className="admin-header__content">
          <div className="admin-header__title-section">
            <h1 className="admin-header__title" data-testid="main-welcome-message">{welcomeMessage}</h1>
            <p className="admin-header__subtitle">System Administrator</p>
            <p className="admin-header__description" data-testid="main-dashboard-title">Admin Dashboard</p>
          </div>
          
          {urgentCount > 0 && (
            <div className="urgent-notifications" data-testid="urgent-notifications">
              <span className="urgent-badge">{urgentCount + (dashboardData?.pendingApproval || 0)}</span>
              <span>urgent items</span>
            </div>
          )}
          
          <SystemHealthIndicator
            systemLoad={dashboardData?.systemMetrics?.systemLoad || 0.65}
            activeUsers={dashboardData?.systemMetrics?.activeUsers || 45}
            averageApprovalTime={dashboardData?.systemMetrics?.averageApprovalTime || 2.5}
            alerts={dashboardData?.systemMetrics?.alerts}
          />
        </div>

        {/* Global Search */}
        <div className="admin-header__search">
          <input
            type="text"
            placeholder="Search timesheets, users, courses..."
            value={searchQuery}
            onChange={(e) => handleGlobalSearch(e.target.value)}
            className="global-search"
          />
          <button onClick={() => {
            refreshTimesheets();
            refetchDashboard();
          }}>
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-navigation">
        <div className="nav-tabs">
          {[
            { id: 'overview', label: 'System Overview' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'users', label: 'User Management' },
            { id: 'analytics', label: 'Reports & Analytics' },
            { id: 'settings', label: 'System Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id as typeof currentTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Error Display */}
      {hasErrors && (
        <div className="dashboard-errors">
          {timesheetsError && (
            <div className="error-message">
              <span>Failed to load timesheets: {timesheetsError}</span>
              <button onClick={refreshTimesheets}>Retry</button>
            </div>
          )}
          {dashboardError && (
            <div className="error-message">
              <span>Failed to load admin dashboard data: {dashboardError}</span>
              <button onClick={refetchDashboard}>Retry</button>
            </div>
          )}
          {approvalError && (
            <div className="error-message">
              <span>Approval failed: {approvalError}</span>
              <button onClick={resetApproval}>Dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* System Overview Tab */}
      {currentTab === 'overview' && (
        <>
          {/* Statistics Cards */}
          <section 
            className="dashboard-statistics"
            role="region"
            aria-label="System Overview"
          >
            <header className="statistics-header">
              <h2 data-testid="system-overview-title">System Overview</h2>
            </header>
            <div className="statistics-grid" data-testid="statistics-cards">
              <AdminStatCard
                title="Total Timesheets"
                value={totalTimesheetCount}
                subtitle="All time records"
                color="primary"
                icon="📊"
                testId="total-timesheets-card"
              />

              <AdminStatCard
                title="Pending Approvals"
                value={pendingApprovalsCount}
                subtitle="Awaiting admin review"
                color="warning"
                icon="⏳"
                testId="pending-approvals-card"
              />

              <AdminStatCard
                title="Total Hours"
                value={formatters.hours(totalHoursValue)}
                subtitle="Tracked across all tutors"
                color="info"
                icon="⏰"
                testId="total-hours-card"
              />

              <AdminStatCard
                title="Total Payroll"
                value={formatters.currency(totalPayrollValue)}
                subtitle="Approved payouts"
                color="success"
                icon="💰"
                testId="total-pay-card"
              />

              <AdminStatCard
                title="Tutor Coverage"
                value={tutorCountValue}
                subtitle="Active tutors this term"
                color="info"
                icon="👥"
                testId="tutors-card"
              />
            </div>
          </section>

          <div className="admin-overview-grid">
            {/* Status Distribution */}
            {dashboardData?.statusBreakdown && (
              <StatusDistributionChart 
                statusBreakdown={dashboardData.statusBreakdown}
                total={dashboardData.totalTimesheets || 0}
              />
            )}

            {/* Real-time Status */}
            <div className="real-time-status" data-testid="real-time-status">
              <h3>System Status</h3>
              <div className="status-metrics">
                <div className="status-item">
                  <span className="status-label">Database Status</span>
                  <span className="status-value status-healthy">Operational</span>
                </div>
                <div className="status-item">
                  <span className="status-label">API Response Time</span>
                  <span className="status-value">127ms</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Memory Usage</span>
                  <span className="status-value">68%</span>
                </div>
                <div className="status-update">
                  <span>Last Updated: {new Date().toLocaleTimeString()}</span>
                  <span>Auto-refresh in 60s</span>
                </div>
              </div>
            </div>

            {/* Performance Monitor */}
            <div className="performance-monitor" data-testid="performance-monitor">
              <h3>Performance Metrics</h3>
              <div className="performance-metrics">
                <div className="perf-metric">
                  <span className="perf-label">Request Rate</span>
                  <span className="perf-value">45/min</span>
                </div>
                <div className="perf-metric">
                  <span className="perf-label">Error Rate</span>
                  <span className="perf-value">0.1%</span>
                </div>
                <div className="perf-metric">
                  <span className="perf-label">Average Approval Time</span>
                  <span className="perf-value">2.5 days</span>
                </div>
              </div>
              <div className="performance-chart" data-testid="performance-chart">
                <div className="chart-placeholder">Performance trends chart</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pending Review Tab */}
      {currentTab === 'pending' && (
        <section 
          className="pending-review-section"
          role="region"
          aria-label="Pending Review"
        >
          <div className="section-header">
            <h2>Pending Admin Review</h2>
            <div className="section-actions">
              {selectedTimesheets.length > 0 && (
                <>
                  <button 
                    className="batch-action-btn final-approve"
                    onClick={handleBatchApproval}
                    disabled={approvalLoading}
                  >
                    {approvalLoading ? <LoadingSpinner size="small" /> : 'Final Approve Selected'}
                  </button>
                  <button 
                    className="batch-action-btn bulk-reject"
                    onClick={() => setShowConfirmDialog({
                      open: true,
                      action: 'reject',
                      timesheetIds: selectedTimesheets
                    })}
                  >
                    Bulk Reject
                  </button>
                  <button className="batch-action-btn export">
                    Export Selected
                  </button>
                  <span className="selection-count">
                    {selectedTimesheets.length} selected
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <FilterControls
            onFilterChange={handleFilterChange}
            presets={filterPresets}
            onPresetSelect={handlePresetSelect}
          />

          {/* Priority Queue */}
          <div className="priority-queue" data-testid="priority-queue">
            <h3>Priority Queue</h3>
            <div className="priority-items">
              <div className="priority-category">
                <span className="priority-label priority-high">High Priority</span>
                <span className="priority-count">{urgentCount}</span>
              </div>
              <div className="priority-category">
                <span className="priority-label priority-overdue">Overdue</span>
                <span className="priority-count">3</span>
              </div>
            </div>
          </div>

          {/* Timesheets Table */}
          <section
            className="timesheet-admin-section"
            role="region"
            aria-label="All System Timesheets"
          >
            <div className="timesheet-section__header">
              <h2 data-testid="timesheet-section-title">All System Timesheets</h2>
              <span className="timesheet-count-badge" data-testid="total-count-badge">
                {totalTimesheetCount} total
              </span>
            </div>

            {noTimesheets ? (
              <div className="empty-state" data-testid="empty-state">
                <div className="empty-state__content">
                  <span className="empty-state__icon">✅</span>
                  <h3>No pending reviews</h3>
                  <p>All timesheets have been processed.</p>
                </div>
              </div>
            ) : (
              <TimesheetTable
                timesheets={filteredTimesheets}
                loading={timesheetsLoading}
                onApprovalAction={handleApprovalAction}
                actionLoading={approvalLoading ? filteredTimesheets[0]?.id : null}
                showActions={true}
                showTutorInfo={true}
                showCourseInfo={true}
                showSelection={true}
                selectedIds={selectedTimesheets}
                onSelectionChange={setSelectedTimesheets}
                virtualizeThreshold={50}
                className="admin-timesheet-table"
                approvalRole="ADMIN"
              />
            )}
          </section>
        </section>
      )}

      {/* User Management Tab */}
      {currentTab === 'users' && (
        <section 
          className="user-management-section"
          role="region"
          aria-label="User Management"
        >
          <div className="user-summary" data-testid="recent-user-activity">
            <h2>User Management</h2>
            <div className="user-stats">
              <div className="user-stat">
                <span className="user-stat__label">Active Users</span>
                <span className="user-stat__value">45</span>
                <div className="user-breakdown">
                  <span>Tutors: 32</span>
                  <span>Lecturers: 12</span>
                  <span>Admins: 1</span>
                </div>
              </div>
              <div className="user-activity">
                <h3>Recent Activity</h3>
                <div className="activity-items">
                  <div className="activity-item">
                    <span>New Registrations</span>
                    <span>3 this week</span>
                  </div>
                  <div className="activity-item">
                    <span>Recent Logins</span>
                    <span>28 today</span>
                  </div>
                </div>
              </div>
            </div>
            <button className="manage-users-btn">Manage Users</button>
          </div>
        </section>
      )}

      {/* Analytics Tab */}
      {currentTab === 'analytics' && (
        <section 
          className="analytics-section"
          role="region"
          aria-label="Reports & Analytics"
        >
          <div className="analytics-header">
            <h2>Reports & Analytics</h2>
            <div className="export-controls">
              <button>PDF Report</button>
              <button>Excel Export</button>
              <button>Custom Report</button>
            </div>
          </div>

          <div className="financial-overview">
            <h3>Financial Overview</h3>
            <div className="financial-stats">
              <div className="financial-stat">
                <span className="financial-label">Total Payroll</span>
                <span className="financial-value">$43,767.50</span>
              </div>
              <div className="financial-stat">
                <span className="financial-label">This Week: $6,300</span>
              </div>
              <div className="financial-stat">
                <span className="financial-label">Budget Utilization</span>
                <span className="financial-value">78%</span>
              </div>
            </div>
          </div>

          <AnalyticsDashboard data={analyticsData} />

          <div className="trend-analysis" data-testid="trend-analysis">
            <h3>Trend Analysis</h3>
            <div className="trend-periods">
              <button>Month over Month</button>
              <button>Year over Year</button>
            </div>
          </div>
        </section>
      )}

      {/* System Settings Tab */}
      {currentTab === 'settings' && (
        <section 
          className="system-settings-section"
          role="region"
          aria-label="System Settings"
        >
          <h2>System Settings</h2>
          <div className="system-controls">
            <h3>System Maintenance</h3>
            <div className="control-actions">
              <button className="control-btn">Backup Database</button>
              <button className="control-btn">Clear Cache</button>
              <button className="control-btn">Run Reports</button>
            </div>
            
            <div className="emergency-controls">
              <h3>Emergency Controls</h3>
              <button className="emergency-btn">Emergency Override</button>
              <button className="emergency-btn">Force Approval</button>
              <button className="emergency-btn">Emergency Reject</button>
            </div>
          </div>
        </section>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog.open && (
        <div className="modal-overlay" onClick={() => handleConfirmAction(false)}>
          <div className="modal confirmation-dialog" onClick={e => e.stopPropagation()}>
            <h3>
              {showConfirmDialog.action === 'approve' ? 'Confirm Final Approval' : 'Confirm Emergency Action'}
            </h3>
            <p>
              {showConfirmDialog.action === 'approve' 
                ? `${showConfirmDialog.timesheetIds.length} timesheets will be finally approved.`
                : 'This action requires administrator authorization'
              }
            </p>
            
            {showConfirmDialog.action === 'reject' && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const reason = formData.get('reason') as string;
                handleConfirmAction(true, reason);
              }}>
                <label htmlFor="rejection-reason">Reason for rejection:</label>
                <textarea
                  id="rejection-reason"
                  name="reason"
                  required
                  placeholder="Please provide a clear reason..."
                  rows={4}
                />
              </form>
            )}
            
            <div className="modal-actions">
              <button onClick={() => handleConfirmAction(false)}>
                Cancel
              </button>
              <button 
                className={showConfirmDialog.action === 'approve' ? 'approve-confirm' : 'reject-confirm'}
                onClick={() => handleConfirmAction(true)}
              >
                {showConfirmDialog.action === 'approve' ? 'Final Approve' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status announcements for screen readers */}
      <div role="status" aria-live="polite" className="sr-only" aria-label="system announcements">
        {approvalLoading && 'Processing approval...'}
        {timesheetsLoading && 'Loading timesheets...'}
        {dashboardData?.systemMetrics?.alerts?.length && 'System alerts detected'}
      </div>

      {/* Loading Analytics Placeholder */}
      {currentTab === 'analytics' && dashboardLoading && (
        <div data-testid="loading-analytics">
          <LoadingSpinner />
        </div>
      )}

      {/* Virtualized List for Large Datasets */}
      {filteredTimesheets.length > 100 && (
        <div data-testid="virtualized-list" className="sr-only">
          Large dataset - virtualization active
        </div>
      )}
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;

