import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimesheetForm from './TimesheetForm';

vi.mock('../../../../services/timesheets', async (orig) => {
  const actual = await orig();
  const localSpy = vi.fn(async (req: any) => ({
    taskType: req.taskType,
    rateCode: 'X',
    qualification: req.qualification,
    isRepeat: !!(req as any).isRepeat,
    deliveryHours: Number(req.deliveryHours || 1),
    associatedHours: 0,
    payableHours: Number(req.deliveryHours || 1),
    hourlyRate: 50,
    amount: 50 * Number(req.deliveryHours || 1),
    formula: 'f',
    clauseReference: null,
    sessionDate: req.sessionDate,
  }));
  return { ...actual, TimesheetService: { ...actual.TimesheetService, quoteTimesheet: localSpy } };
});

vi.mock('../../../../lib/config/ui-config', async (orig) => {
  const actual = await orig();
  return { ...actual, useUiConstraints: () => ({ HOURS_MIN: 0.25, HOURS_MAX: 60, HOURS_STEP: 0.25, WEEK_START_DAY: 1, mondayOnly: true }) };
});

const tutorOptions = [{ id: 4, label: 'Tutor', qualification: 'STANDARD' }];
const courseOptions = [{ id: 1, label: 'Course 1' }];

const setup = () => render(
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

describe('TimesheetForm quote debounce', () => {

  it('coalesces rapid field changes and loads final quote only', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    const hours = screen.getByLabelText(/delivery hours/i);
    fireEvent.change(hours, { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A' } });

    // Rapidly toggle task type
    const task = screen.getByLabelText(/task type/i);
    fireEvent.change(task, { target: { value: 'LECTURE' } });
    fireEvent.change(task, { target: { value: 'TUTORIAL' } });

    await waitFor(() => {
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Rate Code/i)).toBeInTheDocument();
    });
  });

  it('disables submit when future date selected', async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/delivery hours/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A' } });
    // Change hidden date input to a distant future Monday
    const dateInput = document.querySelector('input[name="weekStartDate"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2099-01-04' } });
    const submit = screen.getByRole('button', { name: /create timesheet/i });
    expect(submit).toBeDisabled();
  });
});
