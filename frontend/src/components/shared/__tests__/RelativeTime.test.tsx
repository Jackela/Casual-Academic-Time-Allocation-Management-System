import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import RelativeTime from '../RelativeTime';

describe('RelativeTime', () => {
  it('renders relative text and exposes full timestamp via tooltip', async () => {
    const user = userEvent.setup();
    const referenceNow = new Date('2025-01-01T12:00:00Z');
    render(<RelativeTime timestamp="2025-01-01T10:00:00Z" now={referenceNow} />);

    const expectedLabel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-2, 'hour');
    const trigger = screen.getByText(expectedLabel);
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('data-iso', '2025-01-01T10:00:00.000Z');

    const tooltip = screen.getByRole('tooltip', { hidden: true });
    await user.hover(trigger);
    await waitFor(() => expect(tooltip).not.toHaveAttribute('aria-hidden', 'true'));
    const absoluteFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const expectedAbsolute = absoluteFormatter.format(new Date('2025-01-01T10:00:00Z'));
    expect(tooltip).toHaveTextContent(expectedAbsolute);
    expect(tooltip).toHaveTextContent('2025-01-01T10:00:00.000Z');
  });

  it('falls back gracefully when timestamp is invalid', () => {
    render(<RelativeTime timestamp="invalid-date" fallback="--" />);
    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
