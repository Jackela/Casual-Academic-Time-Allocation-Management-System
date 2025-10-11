import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminNavTabs from './AdminNavTabs';
import type { AdminTabSpec } from '../../../../types/dashboard/admin-dashboard';

describe('AdminNavTabs placeholder tabs', () => {
  const tabs: AdminTabSpec[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'pending', label: 'Pending Approvals' },
    { id: 'users', label: 'Users' },
    { id: 'analytics', label: 'Reports & Analytics' },
    { id: 'settings', label: 'System Settings' },
  ];

  it('disables placeholder tabs and shows a tooltip on hover', async () => {
    render(<AdminNavTabs tabs={tabs} currentTab="overview" onTabChange={vi.fn()} />);

    const user = userEvent.setup();
    const disabledTabLabels = ['Users', 'Reports & Analytics', 'System Settings'];

    for (const label of disabledTabLabels) {
      const tabButton = screen.getByRole('button', { name: label });

      expect(tabButton).toBeDisabled();
      expect(tabButton).toHaveAttribute('aria-disabled', 'true');

      await user.hover(tabButton);
      expect(tabButton).toHaveAttribute('title', 'Coming soon');
    }
  });

  it('keeps active tabs enabled without placeholder tooltip', () => {
    render(<AdminNavTabs tabs={tabs} currentTab="overview" onTabChange={vi.fn()} />);

    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    const pendingTab = screen.getByRole('button', { name: 'Pending Approvals' });

    expect(overviewTab).not.toBeDisabled();
    expect(overviewTab).not.toHaveAttribute('title');

    expect(pendingTab).not.toBeDisabled();
    expect(pendingTab).not.toHaveAttribute('title');
  });
});
