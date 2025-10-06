import AdminDashboardShell from './AdminDashboardShell';

export type { AdminDashboardProps } from './AdminDashboardShell';
export { default as AdminDashboardShell } from './AdminDashboardShell';

export { useAdminDashboardData } from './hooks/useAdminDashboardData';
export type { UseAdminDashboardDataResult } from './hooks/useAdminDashboardData';

const AdminDashboard = AdminDashboardShell;

export default AdminDashboard;
