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

describe('TimesheetForm - TaskType Fallback in Quote Payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuote.mockResolvedValue({
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
    });
  });

  it('should send taskType=TUTORIAL when form taskType is undefined', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    // Render form with initialData that has NO taskType
    render(
      <TimesheetForm
        tutorId={4}
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialData={{
          courseId: 1,
          weekStartDate: '2025-01-20',
          hours: 1,
          // ❌ NO taskType provided - should fallback to DEFAULT_TASK_TYPE
        }}
      />
    );

    // Wait for auto-quote to trigger
    await waitFor(
      () => {
        expect(mockQuote).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Verify quote payload has taskType
    const quotePayload = mockQuote.mock.calls[mockQuote.mock.calls.length - 1][0];
    expect(quotePayload).toBeDefined();
    expect(quotePayload.taskType).toBe('TUTORIAL'); // DEFAULT_TASK_TYPE
    expect(quotePayload.taskType).not.toBe('OTHER');
    expect(quotePayload.taskType).not.toBeUndefined();
    expect(quotePayload.taskType).not.toBeNull();
  });

  it('should preserve taskType=ORAA when explicitly provided', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    mockQuote.mockResolvedValue({
      taskType: 'ORAA',
      rateCode: 'OR1',
      qualification: 'STANDARD',
      isRepeat: false,
      deliveryHours: 2,
      associatedHours: 1,
      payableHours: 3,
      hourlyRate: 65,
      amount: 195,
      formula: '2h + 1h',
      clauseReference: 'Schedule 1',
      sessionDate: '2025-01-20',
    });

    render(
      <TimesheetForm
        tutorId={4}
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialData={{
          courseId: 1,
          weekStartDate: '2025-01-20',
          hours: 2,
          taskType: 'ORAA', // ✅ Explicitly set
        }}
      />
    );

    await waitFor(
      () => {
        expect(mockQuote).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    const quotePayload = mockQuote.mock.calls[mockQuote.mock.calls.length - 1][0];
    expect(quotePayload.taskType).toBe('ORAA');
  });

  it('should never send taskType=OTHER in quote payload', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <TimesheetForm
        tutorId={4}
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialData={{
          courseId: 1,
          weekStartDate: '2025-01-20',
          hours: 1,
          // Edge case: form may have undefined/null taskType
        }}
      />
    );

    await waitFor(
      () => {
        expect(mockQuote).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Verify NO quote call ever sent taskType=OTHER
    const allCalls = mockQuote.mock.calls;
    for (const call of allCalls) {
      const payload = call[0];
      expect(payload.taskType).not.toBe('OTHER');
      expect(payload.taskType).toBeDefined();
      expect(payload.taskType).not.toBeNull();
    }
  });
});
