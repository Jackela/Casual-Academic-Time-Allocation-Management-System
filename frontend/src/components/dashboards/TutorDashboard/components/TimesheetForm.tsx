import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import type {
  Timesheet,
  TimesheetQuoteResponse,
  TimesheetTaskType,
  TutorQualification,
} from '../../../../types/api';
import { secureLogger } from '../../../../utils/secure-logger';
import { Card, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
import { useUiConstraints } from '../../../../lib/config/ui-config';
import { TimesheetService } from '../../../../services/timesheets';

const DEFAULT_TASK_TYPE: TimesheetTaskType = 'TUTORIAL';
const DEFAULT_QUALIFICATION: TutorQualification = 'STANDARD';

export interface TimesheetFormState {
  courseId: number;
  weekStartDate: string;
  deliveryHours: number;
  description: string;
  taskType: TimesheetTaskType;
  qualification: TutorQualification;
  isRepeat: boolean;
}

export interface TimesheetFormSubmitData extends TimesheetFormState {
  quote: TimesheetQuoteResponse;
}

export interface TimesheetFormProps {
  isEdit?: boolean;
  initialData?: Partial<Timesheet>;
  tutorId: number;
  onSubmit: (data: TimesheetFormSubmitData) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

type QuoteState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: TimesheetQuoteResponse | null; error: null }
  | { status: 'loaded'; data: TimesheetQuoteResponse; error: null }
  | { status: 'error'; data: TimesheetQuoteResponse | null; error: string };

const TimesheetForm = memo<TimesheetFormProps>(({ isEdit = false, initialData, tutorId, onSubmit, onCancel, loading = false, error }) => {
  const {
    HOURS_MIN,
    HOURS_MAX,
    HOURS_STEP,
    WEEK_START_DAY,
    mondayOnly,
  } = useUiConstraints();

  const [formData, setFormData] = useState<TimesheetFormState>({
    courseId: initialData?.courseId || 0,
    weekStartDate: initialData?.weekStartDate || new Date().toISOString().split('T')[0],
    deliveryHours: initialData?.deliveryHours ?? initialData?.hours ?? 0,
    description: initialData?.description || '',
    taskType: initialData?.taskType ?? DEFAULT_TASK_TYPE,
    qualification: initialData?.qualification ?? DEFAULT_QUALIFICATION,
    isRepeat: Boolean(initialData?.isRepeat),
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveMessage, setAutoSaveMessage] = useState<string | null>(null);
  const autoSaveDelay = process.env.NODE_ENV === 'test' ? 0 : 30000;
  const MONDAY_ERROR_MESSAGE = 'Week start must be a Monday';
  const [quoteState, setQuoteState] = useState<QuoteState>(() => {
    if (initialData && typeof initialData.hourlyRate === 'number') {
      return {
        status: 'loaded',
        data: {
          taskType: initialData.taskType ?? DEFAULT_TASK_TYPE,
          rateCode: initialData.rateCode ?? 'TU1',
          qualification: initialData.qualification ?? DEFAULT_QUALIFICATION,
          repeat: Boolean(initialData.isRepeat),
          deliveryHours: Number(initialData.deliveryHours ?? initialData.hours ?? 0),
          associatedHours: Number(initialData.associatedHours ?? 0),
          payableHours: Number(initialData.hours ?? 0),
          hourlyRate: Number(initialData.hourlyRate ?? 0),
          amount: Number(initialData.totalPay ?? ((initialData.hours ?? 0) * (initialData.hourlyRate ?? 0))),
          formula: initialData.calculationFormula ?? 'Delivery + associated hours',
          clauseReference: initialData.clauseReference ?? null,
          sessionDate: initialData.sessionDate ?? initialData.weekStartDate ?? formData.weekStartDate,
        },
        error: null,
      };
    }
    return { status: 'idle', data: null, error: null };
  });

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
    const hasValidDeliveryHours =
      Number.isFinite(formData.deliveryHours) &&
      formData.deliveryHours >= HOURS_MIN &&
      formData.deliveryHours <= HOURS_MAX;
    const hasQuote = quoteState.status === 'loaded' && quoteState.data !== null;
    const noValidationErrors = Object.values(validationErrors).every(message => !message);
    return hasCourse && hasWeekStart && hasValidDeliveryHours && hasQuote && noValidationErrors;
  }, [
    formData.courseId,
    formData.weekStartDate,
    formData.deliveryHours,
    HOURS_MIN,
    HOURS_MAX,
    validationErrors,
    isWeekStartOnAllowedDay,
    quoteState,
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

    if (!formData.deliveryHours || formData.deliveryHours < HOURS_MIN) {
      errors.deliveryHours = `Delivery hours must be at least ${HOURS_MIN}`;
    } else if (formData.deliveryHours > HOURS_MAX) {
      errors.deliveryHours = `Delivery hours must be between ${HOURS_MIN} and ${HOURS_MAX}`;
    }

    if (!formData.weekStartDate) {
      errors.weekStartDate = 'Week start date is required';
    } else if (!isWeekStartOnAllowedDay(formData.weekStartDate)) {
      errors.weekStartDate = MONDAY_ERROR_MESSAGE;
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    if (!formData.taskType) {
      errors.taskType = 'Task type is required';
    }

    if (!formData.qualification) {
      errors.qualification = 'Qualification is required';
    }

    if (quoteState.status === 'error' && quoteState.error) {
      errors.quote = quoteState.error;
    }

    secureLogger.debug('validation run', { formData, errors });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [HOURS_MAX, HOURS_MIN, MONDAY_ERROR_MESSAGE, formData, isWeekStartOnAllowedDay, quoteState]);

  const quoteRequest = useMemo(() => {
    if (
      tutorId <= 0 ||
      formData.courseId <= 0 ||
      !formData.weekStartDate ||
      formData.deliveryHours <= 0
    ) {
      return null;
    }
    return {
      tutorId,
      courseId: formData.courseId,
      sessionDate: formData.weekStartDate,
      taskType: formData.taskType,
      qualification: formData.qualification,
      repeat: formData.isRepeat,
      deliveryHours: formData.deliveryHours,
    };
  }, [
    tutorId,
    formData.courseId,
    formData.weekStartDate,
    formData.taskType,
    formData.qualification,
    formData.isRepeat,
    formData.deliveryHours,
  ]);

  useEffect(() => {
    if (!quoteRequest) {
      setQuoteState(prev => (prev.status === 'idle' && prev.data === null && prev.error === null
        ? prev
        : { status: 'idle', data: null, error: null }));
      return;
    }

    const controller = new AbortController();
    setQuoteState(prev => (prev.status === 'loading' ? prev : { status: 'loading', data: prev.data, error: null }));
    setValidationErrors(prev => {
      if (!prev.quote) {
        return prev;
      }
      const { quote: _ignored, ...rest } = prev;
      return rest;
    });

    TimesheetService.quoteTimesheet(quoteRequest, controller.signal)
      .then(response => {
        if (controller.signal.aborted) {
          return;
        }
        setQuoteState({ status: 'loaded', data: response, error: null });
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to calculate pay with EA rules.';
        setQuoteState(prev => ({
          status: 'error',
          data: prev.data,
          error: message,
        }));
        setValidationErrors(prev => ({ ...prev, quote: message }));
      });

    return () => {
      controller.abort();
    };
  }, [quoteRequest]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (quoteState.status !== 'loaded' || !quoteState.data) {
      setValidationErrors(prev => ({
        ...prev,
        quote: 'Unable to calculate pay. Please review the input fields.',
      }));
      return;
    }

    const submission: TimesheetFormSubmitData = {
      ...formData,
      quote: quoteState.data,
    };

    secureLogger.debug('submitting form', submission);
    onSubmit(submission);
  }, [formData, loading, onSubmit, quoteState, validateForm]);

  const handleFieldChange = useCallback((field: keyof TimesheetFormState, value: string | number | boolean) => {
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

    setFormData(prev => ({ ...prev, [field]: value as never }));
    setValidationErrors(prev => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev, [field]: '' };
      if (field === 'weekStartDate') {
        next.weekStartDate = '';
      }
      return next;
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

      {initialData?.rejectionReason && initialData?.status === 'REJECTED' && (
        <div 
          data-testid="rejection-feedback-section" 
          className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4"
        >
          <h3 
            data-testid="rejection-feedback-title" 
            className="text-sm font-semibold text-orange-800 mb-2"
          >
            Lecturer Feedback
          </h3>
          <p 
            data-testid="rejection-feedback-content" 
            className="text-sm text-orange-700"
          >
            {initialData.rejectionReason}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="timesheet-form space-y-4" data-testid="edit-timesheet-form">
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="form-field space-y-1">
            <label htmlFor="task-type" className="text-sm font-medium">Task Type</label>
            <select
              id="task-type"
              value={formData.taskType}
              onChange={(e) => handleFieldChange('taskType', e.target.value as TimesheetTaskType)}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${validationErrors.taskType ? 'border-destructive ring-destructive/20' : ''}`}
              aria-describedby={validationErrors.taskType ? 'task-type-error' : undefined}
            >
              <option value="TUTORIAL">Tutorial</option>
              <option value="LECTURE">Lecture</option>
              <option value="ORAA">ORAA</option>
              <option value="DEMO">Demonstration</option>
              <option value="MARKING">Marking</option>
              <option value="OTHER">Other</option>
            </select>
            {validationErrors.taskType && (
              <span id="task-type-error" className="text-xs text-destructive">{validationErrors.taskType}</span>
            )}
          </div>

          <div className="form-field space-y-1">
            <label htmlFor="qualification" className="text-sm font-medium">Tutor Qualification</label>
            <select
              id="qualification"
              value={formData.qualification}
              onChange={(e) => handleFieldChange('qualification', e.target.value as TutorQualification)}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${validationErrors.qualification ? 'border-destructive ring-destructive/20' : ''}`}
              aria-describedby={validationErrors.qualification ? 'qualification-error' : undefined}
            >
              <option value="STANDARD">Standard Tutor</option>
              <option value="PHD">PhD Qualified</option>
              <option value="COORDINATOR">Course Coordinator</option>
            </select>
            {validationErrors.qualification && (
              <span id="qualification-error" className="text-xs text-destructive">{validationErrors.qualification}</span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            id="is-repeat"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
            checked={formData.isRepeat}
            onChange={(e) => handleFieldChange('isRepeat', e.target.checked)}
          />
          <div className="space-y-1">
            <label htmlFor="is-repeat" className="text-sm font-medium leading-none">Repeat session within seven days</label>
            <p className="text-xs text-muted-foreground">Select if this session is a repeat tutorial for the same cohort within seven days.</p>
          </div>
        </div>

        <div className="form-field space-y-1">
          <label htmlFor="delivery-hours" className="text-sm font-medium">Delivery Hours</label>
          <Input
            id="delivery-hours"
            type="number"
            step={HOURS_STEP}
            min={HOURS_MIN}
            max={HOURS_MAX}
            value={formData.deliveryHours || ''}
            onChange={(e) => handleFieldChange('deliveryHours', parseFloat(e.target.value) || 0)}
            onBlur={() => validateForm()}
            className={validationErrors.deliveryHours ? 'border-destructive ring-destructive/20' : ''}
            aria-describedby="delivery-hours-error delivery-hours-help"
          />
          <span id="delivery-hours-help" className="text-xs text-muted-foreground">Enter the in-class delivery hours ({HOURS_MIN} - {HOURS_MAX})</span>
          {validationErrors.deliveryHours && (
            <span id="delivery-hours-error" className="text-xs text-destructive">{validationErrors.deliveryHours}</span>
          )}
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Calculated Pay Summary</h3>
              <p className="text-xs text-muted-foreground">Values sourced from the EA Schedule 1 rules.</p>
            </div>
            {quoteState.status === 'loading' && <LoadingSpinner size="small" />}
          </div>

          {quoteState.status === 'error' && quoteState.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {quoteState.error}
            </div>
          )}

          {quoteState.status === 'loaded' && quoteState.data && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Rate Code</p>
                <p className="text-sm font-medium">{quoteState.data.rateCode}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Qualification</p>
                <p className="text-sm font-medium">{quoteState.data.qualification}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Associated Hours</p>
                <p className="text-sm font-medium">{quoteState.data.associatedHours.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payable Hours</p>
                <p className="text-sm font-medium">{quoteState.data.payableHours.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Hourly Rate</p>
                <p className="text-sm font-medium">
                  {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(quoteState.data.hourlyRate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount</p>
                <p className="text-sm font-medium">
                  {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(quoteState.data.amount)}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Formula</p>
                <p className="text-sm font-medium">{quoteState.data.formula}</p>
                {quoteState.data.clauseReference && (
                  <p className="text-xs text-muted-foreground mt-1">Clause: {quoteState.data.clauseReference}</p>
                )}
              </div>
            </div>
          )}

          {validationErrors.quote && (
            <p className="mt-2 text-xs text-destructive" role="alert">{validationErrors.quote}</p>
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
