import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimesheetForm from './TimesheetForm';

const mockQuoteTimesheet = vi.hoisted(() => vi.fn(async (req) => {
  console.log('[TEST] quoteTimesheet called with:', req);
  return {
    taskType: req.taskType,
    rateCode: 'TU2',
    qualification: req.qualification,
    isRepeat: false,
    deliveryHours: Number(req.deliveryHours || 1),
    associatedHours: 2,
    payableHours: 3,
    hourlyRate: 60,
    amount: 180,
    formula: 'test',
    clauseReference: null,
    sessionDate: req.sessionDate,
  };
}));

vi.mock('../../../../services/timesheets', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    TimesheetService: {
      ...actual.TimesheetService,
      quoteTimesheet: mockQuoteTimesheet,
    },
  };
});

const tutorOptions = [{ id: 4, label: 'Tutor', qualification: 'STANDARD' }];
const courseOptions = [{ id: 1, label: 'Course 1' }];

describe('TimesheetForm Debug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should debug quote loading and submit button state', async () => {
    const onSubmit = vi.fn();
    
    render(
      <TimesheetForm
        mode="lecturer-create"
        tutorId={4}
        selectedTutorId={4}
        tutorOptions={tutorOptions as any}
        courseOptions={courseOptions}
        onTutorChange={() => {}}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );

    // Fill all fields
    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/delivery hours/i), { target: { value: '1.0' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Test' } });

    // Wait for quote to load
    await waitFor(() => {
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check if TU2 appears (indicating quote loaded)
    await waitFor(() => {
      expect(screen.getByText('TU2')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Get submit button
    const submit = screen.getByRole('button', { name: /create timesheet/i });
    
    // Debug: log button state
    console.log('[TEST] Submit button disabled:', submit.hasAttribute('disabled'));
    console.log('[TEST] Submit button classList:', submit.className);
    
    // This should pass if quote loaded correctly
    expect(submit).not.toBeDisabled();
  });

  it('reproduces failing test: accepts minimum hours (0.25)', async () => {
    const onSubmit = vi.fn();
    
    render(
      <TimesheetForm
        mode="lecturer-create"
        tutorId={4}
        selectedTutorId={4}
        tutorOptions={tutorOptions as any}
        courseOptions={courseOptions}
        onTutorChange={() => {}}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText(/course/i), { target: { value: '1' } });
    console.log('[TEST-ORAA] After course select');
    
    // Switch to an hourly task type
    fireEvent.change(screen.getByLabelText(/task type/i), { target: { value: 'ORAA' } });
    console.log('[TEST-ORAA] After task type change to ORAA');
    
    const hoursInput = screen.getByLabelText(/delivery hours/i) as HTMLInputElement;
    console.log('[TEST-ORAA] Hours value before change:', hoursInput.value);
    
    // Need to blur to trigger React Hook Form's onChange validation
    fireEvent.change(hoursInput, { target: { value: '0.25' } });
    fireEvent.blur(hoursInput);
    console.log('[TEST-ORAA] Hours value after change+blur:', hoursInput.value);
    
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Min boundary' } });

    // Wait for quote debounce (300ms) + safety margin
    await new Promise(r => setTimeout(r, 400));
    
    console.log('[TEST-ORAA] Quote mock called?', mockQuoteTimesheet.mock.calls.length, 'times');
    if (mockQuoteTimesheet.mock.calls.length > 0) {
      console.log('[TEST-ORAA] Last quote call:', mockQuoteTimesheet.mock.calls[mockQuoteTimesheet.mock.calls.length - 1][0]);
    }

    await waitFor(() => {
      expect(screen.getByText(/Calculated Pay Summary/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    const submit = screen.getByRole('button', { name: /create timesheet/i });
    console.log('[TEST-ORAA] Submit button disabled:', submit.hasAttribute('disabled'));
    expect(submit).not.toBeDisabled();
  });
});
