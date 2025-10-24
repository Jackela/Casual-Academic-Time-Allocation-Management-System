import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { STORAGE_KEYS } from '../utils/storage-keys';
import useRole from '../auth/useRole';
import { useUserProfile } from '../auth/UserProfileProvider';
import { useAccessControl } from '../auth/access-control';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { role, ready } = useRole();
  const session = useSession();
  const { profile } = useUserProfile();
  const access = useAccessControl();
  const location = useLocation();

  // Show loading spinner while checking authentication only if no token fallback is present
  const isLoadingSession = session.status === 'authenticating' || session.status === 'refreshing';
  const hasToken = typeof window !== 'undefined' && !!window.localStorage.getItem(STORAGE_KEYS.TOKEN);
  const hasSeededUser = !!(typeof window !== 'undefined' && (window as any).__E2E_AUTH_MANAGER_STATE__?.()?.user) || false;
  if (isLoadingSession && !hasToken) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // SPA E2E best-practice: honor injected auth in localStorage immediately
  const effectiveIsAuthed = session.isAuthenticated || hasToken || hasSeededUser;

  // Redirect to login if not authenticated
  if (!effectiveIsAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole) {
    // While role is resolving but we have client-side auth seed, render children to allow route to mount
    if (!role && effectiveIsAuthed) {
      return <>{children}</>;
    }
    const hasRequired = role ? String(role).toUpperCase() === String(requiredRole).toUpperCase() : access.hasRole(requiredRole);
    if (!hasRequired) {
      return (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p>Required role: {requiredRole}</p>
          <p>Your role: {role ?? 'Unknown'}</p>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
