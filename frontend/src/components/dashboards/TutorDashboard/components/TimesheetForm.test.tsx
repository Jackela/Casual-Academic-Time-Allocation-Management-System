import { render, screen, waitFor, within } from '@testing-library/react';
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

  it('allows selecting the next Monday via quick action', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const weekStartInput = await screen.findByLabelText(/Week Starting/i) as HTMLInputElement;
    const initialValue = weekStartInput.value;

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Next Monday/i }));

    await waitFor(() => {
      expect(weekStartInput.value).not.toBe(initialValue);
    });

    expect(new Date(weekStartInput.value).getDay()).toBe(1);
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
    await screen.findByLabelText(/Week Starting/i);

    await waitFor(() => expect(hoursInput).toHaveAttribute('max', '48'));
    expect(screen.getByRole('button', { name: /Next Monday/i })).toBeInTheDocument();
    expect(screen.getByText(/Select a Monday to start your week/i)).toBeInTheDocument();

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

  it('renders tutor selector only in lecturer-create mode', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const tutorOptions = [{ id: 7, label: 'Jordan Lee' }];
    const courseOptions = [{ id: 3, label: 'COMP1010 - Programming' }];

    const { rerender } = render(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        tutorOptions={tutorOptions}
        courseOptions={courseOptions}
        {...({ mode: 'lecturer-create' } as any)}
      />,
    );

    const tutorSection = await screen.findByTestId('lecturer-timesheet-tutor-selector');
    expect(within(tutorSection).getByLabelText(/^Tutor$/i)).toBeInTheDocument();

    rerender(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        tutorOptions={tutorOptions}
        courseOptions={courseOptions}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('lecturer-timesheet-tutor-selector')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^Tutor$/i)).not.toBeInTheDocument();
    });
  });

  it('disables tutor selection and shows empty state when no tutors available', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        tutorOptions={[]}
        mode="lecturer-create"
        optionsLoading={false}
      />,
    );

    const tutorSelect = await screen.findByLabelText(/^Tutor$/i);
    expect(tutorSelect).toBeDisabled();
    expect(screen.getByTestId('tutor-empty-state')).toHaveTextContent(/No tutors are currently assigned/i);
  });

  it('disables course selection and shows empty state when no courses available', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        courseOptions={[]}
        optionsLoading={false}
      />,
    );

    const courseSelect = await screen.findByLabelText(/^Course$/i);
    expect(courseSelect).toHaveValue('0');
    expect(courseSelect).toBeDisabled();
    expect(screen.getByTestId('course-empty-state')).toHaveTextContent('No active courses found');
  });

  it('renders tutor qualification as read-only text', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm
        isEdit
        initialData={{
          courseId: 10,
          qualification: 'PHD',
          weekStartDate: '2025-01-06',
          deliveryHours: 1.5,
          description: 'Research supervision',
        }}
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const qualificationField = await screen.findByLabelText(/Tutor Qualification/i) as HTMLInputElement;
    expect(qualificationField).toBeDisabled();
    expect(qualificationField).toHaveAttribute('readonly');
    expect(qualificationField.value).toBe('PhD Qualified');
    expect(screen.queryByRole('combobox', { name: /Tutor Qualification/i })).not.toBeInTheDocument();
  });

  it('renders task type as read-only for tutors and selectable for lecturers', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const { rerender } = render(
      <TimesheetForm
        isEdit
        initialData={{
          courseId: 10,
          taskType: 'MARKING',
          weekStartDate: '2025-01-06',
          deliveryHours: 1.5,
          description: 'Assessment marking',
        }}
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const taskTypeDisplay = await screen.findByLabelText(/Task Type/i) as HTMLInputElement;
    expect(taskTypeDisplay).toBeDisabled();
    expect(taskTypeDisplay.value).toBe('Marking');
    expect(screen.queryByRole('combobox', { name: /Task Type/i })).not.toBeInTheDocument();

    rerender(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        mode="lecturer-create"
        tutorOptions={[{ id: 42, label: 'Jordan Lee', qualification: 'STANDARD' }]}
        courseOptions={[{ id: 10, label: 'COMP1001' }]}
      />,
    );

    const taskTypeSelect = await screen.findByRole('combobox', { name: /Task Type/i });
    expect(taskTypeSelect).toBeEnabled();
  });

  it('submits directive-only payload without calculated fields', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;
    const onSubmit = vi.fn();

    render(
      <TimesheetForm
        isEdit
        initialData={{
          courseId: 12,
          weekStartDate: '2025-01-06',
          deliveryHours: 1.5,
          description: 'Existing tutorial',
          taskType: 'TUTORIAL',
          qualification: 'STANDARD',
          isRepeat: false,
        }}
        tutorId={42}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        courseOptions={[{ id: 12, label: 'CS101' }]}
      />,
    );

    await waitFor(() => expect(mockQuote).toHaveBeenCalled());

    const submitButton = await screen.findByRole('button', { name: /Update Timesheet/i });
    const user = userEvent.setup();
    await user.click(submitButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];

    expect(payload).toMatchObject({
      tutorId: 42,
      courseId: 12,
      weekStartDate: '2025-01-06',
      sessionDate: '2025-03-03',
      deliveryHours: 1.5,
      description: 'Existing tutorial',
      taskType: 'TUTORIAL',
      qualification: 'STANDARD',
      repeat: false,
    });
    expect(payload).not.toHaveProperty('quote');
    expect(payload).not.toHaveProperty('payableHours');
    expect(payload).not.toHaveProperty('hourlyRate');
    expect(payload).not.toHaveProperty('amount');
  });
});
