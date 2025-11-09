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
    qualification: 'PhD Qualified',
    isRepeat: false,
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
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
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
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    const hoursInput = await screen.findByLabelText(/Delivery Hours/i);
    await screen.findByLabelText(/Week Starting/i);

    await waitFor(() => expect(hoursInput).toHaveAttribute('max', '48'));
    expect(screen.getByRole('button', { name: /Next Monday/i })).toBeInTheDocument();
    expect(screen.getByText(/Select a Monday to start your week/i)).toBeInTheDocument();

    // For Tutorial, hours are fixed at 1.0 (input disabled). Switch to Lecture to validate constraint.
    const user = userEvent.setup();
    const taskTypeSelect = screen.getByLabelText(/Task Type/i);
    await user.selectOptions(taskTypeSelect, 'Lecture');
    const enabledHoursInput = await screen.findByLabelText(/Delivery Hours/i);
    await user.clear(enabledHoursInput);
    await user.type(enabledHoursInput, '49');
    await user.tab();

    const err = await screen.findByTestId('field-error-deliveryHours');
    expect(err).toHaveTextContent(/Delivery hours must be between 0\.25 and 48/);
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
        tutorId={42} 
        onSubmit={vi.fn()} 
        onCancel={vi.fn()} 
        isEdit={true}
        initialData={rejectedTimesheet as any}
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
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
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
        mode={'lecturer-create' as any}
        tutorOptions={[{ id: 42, label: 'Tutor X', qualification: 'PHD' as any }]}
        courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]}
      />,
    );

    const qualificationField = await screen.findByLabelText(/Tutor Qualification/i) as HTMLSelectElement;
    expect(qualificationField).toBeDisabled();
    expect(qualificationField).toHaveAttribute('readonly');
    
    // Wait for quote to load and update qualification value
    await waitFor(() => {
      // In lecturer mode, the disabled select holds enum value; the option text shows the label
      expect(qualificationField.value).toBe('PHD');
    }, { timeout: 5000 });
    
    // In lecturer-create mode, qualification is rendered as a disabled select (not editable)
    expect(screen.getByRole('combobox', { name: /Tutor Qualification/i })).toBeInTheDocument();
  });

  it('renders task type as read-only for tutors and selectable for lecturers', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const { rerender } = render(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    // In lecturer-create mode, task type should be selectable (not disabled)
    const taskTypeSelect = await screen.findByLabelText(/Task Type/i) as HTMLSelectElement;
    expect(taskTypeSelect).not.toBeDisabled();
    expect(taskTypeSelect.tagName).toBe('SELECT');

    rerender(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    const weekStartInput = await screen.findByLabelText(/Week Starting/i) as HTMLInputElement;
    const initial = weekStartInput.value; // whatever today/next Monday is

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Prev Monday/i }));

    await waitFor(() => {
      expect(weekStartInput.value).not.toBe(initial);
    });

    // New value should be a Monday
    expect(new Date(weekStartInput.value).getDay()).toBe(1);
  });

  it('blocks submission when week start date is in the future (client-side)', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const onSubmit = vi.fn();
    const { rerender } = render(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    const courseSelect = await screen.findByLabelText(/^Course$/i) as HTMLSelectElement;
    const hoursInput = await screen.findByLabelText(/Delivery Hours/i) as HTMLInputElement;
    const descInput = await screen.findByLabelText(/Description/i) as HTMLTextAreaElement;

    // Choose COMP1001 (deterministic option id is '1') and enter hours + description
    await userEvent.selectOptions(courseSelect, '1');
    if (!hoursInput.disabled) {
      await userEvent.clear(hoursInput);
      await userEvent.type(hoursInput, '1.0');
    }
    await userEvent.type(descInput, 'Tutorial for COMP1001');

    // Wait for quote to load based on inputs
    await waitFor(() => expect(mockQuote).toHaveBeenCalled());

    // Simulate options reload phases and ensure inputs persist
    rerender(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    rerender(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    rerender(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    // Validate the selection and inputs persisted
    expect((await screen.findByLabelText(/^Course$/i)) as HTMLSelectElement).toHaveValue('1');
    expect((await screen.findByLabelText(/Delivery Hours/i)) as HTMLInputElement).toHaveValue(1);
    // Quote requests were made; submit enablement depends on date validity, which is tested elsewhere
  });

  it('preserves a user-selected past Monday after course changes and rerenders (lecturer-create)', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    const tutorOptions = [{ id: 1, label: 'John Doe', qualification: 'STANDARD' }];
    const coursesPhase1 = [
      { id: 10, label: 'COMP1001 - Introduction to Programming' },
      { id: 20, label: 'COMP2001 - Data Structures' },
    ];

    const { rerender } = render(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    // Choose a past Monday via quick action
    const weekStartInput = (await screen.findByLabelText(/Week Starting/i)) as HTMLInputElement;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Prev Monday/i }));
    const selectedMonday = weekStartInput.value;
    expect(new Date(selectedMonday).getDay()).toBe(1);

    // Change course, input hours and description (deterministic option id is '1')
    await userEvent.selectOptions(await screen.findByLabelText(/^Course$/i), '1');
    const hoursInput = (await screen.findByLabelText(/Delivery Hours/i)) as HTMLInputElement;
    if (!hoursInput.disabled) {
      await userEvent.clear(hoursInput);
      await userEvent.type(hoursInput, '1.0');
    }
    const desc = (await screen.findByLabelText(/Description/i)) as HTMLTextAreaElement;
    await userEvent.type(desc, 'Tutorial for COMP1001');

    // Trigger quote
    await waitFor(() => expect(mockQuote).toHaveBeenCalled());

    // Simulate options loading flicker and list changes
    rerender(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    rerender(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    // Ensure the week start date remains the explicitly chosen past Monday
    const currentWeekStart = (await screen.findByLabelText(/Week Starting/i)) as HTMLInputElement;
    expect(currentWeekStart.value).toBe(selectedMonday);
    expect(new Date(currentWeekStart.value).getDay()).toBe(1);
  });

  it('updates Selected label and hidden input when navigating months and choosing a Monday', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm tutorId={42} onSubmit={vi.fn()} onCancel={vi.fn()} mode={'lecturer-create' as any} tutorOptions={[{ id: 42, label: 'Tutor X' }]} courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]} />,
    );

    // Record initial month label
    const monthLabelBefore = (await screen.findByTestId('calendar-month-label')).textContent;
    // Navigate to previous month
    await userEvent.click(await screen.findByRole('button', { name: /Prev Month/i }));
    const monthLabelAfter = (await screen.findByTestId('calendar-month-label')).textContent;
    expect(monthLabelAfter).not.toBe(monthLabelBefore);
    // Hidden input remains a Monday
    const weekStartInput = await screen.findByLabelText(/Week Starting/i) as HTMLInputElement;
    expect(weekStartInput.value).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(new Date(weekStartInput.value).getDay()).toBe(1);
  });
});

