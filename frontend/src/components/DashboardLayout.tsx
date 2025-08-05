import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'LECTURER':
        return 'role-badge lecturer';
      case 'TUTOR':
        return 'role-badge tutor';
      case 'ADMIN':
        return 'role-badge admin';
      default:
        return 'role-badge';
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header" data-testid="layout-dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title" data-testid="app-title">CATAMS</h1>
            <span className="app-subtitle" data-testid="app-subtitle">Time Allocation Management</span>
          </div>
          
          <div className="header-right" data-testid="header-right">
            <div className="user-info" data-testid="user-info">
              <div className="user-details" data-testid="user-details">
                <span className="user-name" data-testid="user-name">{user?.name}</span>
                <span className={getRoleBadgeClass(user?.role || '')} data-testid="user-role-badge">
                  {getRoleDisplayName(user?.role || '')}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="logout-button"
                data-testid="logout-button"
                title="Sign out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="dashboard-nav" data-testid="dashboard-nav">
        <div className="nav-content" data-testid="nav-content">
          <div className="nav-items" data-testid="nav-items">
            <button className="nav-item active" data-testid="nav-dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              Dashboard
            </button>
            
            {user?.role === 'LECTURER' && (
              <>
                <button className="nav-item" data-testid="nav-timesheets">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                  Timesheets
                </button>
                <button className="nav-item" data-testid="nav-approvals">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                  Approvals
                </button>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <button className="nav-item" data-testid="nav-users">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  Users
                </button>
                <button className="nav-item" data-testid="nav-reports">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Reports
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main" data-testid="dashboard-main">
        <div className="main-content" data-testid="main-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;