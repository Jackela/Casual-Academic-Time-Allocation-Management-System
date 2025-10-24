import { Navigate } from 'react-router-dom';
import useRole from '../../auth/useRole';

export default function TimesheetCreateRoute() {
  const { role, ready } = useRole();
  if (!ready) return null;
  if (role === 'LECTURER' || role === 'ADMIN') {
    // Route is not a full page in current app; send to dashboard
    return <Navigate to="/dashboard" replace />;
  }
  // Tutor (or others) see restriction message
  return (
    <div
      className="mx-auto my-6 max-w-3xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
      role="status"
      data-testid="restriction-message"
    >
      Timesheet creation is restricted to Lecturers and Admins.
    </div>
  );
}
