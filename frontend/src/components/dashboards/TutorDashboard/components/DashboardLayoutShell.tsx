import type { ReactNode } from 'react';

export interface DashboardLayoutShellProps {
  header?: ReactNode;
  main: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  mainColumnClassName?: string;
  sidebarClassName?: string;
  contentClassName?: string;
}

const DashboardLayoutShell = ({
  header,
  main,
  sidebar,
  footer,
  className = '',
  mainColumnClassName = '',
  sidebarClassName = '',
  contentClassName = ''
}: DashboardLayoutShellProps) => (
  <div className={`dashboard-layout flex flex-col gap-6 ${className}`} data-testid="dashboard-layout-shell">
    {header && (
      <div className="dashboard-layout__header" data-testid="dashboard-layout-shell-header">
        {header}
      </div>
    )}

    <div
      className={`dashboard-layout__content grid grid-cols-1 gap-6 lg:grid-cols-3 ${contentClassName}`}
      data-testid="dashboard-layout-shell-content"
    >
      <div
        className={`dashboard-layout__main space-y-6 ${sidebar ? 'lg:col-span-2' : 'lg:col-span-3'} ${mainColumnClassName}`}
        data-testid="dashboard-layout-shell-main"
      >
        {main}
      </div>
      {sidebar && (
        <aside
          className={`dashboard-layout__sidebar space-y-6 ${sidebarClassName}`}
          data-testid="dashboard-layout-shell-sidebar"
        >
          {sidebar}
        </aside>
      )}
    </div>

    {footer && (
      <div className="dashboard-layout__footer" data-testid="dashboard-layout-shell-footer">
        {footer}
      </div>
    )}
  </div>
);

export default DashboardLayoutShell;