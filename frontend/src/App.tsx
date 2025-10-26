// React import removed as it's not needed in React 17+
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useUserProfile } from './auth/UserProfileProvider';
import useRole from './auth/useRole';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import { AdminDashboard, LecturerDashboard, TutorDashboard } from './components/dashboards';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorLogger, setupGlobalErrorHandling } from './utils/error-logger';
import { initializeConfiguration } from './config';
import { secureLogger } from './utils/secure-logger';
import PageLoadingIndicator from './components/shared/feedback/PageLoadingIndicator';
import { AdminUsersPage } from './features/admin-users';
import './App.css';
import TimesheetCreateRoute from './components/Routes/TimesheetCreateRoute';

// Initialize configuration system
if (!initializeConfiguration()) {
  secureLogger.error('Failed to initialize configuration system');
}

// Initialize global error handling
const errorLogger = new ErrorLogger();
setupGlobalErrorHandling(errorLogger);

// Log application startup
secureLogger.info('CATAMS Application starting up');

// Helper to wrap protected dashboard routes
type DashboardElementOptions = {
  requiredRole?: string;
};

function createDashboardElement(content: ReactNode, options?: DashboardElementOptions) {
  return (
    <ErrorBoundary level="page">
      <ProtectedRoute requiredRole={options?.requiredRole}>
        <DashboardLayout>
          <ErrorBoundary level="component">{content}</ErrorBoundary>
        </DashboardLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

// Component to determine which dashboard to show based on user role
const DashboardRoute = () => {
  const { role, ready } = useRole();
  const { profile } = useUserProfile();

  if (!ready || !role) {
    return (
      <PageLoadingIndicator
        message="Preparing your dashboard…"
        subMessage="Hold tight while we load your role and permissions."
      />
    );
  }

  const resolvedRole = role || profile?.role;
  switch (role) {
    case 'ADMIN':
      return <AdminDashboard key="admin-dashboard" />;
    case 'LECTURER':
      return <LecturerDashboard key="lecturer-dashboard" />;
    case 'TUTOR':
      return <TutorDashboard key="tutor-dashboard" />;
    default:
      return <div className="unknown-role-banner">Unknown role: {resolvedRole}</div>;
  }
};

function App() {
  return (
    <ErrorBoundary level="critical" onError={(error, errorInfo) => {
      // Additional error handling for app-level errors
      secureLogger.error('App-level error', { error, errorInfo });
    }}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route 
                path="/login" 
                element={
                  <ErrorBoundary level="page">
                    <LoginPage />
                  </ErrorBoundary>
                } 
              />
             
              {/* Protected routes */}
              <Route path="/timesheets/create" element={createDashboardElement(<TimesheetCreateRoute />)} />
              <Route path="/dashboard" element={createDashboardElement(<DashboardRoute />)} />
              <Route path="/admin/users" element={createDashboardElement(<AdminUsersPage />, { requiredRole: 'ADMIN' })} />
              {/* Backwards-compatible alias: some tests and deep-links use /users */}
              <Route path="/users" element={<Navigate to="/admin/users" replace />} />
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Catch all route - redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;








