import type { ReactNode } from 'react';

export interface TutorHeaderProps {
  welcomeMessage: string;
  title: string;
  description: string;
  className?: string;
  actions?: ReactNode;
}

const TutorHeader = ({
  welcomeMessage,
  title,
  description,
  className = '',
  actions
}: TutorHeaderProps) => {
  const headerClassName = ['mb-8 space-y-2', className].filter(Boolean).join(' ');

  return (
    <header className={headerClassName}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="main-welcome-message">
            {welcomeMessage}
          </h1>
          <p className="text-muted-foreground" data-testid="main-dashboard-title">
            {title}
          </p>
          <p className="text-muted-foreground" data-testid="main-dashboard-description">
            {description}
          </p>
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
};

export default TutorHeader;