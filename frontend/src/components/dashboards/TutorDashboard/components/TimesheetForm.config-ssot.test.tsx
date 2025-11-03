import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, beforeEach, expect } from 'vitest';

// Mock server constraints to enforce 0.1–10.0 with 0.1 step
const mockServerOverrides = vi.fn(() =>
  Promise.resolve({
    hours: { min: 0.1, max: 10, step: 0.1 },
    weekStart: { mondayOnly: true },
    currency: 'AUD',
  }),
);

vi.mock('../../../../lib/config/server-config', () => ({
  fetchTimesheetConstraints: mockServerOverrides,
}));

vi.mock('../../../../lib/validation/ajv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/validation/ajv')>();
  return {
    ...actual,
    getTimesheetUiConstraints: vi.fn(() => ({
      hours: { min: 0.25, max: 60, step: 0.25 },
      weekStart: { mondayOnly: true },
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
    quoteTimesheet: vi.fn(() => Promise.resolve({
      taskType: 'TUTORIAL',
      rateCode: 'TU1',
      qualification: 'STANDARD',
      isRepeat: false,
      deliveryHours: 1,
      associatedHours: 2,
      payableHours: 3,
      hourlyRate: 70,
      amount: 210,
      formula: '1h delivery + 2h associated',
      clauseReference: 'Schedule 1',
      sessionDate: '2025-03-03',
    })),
  },
}));

describe('TimesheetForm – server config SSOT', () => {
  beforeEach(() => {
    mockServerOverrides.mockClear();
  });

  it('uses GET /api/timesheets/config values for delivery hours min/max/step and note text', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm
        tutorId={42}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        mode={'lecturer-create' as any}
        tutorOptions={[{ id: 42, label: 'Tutor X' }]}
        courseOptions={[{ id: 1, label: 'COMP1001 - Programming' }]}
      />,
    );

    const hoursInput = await screen.findByLabelText(/Delivery Hours/i);

    await waitFor(() => {
      expect(hoursInput).toHaveAttribute('min', '0.1');
      expect(hoursInput).toHaveAttribute('max', '10');
      expect(hoursInput).toHaveAttribute('step', '0.1');
    });

    expect(screen.getByRole('note', { name: '' })).toHaveTextContent('Allowed delivery range: 0.1 to 10');

    // Switch to a task type where hours are editable
    const user = userEvent.setup();
    const taskTypeSelect = screen.getByLabelText(/Task Type/i);
    await user.selectOptions(taskTypeSelect, 'Lecture');
    const editable = await screen.findByLabelText(/Delivery Hours/i);
    await user.clear(editable);
    await user.type(editable, '10.1');
    await user.tab();

    expect(await screen.findByText(/Delivery hours must be between 0\.1 and 10/)).toBeInTheDocument();
  });
});

