// React import removed as it's not needed in React 17+
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import LecturerDashboard from './components/LecturerDashboard';
import TutorDashboard from './components/TutorDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorLogger, setupGlobalErrorHandling } from './utils/error-logger';
import { initializeConfiguration } from './config';
import { secureLogger } from './utils/secure-logger';
import './App.css';

// Initialize configuration system
if (!initializeConfiguration()) {
  console.error('Failed to initialize configuration system');
}

// Initialize global error handling
const errorLogger = new ErrorLogger();
setupGlobalErrorHandling(errorLogger);

// Log application startup
secureLogger.info('CATAMS Application starting up');

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
      console.error('App-level error:', error, errorInfo);
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
              <Route 
                path="/dashboard" 
                element={
                  <ErrorBoundary level="page">
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ErrorBoundary level="component">
                          <DashboardRoute />
                        </ErrorBoundary>
                      </DashboardLayout>
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
              
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
