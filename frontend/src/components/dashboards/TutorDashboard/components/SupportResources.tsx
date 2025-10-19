import type { ReactNode } from 'react';
import { Card, CardContent, CardTitle } from '../../../ui/card';

export interface SupportResourceItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon?: ReactNode;
}

export interface SupportResourcesProps {
  resources: SupportResourceItem[];
  className?: string;
  title?: string;
  emptyMessage?: string;
}

const SupportResources = ({
  resources,
  className = '',
  title = 'Support Resources',
  emptyMessage = 'Contact the staffing team if you need additional help.'
}: SupportResourcesProps) => {
  const cardClassName = ['p-4', className].filter(Boolean).join(' ');

  return (
    <Card className={`w-full max-w-full ${cardClassName}`} data-testid="support-resources">
      <CardTitle className="mb-2 text-lg font-semibold">{title}</CardTitle>
      <CardContent className="space-y-3 p-0">
        {resources.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
        {resources.map((resource) => (
          <div key={resource.id} className="flex items-start gap-3">
            {resource.icon && (
              <span className="mt-1 text-lg text-muted-foreground" aria-hidden="true">
                {resource.icon}
              </span>
            )}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{resource.label}</p>
              {resource.description && (
                <p className="text-xs text-muted-foreground">{resource.description}</p>
              )}
              {resource.href && (
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View details
                </a>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SupportResources;