import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import LecturerDashboard from './components/LecturerDashboard';
import TutorDashboard from './components/TutorDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

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
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardRoute />
                  </DashboardLayout>
                </ProtectedRoute>
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
  );
}

export default App;
