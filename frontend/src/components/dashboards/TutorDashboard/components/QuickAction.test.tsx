import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import QuickAction from './QuickAction';

describe('QuickAction', () => {
  it('disables and shows busy state while loading', async () => {
    const onClick = vi.fn();
    render(
      <QuickAction
        label="Refresh Data"
        description="Reload"
        icon={<span data-testid="icon" />}
        onClick={onClick}
        loading
      />
    );

    const button = screen.getByRole('button', { name: /refresh data/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    const user = userEvent.setup();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('invokes handler when not disabled or loading', async () => {
    const onClick = vi.fn();
    render(
      <QuickAction
        label="View Pay"
        description="Jump"
        icon={<span data-testid="icon" />}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button', { name: /view pay/i });
    expect(button).not.toBeDisabled();

    const user = userEvent.setup();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
