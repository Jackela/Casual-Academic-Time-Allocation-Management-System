import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import SupportResources from './SupportResources';

describe('SupportResources', () => {
  it('renders placeholder text when no resources are provided', () => {
    render(<SupportResources resources={[]} />);

    expect(screen.getByText(/Contact the staffing team/i)).toBeInTheDocument();
  });

  it('indicates when resource links are not yet available', () => {
    render(
      <SupportResources
        resources={[
          {
            id: 'kb',
            label: 'Knowledge Base',
            comingSoon: true,
          },
        ]}
      />,
    );

    expect(screen.getByText(/Knowledge Base/)).toBeInTheDocument();
    expect(screen.getByText(/Link available soon/i)).toBeInTheDocument();
  });

  it('renders external links when href is provided', () => {
    render(
      <SupportResources
        resources={[
          {
            id: 'faq',
            label: 'FAQ',
            href: 'https://example.edu/faq',
          },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: /View details/i });
    expect(link).toHaveAttribute('href', 'https://example.edu/faq');
  });
});
