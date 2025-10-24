import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminNavTabs from './AdminNavTabs';
import type { AdminTabSpec } from '../../../../types/dashboard/admin-dashboard';

describe('AdminNavTabs', () => {
  const tabs: AdminTabSpec[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'pending', label: 'Pending Approvals' },
    { id: 'users', label: 'Users' },
    { id: 'analytics', label: 'Reports & Analytics' },
    { id: 'settings', label: 'System Settings' },
  ];

  it('renders only implemented tabs', () => {
    render(<AdminNavTabs tabs={tabs} currentTab="overview" onTabChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pending Approvals' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reports & Analytics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'System Settings' })).not.toBeInTheDocument();
  });

  it('keeps active tabs enabled without placeholder tooltip', () => {
    render(<AdminNavTabs tabs={tabs.slice(0, 2)} currentTab="overview" onTabChange={vi.fn()} />);

    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    const pendingTab = screen.getByRole('button', { name: 'Pending Approvals' });

    expect(overviewTab).not.toBeDisabled();
    expect(overviewTab).not.toHaveAttribute('title');

    expect(pendingTab).not.toBeDisabled();
    expect(pendingTab).not.toHaveAttribute('title');
  });
});
