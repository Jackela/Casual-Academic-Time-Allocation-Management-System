import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LecturerTimesheetCreateModal from './LecturerTimesheetCreateModal';

vi.mock('../../../../services/courses', () => ({
  fetchLecturerCourses: vi.fn(async () => []),
  fetchAllCourses: vi.fn(async () => [
    { id: 1, code: 'CS101', name: 'Intro', active: true, lecturerId: 999 },
    { id: 2, code: 'CS102', name: 'DSA', active: true, lecturerId: 999 },
  ]),
}));

vi.mock('../../../../services/users', async (orig) => {
  const actual = await vi.importActual<any>('../../../../services/users');
  return {
    ...actual,
    fetchTutorsForLecturer: vi.fn(async () => [
      { id: 10, email: 't@x', name: 'Tutor One', role: 'TUTOR', isActive: true },
    ]),
    getLecturerAssignments: vi.fn(async (_lecturerId: number) => [1]),
    getTutorDefaults: vi.fn(async () => ({ defaultQualification: 'STANDARD' })),
    getAssignmentsForCourses: vi.fn(async () => ({ 1: [10] })),
  };
});

describe('LecturerTimesheetCreateModal – course source via assignments', () => {
  it('uses lecturer assignments + all courses when available (instead of Course.lecturerId)', async () => {
    render(
      <LecturerTimesheetCreateModal
        isOpen={true}
        lecturerId={99}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    // Wait for resources to load
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());

    const courseSelect = await screen.findByLabelText(/Course/i, { selector: 'select' });
    const options = Array.from(courseSelect.querySelectorAll('option')).map(o => o.textContent?.trim());
    // Should include only course 1 from assignments, not all courses
    expect(options.some(t => t?.includes('CS101'))).toBe(true);
    expect(options.some(t => t?.includes('CS102'))).toBe(false);
  });
});
