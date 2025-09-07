/**
 * TutorDashboard Component
 * 
 * Optimized tutor dashboard with timesheet management, self-service features,
 * pay tracking, and course integration for student tutors.
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { 
  useTimesheets,
  useDashboardSummary, 
  useCreateTimesheet,
  useUpdateTimesheet,
  useTimesheetStats 
} from '../../../hooks/useTimesheets';
import { useAuth } from '../../../contexts/AuthContext';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';
import StatusBadge from '../../shared/StatusBadge/StatusBadge';
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { formatters } from '../../../utils/formatting';
import type { 
  Timesheet, 
  TimesheetQuery,
  CreateTimesheetRequest 
} from '../../../types/api';
import './TutorDashboard.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export interface TutorDashboardProps {
  className?: string;
}

interface TutorStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: string;
  onClick?: () => void;
}

interface QuickActionProps {
  label: string;
  description: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
}

interface TimesheetFormData {
  courseId: number;
  weekStartDate: string;
  hours: number;
  description: string;
}

interface TabConfig {
  id: 'all' | 'drafts' | 'submitted' | 'needAction';
  label: string;
  filter: (timesheet: Timesheet) => boolean;
  count: number;
}

// =============================================================================
// Tutor Statistics Card Component
// =============================================================================

const TutorStatCard = memo<TutorStatCardProps>(({
  title,
  value,
  subtitle,
  trend = 'stable',
  color = 'primary',
  icon,
  onClick
}) => (
  <div 
    className={`tutor-stat-card tutor-stat-card--${color} ${onClick ? 'clickable' : ''}`}
    data-testid="stat-card"
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
    <div className="tutor-stat-card__header">
      {icon && <span className="tutor-stat-card__icon">{icon}</span>}
      <h3 className="tutor-stat-card__title">{title}</h3>
    </div>
    <div className="tutor-stat-card__content">
      <div className="tutor-stat-card__value">{value}</div>
      {subtitle && (
        <div className={`tutor-stat-card__subtitle tutor-stat-card__subtitle--${trend}`}>
          {trend === 'up' && '↗ '}
          {trend === 'down' && '↘ '}
          {subtitle}
        </div>
      )}
    </div>
  </div>
));

TutorStatCard.displayName = 'TutorStatCard';

// =============================================================================
// Quick Action Component
// =============================================================================

const QuickAction = memo<QuickActionProps>(({
  label,
  description,
  icon,
  onClick,
  disabled = false,
  shortcut
}) => (
  <button
    className={`quick-action ${disabled ? 'quick-action--disabled' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={`${description}${shortcut ? ` (${shortcut})` : ''}`}
  >
    <span className="quick-action__icon">{icon}</span>
    <div className="quick-action__content">
      <span className="quick-action__label">{label}</span>
      <span className="quick-action__description">{description}</span>
    </div>
    {shortcut && <span className="quick-action__shortcut">{shortcut}</span>}
  </button>
));

QuickAction.displayName = 'QuickAction';

// =============================================================================
// Completion Progress Component
// =============================================================================

const CompletionProgress = memo<{ completionRate: number }>(({ completionRate }) => (
  <div className="completion-progress" data-testid="completion-progress">
    <h3>Semester Progress</h3>
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${completionRate * 100}%` }}
        />
      </div>
      <span className="progress-text">
        {Math.round(completionRate * 100)}% Complete
      </span>
    </div>
    <p className="progress-description">
      Keep up the great work! You're on track for this semester.
    </p>
  </div>
));

CompletionProgress.displayName = 'CompletionProgress';

// =============================================================================
// Upcoming Deadlines Component
// =============================================================================

const UpcomingDeadlines = memo<{ deadlines: any[] }>(({ deadlines }) => (
  <div className="upcoming-deadlines">
    <h3>Upcoming Deadlines</h3>
    {deadlines.length === 0 ? (
      <p className="no-deadlines">No upcoming deadlines</p>
    ) : (
      <ul className="deadline-list">
        {deadlines.map((deadline, index) => (
          <li key={deadline.courseId || index} className="deadline-item">
            <span className="deadline-course">{deadline.courseName}</span>
            <span className="deadline-date">
              Due {formatters.dateShort(deadline.deadline)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
));

UpcomingDeadlines.displayName = 'UpcomingDeadlines';

// =============================================================================
// Pay Summary Component
// =============================================================================

const PaySummary = memo<{ 
  totalEarned: number;
  thisWeekPay: number;
  averagePerTimesheet: number;
  paymentStatus: Record<string, number>;
}>(({ totalEarned, thisWeekPay, averagePerTimesheet, paymentStatus }) => (
  <div className="pay-summary">
    <h3>Pay Summary</h3>
    <div className="pay-stats">
      <div className="pay-stat">
        <span className="pay-label">Total Earned</span>
        <span className="pay-value">${formatters.currencyValue(totalEarned)}</span>
      </div>
      <div className="pay-stat">
        <span className="pay-label">This Week</span>
        <span className="pay-value">${formatters.currencyValue(thisWeekPay)}</span>
      </div>
      <div className="pay-stat">
        <span className="pay-label">Average per Timesheet</span>
        <span className="pay-value">${formatters.currencyValue(averagePerTimesheet)}</span>
      </div>
    </div>
    
    <div className="payment-status">
      <h4>Payment Status</h4>
      <div className="payment-breakdown">
        <div className="payment-item">
          <span>{paymentStatus.PAID || 0} Paid</span>
        </div>
        <div className="payment-item">
          <span>{paymentStatus.FINAL_APPROVED || 0} Approved for Payment</span>
        </div>
        <div className="payment-item">
          <span className="next-payment">Next Payment Date: Jan 31, 2024</span>
        </div>
      </div>
    </div>

    <div className="tax-information">
      <h4>Tax Information</h4>
      <div className="tax-stats">
        <span>Year-to-Date Earnings: ${formatters.currencyValue(totalEarned)}</span>
        <button className="download-tax-summary">Download Tax Summary</button>
      </div>
    </div>
  </div>
));

PaySummary.displayName = 'PaySummary';

// =============================================================================
// Earnings Breakdown Component
// =============================================================================

const EarningsBreakdown = memo<{ timesheets: Timesheet[] }>(({ timesheets }) => {
  const courseEarnings = useMemo(() => {
    const earnings: Record<string, { hours: number; pay: number }> = {};
    
    timesheets.forEach(timesheet => {
      const courseName = timesheet.courseName || 'Unknown Course';
      if (!earnings[courseName]) {
        earnings[courseName] = { hours: 0, pay: 0 };
      }
      earnings[courseName].hours += timesheet.hours;
      earnings[courseName].pay += timesheet.hours * timesheet.hourlyRate;
    });
    
    return Object.entries(earnings).map(([course, data]) => ({
      course,
      ...data
    }));
  }, [timesheets]);

  return (
    <div className="earnings-breakdown" data-testid="earnings-breakdown">
      <h3>Earnings by Course</h3>
      <div className="course-earnings">
        {courseEarnings.map(({ course, hours, pay }) => (
          <div key={course} className="course-earning">
            <span className="course-name">{course}</span>
            <div className="course-stats">
              <span className="course-hours">{hours}h</span>
              <span className="course-pay">${formatters.currencyValue(pay)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

EarningsBreakdown.displayName = 'EarningsBreakdown';

// =============================================================================
// Timesheet Form Component
// =============================================================================

const TimesheetForm = memo<{
  isEdit?: boolean;
  initialData?: Partial<Timesheet>;
  onSubmit: (data: TimesheetFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}>(({ isEdit = false, initialData, onSubmit, onCancel, loading = false, error }) => {
  const [formData, setFormData] = useState<TimesheetFormData>({
    courseId: initialData?.courseId || 0,
    weekStartDate: initialData?.weekStartDate || '',
    hours: initialData?.hours || 0,
    description: initialData?.description || ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-save for drafts
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      if (formData.description.trim() && !isEdit) {
        // Auto-save draft logic would go here
        console.log('Auto-saving draft...');
      }
    }, 30000); // Auto-save after 30 seconds of inactivity

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData, isEdit]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.courseId) {
      errors.courseId = 'Course is required';
    }

    if (!formData.hours || formData.hours <= 0) {
      errors.hours = 'Hours must be greater than 0';
    } else if (formData.hours > 60) {
      errors.hours = 'Hours must be between 0.1 and 60';
    }

    if (!formData.weekStartDate) {
      errors.weekStartDate = 'Week start date is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  const handleFieldChange = useCallback((field: keyof TimesheetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [validationErrors]);

  return (
    <div className="timesheet-form-modal">
      <h3>{isEdit ? 'Edit Timesheet' : 'New Timesheet Form'}</h3>
      
      {error && (
        <div className="form-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="timesheet-form">
        <div className="form-field">
          <label htmlFor="course">Course</label>
          <select
            id="course"
            value={formData.courseId}
            onChange={(e) => handleFieldChange('courseId', parseInt(e.target.value))}
            className={validationErrors.courseId ? 'error' : ''}
            aria-describedby="course-error"
          >
            <option value={0}>Select a course</option>
            <option value={1}>CS101 - Computer Science 101</option>
            <option value={2}>CS102 - Data Structures</option>
          </select>
          {validationErrors.courseId && (
            <span id="course-error" className="error-text">{validationErrors.courseId}</span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="week-start">Week Starting</label>
          <input
            id="week-start"
            type="date"
            value={formData.weekStartDate}
            onChange={(e) => handleFieldChange('weekStartDate', e.target.value)}
            className={validationErrors.weekStartDate ? 'error' : ''}
            aria-describedby="week-start-error"
          />
          {validationErrors.weekStartDate && (
            <span id="week-start-error" className="error-text">{validationErrors.weekStartDate}</span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="hours">Hours Worked</label>
          <input
            id="hours"
            type="number"
            step="0.5"
            min="0.1"
            max="60"
            value={formData.hours || ''}
            onChange={(e) => handleFieldChange('hours', parseFloat(e.target.value) || 0)}
            onBlur={() => validateForm()}
            className={validationErrors.hours ? 'error' : ''}
            aria-describedby="hours-error hours-help"
          />
          <span id="hours-help" className="field-help">Enter hours worked (0.1 - 60)</span>
          {validationErrors.hours && (
            <span id="hours-error" className="error-text">{validationErrors.hours}</span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe the work performed..."
            rows={4}
            aria-describedby="description-help"
          />
          <span id="description-help" className="field-help">Provide details about your tutoring activities</span>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="primary">
            {loading ? <LoadingSpinner size="small" /> : (isEdit ? 'Update Timesheet' : 'Create Timesheet')}
          </button>
        </div>
      </form>
    </div>
  );
});

TimesheetForm.displayName = 'TimesheetForm';

// =============================================================================
// Notifications Panel Component
// =============================================================================

const NotificationsPanel = memo<{
  rejectedCount: number;
  draftCount: number;
  deadlines: any[];
  onDismiss: (notificationId: string) => void;
}>(({ rejectedCount, draftCount, deadlines, onDismiss }) => (
  <div className="notifications-panel" data-testid="notifications-panel">
    <h3>Notifications</h3>
    
    {rejectedCount > 0 && (
      <div className="notification action-required" data-testid="action-required">
        <div className="notification-content">
          <span className="notification-icon">⚠️</span>
          <div className="notification-text">
            <strong>Action Required</strong>
            <p>{rejectedCount} rejected timesheets need your attention</p>
          </div>
        </div>
        <button 
          className="notification-dismiss"
          onClick={() => onDismiss('rejected-reminder')}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    )}

    {draftCount > 0 && (
      <div className="notification reminder">
        <div className="notification-content">
          <span className="notification-icon">📝</span>
          <div className="notification-text">
            <strong>Don't forget to submit</strong>
            <p>{draftCount} draft timesheets are waiting</p>
          </div>
        </div>
        <button 
          className="notification-dismiss"
          onClick={() => onDismiss('draft-reminder')}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    )}

    {deadlines.map((deadline, index) => (
      <div key={deadline.courseId || index} className="notification deadline">
        <div className="notification-content">
          <span className="notification-icon">📅</span>
          <div className="notification-text">
            <strong>Deadline approaching for {deadline.courseName}</strong>
            <p>Due {formatters.dateShort(deadline.deadline)}</p>
          </div>
        </div>
        <button 
          className="notification-dismiss"
          onClick={() => onDismiss(`deadline-${deadline.courseId}`)}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    ))}
  </div>
));

NotificationsPanel.displayName = 'NotificationsPanel';

// =============================================================================
// Main TutorDashboard Component
// =============================================================================

const TutorDashboard = memo<TutorDashboardProps>(({ className = '' }) => {
  const { user } = useAuth();
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [currentTab, setCurrentTab] = useState<'all' | 'drafts' | 'submitted' | 'needAction'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Fetch tutor's timesheets
  const {
    data: timesheetsData,
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    isEmpty: noTimesheets,
    refresh: refreshTimesheets
  } = useTimesheets({ 
    tutorId: user?.id,
    size: 50
  });

  // Fetch tutor dashboard summary
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useDashboardSummary(false); // Tutor dashboard

  // Timesheet creation and updates
  const {
    loading: createLoading,
    error: createError,
    createTimesheet,
    reset: resetCreate
  } = useCreateTimesheet();

  const {
    loading: updateLoading,
    error: updateError,
    updateTimesheet,
    reset: resetUpdate
  } = useUpdateTimesheet();

  // Calculate tutor statistics
  const tutorStats = useTimesheetStats(allTimesheets);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tab configuration with filters and counts
  const tabs: TabConfig[] = useMemo(() => {
    const drafts = allTimesheets.filter(t => t.status === 'DRAFT');
    const submitted = allTimesheets.filter(t => t.status === 'SUBMITTED');
    const needAction = allTimesheets.filter(t => 
      t.status === 'REJECTED_BY_LECTURER' || t.status === 'REJECTED_BY_ADMIN'
    );

    return [
      {
        id: 'all',
        label: 'All Timesheets',
        filter: () => true,
        count: allTimesheets.length
      },
      {
        id: 'drafts',
        label: `Drafts (${drafts.length})`,
        filter: (t) => t.status === 'DRAFT',
        count: drafts.length
      },
      {
        id: 'submitted',
        label: `Submitted (${submitted.length})`,
        filter: (t) => t.status === 'SUBMITTED',
        count: submitted.length
      },
      {
        id: 'needAction',
        label: `Need Action (${needAction.length})`,
        filter: (t) => t.status === 'REJECTED_BY_LECTURER' || t.status === 'REJECTED_BY_ADMIN',
        count: needAction.length
      }
    ];
  }, [allTimesheets]);

  // Filter timesheets based on current tab
  const filteredTimesheets = useMemo(() => {
    const currentTabConfig = tabs.find(tab => tab.id === currentTab);
    return currentTabConfig ? allTimesheets.filter(currentTabConfig.filter) : allTimesheets;
  }, [allTimesheets, currentTab, tabs]);

  // Computed values
  const welcomeMessage = useMemo(() => {
    const firstName = user?.name?.split(' ')[0] || 'Tutor';
    return `Welcome back, ${firstName}!`;
  }, [user?.name]);

  const thisWeekSummary = useMemo(() => ({
    hours: dashboardData?.thisWeekHours || 0,
    pay: dashboardData?.thisWeekPay || 0
  }), [dashboardData]);

  // Event handlers
  const handleCreateTimesheet = useCallback(() => {
    setEditingTimesheet(null);
    setShowForm(true);
  }, []);

  const handleEditTimesheet = useCallback((timesheet: Timesheet) => {
    setEditingTimesheet(timesheet);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(async (data: TimesheetFormData) => {
    try {
      if (editingTimesheet) {
        await updateTimesheet({
          ...data,
          id: editingTimesheet.id,
          tutorId: user?.id || 0,
          hourlyRate: editingTimesheet.hourlyRate
        });
      } else {
        await createTimesheet({
          ...data,
          tutorId: user?.id || 0,
          hourlyRate: 35.50 // Default rate - would come from course data
        });
      }

      setShowForm(false);
      setEditingTimesheet(null);
      await Promise.all([refreshTimesheets(), refetchDashboard()]);
    } catch (error) {
      console.error('Failed to save timesheet:', error);
    }
  }, [editingTimesheet, user?.id, updateTimesheet, createTimesheet, refreshTimesheets, refetchDashboard]);

  const handleSubmitAllDrafts = useCallback(async () => {
    const draftIds = allTimesheets
      .filter(t => t.status === 'DRAFT')
      .map(t => t.id);

    if (draftIds.length === 0) return;

    // This would batch submit all drafts
    console.log('Submitting all drafts:', draftIds);
  }, [allTimesheets]);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'create':
        handleCreateTimesheet();
        break;
      case 'submitDrafts':
        handleSubmitAllDrafts();
        break;
      case 'viewPay':
        setExpandedSections(prev => ({ ...prev, paySummary: !prev.paySummary }));
        break;
      case 'export':
        // Export functionality
        break;
    }
  }, [handleCreateTimesheet, handleSubmitAllDrafts]);

  const handleNotificationDismiss = useCallback((notificationId: string) => {
    console.log('Dismissing notification:', notificationId);
  }, []);

  const handleTabChange = useCallback((tab: typeof currentTab) => {
    setCurrentTab(tab);
    setSelectedTimesheets([]);
  }, []);

  const handleSectionToggle = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Loading state
  if (timesheetsLoading || dashboardLoading) {
    return (
      <div className={`tutor-dashboard loading ${className}`}>
        <div className="dashboard-loading">
          <LoadingSpinner size="large" data-testid="loading-spinner" />
          <p>Loading your timesheets...</p>
        </div>
      </div>
    );
  }

  // Error handling
  const hasErrors = timesheetsError || dashboardError || createError || updateError;

  return (
    <div 
      className={`dashboard-container tutor-dashboard ${className} ${isMobile ? 'mobile-layout' : ''}`}
      data-testid="tutor-dashboard"
      role="main"
      aria-label="Tutor Dashboard"
    >
      {/* Header Section */}
      <header className="tutor-dashboard-header">
        <div className="tutor-header__content">
          <h1 className="tutor-header__title">{welcomeMessage}</h1>
          <p className="tutor-header__subtitle">Tutor Dashboard</p>
          <p className="tutor-header__description">Let's manage your timesheets</p>
          
          {/* This Week Summary */}
          <div className="week-summary">
            <h2>This Week</h2>
            <div className="week-stats">
              <span className="week-hours">{thisWeekSummary.hours}h</span>
              <span className="week-pay">${formatters.currencyValue(thisWeekSummary.pay)}</span>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <UpcomingDeadlines deadlines={dashboardData?.upcomingDeadlines || []} />
        
        {/* Completion Progress */}
        <CompletionProgress completionRate={tutorStats.completionRate || 0.89} />
      </header>

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
              <span>Failed to load dashboard: {dashboardError}</span>
              <button onClick={refetchDashboard}>Retry</button>
            </div>
          )}
          {(createError || updateError) && (
            <div className="error-message">
              <span>{createError || updateError}</span>
              <button onClick={() => {
                resetCreate();
                resetUpdate();
              }}>Dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions Section */}
      <section className="quick-actions-section" role="region" aria-label="Quick Actions">
        <h2>Quick Actions</h2>
        <div className={`quick-actions-grid ${isMobile ? 'mobile-quick-actions' : ''}`} data-testid={isMobile ? 'mobile-quick-actions' : 'quick-actions'}>
          <QuickAction
            label="Create New Timesheet"
            description="Start a new timesheet entry"
            icon="+"
            onClick={() => handleQuickAction('create')}
            shortcut="Ctrl+N"
          />
          
          <QuickAction
            label="Submit All Drafts"
            description="Submit all draft timesheets"
            icon="📤"
            onClick={() => handleQuickAction('submitDrafts')}
            disabled={!allTimesheets.some(t => t.status === 'DRAFT')}
          />
          
          <QuickAction
            label="View Pay Summary"
            description="Check earnings and payments"
            icon="💰"
            onClick={() => handleQuickAction('viewPay')}
          />
          
          <QuickAction
            label="Export My Data"
            description="Download timesheet records"
            icon="📊"
            onClick={() => handleQuickAction('export')}
          />
        </div>

        {/* Mobile Floating Action Button */}
        {isMobile && (
          <button className="floating-action-btn" onClick={handleCreateTimesheet}>
            +
          </button>
        )}
      </section>

      {/* Statistics Cards */}
      <section className="tutor-statistics" role="region" aria-label="Your Statistics">
        <div className="tutor-stats-grid">
          <TutorStatCard
            title="Total Earned"
            value={`$${formatters.currencyValue(tutorStats.totalPay)}`}
            subtitle="All time"
            color="success"
            icon="💰"
          />
          
          <TutorStatCard
            title="Total Hours"
            value={`${tutorStats.totalHours}h`}
            subtitle="Logged this semester"
            color="primary"
            icon="⏰"
          />
          
          <TutorStatCard
            title="Average per Week"
            value={`${(tutorStats.totalHours / 16).toFixed(1)}h`}
            subtitle="Based on 16 weeks"
            color="info"
            icon="📈"
          />
          
          <TutorStatCard
            title="Status at a Glance"
            value=""
            subtitle={`${tutorStats.statusCounts?.DRAFT || 0} Drafts, ${tutorStats.statusCounts?.SUBMITTED || 0} Submitted, ${(tutorStats.statusCounts?.REJECTED_BY_LECTURER || 0) + (tutorStats.statusCounts?.REJECTED_BY_ADMIN || 0)} Need Attention`}
            color="warning"
            icon="📋"
          />
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="tutor-content-grid">
        {/* My Timesheets Section */}
        <section className="my-timesheets-section" role="region" aria-label="My Timesheets">
          <div className="section-header">
            <h2>My Timesheets</h2>
          </div>

          {/* Tab Navigation */}
          <div className="timesheet-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Actions for Drafts */}
          {currentTab === 'drafts' && selectedTimesheets.length > 0 && (
            <div className="bulk-actions">
              <label>
                <input
                  type="checkbox"
                  checked={selectedTimesheets.length === filteredTimesheets.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTimesheets(filteredTimesheets.map(t => t.id));
                    } else {
                      setSelectedTimesheets([]);
                    }
                  }}
                  aria-label="Select all drafts"
                />
                Select All Drafts
              </label>
              <button className="submit-selected-btn">
                Submit Selected ({selectedTimesheets.length})
              </button>
            </div>
          )}

          {/* Timesheets Table */}
          {noTimesheets ? (
            <div className="empty-state">
              <div className="empty-state__content">
                <span className="empty-state__icon">📝</span>
                <h3>No timesheets yet</h3>
                <p>Create your first timesheet to get started.</p>
                <button className="create-first-btn" onClick={handleCreateTimesheet}>
                  Create First Timesheet
                </button>
              </div>
            </div>
          ) : (
            <TimesheetTable
              timesheets={filteredTimesheets}
              loading={timesheetsLoading}
              onApprovalAction={(id, action) => {
                // Handle timesheet actions for tutor (edit, submit, etc.)
                const timesheet = filteredTimesheets.find(t => t.id === id);
                if (timesheet && action === 'EDIT') {
                  handleEditTimesheet(timesheet);
                }
              }}
              showActions={true}
              showTutorInfo={false} // Don't show tutor info on tutor dashboard
              showCourseInfo={true}
              showSelection={currentTab === 'drafts'}
              selectedIds={selectedTimesheets}
              onSelectionChange={setSelectedTimesheets}
              className="tutor-timesheet-table"
              data-testid="timesheet-table"
            />
          )}
        </section>

        {/* Sidebar Content */}
        <aside className="tutor-sidebar">
          {/* Pay Summary */}
          <div className={`pay-summary-section ${isMobile && !expandedSections.paySummary ? 'collapsed' : ''}`}>
            {isMobile && (
              <button 
                className="section-toggle"
                onClick={() => handleSectionToggle('paySummary')}
              >
                {expandedSections.paySummary ? 'Collapse' : 'Expand'} Pay Summary
              </button>
            )}
            
            {(!isMobile || expandedSections.paySummary) && (
              <div data-testid="expanded-pay-summary">
                <PaySummary
                  totalEarned={tutorStats.totalPay}
                  thisWeekPay={thisWeekSummary.pay}
                  averagePerTimesheet={tutorStats.averagePayPerTimesheet}
                  paymentStatus={tutorStats.statusCounts || {}}
                />
              </div>
            )}
          </div>

          {/* Earnings Breakdown */}
          <EarningsBreakdown timesheets={allTimesheets} />

          {/* My Courses */}
          <div className="my-courses">
            <h3>My Courses</h3>
            <div className="course-list">
              <div className="course-item">
                <span className="course-name">CS101 - Computer Science 101</span>
                <span className="course-rate">$35.50/hr</span>
              </div>
              <div className="course-item">
                <span className="course-name">CS102 - Data Structures</span>
                <span className="course-rate">$37.00/hr</span>
              </div>
            </div>
            
            <div className="course-stats" data-testid="course-stats">
              <h4>Hours per Course</h4>
              <div className="course-hours">
                <div className="course-hour-item">
                  <span>CS101: 85h</span>
                </div>
                <div className="course-hour-item">
                  <span>CS102: 62h</span>
                </div>
              </div>
            </div>

            <div className="hourly-rates">
              <h4>Hourly Rates</h4>
              <div className="rate-list">
                <span>CS101: $35.50/hr</span>
                <span>CS102: $37.00/hr</span>
              </div>
            </div>
          </div>

          {/* Course Calendar */}
          <div className="course-calendar" data-testid="course-calendar">
            <h3>This Week's Schedule</h3>
            <div className="calendar-content">
              <p>Schedule integration would go here</p>
            </div>
          </div>

          {/* Notifications */}
          <NotificationsPanel
            rejectedCount={(tutorStats.statusCounts?.REJECTED_BY_LECTURER || 0) + (tutorStats.statusCounts?.REJECTED_BY_ADMIN || 0)}
            draftCount={tutorStats.statusCounts?.DRAFT || 0}
            deadlines={dashboardData?.upcomingDeadlines || []}
            onDismiss={handleNotificationDismiss}
          />
        </aside>
      </div>

      {/* Timesheet Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <TimesheetForm
              isEdit={!!editingTimesheet}
              initialData={editingTimesheet || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingTimesheet(null);
              }}
              loading={createLoading || updateLoading}
              error={createError || updateError}
            />
          </div>
        </div>
      )}

      {/* Status announcement for screen readers */}
      <div role="status" aria-live="polite" className="sr-only" aria-label="dashboard status">
        {createLoading && 'Creating timesheet...'}
        {updateLoading && 'Updating timesheet...'}
        {timesheetsLoading && 'Loading timesheets...'}
      </div>
    </div>
  );
});

TutorDashboard.displayName = 'TutorDashboard';

export default TutorDashboard;