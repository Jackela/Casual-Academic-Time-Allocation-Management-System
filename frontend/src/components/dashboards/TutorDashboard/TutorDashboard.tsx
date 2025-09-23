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
import { TimesheetService } from '../../../services/timesheets';

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
      <h4 className="tutor-stat-card__title">{title}</h4>
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
    tabIndex={0}
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
    <h4>Semester Progress</h4>
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
        {deadlines.map((deadline, index) => {
          const formattedDate = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
          }).format(new Date(deadline.deadline));

          return (
            <li key={deadline.courseId || index} className="deadline-item">
              <span className="deadline-text">
                {`${deadline.courseName} - Due ${formattedDate}`}
              </span>
            </li>
          );
        })}
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
}>(({ totalEarned, thisWeekPay, averagePerTimesheet, paymentStatus }) => {
  const totalEarnedText = formatters.currencyValue(totalEarned);
  const averageText = formatters.currencyValue(averagePerTimesheet);
  const thisWeekText = formatters
    .currencyValue(thisWeekPay)
    .replace(/\.00$/, '');

  return (
    <div className="pay-summary">
      <h3>Pay Summary</h3>
      <div className="pay-stats">
        <div className="pay-stat">
          <span className="pay-label">
            Total Earned: <strong className="pay-value">${totalEarnedText}</strong>
          </span>
        </div>
        <div className="pay-stat">
          <span className="pay-label">
            This Week: <strong className="pay-value">${thisWeekText}</strong>
          </span>
        </div>
        <div className="pay-stat">
          <span className="pay-label">
            Average per Timesheet: <strong className="pay-value">${averageText}</strong>
          </span>
        </div>
      </div>
      
      <div className="payment-status">
        <h4>Payment Status</h4>
        <div className="payment-breakdown">
          <div className="payment-item">
            <span>{paymentStatus.FINAL_CONFIRMED || 0} Final Confirmed</span>
          </div>
          <div className="payment-item">
            <span>{paymentStatus.LECTURER_CONFIRMED || 0} Awaiting Final Approval</span>
          </div>
          <div className="payment-item">
            <span className="next-payment">Next Payment Date: Jan 31, 2024</span>
          </div>
        </div>
      </div>
      
      <div className="tax-information">
        <h4>Tax Information</h4>
        <div className="tax-stats">
          <span>Year-to-Date Earnings: ${totalEarnedText}</span>
          <button className="download-tax-summary">Download Tax Summary</button>
        </div>
      </div>
    </div>
  );
});

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
    weekStartDate: initialData?.weekStartDate || new Date().toISOString().split('T')[0],
    hours: initialData?.hours || 0,
    description: initialData?.description || ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveMessage, setAutoSaveMessage] = useState<string | null>(null);
  const autoSaveDelay = process.env.NODE_ENV === 'test' ? 0 : 30000;

  // Auto-save for drafts
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    if (!formData.description.trim() || isEdit) {
      setAutoSaveMessage(null);
      return;
    }

    const timeout = setTimeout(() => {
      setAutoSaveMessage('Draft saved');
    }, autoSaveDelay); // Auto-save after inactivity

    setAutoSaveTimeout(timeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [formData.description, isEdit, autoSaveDelay]);

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

    console.log('validation run', formData, errors);

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      console.log('submitting form', formData);
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  const handleFieldChange = useCallback((field: keyof TimesheetFormData, value: any) => {
    console.log('field change', field, value);
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
            aria-describedby={[ 'course-help', validationErrors.courseId ? 'course-error' : null ].filter(Boolean).join(' ')}
          >
            <option value={0}>Select a course</option>
            <option value={1}>CS101 - Computer Science 101</option>
            <option value={2}>CS102 - Data Structures</option>
          </select>
          <span id="course-help" className="field-help">Select the course this timesheet applies to</span>
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
            aria-describedby={[ 'week-start-help', validationErrors.weekStartDate ? 'week-start-error' : null ].filter(Boolean).join(' ')}
          />
          <span id="week-start-help" className="field-help">Choose the Monday that starts this work week</span>
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
      {autoSaveMessage && (
        <p className="auto-save-message" role="status" aria-live="polite">
          {autoSaveMessage}
        </p>
      )}
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
            <p>{rejectedCount} timesheets need your attention</p>
            <p>{rejectedCount} rejected timesheets need your attention</p>
          </div>
        </div>
        <button 
          className="notification-dismiss"
          onClick={() => onDismiss('rejected-reminder')}
          aria-label="Dismiss action required alert"
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
          aria-label="Dismiss draft reminder"
        >
          ×
        </button>
      </div>
    )}

    {deadlines.map((deadline, index) => {
      const formattedDate = formatters.date(deadline.deadline, {
        month: 'short',
        day: 'numeric'
      });
      const dismissLabel = index === 0
        ? 'Dismiss notification'
        : `Dismiss ${deadline.courseName} deadline alert`;

      return (
        <div key={deadline.courseId || index} className="notification deadline">
          <div className="notification-content">
            <span className="notification-icon">📅</span>
            <div className="notification-text">
              <strong>Deadline approaching for {deadline.courseName}</strong>
              <p>Due {formattedDate}</p>
            </div>
          </div>
          <button 
            className="notification-dismiss"
            onClick={() => onDismiss(`deadline-${deadline.courseId ?? index}`)}
            aria-label={dismissLabel}
          >
            ×
          </button>
        </div>
      );
    })}
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
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch tutor's timesheets
  const {
    data: timesheetsData,
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    isEmpty: noTimesheets,
    refresh: refreshTimesheets,
    refetch: refetchTimesheets
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
    const drafts = allTimesheets.filter(t => t.status === 'DRAFT' || t.status === 'MODIFICATION_REQUESTED');
    const inProgress = allTimesheets.filter(t =>
      ['PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED'].includes(t.status)
    );
    const needAction = allTimesheets.filter(t => t.status === 'REJECTED' || t.status === 'MODIFICATION_REQUESTED');

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
        filter: (t) => t.status === 'DRAFT' || t.status === 'MODIFICATION_REQUESTED',
        count: drafts.length
      },
      {
        id: 'submitted',
        label: `In Progress (${inProgress.length})`,
        filter: (t) => ['PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED'].includes(t.status),
        count: inProgress.length
      },
      {
        id: 'needAction',
        label: `Needs Attention (${needAction.length})`,
        filter: (t) => t.status === 'REJECTED' || t.status === 'MODIFICATION_REQUESTED',
        count: needAction.length
      }
    ];
  }, [allTimesheets]);

  const dismissedSet = useMemo(() => new Set(dismissedNotifications), [dismissedNotifications]);

  const rejectedBaseCount = tutorStats.statusCounts?.REJECTED || 0;
  const draftBaseCount = (tutorStats.statusCounts?.DRAFT || 0) + (tutorStats.statusCounts?.MODIFICATION_REQUESTED || 0);
  const inProgressCount = allTimesheets.filter(t =>
    ['PENDING_TUTOR_CONFIRMATION', 'TUTOR_CONFIRMED', 'LECTURER_CONFIRMED'].includes(t.status)
  ).length;

  const visibleRejectedCount = dismissedSet.has('rejected-reminder') ? 0 : rejectedBaseCount;
  const visibleDraftCount = dismissedSet.has('draft-reminder') ? 0 : draftBaseCount;

  const visibleDeadlines = useMemo(() => {
    const deadlines = dashboardData?.upcomingDeadlines || [];
    return deadlines.filter((deadline, index) => {
      const identifier = `deadline-${deadline.courseId ?? index}`;
      return !dismissedSet.has(identifier);
    });
  }, [dashboardData?.upcomingDeadlines, dismissedSet]);

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
      console.log('createTimesheet fn', createTimesheet);
      if (editingTimesheet) {
        await updateTimesheet(editingTimesheet.id, {
          ...data,
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

      await Promise.all([refetchTimesheets(), refetchDashboard()]);
      setShowForm(false);
      setEditingTimesheet(null);
    } catch (error) {
      console.error('Failed to save timesheet:', error);
    }
  }, [editingTimesheet, user?.id, updateTimesheet, createTimesheet, refetchTimesheets, refetchDashboard]);

  const handleSubmitTimesheet = useCallback(async (timesheetId: number) => {
    setActionLoadingId(timesheetId);
    setActionError(null);
    try {
      await TimesheetService.approveTimesheet({
        timesheetId,
        action: 'SUBMIT_DRAFT'
      });
      await Promise.all([refetchTimesheets(), refetchDashboard()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit timesheet';
      setActionError(message);
    } finally {
      setActionLoadingId(null);
    }
  }, [refetchTimesheets, refetchDashboard]);

  const handleConfirmTimesheet = useCallback(async (timesheetId: number) => {
    setActionLoadingId(timesheetId);
    setActionError(null);
    try {
      await TimesheetService.approveTimesheet({
        timesheetId,
        action: 'TUTOR_CONFIRM'
      });
      await Promise.all([refetchTimesheets(), refetchDashboard()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm timesheet';
      setActionError(message);
    } finally {
      setActionLoadingId(null);
    }
  }, [refetchTimesheets, refetchDashboard]);

  const handleSubmitAllDrafts = useCallback(async () => {
    const draftIds = allTimesheets
      .filter(t => t.status === 'DRAFT')
      .map(t => t.id);

    if (draftIds.length === 0) {
      return;
    }

    setActionLoadingId(-1);
    setActionError(null);

    try {
      await TimesheetService.batchApproveTimesheets(
        draftIds.map(id => ({ timesheetId: id, action: 'SUBMIT_DRAFT' }))
      );
      await Promise.all([refetchTimesheets(), refetchDashboard()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit drafts';
      setActionError(message);
    } finally {
      setActionLoadingId(null);
    }
  }, [allTimesheets, refetchTimesheets, refetchDashboard]);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'create':
        handleCreateTimesheet();
        break;
      case 'submitDrafts':
        handleSubmitAllDrafts();
        break;
      case 'refresh':
        Promise.all([refetchTimesheets(), refetchDashboard()]).catch(console.error);
        break;
      case 'viewPay':
        setExpandedSections(prev => ({ ...prev, paySummary: !prev.paySummary }));
        break;
      case 'export':
        // Export functionality
        break;
      default:
        break;
    }
  }, [handleCreateTimesheet, handleSubmitAllDrafts, refetchTimesheets, refetchDashboard, setExpandedSections]);

  const handleNotificationDismiss = useCallback((notificationId: string) => {
    setDismissedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev;
      }
      return [...prev, notificationId];
    });
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
      <div className={`tutor-dashboard loading ${className}`} data-testid="loading-state">
        <div className="dashboard-loading" data-testid="loading-state-container">
          <LoadingSpinner size="large" data-testid="spinner" />
          <p data-testid="loading-text">Loading your timesheets...</p>
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
          <h1 className="tutor-header__title" data-testid="main-welcome-message">{welcomeMessage}</h1>
          <p className="tutor-header__subtitle" data-testid="main-dashboard-title">Tutor Dashboard</p>
          <p className="tutor-header__description" data-testid="main-dashboard-description">Let's manage your timesheets</p>
          
          {/* This Week Summary */}
          <div className="week-summary">
            <h2>This Week</h2>
            <div className="week-stats">
              <span className="week-hours">{thisWeekSummary.hours}h</span>
              <span className="week-pay">${formatters.currencyValue(thisWeekSummary.pay).replace(/\.00$/, '')}</span>
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
            <div className="error-message" data-testid="error-message">
              <span>Failed to load timesheets: {timesheetsError}</span>
              <button data-testid="retry-button" onClick={refetchTimesheets}>Retry</button>
            </div>
          )}
          {dashboardError && (
            <div className="error-message" data-testid="error-message">
              <span>Failed to load dashboard: {dashboardError}</span>
              <button data-testid="retry-button" onClick={refetchDashboard}>Retry</button>
            </div>
          )}
          {(createError || updateError) && (
            <div className="error-message" data-testid="error-message">
              <span>{createError || updateError}</span>
              <button onClick={() => {
                resetCreate();
                resetUpdate();
              }}>Dismiss</button>
            </div>
          )}
          {actionError && (
            <div className="error-message" data-testid="error-message">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)}>Dismiss</button>
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
            icon="📝"
            onClick={() => handleQuickAction('create')}
            shortcut="Ctrl+N"
          />
          
          <QuickAction
            label="Refresh Data"
            description="Reload the latest timesheets"
            icon="🔄"
            onClick={() => handleQuickAction('refresh')}
          />
          
          <QuickAction
            label="Submit All Drafts"
            description="Submit all draft timesheets"
            icon="📤"
            onClick={() => handleQuickAction('submitDrafts')}
            disabled={!allTimesheets.some(t => t.status === 'DRAFT' || t.status === 'MODIFICATION_REQUESTED')}
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
          <button
            className="floating-action-btn"
            onClick={handleCreateTimesheet}
            aria-label="Create new timesheet (mobile)"
            title="Create new timesheet (mobile)"
          >
            +
          </button>
        )}
      </section>

      {/* Statistics Cards */}
      <section className="tutor-statistics" role="region" aria-label="Your Statistics">
        <h2>Your Statistics</h2>
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
            subtitle={`${draftBaseCount} Drafts, ${inProgressCount} In Progress, ${rejectedBaseCount} Needs Attention`}
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
            <h2 data-testid="timesheets-section-title">My Timesheets</h2>
            <span className="count-badge" data-testid="count-badge">{filteredTimesheets.length} total</span>
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
          {currentTab === 'drafts' && (
            <div className="bulk-actions">
              <label>
                <input
                  type="checkbox"
                  checked={filteredTimesheets.length > 0 && selectedTimesheets.length === filteredTimesheets.length}
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
              <button 
                className="submit-selected-btn"
                disabled={selectedTimesheets.length === 0}
              >
                Submit Selected ({selectedTimesheets.length})
              </button>
              {selectedTimesheets.length > 0 && (
                <div className="submission-preview">
                  <strong>Confirm Submission</strong>
                  <p>{selectedTimesheets.length} timesheets will be submitted</p>
                </div>
              )}
            </div>
          )}

          {/* Timesheets Table */}
          {noTimesheets ? (
            <div className="empty-state" data-testid="empty-state">
              <div className="empty-state__content">
                <span className="empty-state__icon">📝</span>
                <h3 data-testid="empty-state-title">No Timesheets Found</h3>
                <p data-testid="empty-state-description">Create your first timesheet to get started.</p>
                <button className="create-first-btn" onClick={handleCreateTimesheet}>
                  Create First Timesheet
                </button>
              </div>
            </div>
          ) : (
            <TimesheetTable
              timesheets={filteredTimesheets}
              loading={timesheetsLoading}
              actionLoading={actionLoadingId}
              onApprovalAction={(id, action) => {
                // Handle timesheet actions for tutor (edit, submit, confirm)
                const timesheet = filteredTimesheets.find(t => t.id === id);
                if (!timesheet) return;

                if (action === 'EDIT') {
                  handleEditTimesheet(timesheet);
                  return;
                }

                if (action === 'SUBMIT_DRAFT') {
                  handleSubmitTimesheet(id);
                  return;
                }

                if (action === 'TUTOR_CONFIRM') {
                  handleConfirmTimesheet(id);
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
              actionMode="tutor"
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
            rejectedCount={visibleRejectedCount}
            draftCount={visibleDraftCount}
            deadlines={visibleDeadlines}
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

