import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LecturerTimesheetCreateModal from './LecturerTimesheetCreateModal';

const TimesheetFormMock = vi.hoisted(() =>
  vi.fn((props: any) => (
    <div data-testid="timesheet-form-mock">
      <button onClick={() => props.onTutorChange?.(props.tutorOptions?.[0]?.id ?? 1)}>
        select tutor
      </button>
      <button
        onClick={() =>
          props.onSubmit({
            tutorId: props.tutorOptions?.[0]?.id ?? 1,
            courseId: props.courseOptions?.[0]?.id ?? 1,
            weekStartDate: '2025-01-06',
            sessionDate: '2025-01-06',
            deliveryHours: 2,
            description: 'Guest tutorial',
            taskType: 'TUTORIAL',
            qualification: 'STANDARD',
            isRepeat: false,
          })
        }
      >
        submit form
      </button>
    </div>
  )),
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

const dispatcherMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../lib/routing/notificationRouter', () => ({
  dispatchNotification: (...args: unknown[]) => dispatcherMock(...args),
}));

const createTimesheetMock = vi.hoisted(() => vi.fn());
const resetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../hooks/timesheets', () => ({
  useTimesheetCreate: () => ({
    createTimesheet: (...args: unknown[]) => createTimesheetMock(...args),
    loading: false,
    error: null,
    data: null,
    reset: resetMock,
  }),
}));

describe('LecturerTimesheetCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchLecturerCourses.mockResolvedValue([
      { id: 12, code: 'CS101', name: 'Computer Science 101', active: true, lecturerId: 9 },
    ]);
    fetchTutorsForLecturer.mockResolvedValue([
      { id: 34, name: 'Jordan Lee', email: 'jordan@example.edu', role: 'TUTOR', qualification: 'STANDARD' },
    ]);
  });

  it('configures the timesheet form for lecturer creation with loading state', async () => {
    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={9}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() => expect(TimesheetFormMock).toHaveBeenCalled());

    const initialProps = TimesheetFormMock.mock.calls[0][0];
    expect(initialProps.mode).toBe('lecturer-create');
    expect(initialProps.optionsLoading).toBe(true);
    expect(initialProps.tutorOptions).toEqual([]);
    expect(initialProps.courseOptions).toEqual([]);

    await waitFor(() => {
      const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
      expect(latestProps?.optionsLoading).toBe(false);
      expect(latestProps?.tutorOptions).toEqual([
        expect.objectContaining({ id: 34, label: 'Jordan Lee', qualification: 'STANDARD' }),
      ]);
      expect(latestProps?.courseOptions).toEqual([
        { id: 12, label: 'CS101 - Computer Science 101' },
      ]);
    });
  });

  it('fetches lecturer resources and submits a create request', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={9}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />,
    );

    await waitFor(() => expect(fetchLecturerCourses).toHaveBeenCalledWith(9));
    await waitFor(() => expect(fetchTutorsForLecturer).toHaveBeenCalledWith(9));

    expect(await screen.findByTestId('timesheet-form-mock')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText('select tutor'));
    await user.click(screen.getByText('submit form'));

    await waitFor(() => {
      expect(createTimesheetMock).toHaveBeenCalledWith({
        tutorId: 34,
        courseId: 12,
        weekStartDate: '2025-01-06',
        sessionDate: '2025-01-06',
        deliveryHours: 2,
        description: 'Guest tutorial',
        taskType: 'TUTORIAL',
        qualification: 'STANDARD',
        isRepeat: false,
      });
    });

    expect(dispatcherMock).toHaveBeenCalledWith({
      type: 'TIMESHEET_CREATE_SUCCESS',
      tutorName: 'Jordan Lee',
      courseName: 'CS101 - Computer Science 101',
    });
    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });
});
