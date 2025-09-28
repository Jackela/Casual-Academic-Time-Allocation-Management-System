// React import removed as it's not needed in React 17+
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import { AdminDashboard, LecturerDashboard, TutorDashboard } from './components/dashboards';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorLogger, setupGlobalErrorHandling } from './utils/error-logger';
import { initializeConfiguration } from './config';
import { secureLogger } from './utils/secure-logger';
import './App.css';

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
function createDashboardElement(content: ReactNode) {
  return (
    <ErrorBoundary level="page">
      <ProtectedRoute>
        <DashboardLayout>
          <ErrorBoundary level="component">{content}</ErrorBoundary>
        </DashboardLayout>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

type PlaceholderPageProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}

function TimesheetsPage() {
  return (
    <PlaceholderPage
      title="Timesheets"
      description="Full timesheet management is being restored. For now, continue using the dashboard actions to manage drafts and submissions."
    />
  );
}

function ApprovalsPage() {
  return (
    <PlaceholderPage
      title="Approvals"
      description="Approval workflows are available from the dashboard while we finish re-enabling dedicated approval screens."
    />
  );
}

function UsersPage() {
  return (
    <PlaceholderPage
      title="User Management"
      description="Administrator tools for managing users will return shortly. Existing data remains accessible from the dashboard summaries."
    />
  );
}

function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports & Analytics"
      description="Detailed reports are under reconstruction. Use the dashboard KPIs for the most up-to-date metrics."
    />
  );
}

function ApprovalsHistoryPage() {
  return (
    <PlaceholderPage
      title="Approval History"
      description="The archived approval log is being migrated. We'll surface the complete history here once the migration is complete."
    >
      <Link to="/approvals" className="text-primary underline">Return to approvals</Link>
    </PlaceholderPage>
  );
}
// Component to determine which dashboard to show based on user role
const DashboardRoute = () => {
  const { user } = useAuth();
  
  switch (user?.role) {
    case 'LECTURER':
      return <LecturerDashboard />;
    case 'TUTOR':
      return <TutorDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    default:
      return <div>Unknown role: {user?.role}</div>;
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
              <Route path="/dashboard" element={createDashboardElement(<DashboardRoute />)} />
              <Route path="/timesheets" element={createDashboardElement(<TimesheetsPage />)} />
              <Route path="/approvals" element={createDashboardElement(<ApprovalsPage />)} />
              <Route path="/approvals/history" element={createDashboardElement(<ApprovalsHistoryPage />)} />
              <Route path="/users" element={createDashboardElement(<UsersPage />)} />
              <Route path="/reports" element={createDashboardElement(<ReportsPage />)} />              
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





