import React from 'react';
import { useSession } from '../auth/SessionProvider';
import { useUserProfile } from '../auth/UserProfileProvider';
import { useAccessControl } from '../auth/access-control';
import { useNavigate, NavLink } from 'react-router-dom';
import { Badge } from './ui/badge';
import NotificationPresenter from './shared/NotificationPresenter';
import { secureLogger } from '../utils/secure-logger';

// import './DashboardLayout.css'; - REMOVED

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const session = useSession();
  const { profile } = useUserProfile();
  const access = useAccessControl();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await session.signOut();
    } catch (error) {
      secureLogger.warn('Logout did not complete cleanly', error);
    }
    navigate('/login', { replace: true });
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'LECTURER':
        return 'Lecturer';
      case 'TUTOR':
        return 'Tutor';
      case 'ADMIN':
        return 'Administrator';
      default:
        return role;
    }
  };

  // This function is now replaced by the Badge component with variants.
  /*
  const getRoleBadgeClass = (role: string) => {
    const baseClasses = 'px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider';
    switch (role) {
      case 'LECTURER':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'TUTOR':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'ADMIN':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
    }
  };
  */

  const getRoleVariant = (role: string): 'lecturer' | 'tutor' | 'admin' | 'secondary' => {
    switch (role) {
      case 'LECTURER':
        return 'lecturer';
      case 'TUTOR':
        return 'tutor';
      case 'ADMIN':
        return 'admin';
      default:
        return 'secondary';
    }
  };

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 border-b-2 px-0 py-3 mr-8 text-sm font-medium transition-colors ${
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header
        className="sticky bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md elevation-sticky"
        data-testid="layout-dashboard-header"
        style={{ top: 'calc(var(--safe-top) - var(--header-h) - var(--banner-h) - 16px)' }}
      >
        <div
          className="layout-container flex items-center justify-between py-4"
          data-testid="dashboard-title-anchor"
        >
          <div className="flex items-baseline gap-3" data-testid="header-left">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="app-title">
              CATAMS
            </h1>
            <span className="hidden text-sm opacity-90 md:inline" data-testid="app-subtitle">
              Time Allocation Management
            </span>
          </div>

          <div className="flex items-center gap-4" data-testid="header-right">
            {profile && (
              <div className="flex items-center gap-3 sm:gap-4" data-testid="user-info">
                <div
                  className="flex min-w-0 flex-col items-end text-right"
                  data-testid="user-details"
                >
                  <span
                    className="max-w-[9rem] truncate text-sm font-semibold sm:max-w-none sm:text-base"
                    data-testid="user-name"
                  >
                    {profile.name}
                  </span>
                  <Badge
                    variant={profile ? getRoleVariant(profile.role) : 'secondary'}
                    className="mt-1"
                    data-testid="user-role-badge"
                  >
                    {profile ? getRoleDisplayName(profile.role) : ''}
                  </Badge>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                  data-testid="logout-button"
                  title="Sign out"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card" data-testid="dashboard-nav">
        <div className="layout-container" data-testid="nav-content">
          <div className="flex gap-1" data-testid="nav-items">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => navLinkClassName({ isActive })}
              data-testid="nav-dashboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
              </svg>
              Dashboard
            </NavLink>

            {access.isLecturer && (
              <>
                <NavLink
                  to="/timesheets"
                  end
                  className={({ isActive }) => navLinkClassName({ isActive })}
                  data-testid="nav-timesheets"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                  Timesheets
                </NavLink>
                <NavLink
                  to="/approvals"
                  className={({ isActive }) => navLinkClassName({ isActive })}
                  data-testid="nav-approvals"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                  Approvals
                </NavLink>
              </>
            )}

            {access.isAdmin && (
              <>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => navLinkClassName({ isActive })}
                  data-testid="nav-users"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                  Users
                </NavLink>
                <NavLink
                  to="/reports"
                  className={({ isActive }) => navLinkClassName({ isActive })}
                  data-testid="nav-reports"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                  </svg>
                  Reports
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 py-4 sm:py-6 lg:py-8" data-testid="dashboard-main">
        <div className="layout-container" data-testid="main-content">
          <NotificationPresenter />
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;


