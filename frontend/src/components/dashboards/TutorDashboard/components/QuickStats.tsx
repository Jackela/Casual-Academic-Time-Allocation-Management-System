import { memo } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

export interface QuickStat {
  id: string;
  title: string;
  value: ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
  onClick?: () => void;
}

export interface QuickStatsProps {
  heading: string;
  stats: QuickStat[];
  ariaLabel?: string;
  className?: string;
}

const QuickStatCard = memo<QuickStat>(({ title, value, subtitle, trend = 'stable', icon, onClick }) => (
  <Card
    className={`flex flex-col ${onClick ? 'cursor-pointer hover:bg-accent' : ''}`}
    data-testid="stat-card"
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    } : undefined}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon && <span className="text-2xl text-muted-foreground">{icon}</span>}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold dashboard-number text-right">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground">
          {trend === 'up' && '↗ '}
          {trend === 'down' && '↘ '}
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
));

QuickStatCard.displayName = 'QuickStatCard';

const QuickStats = ({ heading, stats, ariaLabel = heading, className = '' }: QuickStatsProps) => {
  const sectionClassName = ['mb-8', className].filter(Boolean).join(' ');

  return (
    <section className={sectionClassName} role="region" aria-label={ariaLabel}>
      <h2 className="mb-4 text-xl font-semibold">{heading}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <QuickStatCard key={stat.id} {...stat} />
        ))}
      </div>
    </section>
  );
};

export default QuickStats;
