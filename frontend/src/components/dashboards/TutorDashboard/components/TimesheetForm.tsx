import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { Timesheet } from '../../../../types/api';
import { secureLogger } from '../../../../utils/secure-logger';
import { Card, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
import { useUiConstraints } from '../../../../lib/config/ui-config';
import { validateTimesheet } from '../../../../lib/validation/ajv';

export interface TimesheetFormData {
  courseId: number;
  weekStartDate: string;
  hours: number;
  description: string;
}

export interface TimesheetFormProps {
  isEdit?: boolean;
  initialData?: Partial<Timesheet>;
  onSubmit: (data: TimesheetFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

const TimesheetForm = memo<TimesheetFormProps>(({ isEdit = false, initialData, onSubmit, onCancel, loading = false, error }) => {
  const {
    HOURS_MIN,
    HOURS_MAX,
    HOURS_STEP,
    WEEK_START_DAY,
    mondayOnly,
  } = useUiConstraints();

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
  const MONDAY_ERROR_MESSAGE = 'Week start must be a Monday';

  const isWeekStartOnAllowedDay = useCallback(
    (value: string | undefined) => {
      if (!value) {
        return false;
      }

      if (!mondayOnly) {
        return true;
      }

      const parsed = new Date(`${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return false;
      }

      return parsed.getDay() === WEEK_START_DAY;
    },
    [WEEK_START_DAY, mondayOnly]
  );

  const mondayReferenceDate = useMemo(() => {
    if (!mondayOnly) {
      return undefined;
    }

    const base = new Date(Date.UTC(1970, 0, 4)); // Sunday, 1970-01-04
    const offset = (WEEK_START_DAY - base.getUTCDay() + 7) % 7;
    base.setUTCDate(base.getUTCDate() + offset);
    return base.toISOString().split('T')[0];
  }, [WEEK_START_DAY, mondayOnly]);

  const isFormValid = useMemo(() => {
    const hasCourse = formData.courseId > 0;
    const hasWeekStart = Boolean(formData.weekStartDate) && isWeekStartOnAllowedDay(formData.weekStartDate);
    const hasValidHours =
      Number.isFinite(formData.hours) &&
      formData.hours >= HOURS_MIN &&
      formData.hours <= HOURS_MAX;
    const noValidationErrors = Object.values(validationErrors).every(message => !message);
    return hasCourse && hasWeekStart && hasValidHours && noValidationErrors;
  }, [
    formData.courseId,
    formData.weekStartDate,
    formData.hours,
    HOURS_MIN,
    HOURS_MAX,
    validationErrors,
    isWeekStartOnAllowedDay
  ]);

  const isSubmitDisabled = loading || !isFormValid;

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
    }, autoSaveDelay);

    setAutoSaveTimeout(timeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [autoSaveTimeout, autoSaveDelay, formData.description, isEdit]);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.courseId) {
      errors.courseId = 'Course is required';
    }

    if (!formData.hours || formData.hours < HOURS_MIN) {
      errors.hours = `Hours must be at least ${HOURS_MIN}`;
    } else if (formData.hours > HOURS_MAX) {
      errors.hours = `Hours must be between ${HOURS_MIN} and ${HOURS_MAX}`;
    }

    if (!formData.weekStartDate) {
      errors.weekStartDate = 'Week start date is required';
    } else if (!isWeekStartOnAllowedDay(formData.weekStartDate)) {
      errors.weekStartDate = MONDAY_ERROR_MESSAGE;
    }

    const schemaResult = validateTimesheet({
      courseId: formData.courseId ? String(formData.courseId) : '',
      weekStart: formData.weekStartDate,
      hours: formData.hours,
      description: formData.description,
    });

    if (!schemaResult.valid && schemaResult.errors) {
      for (const error of schemaResult.errors) {
        const path = error.instancePath.replace(/^\//, '');
        const message = error.message ? `${error.message.charAt(0).toUpperCase()}${error.message.slice(1)}` : 'Invalid value';

        if (path === 'courseId' && !errors.courseId) {
          errors.courseId = 'Course is required';
        } else if (path === 'weekStart' && !errors.weekStartDate) {
          errors.weekStartDate = message === 'Must match format "date"' ? 'Week start date must be a valid date' : message;
        } else if (path === 'hours' && !errors.hours) {
          errors.hours = message;
        } else if (path === 'description' && !errors.description) {
          errors.description = message;
        }
      }
    }

    secureLogger.debug('validation run', { formData, errors });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [HOURS_MAX, HOURS_MIN, MONDAY_ERROR_MESSAGE, formData, isWeekStartOnAllowedDay]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (validateForm()) {
      secureLogger.debug('submitting form', formData);
      onSubmit(formData);
    }
  }, [formData, loading, onSubmit, validateForm]);

  const handleFieldChange = useCallback((field: keyof TimesheetFormData, value: string | number) => {
    secureLogger.debug('field change', { field, value });
    if (field === 'weekStartDate') {
      const stringValue = typeof value === 'string' ? value : String(value);
      if (stringValue && !isWeekStartOnAllowedDay(stringValue)) {
        setValidationErrors(prev => ({
          ...prev,
          weekStartDate: MONDAY_ERROR_MESSAGE
        }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      return { ...prev, [field]: '' };
    });
  }, [MONDAY_ERROR_MESSAGE, isWeekStartOnAllowedDay]);

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
            onChange={(e) => handleFieldChange('courseId', parseInt(e.target.value, 10))}
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
            min={mondayReferenceDate}
            step={mondayOnly ? 7 : undefined}
          />
          <span id="week-start-help" className="text-xs text-muted-foreground">Choose the Monday that starts this work week</span>
          {validationErrors.weekStartDate && (
            <span
              id="week-start-error"
              className="text-xs text-destructive"
              role="alert"
              aria-live="polite"
            >
              {validationErrors.weekStartDate}
            </span>
          )}
        </div>

        <div className="form-field space-y-1">
          <label htmlFor="hours" className="text-sm font-medium">Hours Worked</label>
          <Input
            id="hours"
            type="number"
            step={HOURS_STEP}
            min={HOURS_MIN}
            max={HOURS_MAX}
            value={formData.hours || ''}
            onChange={(e) => handleFieldChange('hours', parseFloat(e.target.value) || 0)}
            onBlur={() => validateForm()}
            className={validationErrors.hours ? 'border-destructive ring-destructive/20' : ''}
            aria-describedby="hours-error hours-help"
          />
          <span id="hours-help" className="text-xs text-muted-foreground">Enter hours worked ({HOURS_MIN} - {HOURS_MAX})</span>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!loading) {
                onCancel();
              }
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled} title={isSubmitDisabled && !loading ? 'Complete all required fields before submitting.' : undefined}>
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

export default TimesheetForm;
