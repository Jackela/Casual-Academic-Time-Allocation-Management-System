import { memo } from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface AdminDashboardHeaderProps {
  welcomeMessage: string;
  searchQuery: string;
  onSearch: (value: string) => void;
  onRefresh: () => void;
  urgentCount: number;
  pendingApprovals: number;
}

const AdminDashboardHeader = memo<AdminDashboardHeaderProps>(({
  welcomeMessage,
  searchQuery,
  onSearch,
  onRefresh,
  urgentCount,
  pendingApprovals,
}) => (
  <header className="mb-8">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="main-welcome-message">
          {welcomeMessage}
        </h1>
        <p className="text-muted-foreground" data-testid="main-dashboard-title">
          System Administrator Dashboard
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search timesheets, users..."
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          className="w-64"
        />
        <Button variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </div>

    {urgentCount > 0 && (
      <div
        className="mt-4 flex items-center text-sm font-semibold text-destructive"
        data-testid="urgent-notifications"
        aria-live="polite"
      >
        <span className="relative mr-2 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        {urgentCount + pendingApprovals} urgent items
      </div>
    )}
  </header>
));

AdminDashboardHeader.displayName = 'AdminDashboardHeader';

export default AdminDashboardHeader;
