import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LecturerTimesheetCreateModal from './LecturerTimesheetCreateModal';

const TimesheetFormMock = vi.hoisted(() => vi.fn((props: any) => (
  <div data-testid="timesheet-form-mock">
    <div data-testid="tutor-id-prop">{props.tutorId}</div>
    <div data-testid="selected-tutor-id-prop">{props.selectedTutorId}</div>
    <div data-testid="tutor-options-length">{props.tutorOptions?.length ?? 0}</div>
  </div>
)));

vi.mock('../../TutorDashboard/components/TimesheetForm', () => ({
  __esModule: true,
  default: TimesheetFormMock,
}));

const fetchLecturerCourses = vi.hoisted(() => vi.fn());
const fetchTutorsForLecturer = vi.hoisted(() => vi.fn());
const getAssignmentsForCourses = vi.hoisted(() => vi.fn());
const getTutorDefaults = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/courses', () => ({
  fetchLecturerCourses: (...args: unknown[]) => fetchLecturerCourses(...args),
}));

vi.mock('../../../../services/users', () => ({
  fetchTutorsForLecturer: (...args: unknown[]) => fetchTutorsForLecturer(...args),
  getAssignmentsForCourses: (...args: unknown[]) => getAssignmentsForCourses(...args),
  getTutorDefaults: (...args: unknown[]) => getTutorDefaults(...args),
}));

vi.mock('../../../../lib/routing/notificationRouter', () => ({
  dispatchNotification: vi.fn(),
}));

vi.mock('../../../../hooks/timesheets', () => ({
  useTimesheetCreate: () => ({
    createTimesheet: vi.fn(),
    loading: false,
    error: null,
    data: null,
    reset: vi.fn(),
  }),
}));

describe('LecturerTimesheetCreateModal - Tutor Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchLecturerCourses.mockResolvedValue([
      { id: 1, code: 'COMP1001', name: 'Introduction to Programming', active: true, lecturerId: 2 },
    ]);
    getAssignmentsForCourses.mockResolvedValue({ 1: [5, 4] });
    getTutorDefaults.mockResolvedValue({ defaultQualification: 'STANDARD' });
  });

  it('should default selectedTutorId to first tutor when multiple tutors exist', async () => {
    fetchTutorsForLecturer.mockResolvedValue([
      { id: 5, name: 'Alice Chen', email: 'alice@example.com', role: 'TUTOR', qualification: 'STANDARD' },
      { id: 4, name: 'John Doe', email: 'john@example.com', role: 'TUTOR', qualification: 'STANDARD' },
    ]);

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={2}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
      expect(latestProps).toBeDefined();
      expect(latestProps.tutorOptions).toHaveLength(2);
    });

    // CRITICAL: selectedTutorId should be 5 (first tutor), not null
    const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
    expect(latestProps.selectedTutorId).toBe(5);
  });

  it('should pass non-zero tutorId to TimesheetForm when multiple tutors exist', async () => {
    fetchTutorsForLecturer.mockResolvedValue([
      { id: 5, name: 'Alice Chen', email: 'alice@example.com', role: 'TUTOR', qualification: 'STANDARD' },
      { id: 4, name: 'John Doe', email: 'john@example.com', role: 'TUTOR', qualification: 'STANDARD' },
    ]);

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={2}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
      expect(latestProps).toBeDefined();
      expect(latestProps.tutorOptions).toHaveLength(2);
    });

    // CRITICAL: tutorId should be > 0, not 0
    const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
    expect(latestProps.tutorId).toBeGreaterThan(0);
    expect(latestProps.tutorId).toBe(5); // Should be first tutor's ID
  });

  it('should default to single tutor when only one exists', async () => {
    fetchTutorsForLecturer.mockResolvedValue([
      { id: 5, name: 'Alice Chen', email: 'alice@example.com', role: 'TUTOR', qualification: 'STANDARD' },
    ]);

    render(
      <LecturerTimesheetCreateModal
        isOpen
        lecturerId={2}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
      expect(latestProps).toBeDefined();
      expect(latestProps.tutorOptions).toHaveLength(1);
    });

    const latestProps = TimesheetFormMock.mock.calls.at(-1)?.[0];
    expect(latestProps.selectedTutorId).toBe(5);
    expect(latestProps.tutorId).toBe(5);
  });
});
