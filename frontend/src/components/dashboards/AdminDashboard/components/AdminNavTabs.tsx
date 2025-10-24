import { memo } from 'react';
import type { AdminTabSpec, AdminTabId } from '../../../../types/dashboard/admin-dashboard';

const HIDDEN_TAB_IDS = new Set<AdminTabId>(['users', 'analytics', 'settings']);

interface AdminNavTabsProps {
  tabs: AdminTabSpec[];
  currentTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
}

const AdminNavTabs = memo<AdminNavTabsProps>(({ tabs, currentTab, onTabChange }) => (
  <nav className="mb-8 border-b">
    <div className="-mb-px flex space-x-6" data-testid="filters-section">
      {tabs
        .filter((tab) => !HIDDEN_TAB_IDS.has(tab.id))
        .map((tab) => {
        const isActive = currentTab === tab.id;

        const variantClass = isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground';

        return (
          <button
            key={tab.id}
            type="button"
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${variantClass}`}
            onClick={() => {
              onTabChange(tab.id);
            }}
            data-testid={tab.id === 'pending' ? 'tab-pending-approvals' : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  </nav>
));

AdminNavTabs.displayName = "AdminNavTabs";

export default AdminNavTabs;
