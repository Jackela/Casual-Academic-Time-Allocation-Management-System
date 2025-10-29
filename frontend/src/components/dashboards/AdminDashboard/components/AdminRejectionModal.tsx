import { memo, useEffect, useRef } from 'react';
import LoadingSpinner from '../../../shared/LoadingSpinner/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../ui/card';
import { Button } from '../../../ui/button';
import type { Timesheet } from '../../../../types/api';
import type { ActionState } from '../../../../types/dashboard/admin-dashboard';

interface AdminRejectionModalProps {
  open: boolean;
  timesheetId: number | null;
  targetTimesheet: Timesheet | null;
  comment: string;
  validationError: string | null;
  onCancel: () => void;
  onSubmit: () => void;
  onCommentChange: (value: string) => void;
  actionState: ActionState;
  mode: 'reject' | 'request';
}

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter((element) =>
    !element.hasAttribute('disabled') &&
    element.tabIndex !== -1 &&
    element.getAttribute('aria-hidden') !== 'true',
  );
}

const COPY = {
  reject: {
    title: 'Confirm Emergency Action',
    description: 'Provide a brief justification before rejecting this timesheet. Your note will be shared with the tutor and lecturer.',
    commentLabel: 'Reason for rejection:',
    placeholder: 'e.g., Adjust the recorded hours to match the signed log sheet.',
    confirmLabel: 'Reject Timesheet',
    confirmTitle: 'Confirm rejection action',
    confirmVariant: 'destructive' as const,
    processingLabel: 'Processing…',
    confirmProcessingMessage: 'Processing rejection. Please wait…',
    confirmValidationMessage: 'Add at least a short justification before rejecting the timesheet.',
  },
  request: {
    title: 'Request Changes',
    description: 'Share specific guidance so the tutor can update this timesheet.',
    commentLabel: 'Guidance for tutor:',
    placeholder: 'e.g., Please include associated grading hours before resubmitting.',
    confirmLabel: 'Send Request',
    confirmTitle: 'Send modification request',
    confirmVariant: 'default' as const,
    processingLabel: 'Sending…',
    confirmProcessingMessage: 'Sending request. Please wait…',
    confirmValidationMessage: 'Add a short note before requesting changes.',
  },
} as const;

const AdminRejectionModal = memo<AdminRejectionModalProps>(({
  open,
  timesheetId,
  targetTimesheet,
  comment,
  validationError,
  onCancel,
  onSubmit,
  onCommentChange,
  actionState,
  mode,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const copy = COPY[mode];

  useEffect(() => {
    if (!open) {
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus({ preventScroll: true });
        previouslyFocusedElement.current = null;
      }
      return;
    }

    if (!dialogRef.current) {
      return;
    }

    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusFirstElement = () => {
      const focusTargets = getFocusableElements(dialogRef.current);
      if (focusTargets.length > 0) {
        focusTargets[0].focus({ preventScroll: true });
      } else {
        dialogRef.current?.focus({ preventScroll: true });
      }
    };

    focusFirstElement();
    const rafId = window.requestAnimationFrame(focusFirstElement);

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialogRef.current) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        focusFirstElement();
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const currentIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;

      if (event.shiftKey) {
        const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        event.preventDefault();
        focusableElements[nextIndex].focus({ preventScroll: true });
      } else {
        const nextIndex =
          currentIndex >= focusableElements.length - 1 || currentIndex === -1
            ? 0
            : currentIndex + 1;
        event.preventDefault();
        focusableElements[nextIndex].focus({ preventScroll: true });
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  const modalTitleId = `admin-${mode}-modal-title`;
  const modalDescriptionId = `admin-${mode}-modal-description`;
  const textareaId = `admin-${mode}-comment`;
  const isSubmitting = actionState.loadingId === timesheetId || actionState.isSubmitting;
  const trimmedComment = comment.trim();
  const isCommentTooShort = trimmedComment.length < 3;
  const isConfirmDisabled = isSubmitting || isCommentTooShort || Boolean(validationError);
  const confirmDisabledReason = (() => {
    if (isSubmitting) {
      return copy.confirmProcessingMessage;
    }
    if (validationError) {
      return validationError;
    }
    if (isCommentTooShort) {
      return copy.confirmValidationMessage;
    }
    return undefined;
  })();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 elevation-overlay"
      style={{ backgroundColor: 'var(--overlay-backdrop)' }}
      role="presentation"
    >
      <Card
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        aria-describedby={modalDescriptionId}
        tabIndex={-1}
        className="w-full max-w-lg focus:outline-none"
      >
        <CardHeader>
          <CardTitle id={modalTitleId}>{copy.title}</CardTitle>
          <CardDescription id={modalDescriptionId}>
            {copy.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {targetTimesheet && (
            <div className="mb-4 rounded-md border border-muted bg-muted/40 p-4 text-sm">
              <p className="font-semibold">{targetTimesheet.tutorName ?? 'Tutor'} · {targetTimesheet.courseName ?? 'Course'}</p>
              <p className="text-muted-foreground">
                Week starting {targetTimesheet.weekStartDate} · {targetTimesheet.description}
              </p>
            </div>
          )}
          <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
            {copy.commentLabel}
          </label>
          <textarea
            id={textareaId}
            name={textareaId}
            rows={4}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={copy.placeholder}
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            disabled={isSubmitting}
          />
          {validationError && (
            <p className="mt-2 text-sm text-destructive">{validationError}</p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!isSubmitting) {
                  onCancel();
                }
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={copy.confirmVariant}
              onClick={() => {
                if (!isConfirmDisabled) {
                  onSubmit();
                }
              }}
              disabled={isConfirmDisabled}
              title={isConfirmDisabled ? confirmDisabledReason : copy.confirmTitle}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="small" />
                  <span>{copy.processingLabel}</span>
                </div>
              ) : (
                copy.confirmLabel
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AdminRejectionModal.displayName = 'AdminRejectionModal';

export default AdminRejectionModal;




