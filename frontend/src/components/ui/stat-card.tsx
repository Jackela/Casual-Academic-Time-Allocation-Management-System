/**
 * Enhanced StatCard Component
 * 
 * Modern replacement for TutorStatCard with improved design, accessibility, and features.
 * Compatible with both existing CSS system and new Tailwind system.
 */

import { memo } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { cn } from '../../lib/utils';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatting';

// Icons - using simple SVG icons for now, can be replaced with lucide-react
const TrendingUpIcon = () => (
  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
    <polyline points="16,7 22,7 22,13" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22,17 13.5,8.5 8.5,13.5 2,7" />
    <polyline points="16,17 22,17 22,11" />
  </svg>
);

const DollarSignIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

// =============================================================================
// Types
// =============================================================================

export interface StatCardTrend {
  value: number;
  isPositive: boolean;
  period?: string;
}

export interface StatCardProps {
  icon?: ReactNode;
  title: string;
  value: string | number;
  trend?: StatCardTrend;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
  loading?: boolean;
}

// =============================================================================
// Variant Configurations
// =============================================================================

const getVariantStyles = (variant: StatCardProps['variant'] = 'default') => {
  const styles = {
    default: {
      card: 'border-border bg-background hover:bg-accent/5',
      icon: 'text-primary bg-primary/10',
      title: 'text-muted-foreground',
      value: 'text-foreground',
    },
    success: {
      card: 'border-green-200 bg-green-50/50 hover:bg-green-50 dark:border-green-800 dark:bg-green-950/50 dark:hover:bg-green-950/70',
      icon: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50',
      title: 'text-green-700 dark:text-green-300',
      value: 'text-green-900 dark:text-green-100',
    },
    warning: {
      card: 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/50 dark:hover:bg-yellow-950/70',
      icon: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/50',
      title: 'text-yellow-700 dark:text-yellow-300',
      value: 'text-yellow-900 dark:text-yellow-100',
    },
    destructive: {
      card: 'border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/50 dark:hover:bg-red-950/70',
      icon: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/50',
      title: 'text-red-700 dark:text-red-300',
      value: 'text-red-900 dark:text-red-100',
    },
    primary: {
      card: 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50 dark:hover:bg-blue-950/70',
      icon: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50',
      title: 'text-blue-700 dark:text-blue-300',
      value: 'text-blue-900 dark:text-blue-100',
    },
  };
  
  return styles[variant];
};

const getSizeStyles = (size: StatCardProps['size'] = 'medium') => {
  const styles = {
    small: {
      padding: 'p-4',
      icon: 'p-1.5 rounded-lg',
      title: 'text-xs',
      value: 'text-lg',
      gap: 'space-y-2',
    },
    medium: {
      padding: 'p-6',
      icon: 'p-2 rounded-lg',
      title: 'text-sm',
      value: 'text-2xl',
      gap: 'space-y-3',
    },
    large: {
      padding: 'p-8',
      icon: 'p-3 rounded-xl',
      title: 'text-base',
      value: 'text-3xl',
      gap: 'space-y-4',
    },
  };
  
  return styles[size];
};

// =============================================================================
// Loading Skeleton Component
// =============================================================================

const StatCardSkeleton = memo<{ size?: StatCardProps['size']; className?: string }>(
  ({ size = 'medium', className }) => {
    const sizeStyles = getSizeStyles(size);
    
    return (
      <Card className={cn(sizeStyles.padding, 'animate-pulse', className)}>
        <div className="flex items-center justify-between space-y-0 pb-2">
          <div className="h-4 bg-muted rounded w-24" />
          <div className={cn("bg-muted rounded", sizeStyles.icon, "h-8 w-8")} />
        </div>
        
        <div className={sizeStyles.gap}>
          <div className={cn("h-8 bg-muted rounded w-32", {
            'h-6 w-24': size === 'small',
            'h-10 w-40': size === 'large',
          })} />
          
          <div className="flex items-center space-x-2">
            <div className="h-6 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-20" />
          </div>
          
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </Card>
    );
  }
);

StatCardSkeleton.displayName = 'StatCardSkeleton';

// =============================================================================
// Main StatCard Component
// =============================================================================

const StatCard = memo<StatCardProps>(({
  icon = <DollarSignIcon />,
  title,
  value,
  trend,
  description,
  variant = 'default',
  size = 'medium',
  interactive = false,
  onClick,
  className,
  'data-testid': dataTestId,
  loading = false,
}) => {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const isNumericValue = typeof value === 'number';

  // Format value if it's a number
  const formattedValue = typeof value === 'number'
    ? (
        title.toLowerCase().includes('earn') ||
        title.toLowerCase().includes('pay') ||
        title.toLowerCase().includes('revenue')
      )
        ? formatCurrency(value)
        : formatNumber(value)
    : value;

  // Loading state
  if (loading) {
    return <StatCardSkeleton size={size} className={className} />;
  }

  // Event handlers
  const handleClick = () => {
    if (interactive && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (interactive && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        sizeStyles.padding,
        variantStyles.card,
        interactive && 'cursor-pointer hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'transition-all duration-200',
        className
      )}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      data-testid={dataTestId ?? 'stat-card'}
    >
      {/* Header */}
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className={cn(
          'font-medium tracking-tight',
          sizeStyles.title,
          variantStyles.title
        )}>
          {title}
        </h3>
        
        {icon && (
          <div className={cn(sizeStyles.icon, variantStyles.icon)}>
            {icon}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className={sizeStyles.gap}>
        {/* Value */}
        <div className={cn(
          'font-bold',
          sizeStyles.value,
          variantStyles.value,
          isNumericValue && 'dashboard-number text-right'
        )}>
          {formattedValue}
        </div>
        
        {/* Trend */}
        {trend && (
          <div className="flex items-center space-x-2">
            <Badge 
              variant={trend.isPositive ? "success" : "destructive"}
              className="flex items-center space-x-1 px-2 py-1"
            >
              {trend.isPositive ? (
                <TrendingUpIcon />
              ) : (
                <TrendingDownIcon />
              )}
              <span className="text-xs font-medium">
                {trend.isPositive ? '+' : ''}{formatPercentage(trend.value)}
              </span>
            </Badge>
            
            {trend.period && (
              <span className="text-xs text-muted-foreground">
                {trend.period}
              </span>
            )}
          </div>
        )}
        
        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// =============================================================================
// StatCard Group Component
// =============================================================================

export interface StatCardGroupProps {
  cards: StatCardProps[];
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatCardGroup = memo<StatCardGroupProps>(({
  cards,
  columns = 4,
  gap = 'md',
  className,
}) => {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-6',
    lg: 'gap-8',
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div 
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
    >
      {cards.map((card, index) => (
        <StatCard key={card['data-testid'] || `stat-card-${index}`} {...card} />
      ))}
    </div>
  );
});

StatCardGroup.displayName = 'StatCardGroup';

export { StatCard, StatCardSkeleton };
