import { memo } from 'react';
import type { AdminTabSpec, AdminTabId } from '../../../../types/dashboard/admin-dashboard';

const COMING_SOON_TABS = new Set<AdminTabId>(['users', 'analytics', 'settings']);

interface AdminNavTabsProps {
  tabs: AdminTabSpec[];
  currentTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
}

const AdminNavTabs = memo<AdminNavTabsProps>(({ tabs, currentTab, onTabChange }) => (
  <nav className="mb-8 border-b">
    <div className="-mb-px flex space-x-6" data-testid="filters-section">
      {tabs.map((tab) => {
        const isComingSoon = COMING_SOON_TABS.has(tab.id);
        const isActive = currentTab === tab.id;

        const variantClass = isComingSoon
          ? 'border-transparent text-muted-foreground opacity-60 cursor-not-allowed'
          : isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground';

        return (
          <button
            key={tab.id}
            type="button"
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${variantClass}`}
            title={isComingSoon ? 'Coming soon' : undefined}
            aria-disabled={isComingSoon}
            disabled={isComingSoon}
            onClick={() => {
              if (!isComingSoon) {
                onTabChange(tab.id);
              }
            }}
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
