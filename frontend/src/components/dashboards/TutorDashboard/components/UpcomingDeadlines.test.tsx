import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UpcomingDeadlines from './UpcomingDeadlines';

describe('UpcomingDeadlines', () => {
  it('renders loading state when summary is fetching', () => {
    render(
      <UpcomingDeadlines
        deadlines={[]}
        isLoading
      />,
    );

    expect(screen.getByText(/Loading upcoming deadlines/i)).toBeInTheDocument();
    const statusIndicators = screen.getAllByRole('status');
    expect(statusIndicators.length).toBeGreaterThan(0);
  });

  it('renders empty state when no deadlines exist', () => {
    render(
      <UpcomingDeadlines
        deadlines={[]}
      />,
    );

    expect(screen.getByText(/No upcoming deadlines available/i)).toBeInTheDocument();
  });

  it('renders provided error message', () => {
    render(
      <UpcomingDeadlines
        deadlines={[]}
        errorMessage="Unable to load deadlines"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load deadlines');
  });
});
