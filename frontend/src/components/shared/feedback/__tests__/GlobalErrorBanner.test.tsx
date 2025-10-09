import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, expect } from 'vitest';
import { GlobalErrorBanner } from '../GlobalErrorBanner';

describe('GlobalErrorBanner', () => {
  it('renders with default title and message', () => {
    render(<GlobalErrorBanner message="Something exploded" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something exploded')).toBeInTheDocument();
  });

  it('supports custom title and warning severity', () => {
    render(
      <GlobalErrorBanner
        title="Heads up"
        message="This is only a warning"
        severity="warning"
      />,
    );

    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('This is only a warning')).toBeInTheDocument();
  });

  it('renders action button and handles clicks', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <GlobalErrorBanner
        message="Refresh required"
        actionLabel="Retry"
        onAction={onAction}
      />,
    );

    const actionButton = screen.getByRole('button', { name: /retry/i });
    await user.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders dismiss button when provided', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <GlobalErrorBanner
        message="Dismiss me"
        onDismiss={onDismiss}
      />,
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
