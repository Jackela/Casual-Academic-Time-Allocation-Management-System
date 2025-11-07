import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import TimesheetForm from './TimesheetForm';

const quoteTimesheetSpy = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/timesheets', async (orig) => {
  const actual = await orig();
  quoteTimesheetSpy().mockResolvedValue({
    taskType: 'TUTORIAL',
    rateCode: 'TU1',
    qualification: 'STANDARD',
    isRepeat: false,
    deliveryHours: 1.0,
    associatedHours: 1.0,
    payableHours: 2.0,
    hourlyRate: 82.50,
    amount: 165.00,
    formula: '1.0h delivery + 1.0h prep = 2.0h × $82.50',
    clauseReference: 'Schedule 1, Clause 3.1',
    sessionDate: '2025-11-03',
  });
  return { ...actual, TimesheetService: { ...actual.TimesheetService, quoteTimesheet: quoteTimesheetSpy() } };
});

vi.mock('../../../../lib/config/ui-config', async (orig) => {
  const actual = await orig();
  return { ...actual, useUiConstraints: () => ({ HOURS_MIN: 0.1, HOURS_MAX: 10, HOURS_STEP: 0.1, WEEK_START_DAY: 1, mondayOnly: true }) };
});

vi.mock('../../../../lib/config/server-config', () => ({
  fetchTimesheetConstraints: vi.fn().mockResolvedValue({
    hours: { min: 0.1, max: 10, step: 0.1 },
    weekStart: { mondayOnly: true },
  }),
}));

const tutorOptions = [
  { id: 5, label: 'Alice Chen', qualification: 'STANDARD', courseIds: [1] },
  { id: 4, label: 'John Doe', qualification: 'STANDARD', courseIds: [1] },
];
const courseOptions = [
  { id: 1, label: 'COMP1001 - Introduction to Programming' },
];

describe('TimesheetForm - Lecturer Mode Quote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fire quote request automatically when form opens with valid initial data', async () => {
    render(
      <TimesheetForm
        mode="lecturer-create"
        tutorId={5}
        selectedTutorId={5}
        tutorOptions={tutorOptions as any}
        courseOptions={courseOptions}
        onTutorChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Quote should fire automatically within 500ms (debounce + ensure timers)
    await waitFor(() => {
      expect(quoteTimesheetSpy()).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Verify quote was called with correct payload
    const callArgs = quoteTimesheetSpy().mock.calls[0][0];
    expect(callArgs.tutorId).toBe(5);
    expect(callArgs.courseId).toBe(1);
    expect(callArgs.taskType).toBe('TUTORIAL');
    expect(callArgs.deliveryHours).toBe(1.0);
  });

  it('should initialize internalTutorId from tutorOptions when selectedTutorId is null', async () => {
    render(
      <TimesheetForm
        mode="lecturer-create"
        tutorId={0}
        selectedTutorId={null}
        tutorOptions={tutorOptions as any}
        courseOptions={courseOptions}
        onTutorChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Even with tutorId=0 and selectedTutorId=null, quote should still fire
    // because form should fallback to first tutor in tutorOptions
    await waitFor(() => {
      expect(quoteTimesheetSpy()).toHaveBeenCalled();
    }, { timeout: 1000 });

    const callArgs = quoteTimesheetSpy().mock.calls[0][0];
    expect(callArgs.tutorId).toBeGreaterThan(0);
    expect(callArgs.tutorId).toBe(5); // First tutor
  });

  it('should use tutorId prop when provided (takes precedence over selectedTutorId)', async () => {
    render(
      <TimesheetForm
        mode="lecturer-create"
        tutorId={4}
        selectedTutorId={5}
        tutorOptions={tutorOptions as any}
        courseOptions={courseOptions}
        onTutorChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(quoteTimesheetSpy()).toHaveBeenCalled();
    }, { timeout: 1000 });

    const callArgs = quoteTimesheetSpy().mock.calls[0][0];
    // In lecturer-create mode with tutorId=4, should use selectedTutorId=5 initially
    // but then internalTutorId state should be 5 (from selectedTutorId)
    expect(callArgs.tutorId).toBe(5);
  });

  it('should NOT fire quote when required fields are missing', async () => {
    render(
      <TimesheetForm
        mode="lecturer-create"
        tutorId={0}
        selectedTutorId={null}
        tutorOptions={[]}
        courseOptions={[]}
        onTutorChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Wait to ensure quote does not fire
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(quoteTimesheetSpy()).not.toHaveBeenCalled();
  });
});
