import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimesheetForm from './TimesheetForm';

vi.mock('../../../../services/timesheets', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    TimesheetService: {
      ...actual.TimesheetService,
      quoteTimesheet: vi.fn(async (req) => ({
        taskType: req.taskType,
        rateCode: req.taskType === 'LECTURE' ? 'LEC' : 'TU2',
        qualification: req.qualification,
        isRepeat: !!(req as any).isRepeat,
        deliveryHours: Number(req.deliveryHours || 1),
        associatedHours: req.taskType === 'TUTORIAL' ? 2 : 0,
        payableHours: req.taskType === 'TUTORIAL' ? Number(req.deliveryHours || 1) + 2 : Number(req.deliveryHours || 1),
        hourlyRate: 60,
        amount: 60 * Number(req.deliveryHours || 1),
        formula: 'test-formula',
        clauseReference: null,
        sessionDate: req.sessionDate,
      })),
    },
  };
});

const tutorOptions = [
  { id: 4, label: 'E2E Tutor One', qualification: 'STANDARD' },
];
const courseOptions = [
  { id: 1, label: 'COMP1001 - Introduction to Programming' },
];

const renderLecturerCreate = () =>
  render(
    <TimesheetForm
      mode="lecturer-create"
      tutorId={4}
      selectedTutorId={4}
      tutorOptions={tutorOptions as any}
      courseOptions={courseOptions}
      onTutorChange={() => {}}
      onSubmit={() => {}}
      onCancel={() => {}}
    />
  );

describe('TimesheetForm validation and quoting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error and disables submit when hours have >1 decimal place', async () => {
    renderLecturerCreate();
    const course = screen.getByLabelText(/course/i);
    fireEvent.change(course, { target: { value: '1' } });

    const hours = screen.getByLabelText(/delivery hours/i);
    fireEvent.change(hours, { target: { value: '1.23' } });

    const submit = screen.getByRole('button', { name: /create timesheet/i });
    expect(submit).toBeDisabled();
  });

  it('shows error and disables submit when hours are below minimum', async () => {
    renderLecturerCreate();
    const course = screen.getByLabelText(/course/i);
    fireEvent.change(course, { target: { value: '1' } });

    const hours = screen.getByLabelText(/delivery hours/i);
    fireEvent.change(hours, { target: { value: '0.1' } });

    const submit = screen.getByRole('button', { name: /create timesheet/i });
    expect(submit).toBeDisabled();
  });

  it('accepts minimum hours (0.25) and enables submit when other fields valid (non-Tutorial)', async () => {
    renderLecturerCreate();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    // Switch to an hourly task type
    fireEvent.change(screen.getByLabelText(/task type/i), { target: { value: 'ORAA' } });
    fireEvent.change(screen.getByLabelText(/delivery hours/i), { target: { value: '0.25' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Min boundary' } });

    await waitFor(() => {
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
    });

    const submit = screen.getByRole('button', { name: /create timesheet/i });
    expect(submit).not.toBeDisabled();
  });

  it('accepts maximum hours (60) and enables submit when other fields valid', async () => {
    renderLecturerCreate();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/delivery hours/i), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Max boundary' } });

    await waitFor(() => {
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
    });

    const submit = screen.getByRole('button', { name: /create timesheet/i });
    expect(submit).not.toBeDisabled();
  });

  it('loads quote and enables submit for valid inputs', async () => {
    renderLecturerCreate();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/delivery hours/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Valid desc' } });

    await waitFor(() => {
      // Quote preview fields appear
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Rate Code/i)).toBeInTheDocument();
    });

    const submit = screen.getByRole('button', { name: /create timesheet/i });
    expect(submit).not.toBeDisabled();
  });

  it('requires Tutorial delivery hours to be exactly 1.0', async () => {
    renderLecturerCreate();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    // Default task type is Tutorial; set non-1.0 hours
    const hours = screen.getByLabelText(/delivery hours/i);
    fireEvent.change(hours, { target: { value: '0.5' } });
    fireEvent.blur(hours);
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Tutorial invalid hours' } });

    const submit = screen.getByRole('button', { name: /create timesheet/i });
    expect(await screen.findByText(/Tutorial delivery hours must be 1.0/i)).toBeInTheDocument();
    expect(submit).toBeDisabled();

    // Fix to 1.0
    fireEvent.change(hours, { target: { value: '1.0' } });
    fireEvent.blur(hours);
    await waitFor(() => {
      expect(screen.queryByText(/Tutorial delivery hours must be 1.0/i)).toBeNull();
    });
  });

  it('allows fractional hours for ORAA task type', async () => {
    renderLecturerCreate();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/task type/i), { target: { value: 'ORAA' } });
    fireEvent.change(screen.getByLabelText(/delivery hours/i), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'ORAA ok' } });

    await waitFor(() => {
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
    });
    // Should not show the Tutorial-specific validation error
    expect(screen.queryByText(/Tutorial delivery hours must be 1\.0/i)).toBeNull();
  });

  it('repeat tutorial shows repeat note when payable < associated', async () => {
    renderLecturerCreate();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/delivery hours/i), { target: { value: '1.0' } });
    fireEvent.click(screen.getByLabelText(/Repeat session within seven days/i));
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Repeat case' } });

    await waitFor(() => {
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
    });
    // For tutorial, associated 2h; payable 3h (not less), so note should be absent
    expect(screen.queryByTestId('repeat-note')).toBeNull();
  });
});
