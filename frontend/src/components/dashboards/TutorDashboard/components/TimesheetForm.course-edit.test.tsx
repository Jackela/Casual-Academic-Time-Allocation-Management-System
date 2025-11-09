import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockServerConstraints = vi.fn(() =>
  Promise.resolve({ hours: { max: 48 }, weekStart: { mondayOnly: false } })
);

vi.mock('../../../../lib/config/server-config', () => ({
  fetchTimesheetConstraints: mockServerConstraints,
}));

const mockQuote = vi.fn(() =>
  Promise.resolve({
    taskType: 'TUTORIAL',
    rateCode: 'TU1',
    qualification: 'STANDARD',
    isRepeat: false,
    deliveryHours: 1,
    associatedHours: 2,
    payableHours: 3,
    hourlyRate: 70,
    amount: 210,
    formula: '1h + 2h',
    clauseReference: 'Schedule 1',
    sessionDate: '2025-01-20',
  })
);

vi.mock('../../../../lib/validation/ajv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/validation/ajv')>();
  return {
    ...actual,
    getTimesheetUiConstraints: vi.fn(() => ({
      hours: { min: 0.25, max: 60, step: 0.25 },
      weekStart: { mondayOnly: false },
      currency: 'AUD',
    })),
  };
});

vi.mock('../../../../utils/secure-logger', () => ({
  secureLogger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../../services/timesheets', () => ({
  TimesheetService: {
    quoteTimesheet: mockQuote,
  },
}));

describe('TimesheetForm - Course Field in Edit Mode (Tutor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should FAIL: Course dropdown disabled when courseOptions NOT provided in tutor edit mode', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    // Simulate Tutor Edit: initialData with courseId, but NO courseOptions prop
    render(
      <TimesheetForm
        tutorId={4}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isEdit={true}
        initialData={{
          id: 123,
          tutorId: 4,
          courseId: 1,
          courseCode: 'COMP2022',
          courseName: 'Models of Computation',
          weekStartDate: '2025-01-20',
          hours: 1,
          deliveryHours: 1,
          taskType: 'TUTORIAL',
          qualification: 'STANDARD',
          isRepeat: false,
          description: 'Week 2 tutorial',
          status: 'MODIFICATION_REQUESTED',
        }}
        // ❌ BUG: courseOptions NOT provided - this is what TutorDashboard does
      />
    );

    await waitFor(() => {
      const courseSelect = screen.getByLabelText(/Course/i) as HTMLSelectElement;
      
      // ❌ CURRENT BEHAVIOR (BUG): Course dropdown is disabled
      expect(courseSelect).toBeDisabled();
      expect(screen.getByTestId('course-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('course-empty-state')).toHaveTextContent('No active courses found');
    });
  });

  it('should PASS: Course dropdown enabled when courseOptions provided', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    // Simulate FIXED behavior: courseOptions provided
    render(
      <TimesheetForm
        tutorId={4}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isEdit={true}
        initialData={{
          id: 123,
          tutorId: 4,
          courseId: 1,
          courseCode: 'COMP2022',
          courseName: 'Models of Computation',
          weekStartDate: '2025-01-20',
          hours: 1,
          deliveryHours: 1,
          taskType: 'TUTORIAL',
          qualification: 'STANDARD',
          isRepeat: false,
          description: 'Week 2 tutorial',
          status: 'MODIFICATION_REQUESTED',
        }}
        courseOptions={[
          { id: 1, label: 'COMP2022 - Models of Computation' },
          { id: 2, label: 'COMP3221 - Distributed Systems' },
        ]}
      />
    );

    await waitFor(() => {
      const courseSelect = screen.getByLabelText(/Course/i) as HTMLSelectElement;
      
      // ✅ EXPECTED BEHAVIOR: Course dropdown is enabled
      expect(courseSelect).not.toBeDisabled();
      expect(courseSelect.value).toBe('1'); // Pre-selected from initialData
      expect(screen.queryByTestId('course-empty-state')).not.toBeInTheDocument();
    });
  });
});
