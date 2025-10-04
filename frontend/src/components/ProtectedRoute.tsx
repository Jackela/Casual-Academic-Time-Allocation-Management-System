import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { useUserProfile } from '../auth/UserProfileProvider';
import { useAccessControl } from '../auth/access-control';
import { ENV_CONFIG } from '../utils/environment';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const session = useSession();
  const { profile } = useUserProfile();
  const access = useAccessControl();
  const location = useLocation();
  
  // E2E auth bypass: allow protected content in e2e mode when flag is set
  const hasE2EBypass = ENV_CONFIG.e2e.hasAuthBypass();

  // Show loading spinner while checking authentication
  if (session.status === 'authenticating' || session.status === 'refreshing') {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session.isAuthenticated && !hasE2EBypass) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole && !access.hasRole(requiredRole)) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>Required role: {requiredRole}</p>
        <p>Your role: {user?.role}</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
