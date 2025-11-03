import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LecturerTimesheetCreateModal from './LecturerTimesheetCreateModal';

const TimesheetFormMock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="timesheet-form-mock" />),
);

vi.mock('../../TutorDashboard/components/TimesheetForm', () => ({
  __esModule: true,
  default: TimesheetFormMock,
}));

const fetchLecturerCourses = vi.hoisted(() => vi.fn());
const fetchTutorsForLecturer = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/courses', () => ({
  fetchLecturerCourses: (...args: unknown[]) => fetchLecturerCourses(...args),
}));

vi.mock('../../../../services/users', () => ({
  fetchTutorsForLecturer: (...args: unknown[]) => fetchTutorsForLecturer(...args),
}));

describe('LecturerTimesheetCreateModal – resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not crash when courses API returns a non-array shape', async () => {
    fetchLecturerCourses.mockResolvedValue({ unexpected: true });
    fetchTutorsForLecturer.mockResolvedValue([]);

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={2}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => expect(TimesheetFormMock).toHaveBeenCalled());
    const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
    expect(latestProps?.courseOptions).toEqual([]);
  });
});

