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

describe('TimesheetForm', () => {
  beforeEach(() => {
    mockServerOverrides.mockClear();
  });

  it('applies server-provided constraint overrides', async () => {
    const TimesheetFormModule = await import('./TimesheetForm');
    const TimesheetForm = TimesheetFormModule.default;

    render(
      <TimesheetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const hoursInput = await screen.findByLabelText(/Hours Worked/i);
    const weekStartInput = await screen.findByLabelText(/Week Starting/i);

    await waitFor(() => expect(hoursInput).toHaveAttribute('max', '48'));
    await waitFor(() => expect(weekStartInput).toHaveAttribute('step', '7'));

    expect(mockServerOverrides).toHaveBeenCalledTimes(1);

    const user = userEvent.setup();
    await user.clear(hoursInput);
    await user.type(hoursInput, '49');
    await user.tab();

    expect(await screen.findByText(/Hours must be between 0\.25 and 48/)).toBeInTheDocument();
  });
});
