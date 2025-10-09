import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageLoadingIndicator } from '../PageLoadingIndicator';

describe('PageLoadingIndicator', () => {
  it('renders default message and icon', () => {
    render(<PageLoadingIndicator />);

    const statusRegion = screen.getByRole('status', { name: /page loading indicator/i });
    expect(statusRegion).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('supports custom message and sub-message', () => {
    render(
      <PageLoadingIndicator
        message="Fetching dashboard data"
        subMessage="Please hold tight while we crunch the numbers"
      />,
    );

    expect(screen.getByText('Fetching dashboard data')).toBeInTheDocument();
    expect(screen.getByText('Please hold tight while we crunch the numbers')).toBeInTheDocument();
  });

  it('allows overriding aria-label and test id', () => {
    render(
      <PageLoadingIndicator
        aria-label="Loading admin dashboard"
        data-testid="admin-loading"
      />,
    );

    expect(screen.getByRole('status', { name: 'Loading admin dashboard' })).toBeInTheDocument();
    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
  });
});
