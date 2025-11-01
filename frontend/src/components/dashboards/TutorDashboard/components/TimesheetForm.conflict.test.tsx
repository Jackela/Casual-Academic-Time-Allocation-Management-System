import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimesheetForm from './TimesheetForm';

describe('TimesheetForm — regression: duplicate week inline error', () => {
  it('renders a friendly inline error when server reports duplicate week', async () => {
    render(
      <TimesheetForm
        mode="lecturer-create"
        tutorId={4}
        selectedTutorId={4}
        tutorOptions={[{ id: 4, label: 'Tutor A', qualification: 'STANDARD' } as any]}
        courseOptions={[{ id: 1, label: 'COMP1001 - Introduction to Programming' }]}
        error={'Timesheet already exists for this tutor and week'}
        onTutorChange={() => {}}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    // Inline friendly message derived from error prop
    expect(
      await screen.findByText(
        /A timesheet already exists for this tutor, course, and week/i,
      ),
    ).toBeInTheDocument();
  });
});

