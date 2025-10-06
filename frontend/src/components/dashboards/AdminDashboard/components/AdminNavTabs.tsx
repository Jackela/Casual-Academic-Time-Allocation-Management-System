import { memo } from 'react';
import type { AdminTabSpec, AdminTabId } from '../../../../types/dashboard/admin-dashboard';

interface AdminNavTabsProps {
  tabs: AdminTabSpec[];
  currentTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
}

const AdminNavTabs = memo<AdminNavTabsProps>(({ tabs, currentTab, onTabChange }) => (
  <nav className="mb-8 border-b">
    <div className="-mb-px flex space-x-6" data-testid="filters-section">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
            currentTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </nav>
));

AdminNavTabs.displayName = "AdminNavTabs";

export default AdminNavTabs;
