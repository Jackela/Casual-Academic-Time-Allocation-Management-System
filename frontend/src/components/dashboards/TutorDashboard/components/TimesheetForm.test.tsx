import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockServerOverrides = vi.fn(() =>
  Promise.resolve({
    hours: { max: 48 },
    weekStart: { mondayOnly: true },
  }),
);

vi.mock('../../../../lib/config/server-config', () => ({
  fetchTimesheetConstraints: mockServerOverrides,
}));

const mockQuote = vi.fn(() =>
  Promise.resolve({
    taskType: 'TUTORIAL',
    rateCode: 'TU1',
    qualification: 'STANDARD',
    repeat: false,
    deliveryHours: 1,
    associatedHours: 2,
    payableHours: 3,
    hourlyRate: 70,
    amount: 210,
    formula: '1h delivery + 2h associated',
    clauseReference: 'Schedule 1',
    sessionDate: '2025-03-03',
  }),
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
    validateTimesheet: vi.fn(() => ({ valid: true, errors: null })),
  };
});

vi.mock('../../../../utils/secure-logger', () => ({
  secureLogger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    api: vi.fn(),
  },
}));

vi.mock('../../../../services/timesheets', () => ({
  TimesheetService: {
    quoteTimesheet: mockQuote,
  },
}));

describe('TimesheetForm', () => {
  beforeEach(() => {
    mockServerOverrides.mockClear();
    mockQuote.mockClear();
  });

  it('applies server-provided constraint overrides', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const hoursInput = await screen.findByLabelText(/Delivery Hours/i);
    const weekStartInput = await screen.findByLabelText(/Week Starting/i);

    await waitFor(() => expect(hoursInput).toHaveAttribute('max', '48'));
    await waitFor(() => expect(weekStartInput).toHaveAttribute('step', '7'));

    expect(mockServerOverrides).toHaveBeenCalledTimes(1);

    const user = userEvent.setup();
    await user.clear(hoursInput);
    await user.type(hoursInput, '49');
    await user.tab();

    expect(await screen.findByText(/Delivery hours must be between 0\.25 and 48/)).toBeInTheDocument();
  });

  it('displays rejection feedback for rejected timesheets', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const rejectedTimesheet = {
      id: 123,
      tutorId: 42,
      courseId: 1,
      courseCode: 'COMP1001',
      courseName: 'Introduction to Programming',
      weekStartDate: '2025-01-27',
      hours: 10,
      deliveryHours: 10,
      hourlyRate: 45,
      qualification: 'STANDARD',
      taskType: 'TUTORIAL',
      isRepeat: false,
      description: 'Tutorial sessions for COMP1001',
      status: 'REJECTED',
      createdAt: '2025-01-20T10:00:00Z',
      updatedAt: '2025-01-25T14:30:00Z',
      rejectionReason: 'Correction required: Please update the project code and provide more detailed description of tasks completed.',
    };

    render(
      <TimesheetForm
        isEdit={true}
        initialData={rejectedTimesheet}
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Check that rejection feedback section is visible
    expect(screen.getByTestId('rejection-feedback-section')).toBeInTheDocument();
    expect(screen.getByTestId('rejection-feedback-title')).toHaveTextContent('Lecturer Feedback');
    expect(screen.getByTestId('rejection-feedback-content')).toHaveTextContent('Correction required: Please update the project code and provide more detailed description of tasks completed.');
  });

  it('does not display rejection feedback for non-rejected timesheets', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const draftTimesheet = {
      id: 123,
      status: 'DRAFT',
      tutorId: 42,
      courseId: 1,
      weekStartDate: '2025-01-27',
      hours: 10,
      hourlyRate: 45,
      description: 'Tutorial sessions for COMP1001',
    };

    render(
      <TimesheetForm
        isEdit={true}
        initialData={draftTimesheet}
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // Check that rejection feedback section is NOT visible
    expect(screen.queryByTestId('rejection-feedback-section')).not.toBeInTheDocument();
  });
});
