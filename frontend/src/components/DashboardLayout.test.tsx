import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardLayout from './DashboardLayout';

const mockSignOut = vi.fn<() => Promise<void>>(() => Promise.resolve());
const mockNavigate = vi.fn();

vi.mock('../auth/SessionProvider', () => ({
  useSession: () => ({
    status: 'authenticated',
    isAuthenticated: true,
    token: 'token',
    refreshToken: null,
    expiresAt: null,
    error: null,
    signIn: vi.fn(),
    signOut: mockSignOut,
    refresh: vi.fn(),
  }),
}));

vi.mock('../auth/UserProfileProvider', () => ({
  useUserProfile: () => ({
    profile: { name: 'Test User', role: 'LECTURER' },
    loading: false,
    error: null,
    reload: vi.fn(),
    setProfile: vi.fn(),
  }),
}));

vi.mock('../auth/access-control', () => ({
  useAccessControl: () => ({
    role: 'LECTURER',
    isTutor: false,
    isLecturer: true,
    isAdmin: false,
    canApproveTimesheets: true,
    canViewAdminDashboard: false,
    hasRole: vi.fn(),
  }),
}));

vi.mock('./shared/NotificationPresenter', () => ({
  default: () => <div data-testid="notification-presenter" />,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    NavLink: ({ children, to, className, ...props }: { children: React.ReactNode; to: string; className?: string | ((args: { isActive: boolean; isPending?: boolean; isTransitioning?: boolean }) => string); end?: boolean }) => {
      const resolvedClassName =
        typeof className === 'function'
          ? className({ isActive: false, isPending: false, isTransitioning: false })
          : className;
      return (
        <a href={to} className={resolvedClassName} {...props}>
          {children}
        </a>
      );
    },
  };
});

beforeEach(() => {
  mockSignOut.mockClear();
  mockNavigate.mockClear();
});

describe('DashboardLayout', () => {
  it('signs out and navigates to login when the header button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <DashboardLayout>
        <div>Protected content</div>
      </DashboardLayout>,
    );

    const button = screen.getByRole('button', { name: /sign out/i });
    await user.click(button);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
