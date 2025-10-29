import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminRejectionModal from './AdminRejectionModal';
import type { Timesheet } from '../../../../types/api';
import type { ActionState } from '../../../../types/dashboard/admin-dashboard';

function buildTimesheet(partial: Partial<Timesheet> = {}): Timesheet {
  return {
    id: 42,
    tutorId: 7,
    courseId: 11,
    weekStartDate: '2025-04-07',
    hours: 6,
    hourlyRate: 55,
    description: 'Weekly tutorial delivery',
    status: 'LECTURER_CONFIRMED',
    createdAt: '2025-04-07T00:00:00Z',
    updatedAt: '2025-04-07T00:00:00Z',
    tutorName: 'Alex Tutor',
    courseName: 'COMP1234',
    lecturerName: 'Dr. Smith',
    ...partial,
  } as Timesheet;
}

const defaultActionState: ActionState = {
  loadingId: null,
  isSubmitting: false,
};

describe('AdminRejectionModal accessibility', () => {
  it('keeps keyboard focus trapped within the modal', async () => {
    const user = userEvent.setup();

    render(
      <AdminRejectionModal
        open
        timesheetId={42}
        targetTimesheet={buildTimesheet()}
        comment=""
        validationError={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        onCommentChange={vi.fn()}
        actionState={defaultActionState}
        mode="reject"
      />,
    );

    const commentField = await screen.findByLabelText(/reason for rejection/i);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /reject timesheet/i });
    const focusableElements = [commentField, cancelButton, confirmButton];

    expect(commentField).toHaveFocus();

    for (let index = 0; index < focusableElements.length * 3; index += 1) {
      await user.tab();
      expect(focusableElements).toContain(document.activeElement);
    }
  });

  it('invokes onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(
      <AdminRejectionModal
        open
        timesheetId={42}
        targetTimesheet={buildTimesheet()}
        comment=""
        validationError={null}
        onCancel={handleCancel}
        onSubmit={vi.fn()}
        onCommentChange={vi.fn()}
        actionState={defaultActionState}
        mode="reject"
      />,
    );

    await user.keyboard('{Escape}');

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
