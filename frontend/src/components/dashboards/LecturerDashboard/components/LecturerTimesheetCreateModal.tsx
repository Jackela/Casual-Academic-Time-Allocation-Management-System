import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TimesheetForm, {
  type TimesheetFormSubmitData,
  type TimesheetFormCourseOption,
  type TimesheetFormTutorOption,
} from '../../TutorDashboard/components/TimesheetForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../ui/card';
import { Button } from '../../../ui/button';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
import { secureLogger } from '../../../../utils/secure-logger';
import { fetchLecturerCourses } from '../../../../services/courses';
import { fetchTutorsForLecturer } from '../../../../services/users';
import { useTimesheetCreate } from '../../../../hooks/timesheets';
import { dispatchNotification } from '../../../../lib/routing/notificationRouter';

interface LecturerTimesheetCreateModalProps {
  isOpen: boolean;
  lecturerId: number;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const LecturerTimesheetCreateModal = memo<LecturerTimesheetCreateModalProps>(
  ({ isOpen, lecturerId, onClose, onSuccess }) => {
    const [courseOptions, setCourseOptions] = useState<TimesheetFormCourseOption[]>([]);
    const [tutorOptions, setTutorOptions] = useState<TimesheetFormTutorOption[]>([]);
    const [selectedTutorId, setSelectedTutorId] = useState<number | null>(null);
    const [loadingResources, setLoadingResources] = useState(isOpen);
    const [resourceError, setResourceError] = useState<string | null>(null);

    const {
      createTimesheet,
      loading: createLoading,
      error: createError,
      reset,
    } = useTimesheetCreate();

    useEffect(() => {
      if (isOpen) {
        setCourseOptions([]);
        setTutorOptions([]);
        setSelectedTutorId(null);
        setLoadingResources(true);
        setResourceError(null);
      } else {
        setLoadingResources(false);
      }
    }, [isOpen]);

    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
      if (!isOpen || !lecturerId) {
        return;
      }

      let cancelled = false;
      setLoadingResources(true);
      setResourceError(null);

      const loadResources = async () => {
        try {
          const [coursesRaw, tutorsRaw] = await Promise.all([
            fetchLecturerCourses(lecturerId),
            fetchTutorsForLecturer(lecturerId),
          ]);

          // Be resilient to unexpected shapes to avoid runtime crashes
          const courses = Array.isArray(coursesRaw) ? coursesRaw : [];
          const tutors = Array.isArray(tutorsRaw) ? tutorsRaw : [];

          if (cancelled) {
            return;
          }

          const mappedCourses: TimesheetFormCourseOption[] = courses.map((course) => ({
            id: course.id,
            label: course.code ? `${course.code} - ${course.name}` : course.name,
          }));

          // Build assignment map: courseId -> Set<tutorId>
          const courseToTutors = new Map<number, Set<number>>();
          try {
            const { getAssignmentsForCourses } = await import('../../../../services/users');
            const ids = (courses || []).map(c => c.id);
            const map = await getAssignmentsForCourses(ids);
            Object.entries(map).forEach(([courseId, tutorIds]) => {
              courseToTutors.set(Number(courseId), new Set(tutorIds));
            });
          } catch {
            // Fallback: no filtering by assignment if bulk endpoint fails
          }

          // Optionally hydrate defaultQualification for tutors lacking qualification
          const mappedTutors: TimesheetFormTutorOption[] = await Promise.all(tutors.map(async (tutor) => {
            const courseIds: number[] = [];
            courseToTutors.forEach((ids, cId) => { if (ids.has(tutor.id)) courseIds.push(cId); });
            let qualification = tutor.qualification ?? null;
            if (!qualification) {
              try {
                const { getTutorDefaults } = await import('../../../../services/users');
                const defaults = await getTutorDefaults(tutor.id);
                qualification = defaults.defaultQualification ?? null;
              } catch {}
            }
            return {
              id: tutor.id,
              label: tutor.displayName ?? tutor.name ?? tutor.email,
              qualification,
              courseIds,
            };
          }));

          setCourseOptions(mappedCourses);
          setTutorOptions(mappedTutors);
          setSelectedTutorId((current) => {
            if (current && mappedTutors.some((option) => option.id === current)) {
              return current;
            }
            // FIX: Default to first tutor when multiple tutors exist
            return mappedTutors[0]?.id ?? null;
          });
        } catch (error) {
          if (cancelled) {
            return;
          }
          const message =
            error instanceof Error ? error.message : 'Unable to load lecturer resources.';
          setResourceError(message);
          secureLogger.error('Failed to load lecturer timesheet resources', error);
        } finally {
          if (!cancelled) {
            setLoadingResources(false);
          }
        }
      };

      void loadResources();

      return () => {
        cancelled = true;
      };
    }, [isOpen, lecturerId, reloadTick]);

    // Focus management & keyboard support
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const prevFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
      if (isOpen) {
        try {
          prevFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
        } catch {}
        // Focus the dialog
        const id = requestAnimationFrame(() => {
          dialogRef.current?.focus();
        });
        return () => cancelAnimationFrame(id);
      }
      return;
    }, [isOpen]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // call close
        try {
          (handleClose as any)();
        } catch {}
      } else if (e.key === 'Tab') {
        // focus trap within dialog content
        const container = dialogRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }, [isOpen]);

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);

    const handleClose = useCallback(() => {
      if (createLoading) {
        return;
      }
      reset();
      setResourceError(null);
      onClose();
      // attempt to restore focus to the element that opened the dialog
      try {
        prevFocusedRef.current?.focus();
      } catch {}
    }, [createLoading, onClose, reset]);

    const courseLookup = useMemo(() => new Map(courseOptions.map((course) => [course.id, course.label])), [courseOptions]);
    const tutorLookup = useMemo(() => new Map(tutorOptions.map((tutor) => [tutor.id, tutor.label])), [tutorOptions]);

    const handleSubmit = useCallback(
      async (formData: TimesheetFormSubmitData) => {
        try {
          const created = await createTimesheet({
            tutorId: formData.tutorId,
            courseId: formData.courseId,
            weekStartDate: formData.weekStartDate,
            sessionDate: formData.sessionDate ?? formData.weekStartDate,
            deliveryHours: formData.deliveryHours,
            description: formData.description,
            taskType: formData.taskType,
            qualification: formData.qualification,
            isRepeat: formData.isRepeat,
          });

          const tutorLabel = tutorLookup.get(formData.tutorId);
          const courseLabel = courseLookup.get(formData.courseId);

          // First, notify creation success
          dispatchNotification({
            type: 'TIMESHEET_CREATE_SUCCESS',
            tutorName: tutorLabel,
            courseName: courseLabel,
          });

          // Auto-submit for tutor confirmation to move from DRAFT → PENDING_TUTOR_CONFIRMATION
          // Fire-and-forget: do not block close flow on submission
          (async () => {
            const { TimesheetService } = await import('../../../../services/timesheets');
            const submit = async () => {
              await TimesheetService.approveTimesheet({
                timesheetId: created.id,
                action: 'SUBMIT_FOR_APPROVAL',
              });
            };
            try {
              await submit();
              dispatchNotification({ type: 'TIMESHEET_SUBMIT_SUCCESS', count: 1 });
            } catch (firstErr) {
              // Quick transient retry once
              try {
                await submit();
                dispatchNotification({ type: 'TIMESHEET_SUBMIT_SUCCESS', count: 1 });
              } catch (secondErr) {
                // Non-blocking: keep the draft and provide a retry CTA
                secureLogger.warn('Auto-submit after creation failed', secondErr);
                dispatchNotification({
                  type: 'DRAFTS_PENDING',
                  count: 1,
                  onSubmitDrafts: async () => {
                    await submit();
                    dispatchNotification({ type: 'TIMESHEET_SUBMIT_SUCCESS', count: 1 });
                  },
                });
              }
            }
          })();

          await onSuccess?.();
          reset();
          onClose();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create timesheet';
        secureLogger.error('Lecturer timesheet creation failed', error);
        try {
          const evt = new CustomEvent('catams-create-field-error', {
            detail: { field: 'weekStartDate', message },
          } as CustomEventInit);
          window.dispatchEvent(evt);
        } catch {}
        dispatchNotification({ type: 'API_ERROR', message });
      }
      },
      [createTimesheet, courseLookup, onClose, onSuccess, reset, tutorLookup],
    );

    const overlayClasses = isOpen
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 elevation-modal'
      : 'fixed inset-0 z-50 hidden bg-black/50 p-4 elevation-modal';

    return (
      <div
        className={overlayClasses}
        data-testid="lecturer-create-modal"
        tabIndex={-1}
        aria-hidden={isOpen ? 'false' : 'true'}
      >
        <Card
          id="lecturer-create-timesheet-modal"
          className="w-full max-w-2xl focus:outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lecturer-create-timesheet-title"
          tabIndex={-1}
          ref={dialogRef as any}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle id="lecturer-create-timesheet-title">Create Timesheet</CardTitle>
                <CardDescription>
                  Create a new timesheet on behalf of an assigned tutor.
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={handleClose} disabled={createLoading}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {resourceError && (
              <div className="mb-4 flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive" role="alert">
                <span>{resourceError}</span>
                <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>Retry</Button>
              </div>
            )}

            {/* Empty-state guidance: explain that Admin assignments are required before creation */}
            {!loadingResources && !resourceError && (courseOptions.length === 0 || tutorOptions.length === 0) && (
              <div
                className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                role="note"
                data-testid="lecturer-create-empty-hint"
              >
                <p className="mb-1">
                  No courses or assigned tutors were found for your account.
                </p>
                <p>
                  To create a timesheet, an Administrator must set up course ↔ tutor assignments in the Admin UI (Users → Assignments).
                  If you have admin access, please add the assignment(s) first, then return here.
                </p>
                {/* zh-CN helper */}
                <p className="mt-2 text-xs text-slate-600">
                  提示：需先在 Admin 界面的「Users」中完成课程与导师（Assignment）的关联后，才能在此创建 Timesheet。
                </p>
              </div>
            )}

            <TimesheetForm
              mode="lecturer-create"
              tutorId={selectedTutorId ?? 0}
              selectedTutorId={selectedTutorId}
              tutorOptions={tutorOptions}
              onTutorChange={setSelectedTutorId}
              courseOptions={courseOptions}
              isEdit={false}
              initialData={undefined}
              loading={createLoading || loadingResources}
              optionsLoading={loadingResources}
              error={createError}
              onSubmit={handleSubmit}
              onCancel={handleClose}
            />

            {createLoading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <LoadingSpinner size="small" />
                <span>Creating timesheet…</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
);

LecturerTimesheetCreateModal.displayName = 'LecturerTimesheetCreateModal';

export default LecturerTimesheetCreateModal;
