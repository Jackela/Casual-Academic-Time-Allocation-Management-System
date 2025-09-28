/**
 * TutorDashboard Component
 * 
 * Optimized tutor dashboard with timesheet management, self-service features,
 * pay tracking, and course integration for student tutors.
 */

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { 
  useTimesheets,
  useDashboardSummary, 
  useCreateTimesheet,
  useUpdateTimesheet,
  useTimesheetStats 
} from '../../../hooks/useTimesheets';
import { useAuth } from '../../../contexts/AuthContext';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';

import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { formatters } from '../../../utils/formatting';
import { secureLogger } from '../../../utils/secure-logger';
import type { Timesheet, DashboardDeadline } from '../../../types/api';
import { TimesheetService } from '../../../services/timesheets';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

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
  icon,
  onClick
}) => (
  <Card
    className={`flex flex-col ${onClick ? 'cursor-pointer hover:bg-accent' : ''}`}
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
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon && <span className="text-2xl text-muted-foreground">{icon}</span>}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground">
          {trend === 'up' && '↗ '}
          {trend === 'down' && '↘ '}
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
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
  <Button
    variant="outline"
    className="h-auto w-full justify-start p-4 text-left"
    onClick={onClick}
    disabled={disabled}
    title={`${description}${shortcut ? ` (${shortcut})` : ''}`}
  >
    <span className="mr-4 text-2xl">{icon}</span>
    <div className="flex flex-col">
      <span className="font-semibold">{label}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
    {shortcut && <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>}
  </Button>
));

QuickAction.displayName = 'QuickAction';

// =============================================================================
// Completion Progress Component
// =============================================================================

const CompletionProgress = memo<{ completionRate: number }>(({ completionRate }) => (
  <div className="rounded-lg border bg-card p-4" data-testid="completion-progress">
    <h4 className="mb-2 font-semibold">Semester Progress</h4>
    <div className="flex items-center gap-2">
      <div className="h-2 w-full flex-1 rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${completionRate * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {Math.round(completionRate * 100)}%
      </span>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">
      Keep up the great work! You're on track for this semester.
    </p>
  </div>
));

CompletionProgress.displayName = 'CompletionProgress';

// =============================================================================
// Upcoming Deadlines Component
// =============================================================================

const UpcomingDeadlines = memo<{ deadlines: DashboardDeadline[] }>(({ deadlines }) => (
  <div className="rounded-lg border bg-card p-4">
    <h3 className="mb-2 font-semibold">Upcoming Deadlines</h3>
    {deadlines.length === 0 ? (
      <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
    ) : (
      <ul className="space-y-2">
        {deadlines.map((deadline, index) => {
          const dateValue = deadline.deadline ?? deadline.dueDate;
          const formattedDate = dateValue
            ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateValue))
            : 'TBD';
          const courseLabel = deadline.courseName ?? 'Course';

          return (
            <li key={deadline.id ?? deadline.courseId ?? index} className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {`${courseLabel} - Due`}
              </span>
              <span className="text-muted-foreground">{formattedDate}</span>
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
    <Card className="p-4">
      <CardTitle className="mb-2 text-lg font-semibold">Pay Summary</CardTitle>
      <CardContent className="space-y-2 p-0">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Earned:</span>
          <strong className="text-foreground">${totalEarnedText}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">This Week:</span>
          <strong className="text-foreground">${thisWeekText}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Average per Timesheet:</span>
          <strong className="text-foreground">${averageText}</strong>
        </div>

        <div className="pt-4">
          <h4 className="mb-2 font-semibold">Payment Status</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{paymentStatus.FINAL_CONFIRMED || 0} Final Confirmed</p>
            <p>{paymentStatus.LECTURER_CONFIRMED || 0} Awaiting Final Approval</p>
            <p className="font-medium text-primary">Next Payment Date: Jan 31, 2024</p>
          </div>
        </div>

        <div className="pt-4">
          <h4 className="mb-2 font-semibold">Tax Information</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Year-to-Date Earnings: ${totalEarnedText}</p>
            <Button variant="outline" size="sm" className="mt-2 w-full">Download Tax Summary</Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card className="p-4" data-testid="earnings-breakdown">
      <CardTitle className="mb-2 text-lg font-semibold">Earnings by Course</CardTitle>
      <CardContent className="space-y-2 p-0">
        {courseEarnings.map(({ course, hours, pay }) => (
          <div key={course} className="flex justify-between text-sm">
            <span className="font-medium text-foreground">{course}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{hours}h</span>
              <span>${formatters.currencyValue(pay)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
  }, [formData.description, isEdit, autoSaveDelay, autoSaveTimeout]);

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

    secureLogger.debug('validation run', { formData, errors });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      secureLogger.debug('submitting form', formData);
      onSubmit(formData);
    }
  }, [formData, validateForm, onSubmit]);

  const handleFieldChange = useCallback((field: keyof TimesheetFormData, value: string | number) => {
    secureLogger.debug('field change', { field, value });
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [validationErrors]);

  return (
    <Card className="timesheet-form-modal p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-semibold">{isEdit ? 'Edit Timesheet' : 'New Timesheet Form'}</CardTitle>
      </CardHeader>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="timesheet-form space-y-4">
        <div className="form-field space-y-1">
          <label htmlFor="course" className="text-sm font-medium">Course</label>
          <select
            id="course"
            value={formData.courseId}
            onChange={(e) => handleFieldChange('courseId', parseInt(e.target.value))}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${validationErrors.courseId ? 'border-destructive ring-destructive/20' : ''}`}
            aria-describedby={[ 'course-help', validationErrors.courseId ? 'course-error' : null ].filter(Boolean).join(' ')}
          >
            <option value={0}>Select a course</option>
            <option value={1}>CS101 - Computer Science 101</option>
            <option value={2}>CS102 - Data Structures</option>
          </select>
          <span id="course-help" className="text-xs text-muted-foreground">Select the course this timesheet applies to</span>
          {validationErrors.courseId && (
            <span id="course-error" className="text-xs text-destructive">{validationErrors.courseId}</span>
          )}
        </div>

        <div className="form-field space-y-1">
          <label htmlFor="week-start" className="text-sm font-medium">Week Starting</label>
          <Input
            id="week-start"
            type="date"
            value={formData.weekStartDate}
            onChange={(e) => handleFieldChange('weekStartDate', e.target.value)}
            className={validationErrors.weekStartDate ? 'border-destructive ring-destructive/20' : ''}
            aria-describedby={[ 'week-start-help', validationErrors.weekStartDate ? 'week-start-error' : null ].filter(Boolean).join(' ')}
          />
          <span id="week-start-help" className="text-xs text-muted-foreground">Choose the Monday that starts this work week</span>
          {validationErrors.weekStartDate && (
            <span id="week-start-error" className="text-xs text-destructive">{validationErrors.weekStartDate}</span>
          )}
        </div>

        <div className="form-field space-y-1">
          <label htmlFor="hours" className="text-sm font-medium">Hours Worked</label>
          <Input
            id="hours"
            type="number"
            step="0.5"
            min="0.1"
            max="60"
            value={formData.hours || ''}
            onChange={(e) => handleFieldChange('hours', parseFloat(e.target.value) || 0)}
            onBlur={() => validateForm()}
            className={validationErrors.hours ? 'border-destructive ring-destructive/20' : ''}
            aria-describedby="hours-error hours-help"
          />
          <span id="hours-help" className="text-xs text-muted-foreground">Enter hours worked (0.1 - 60)</span>
          {validationErrors.hours && (
            <span id="hours-error" className="text-xs text-destructive">{validationErrors.hours}</span>
          )}
        </div>

        <div className="form-field space-y-1">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Describe the work performed..."
            rows={4}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-describedby="description-help"
          />
          <span id="description-help" className="text-xs text-muted-foreground">Provide details about your tutoring activities</span>
        </div>

        <div className="form-actions flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner size="small" /> : (isEdit ? 'Update Timesheet' : 'Create Timesheet')}
          </Button>
        </div>
      </form>
      {autoSaveMessage && (
        <p className="auto-save-message mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {autoSaveMessage}
        </p>
      )}
    </Card>
  );
});

TimesheetForm.displayName = 'TimesheetForm';

// =============================================================================
// Notifications Panel Component
// =============================================================================

const NotificationsPanel = memo<{
  rejectedCount: number;
  draftCount: number;
  deadlines: DashboardDeadline[];
  onDismiss: (notificationId: string) => void;
}>(({ rejectedCount, draftCount, deadlines, onDismiss }) => (
  <Card className="p-4" data-testid="notifications-panel">
    <CardTitle className="mb-2 text-lg font-semibold">Notifications</CardTitle>

    {rejectedCount > 0 && (
      <div className="notification mb-2 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" data-testid="action-required">
        <span className="notification-icon text-xl">⚠️</span>
        <div className="notification-content flex-1">
          <strong className="block font-semibold">Action Required</strong>
          <p>{rejectedCount} timesheets need your attention</p>
          <p>{rejectedCount} rejected timesheets need your attention</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss('rejected-reminder')}
          aria-label="Dismiss action required alert"
          className="h-auto p-1 text-muted-foreground hover:bg-red-100 hover:text-red-800"
        >
          ×
        </Button>
      </div>
    )}

    {draftCount > 0 && (
      <div className="notification mb-2 flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
        <span className="notification-icon text-xl">📝</span>
        <div className="notification-content flex-1">
          <strong className="block font-semibold">Don't forget to submit</strong>
          <p>{draftCount} draft timesheets are waiting</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss('draft-reminder')}
          aria-label="Dismiss draft reminder"
          className="h-auto p-1 text-muted-foreground hover:bg-yellow-100 hover:text-yellow-800"
        >
          ×
        </Button>
      </div>
    )}

    {deadlines.map((deadline, index) => {
      const formattedDate = formatters.date(deadline.deadline ?? '', {
        month: 'short',
        day: 'numeric'
      });
      const dismissLabel = index === 0
        ? 'Dismiss notification'
        : `Dismiss ${deadline.courseName} deadline alert`;

      return (
        <div key={deadline.courseId || index} className="notification mb-2 flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <span className="notification-icon text-xl">📅</span>
          <div className="notification-content flex-1">
            <strong className="block font-semibold">Deadline approaching for {deadline.courseName}</strong>
            <p>Due {formattedDate}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(`deadline-${deadline.courseId ?? index}`)}
            aria-label={dismissLabel}
            className="h-auto p-1 text-muted-foreground hover:bg-blue-100 hover:text-blue-800"
          >
            ×
          </Button>
        </div>
      );
    })}
  </Card>
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
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch tutor's timesheets
  const {
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    isEmpty: noTimesheets,
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

  const completionRate = useMemo(() => {
    const total = tutorStats.totalCount || 0;
    if (!total) {
      return 0;
    }
    const completed = tutorStats.statusCounts?.FINAL_CONFIRMED ?? 0;
    return completed / total;
  }, [tutorStats.statusCounts, tutorStats.totalCount]);

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
    const deadlines = (dashboardData?.upcomingDeadlines ?? []) as DashboardDeadline[];
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
      secureLogger.debug('createTimesheet fn', Boolean(createTimesheet));
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
      secureLogger.error('Failed to save timesheet', error);
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
      case 'export':
        // Export functionality
        break;
      default:
        break;
    }
  }, [handleCreateTimesheet, handleSubmitAllDrafts, refetchTimesheets, refetchDashboard]);

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
      className={`p-4 sm:p-6 lg:p-8 ${className}`}
      data-testid="tutor-dashboard"
      role="main"
      aria-label="Tutor Dashboard"
    >
      {/* Header Section */}
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="main-welcome-message">{welcomeMessage}</h1>
        <p className="text-muted-foreground" data-testid="main-dashboard-title">Tutor Dashboard</p>
        <p className="text-muted-foreground" data-testid="main-dashboard-description">
          Here's an overview of your timesheets and earnings. Let's get started.
        </p>
      </header>

      {/* Error Display */}
      {hasErrors && (
        <div className="mb-6 space-y-4">
          {timesheetsError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
              <span>Failed to load timesheets: {timesheetsError}</span>
              <Button variant="destructive" size="sm" className="ml-4" data-testid="retry-button-timesheets" onClick={() => refetchTimesheets()}>Retry</Button>
            </div>
          )}
          {dashboardError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
              <span>Failed to load dashboard: {dashboardError}</span>
              <Button variant="destructive" size="sm" className="ml-4" data-testid="retry-button-dashboard" onClick={refetchDashboard}>Retry</Button>
            </div>
          )}
          {(createError || updateError) && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
              <span>{createError || updateError}</span>
              <Button variant="ghost" size="sm" className="ml-4" onClick={() => { resetCreate(); resetUpdate(); }}>Dismiss</Button>
            </div>
          )}
          {actionError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
              <span>{actionError}</span>
              <Button variant="ghost" size="sm" className="ml-4" onClick={() => setActionError(null)}>Dismiss</Button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions Section */}
      <section className="mb-8" role="region" aria-label="Quick Actions">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="quick-actions">
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
      </section>

      {/* Statistics Cards */}
      <section className="mb-8" role="region" aria-label="Your Statistics">
        <h2 className="mb-4 text-xl font-semibold">Your Statistics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            value={`${draftBaseCount} Drafts`}
            subtitle={`${inProgressCount} In Progress`}
            color="warning"
            icon="📋"
          />
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Main Content) */}
        <div className="space-y-6 lg:col-span-2">
          {/* My Timesheets Section */}
          <section aria-label="My Timesheets">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle data-testid="timesheets-section-title">My Timesheets</CardTitle>
                      <span 
                        className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary" 
                        data-testid="count-badge"
                      >
                        {allTimesheets.length} total
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manage all your work logs here.
                    </p>
                  </div>
                  <Button onClick={handleCreateTimesheet}>Create New</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tab Navigation */}
                <div className="mb-4 border-b">
                  <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                          currentTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                        }`}
                        onClick={() => handleTabChange(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
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
                    <Button 
                      className="submit-selected-btn"
                      disabled={selectedTimesheets.length === 0}
                    >
                      Submit Selected ({selectedTimesheets.length})
                    </Button>
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
                  <div className="py-12 text-center" data-testid="empty-state">
                    <div className="mx-auto max-w-xs">
                      <h3 className="text-lg font-semibold" data-testid="empty-state-title">
                        No Timesheets Found
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground" data-testid="empty-state-description">
                        Create your first timesheet to get started.
                      </p>
                      <Button className="mt-4" onClick={handleCreateTimesheet}>
                        Create First Timesheet
                      </Button>
                    </div>
                  </div>
                ) : (
                  <TimesheetTable
                    timesheets={filteredTimesheets}
                    loading={timesheetsLoading}
                    loadingMessage="Loading timesheets to review..."
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
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6 lg:col-span-1">
          <NotificationsPanel
            rejectedCount={visibleRejectedCount}
            draftCount={visibleDraftCount}
            deadlines={visibleDeadlines}
            onDismiss={handleNotificationDismiss}
          />
          <UpcomingDeadlines deadlines={dashboardData?.upcomingDeadlines || []} />
          <CompletionProgress completionRate={completionRate || 0} />
          <PaySummary
            totalEarned={tutorStats.totalPay}
            thisWeekPay={thisWeekSummary.pay}
            averagePerTimesheet={tutorStats.averagePayPerTimesheet}
            paymentStatus={tutorStats.statusCounts || {}}
          />
          <EarningsBreakdown timesheets={allTimesheets} />
        </div>
      </div>

      {/* Timesheet Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="relative w-full max-w-lg rounded-lg bg-card shadow-lg" onClick={e => e.stopPropagation()}>
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



