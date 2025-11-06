import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  Timesheet,
  TimesheetQuoteResponse,
  TimesheetTaskType,
  TutorQualification,
} from '../../../../types/api';
import { Card, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
import { useUiConstraints } from '../../../../lib/config/ui-config';
import { fetchTimesheetConstraints } from '../../../../lib/config/server-config';
import { TimesheetService } from '../../../../services/timesheets';
import type { TimesheetQuoteRequest } from '../../../../types/api';

type Mode = 'tutor' | 'lecturer-create' | 'lecturer-edit';

const DEFAULT_TASK_TYPE: TimesheetTaskType = 'TUTORIAL';
const DEFAULT_QUALIFICATION: TutorQualification = 'STANDARD';

export interface TimesheetFormTutorOption {
  id: number;
  label: string;
  qualification?: TutorQualification | null;
  courseIds?: number[];
}

export interface TimesheetFormCourseOption {
  id: number;
  label: string;
}

export interface TimesheetFormSubmitData {
  tutorId: number;
  courseId: number;
  weekStartDate: string;
  sessionDate: string;
  deliveryHours: number;
  description: string;
  taskType: TimesheetTaskType;
  qualification: TutorQualification;
  isRepeat: boolean;
}

export interface TimesheetFormProps {
  isEdit?: boolean;
  initialData?: Partial<Timesheet>;
  tutorId: number;
  onSubmit: (data: TimesheetFormSubmitData) => void;
  onCancel: () => void;
  mode?: Mode;
  loading?: boolean;
  error?: string | null;
  tutorOptions?: TimesheetFormTutorOption[];
  selectedTutorId?: number | null;
  onTutorChange?: (tutorId: number) => void;
  courseOptions?: TimesheetFormCourseOption[];
  optionsLoading?: boolean;
}

type QuoteState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: TimesheetQuoteResponse | null; error: null }
  | { status: 'loaded'; data: TimesheetQuoteResponse; error: null }
  | { status: 'error'; data: TimesheetQuoteResponse | null; error: string };

const formatISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isMonday = (d: Date) => d.getDay() === 1;
const previousMonday = (from: Date) => {
  let cur = new Date(from);
  while (!isMonday(cur)) cur = new Date(cur.getTime() - 24 * 3600 * 1000);
  return cur;
};

const TimesheetForm = memo(function TimesheetForm(props: TimesheetFormProps) {
  const {
    isEdit = false,
    initialData,
    tutorId,
    onSubmit,
    onCancel,
    mode = 'tutor',
    loading = false,
    error = null,
    tutorOptions = [],
    selectedTutorId = null,
    onTutorChange,
    courseOptions = [],
    optionsLoading = false,
  } = props;


  const ui = useUiConstraints();
  const [hoursMin, setHoursMin] = useState(ui.HOURS_MIN);
  const [hoursMax, setHoursMax] = useState(ui.HOURS_MAX);
  const [hoursStep, setHoursStep] = useState(ui.HOURS_STEP);
  const [mondayOnly, setMondayOnly] = useState(ui.mondayOnly);

  useEffect(() => {
    let cancelled = false;
    fetchTimesheetConstraints()
      .then((overrides) => {
        if (cancelled || !overrides) return;
        if (overrides.hours?.max) setHoursMax(Number(overrides.hours.max));
        if (overrides.hours?.min) setHoursMin(Number(overrides.hours.min));
        if (overrides.hours?.step) setHoursStep(Number(overrides.hours.step));
        if (typeof overrides.weekStart?.mondayOnly === 'boolean') setMondayOnly(Boolean(overrides.weekStart.mondayOnly));
      })
      .catch(() => void 0);
    return () => { cancelled = true; };
  }, []);
  const isLecturerCreate = mode === 'lecturer-create';
  const isLecturerMode = mode === 'lecturer-create' || mode === 'lecturer-edit';

  // In lecturer mode, keep internal tutor selection in sync with parent-provided selection
  useEffect(() => {
    if (isLecturerMode && selectedTutorId && selectedTutorId > 0) {
      setInternalTutorId((prev) => (prev && prev > 0 ? prev : selectedTutorId));
    }
  }, [isLecturerMode, selectedTutorId]);

  const today = new Date();
  const defaultWeek = initialData?.weekStartDate
    ? String(initialData.weekStartDate)
    : formatISO(mondayOnly ? (isMonday(today) ? today : previousMonday(today)) : today);

  type FormValues = {
    courseId: number;
    weekStartDate: string;
    deliveryHours: number;
    description: string;
    taskType: TimesheetTaskType;
    qualification: TutorQualification;
    isRepeat: boolean;
  };

  const { register, setValue, watch, handleSubmit, getValues } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {
      courseId: Number(initialData?.courseId ?? 0),
      weekStartDate: defaultWeek,
      // Default tutorial delivery to 1.0h for happy-path
      deliveryHours: Number(initialData?.deliveryHours ?? initialData?.hours ?? (DEFAULT_TASK_TYPE === 'TUTORIAL' ? 1.0 : 0)),
      description: String(initialData?.description ?? ''),
      taskType: (initialData?.taskType as TimesheetTaskType) ?? DEFAULT_TASK_TYPE,
      qualification: (initialData?.qualification as TutorQualification) ?? DEFAULT_QUALIFICATION,
      isRepeat: Boolean(initialData?.isRepeat),
    },
  });

  // Tutor selection (lecturer mode)
  const [internalTutorId, setInternalTutorId] = useState<number>(() => {
    if (isLecturerCreate) {
      if (selectedTutorId) return selectedTutorId;
      if (tutorOptions.length > 0) return tutorOptions[0].id;
      return 0;
    }
    return tutorId;
  });

  useEffect(() => {
    if (!isLecturerCreate) return;
    if (selectedTutorId && selectedTutorId !== internalTutorId) {
      setInternalTutorId(selectedTutorId);
    }
  }, [isLecturerCreate, selectedTutorId, internalTutorId]);

  const fCourseId = watch('courseId');
  const fWeek = watch('weekStartDate');
  const fTask = watch('taskType');
  const fQual = watch('qualification');
  const fRepeat = watch('isRepeat');
  const fHours = watch('deliveryHours');

  // Keep Tutorial hours fixed at 1.0
  useEffect(() => {
    if (fTask === 'TUTORIAL' && fHours !== 1.0) {
      setValue('deliveryHours', 1.0, { shouldDirty: true, shouldValidate: true });
    }
  }, [fTask]);

  const visibleTutorOptions = useMemo(() => {
    if (!isLecturerMode) return tutorOptions;
    if (!fCourseId || fCourseId <= 0) return tutorOptions;
    const filtered = tutorOptions.filter(t => Array.isArray(t.courseIds) ? t.courseIds.includes(fCourseId) : true);
    return filtered.length > 0 ? filtered : tutorOptions;
  }, [isLecturerMode, tutorOptions, fCourseId]);

  // Filter course options by selected tutor assignments (bi-directional restriction)
  const visibleCourseOptions = useMemo(() => {
    if (!isLecturerMode) return courseOptions;
    const selectedTutor = visibleTutorOptions.find(t => t.id === internalTutorId);
    const allowed = Array.isArray(selectedTutor?.courseIds) ? selectedTutor!.courseIds! : null;
    if (!allowed || allowed.length === 0) return courseOptions;
    const filtered = courseOptions.filter(c => allowed.includes(c.id));
    return filtered.length > 0 ? filtered : courseOptions;
  }, [isLecturerMode, courseOptions, internalTutorId, visibleTutorOptions]);

  // Ensure selected course remains valid when tutor changes
  useEffect(() => {
    if (!isLecturerMode) return;
    const valid = visibleCourseOptions.some(c => c.id === fCourseId);
    if (!valid) {
      const next = visibleCourseOptions[0]?.id ?? 0;
      setValue('courseId', next, { shouldDirty: true });
    }
  }, [isLecturerMode, visibleCourseOptions]);

  // When a tutor is selected in lecturer mode, sync qualification from tutor profile
  useEffect(() => {
    if (!isLecturerMode) return;
    const selected = visibleTutorOptions.find(t => t.id === internalTutorId);
    if (!selected) return;
    const q = (selected.qualification || DEFAULT_QUALIFICATION) as TutorQualification;
    if (q !== fQual) {
      setValue('qualification', q, { shouldDirty: true });
    }
  }, [isLecturerMode, internalTutorId, visibleTutorOptions, fQual, setValue]);

  // Force a fresh quote cycle immediately when the tutor changes in lecturer mode
  // to ensure the request carries the updated tutorId before any subsequent field changes
  useEffect(() => {
    if (!isLecturerMode) return;
    try {
      setQuoteRetryTick((n) => n + 1);
    } catch {}
  }, [isLecturerMode, internalTutorId]);

  // Quote state
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: 'idle', data: null, error: null });
  const controllerRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const ensureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuotedInputRef = useRef<TimesheetQuoteRequest | null>(null);
  const [quoteRetryTick, setQuoteRetryTick] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorChangedAtRef = useRef<number>(0);

  // Field-level error mapping for backend 400 VALIDATION_FAILED
  const deliveryHoursRef = useRef<HTMLInputElement | null>(null);
  const [fieldError, setFieldError] = useState<{ field: 'deliveryHours' | 'weekStartDate' | null; message: string | null }>({ field: null, message: null });

  const resolvedTutorId = isLecturerMode ? internalTutorId : tutorId;
  const rangeText = `Delivery hours must be between ${hoursMin} and ${hoursMax}`;
  const rangeNoteText = `Allowed delivery range: ${hoursMin} to ${hoursMax}`;

  // Deterministic emission of quote on any relevant field change
  useEffect(() => {
    const ready = resolvedTutorId > 0 && fCourseId > 0 && !!fWeek && (fHours || 0) > 0;
    if (!ready) {
      try { controllerRef.current?.abort(); } catch {}
      controllerRef.current = null;
      if (ensureTimerRef.current) { clearTimeout(ensureTimerRef.current); ensureTimerRef.current = null; }
      setQuoteState(prev => (prev.status === 'idle' && prev.data === null && prev.error === null ? prev : { status: 'idle', data: null, error: null }));
      return;
    }

    try { controllerRef.current?.abort(); } catch {}
    const controller = new AbortController();
    controllerRef.current = controller;
    const mySeq = ++seqRef.current;
    setQuoteState(prev => (prev.status === 'loading' ? prev : { status: 'loading', data: prev.data, error: null }));

    const buildLatestPayload = () => {
      const v = getValues();
      const selectedTutor = visibleTutorOptions.find(t => t.id === resolvedTutorId);
      const derivedQual = (selectedTutor?.qualification || v.qualification || DEFAULT_QUALIFICATION) as TutorQualification;
      return {
        tutorId: resolvedTutorId,
        courseId: Number(v.courseId),
        sessionDate: String(v.weekStartDate),
        taskType: v.taskType,
        qualification: derivedQual,
        isRepeat: Boolean(v.isRepeat),
        deliveryHours: Number(v.deliveryHours || 0),
      } as const;
    };

    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); }
    const nowTs = Date.now();
    const sinceTutorChange = nowTs - (tutorChangedAtRef.current || 0);
    const tutorSettleExtra = Math.max(0, 200 - sinceTutorChange);
    const emitDelay = 300 + tutorSettleExtra;
    debounceTimerRef.current = setTimeout(() => {
      TimesheetService.quoteTimesheet(buildLatestPayload(), controller.signal)
        .then(resp => {
          if (!controller.signal.aborted && mySeq === seqRef.current) {
            setQuoteState({ status: 'loaded', data: resp, error: null });
            lastQuotedInputRef.current = buildLatestPayload() as TimesheetQuoteRequest;
          }
        })
        .catch(err => {
          if (controller.signal.aborted || mySeq !== seqRef.current) return;
          const msg = err instanceof Error ? err.message : 'Unable to calculate pay with EA rules.';
          setQuoteState(prev => ({ status: 'error', data: prev.data, error: msg }));
        });
    }, emitDelay);

    // Immediate microtask re-check (skip if within tutor-change settling window)
    const withinTutorSettle = (Date.now() - (tutorChangedAtRef.current || 0)) < 200;
    if (!withinTutorSettle) queueMicrotask(() => {
      if (controllerRef.current && !controllerRef.current.signal.aborted) return;
      if (seqRef.current !== mySeq) return;
      const stillReadyNow = resolvedTutorId > 0 && fCourseId > 0 && !!fWeek && (fHours || 0) > 0;
      if (!stillReadyNow) return;
      const microController = new AbortController();
      controllerRef.current = microController;
      TimesheetService.quoteTimesheet(buildLatestPayload(), microController.signal)
        .then(resp => {
          if (!microController.signal.aborted && seqRef.current === mySeq) {
            setQuoteState({ status: 'loaded', data: resp, error: null });
            lastQuotedInputRef.current = buildLatestPayload() as TimesheetQuoteRequest;
          }
        })
        .catch(() => void 0);
    });

    // Finalization pass: if a rapid sequence cancelled in-flight emission and left us with no preview,
    // schedule one deterministic re-check to ensure exactly one latest quote lands.
    if (ensureTimerRef.current) { clearTimeout(ensureTimerRef.current); }
    ensureTimerRef.current = setTimeout(() => {
      // Do not emit if a request is in-flight or preview already loaded for this sequence
      if (controllerRef.current && !controllerRef.current.signal.aborted) return;
      if (seqRef.current !== mySeq) return;
      const stillReady = resolvedTutorId > 0 && fCourseId > 0 && !!fWeek && (fHours || 0) > 0;
      if (!stillReady) return;
      // Emit a final quote with the latest values; ignore errors silently as the main path handles them
      const finalController = new AbortController();
      controllerRef.current = finalController;
      TimesheetService.quoteTimesheet(buildLatestPayload(), finalController.signal)
        .then(resp => {
          if (!finalController.signal.aborted && seqRef.current === mySeq) {
            setQuoteState({ status: 'loaded', data: resp, error: null });
            lastQuotedInputRef.current = buildLatestPayload() as TimesheetQuoteRequest;
          }
        })
        .catch(() => void 0);
    }, 50);

    // Secondary ensure pass to cover rare timing edges under heavy load
    const secondEnsure = setTimeout(() => {
      if (controllerRef.current && !controllerRef.current.signal.aborted) return;
      if (seqRef.current !== mySeq) return;
      if (!(resolvedTutorId > 0 && fCourseId > 0 && !!fWeek && (fHours || 0) > 0)) return;
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      TimesheetService.quoteTimesheet(buildLatestPayload(), ctrl.signal)
        .then(resp => {
          if (!ctrl.signal.aborted && seqRef.current === mySeq) {
            setQuoteState({ status: 'loaded', data: resp, error: null });
            lastQuotedInputRef.current = buildLatestPayload() as TimesheetQuoteRequest;
          }
        })
        .catch(() => void 0);
    }, 500);

    return () => {
      try { controller.abort(); } catch {};
      if (controllerRef.current === controller) controllerRef.current = null;
      if (ensureTimerRef.current) { clearTimeout(ensureTimerRef.current); ensureTimerRef.current = null; }
      if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
      try { clearTimeout(secondEnsure); } catch {}
    };
  }, [resolvedTutorId, fCourseId, fWeek, fTask, fQual, fRepeat, fHours, quoteRetryTick]);

  // Keep delivery hours synchronized with quoted value (EA-enforced)
  useEffect(() => {
    if (quoteState.status === 'loaded' && quoteState.data) {
      const qh = Number(quoteState.data.deliveryHours);
      if (Number.isFinite(qh) && qh > 0 && qh !== Number(fHours || 0)) {
        setValue('deliveryHours', qh, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [quoteState.status]);

  // Submit handler
  const onFormSubmit = handleSubmit(async () => {
    if (loading) return;
    const v = getValues();
    const selectedTutor = visibleTutorOptions.find(t => t.id === resolvedTutorId);
    const derivedQual = (selectedTutor?.qualification || v.qualification || DEFAULT_QUALIFICATION) as TutorQualification;
    const currentPayload: TimesheetQuoteRequest = {
      tutorId: resolvedTutorId,
      courseId: Number(v.courseId),
      sessionDate: String(v.weekStartDate),
      taskType: v.taskType,
      qualification: derivedQual,
      isRepeat: Boolean(v.isRepeat),
      deliveryHours: Number(v.deliveryHours || 0),
    };

    const sameAsLast = JSON.stringify(currentPayload) === JSON.stringify(lastQuotedInputRef.current);
    if (!sameAsLast) {
      try { controllerRef.current?.abort(); } catch {}
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      setQuoteState(prev => ({ status: 'loading', data: prev.data, error: null }));
      try {
        const fresh = await TimesheetService.quoteTimesheet(currentPayload, ctrl.signal);
        setQuoteState({ status: 'loaded', data: fresh, error: null });
        lastQuotedInputRef.current = currentPayload;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to calculate pay with EA rules.';
        setQuoteState(prev => ({ status: 'error', data: prev.data, error: msg }));
        return; // block submit on failed quote
      }
    }

    const submission: TimesheetFormSubmitData = {
      tutorId: resolvedTutorId,
      courseId: Number(v.courseId),
      weekStartDate: v.weekStartDate,
      sessionDate: (quoteState.data?.sessionDate ?? v.weekStartDate),
      deliveryHours: Number(v.deliveryHours || 0),
      description: v.description,
      taskType: v.taskType,
      qualification: v.qualification,
      isRepeat: v.isRepeat,
    };
    onSubmit(submission);
  });

  // Helpers to keep labels consistent
  const taskTypeLabels: Record<TimesheetTaskType, string> = {
    LECTURE: 'Lecture',
    TUTORIAL: 'Tutorial',
    ORAA: 'ORAA',
    DEMO: 'Demonstration',
    MARKING: 'Marking',
    OTHER: 'Other',
  };
  const qualLabels: Record<TutorQualification, string> = {
    STANDARD: 'Standard Tutor',
    PHD: 'PhD Qualified',
    COORDINATOR: 'Course Coordinator',
  };

  // Field validations
  const numHours = Number(fHours || 0);
  const stepDecimals = (() => {
    const s = String(hoursStep);
    const idx = s.indexOf('.');
    return idx >= 0 ? s.substring(idx + 1).length : 0;
  })();
  const tutorialHoursInvalid = fTask === 'TUTORIAL' && Number.isFinite(numHours) && numHours !== 1.0;
  const lectureHoursInvalid = fTask === 'LECTURE' && (!Number.isFinite(numHours) || Number(numHours) <= 0);
  const rangeInvalid = Number.isFinite(numHours) && (numHours < hoursMin || numHours > hoursMax);
  const decimalsInvalid = (() => {
    if (!Number.isFinite(numHours)) return false;
    const s = String(numHours);
    const idx = s.indexOf('.');
    const places = idx >= 0 ? s.substring(idx + 1).length : 0;
    const allowed = (fTask === 'TUTORIAL') ? 1 : stepDecimals;
    return places > allowed;
  })();
  // Week start cannot be in the future (compare by date only)
  const weekFutureInvalid = (() => {
    if (!fWeek || !/^\d{4}-\d{2}-\d{2}$/.test(fWeek)) return false;
    const todayOnly = new Date(); todayOnly.setHours(0,0,0,0);
    const chosen = new Date(fWeek); chosen.setHours(0,0,0,0);
    return chosen.getTime() > todayOnly.getTime();
  })();
  const disableSubmit = (
    loading ||
    tutorialHoursInvalid ||
    lectureHoursInvalid ||
    rangeInvalid ||
    decimalsInvalid ||
    weekFutureInvalid ||
    !resolvedTutorId || !fCourseId ||
    quoteState.status !== 'loaded' || !!quoteState.error
  );

  const friendlyError = useMemo(() => {
    if (!error) return null;
    const msg = String(error).toLowerCase();
  if (msg.includes('already exists') || (msg.includes('exists') && (msg.includes('tutor') || msg.includes('week')))) {
      return 'A timesheet already exists for this tutor, course, and week';
    }
    return String(error);
  }, [error]);

  // Map common validation error patterns to field-level error + focus
  useEffect(() => {
    if (!error) {
      setFieldError({ field: null, message: null });
      return;
    }
    const msg = String(error);
    if (/delivery\s*hours/i.test(msg)) {
      setFieldError({ field: 'deliveryHours', message: msg });
      try { deliveryHoursRef.current?.focus(); } catch {}
    } else if (/already\s*exists/i.test(msg) || /week/i.test(msg)) {
      setFieldError({ field: 'weekStartDate', message: msg });
    } else {
      setFieldError({ field: null, message: null });
    }
  }, [error]);

  // Listen for explicit field error events from create hooks (e.g., 409 duplicate-week)
  useEffect(() => {
    function onCreateFieldError(ev: Event) {
      try {
        const detail = (ev as CustomEvent<{ field?: string; message?: string }>).detail || {} as any;
        if (detail.field === 'weekStartDate' && detail.message) {
          setFieldError({ field: 'weekStartDate', message: String(detail.message) });
        } else if (detail.field === 'deliveryHours' && detail.message) {
          setFieldError({ field: 'deliveryHours', message: String(detail.message) });
          try { deliveryHoursRef.current?.focus(); } catch {}
        }
      } catch {}
    }
    window.addEventListener('catams-create-field-error', onCreateFieldError as EventListener);
    return () => window.removeEventListener('catams-create-field-error', onCreateFieldError as EventListener);
  }, []);

  return (
    <Card className="timesheet-form-modal p-6" data-testid={isLecturerCreate ? 'lecturer-create-modal-content' : undefined} aria-hidden="false">
      <div data-testid="lecturer-create-modal-anchor" aria-busy="false" style={{ display: 'none' }} />
  <CardHeader className="p-0 mb-4">
    <CardTitle className="text-xl font-semibold">{isEdit ? 'Edit Timesheet' : 'New Timesheet Form'}</CardTitle>
  </CardHeader>

      {friendlyError && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">{friendlyError}</div>
      )}

      {/* Rejection feedback (edit mode) */}
  {isEdit && initialData?.status === 'REJECTED' && initialData?.rejectionReason && (
    <div data-testid="rejection-feedback-section" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p data-testid="rejection-feedback-title" className="text-sm font-semibold text-amber-900">Lecturer Feedback</p>
      <p data-testid="rejection-feedback-content" className="text-sm text-amber-900/90">{String(initialData.rejectionReason)}</p>
    </div>
  )}

      {optionsLoading && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground" role="status">
          <LoadingSpinner size="small" />
          <span>Loading available options…</span>
        </div>
      )}

      {quoteState.status === 'error' && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <span>{quoteState.error ?? 'Unable to calculate pay with EA rules.'}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuoteRetryTick(t => t + 1)}>Retry quote</Button>
        </div>
      )}

      {/* Inline field errors with stable ids */}
      {lectureHoursInvalid && (
        <div className="text-xs text-destructive" role="alert" data-testid="field-error-deliveryHours">
          Lecture delivery hours must be between {hoursMin} and {hoursMax}
        </div>
      )}
      {weekFutureInvalid && (
        <div className="text-xs text-destructive" role="alert" data-testid="field-error-weekStartDate">
          Week start date cannot be in the future
        </div>
      )}

      <form
        onSubmit={onFormSubmit}
        className="space-y-4"
        aria-label="Create Timesheet"
        data-testid="edit-timesheet-form"
      >
        {/* Course */}
        <div className="form-field space-y-1">
          <label htmlFor="course" className="text-sm font-medium">Course</label>
          <select
            id="course"
            data-testid={isLecturerMode ? 'create-course-select' : undefined}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={visibleCourseOptions.length === 0}
            value={fCourseId}
            onChange={(e) => setValue('courseId', Number(e.target.value), { shouldDirty: true })}
          >
            <option value={0}>Select a course</option>
            {visibleCourseOptions.map(co => (
              <option key={co.id} value={co.id}>{co.label}</option>
            ))}
          </select>
          {visibleCourseOptions.length === 0 && (
            <div data-testid="course-empty-state" className="text-xs text-muted-foreground">No active courses found</div>
          )}
        </div>

        {/* Tutor (lecturer mode) */}
        {isLecturerMode && (
          <div className="form-field space-y-1" data-testid="lecturer-timesheet-tutor-selector">
            <label htmlFor="tutor" className="text-sm font-medium">Tutor</label>
            <select
              id="tutor"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={internalTutorId}
              disabled={tutorOptions.length === 0}
              data-testid={isLecturerMode ? 'create-tutor-select' : undefined}
              onChange={(e) => {
                const v = Number(e.target.value);
                setInternalTutorId(v);
                onTutorChange?.(v);
                // Immediately sync qualification and trigger a fresh quote cycle
                try {
                  const selected = visibleTutorOptions.find(t => t.id === v);
                  const q = (selected?.qualification || DEFAULT_QUALIFICATION) as TutorQualification;
                  if (q !== fQual) {
                    setValue('qualification', q, { shouldDirty: true });
                  }
                } catch {}
                try { setQuoteRetryTick((n) => n + 1); } catch {}
              }}
            >
              {visibleTutorOptions.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            {tutorOptions.length === 0 && (
              <div data-testid="tutor-empty-state" className="text-xs text-muted-foreground">No tutors are currently assigned</div>
            )}
          </div>
        )}

        {/* Week Starting */}
        <div className="form-field space-y-1">
          <label htmlFor="week-start" className="text-sm font-medium">Week Starting</label>
          <div className="flex gap-2 items-center">
            <span data-testid="calendar-month-label" className="text-xs text-muted-foreground">
              {(() => {
                const d = fWeek && /^\d{4}-\d{2}-\d{2}$/.test(fWeek) ? new Date(fWeek) : new Date();
                return new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' }).format(d);
              })()}
            </span>
            <Input
              id="week-start"
              name="weekStartDate"
              type="text"
              placeholder="YYYY-MM-DD"
              value={fWeek}
              onChange={(e) => setValue('weekStartDate', e.target.value, { shouldDirty: true })}
              data-testid={isLecturerMode ? 'create-week-start-input' : undefined}
              aria-invalid={fieldError.field === 'weekStartDate' ? 'true' : undefined}
              aria-describedby={fieldError.field === 'weekStartDate' ? 'week-start-inline-error' : undefined}
            />
            {weekFutureInvalid && (
              <div className="text-xs text-destructive" role="alert">Week start cannot be in the future</div>
            )}
            {/* Selected label to support E2E checks */}
            <span className="text-xs text-muted-foreground" data-testid="calendar-selected-label">
              {(() => {
                try {
                  if (!fWeek || !/^\d{4}-\d{2}-\d{2}$/.test(fWeek)) return '';
                  const d = new Date(fWeek);
                  const label = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
                  return `Selected: ${label}`;
                } catch { return ''; }
              })()}
            </span>
            <Button type="button" variant="outline" size="xs" title="First Monday of previous month" onClick={() => {
              // First Monday of previous month
              const base = fWeek && /^\d{4}-\d{2}-\d{2}$/.test(fWeek) ? new Date(fWeek) : new Date();
              const prevMonth = new Date(base.getFullYear(), base.getMonth() - 1, 1);
              while (prevMonth.getDay() !== 1) prevMonth.setDate(prevMonth.getDate() + 1);
              setValue('weekStartDate', formatISO(prevMonth), { shouldDirty: true });
            }}>Prev Month</Button>
            <Button type="button" variant="outline" size="xs" title="Previous Monday" onClick={() => {
              const base = fWeek && /^\d{4}-\d{2}-\d{2}$/.test(fWeek) ? new Date(fWeek) : new Date();
              const prev = new Date(base.getTime() - 24*3600*1000);
              while (prev.getDay() !== 1) prev.setDate(prev.getDate() - 1);
              setValue('weekStartDate', formatISO(prev), { shouldDirty: true });
            }}>Prev Monday</Button>
            <Button type="button" variant="outline" size="xs" title="Next Monday" onClick={() => {
              const base = fWeek && /^\d{4}-\d{2}-\d{2}$/.test(fWeek) ? new Date(fWeek) : new Date();
              const next = new Date(base.getTime() + 24*3600*1000);
              while (next.getDay() !== 1) next.setDate(next.getDate() + 1);
              setValue('weekStartDate', formatISO(next), { shouldDirty: true });
            }}>Next Monday</Button>
          </div>
          {mondayOnly && (
            <p className="text-xs text-muted-foreground">Select a Monday to start your week</p>
          )}
          {weekFutureInvalid && (
            <p id="week-start-error" className="text-xs text-destructive" role="alert">Week start date cannot be in the future</p>
          )}
          {fieldError.field === 'weekStartDate' && fieldError.message && (
            <div
              id="week-start-inline-error"
              className="text-xs text-destructive"
              role="alert"
              data-testid="field-error-weekStartDate-inline"
            >
              {fieldError.message}
            </div>
          )}
          {!fieldError.message && friendlyError && /already\s*exists|timesheet\s+.*exists/i.test(String(friendlyError)) && (
            <div
              id="week-start-inline-error"
              className="text-xs text-destructive"
              role="alert"
              data-testid="field-error-weekStartDate-inline"
            >
              {String(friendlyError)}
            </div>
          )}
          {!fieldError.message && !friendlyError && error && /exists/i.test(String(error)) && (
            <div
              id="week-start-inline-error"
              className="text-xs text-destructive"
              role="alert"
              data-testid="field-error-weekStartDate-inline"
            >
              {String(error)}
            </div>
          )}
        </div>

        {/* Task Type */}
        <div className="form-field space-y-1">
          <label htmlFor="task-type" className="text-sm font-medium">Task Type</label>
          {isLecturerMode ? (
            <select
              id="task-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={fTask}
              data-testid={isLecturerMode ? 'create-task-type-select' : undefined}
              onChange={(e) => setValue('taskType', e.target.value as TimesheetTaskType, { shouldDirty: true })}
            >
              {Object.keys(taskTypeLabels).map(key => (
                <option key={key} value={key}>{taskTypeLabels[key as TimesheetTaskType]}</option>
              ))}
            </select>
          ) : (
            <Input id="task-type" type="text" value={taskTypeLabels[fTask]} readOnly aria-readonly="true" disabled />
          )}
        </div>

        {/* Qualification */}
        <div className="form-field space-y-1">
          <label htmlFor="qualification" className="text-sm font-medium">Tutor Qualification</label>
          {isLecturerMode ? (
            <select
              id="qualification"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={fQual}
              data-testid="create-qualification-select"
              aria-readonly="true"
              disabled
              readOnly
              onChange={(e) => setValue('qualification', e.target.value as TutorQualification, { shouldDirty: true })}
            >
              {Object.keys(qualLabels).map(key => (
                <option key={key} value={key}>{qualLabels[key as TutorQualification]}</option>
              ))}
            </select>
          ) : (
            <Input
              id="qualification"
              type="text"
              value={qualLabels[fQual]}
              readOnly
              aria-readonly="true"
              disabled
            />
          )}
        </div>

        {/* Repeat */}
        <div className="flex items-start gap-2">
          <input
            id="is-repeat"
            name="isRepeat"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary"
            checked={fRepeat}
            onChange={(e) => setValue('isRepeat', e.target.checked, { shouldDirty: true })}
            data-testid={isLecturerMode ? 'create-repeat-checkbox' : undefined}
          />
          <div className="space-y-1">
            <label htmlFor="is-repeat" className="text-sm font-medium leading-none">Repeat session within seven days</label>
            <p className="text-xs text-muted-foreground">Select only when the same content is delivered again within 7 days for a different group.</p>
          </div>
        </div>

        {/* Delivery Hours */}
        <div className="form-field space-y-1">
          <label htmlFor="delivery-hours" className="text-sm font-medium">Delivery Hours</label>
          <Input
            id="delivery-hours"
            name="deliveryHours"
            type="number"
            step={hoursStep}
            min={hoursMin}
            max={hoursMax}
            value={fTask === 'TUTORIAL' ? 1.0 : (fHours || '')}
            disabled={fTask === 'TUTORIAL'}
            onChange={(e) => setValue('deliveryHours', parseFloat(e.target.value) || 0, { shouldDirty: true })}
            data-testid={isLecturerMode ? 'create-delivery-hours-input' : undefined}
            ref={deliveryHoursRef as any}
            aria-invalid={fieldError.field === 'deliveryHours' ? 'true' : undefined}
          />
          <span className="text-xs text-muted-foreground">
            {fTask === 'TUTORIAL'
              ? 'Tutorial delivery is fixed at 1.0h; associated time is added per EA Schedule 1.'
              : `Enter the in-class delivery hours (${hoursMin} - ${hoursMax})`}
          </span>
          {rangeInvalid && (
            <div className="text-xs text-destructive" role="alert" data-testid="field-error-deliveryHours">{rangeText}</div>
          )}
          {lectureHoursInvalid && fTask === 'LECTURE' && (
            <div className="text-xs text-destructive" role="alert">Lecture delivery hours must be greater than 0.</div>
          )}
          {fieldError.field === 'deliveryHours' && (
            <div className="text-xs text-destructive" role="alert">{fieldError.message}</div>
          )}
          <p className="text-xs text-muted-foreground" role="note">{rangeNoteText}</p>
          {decimalsInvalid && (
            <p id="delivery-hours-error" className="text-xs text-destructive" role="alert">Delivery hours must have at most 1 decimal place</p>
          )}
          {rangeInvalid && (
            <p id="delivery-hours-error" className="text-xs text-destructive" role="alert">{rangeText}</p>
          )}
        </div>

        {/* Description */}
        <div className="form-field space-y-1">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <Input
            id="description"
            type="text"
            value={watch('description')}
            onChange={(e) => setValue('description', e.target.value, { shouldDirty: true })}
            data-testid={isLecturerMode ? 'create-description-input' : undefined}
          />
        </div>

        {/* Calculated Pay Summary */}
        <h3 className="text-sm font-semibold mb-1">Calculated Pay Summary</h3>
        <div className="rounded-md border border-border p-3 space-y-1" aria-live="polite">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Rate Code</p>
            <p>{quoteState.data?.rateCode ?? '-'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Qualification</p>
            <p>{quoteState.data?.qualification ?? '-'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Associated Hours</p>
            <p>{quoteState.data ? Number(quoteState.data.associatedHours) : '-'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Payable Hours</p>
            <p>{quoteState.data ? Number(quoteState.data.payableHours) : '-'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Formula</p>
            <p className="text-xs">{quoteState.data?.formula ?? '-'}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Clause</p>
            <p className="text-xs">{quoteState.data?.clauseReference ?? '-'}</p>
          </div>
        </div>

        {tutorialHoursInvalid && (
          <div className="text-xs text-destructive" role="alert">Tutorial delivery hours must be 1.0</div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={disableSubmit}
            data-testid={isLecturerCreate ? 'lecturer-create-submit-btn' : undefined}
          >
            {loading ? 'Saving…' : isEdit ? 'Update Timesheet' : 'Create Timesheet'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          {quoteState.status === 'loading' && <LoadingSpinner size="small" />}
        </div>
      </form>
    </Card>
  );
});

export default TimesheetForm;

// Back-compat for existing imports
export type TimesheetFormState = {
  courseId: number;
  weekStartDate: string;
  deliveryHours: number;
  description: string;
  taskType: TimesheetTaskType;
  qualification: TutorQualification;
  isRepeat: boolean;
};

