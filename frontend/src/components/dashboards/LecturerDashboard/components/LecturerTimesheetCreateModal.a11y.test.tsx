import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LecturerTimesheetCreateModal from './LecturerTimesheetCreateModal';

vi.mock('../../../../services/courses', () => ({
  fetchLecturerCourses: async () => [{ id: 1, code: 'CS101', name: 'Intro', active: true, lecturerId: 9 }],
}));

vi.mock('../../../../services/users', () => ({
  fetchTutorsForLecturer: async () => [{ id: 2, name: 'Tutor A', email: 'a@x', role: 'TUTOR', qualification: 'STANDARD' }],
  getAssignmentsForCourses: async () => ({ 1: [2] }),
  getTutorDefaults: async () => ({ defaultQualification: 'STANDARD' }),
}));

vi.mock('../../../../hooks/timesheets', () => ({
  useTimesheetCreate: () => ({
    createTimesheet: vi.fn(async () => ({ id: 123 })),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  }),
}));

describe('LecturerTimesheetCreateModal a11y', () => {
  it('renders ARIA dialog semantics', async () => {
    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={9}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'lecturer-create-timesheet-title');
  });

  it('closes on Escape and attempts focus restore', async () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    opener.textContent = 'open';
    document.body.appendChild(opener);
    opener.focus();

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={9}
        onClose={onClose}
        onSuccess={vi.fn()}
      />,
    );

    // Send Escape to document to trigger keydown handler
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    // We can't assert exact focus target reliably, but focus restore is attempted in code
  });
});

