/**
 * Enhanced TutorDashboard Component - Migration Example
 * 
 * This file demonstrates how to integrate the modern StatCard components
 * while maintaining compatibility with the existing codebase.
 */

import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { 
  useTimesheets,
  useDashboardSummary, 
  useCreateTimesheet,
  useUpdateTimesheet,
  useTimesheetStats 
} from '../../../hooks/useTimesheets';
import { useAuth } from '../../../contexts/AuthContext';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';
import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { formatters } from '../../../utils/formatting';
import type { Timesheet, DashboardDeadline } from '../../../types/api';
import { TimesheetService } from '../../../services/timesheets';

// Import new modern components
import { StatCard, StatCardGroup } from '../../ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';

// Modern icons (can be replaced with lucide-react when available)
const DollarIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
    <polyline points="16,7 22,7 22,13" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

// =============================================================================
// Component Props & Types
// =============================================================================

export interface EnhancedTutorDashboardProps {
  className?: string;
}

// =============================================================================
// Enhanced Tutor Dashboard Component
// =============================================================================

const EnhancedTutorDashboard = memo<EnhancedTutorDashboardProps>(({ className = '' }) => {
  const { user } = useAuth();
  const [selectedTimesheets, setSelectedTimesheets] = useState<number[]>([]);
  const [currentTab, setCurrentTab] = useState<'all' | 'drafts' | 'submitted' | 'needAction'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Existing hooks and data fetching
  const {
    loading: timesheetsLoading,
    error: timesheetsError,
    timesheets: allTimesheets,
    isEmpty: noTimesheets,
    refetch: refetchTimesheets
  } = useTimesheets({ 
    tutorId: user?.id,
    size: 50
  });

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useDashboardSummary(false);

  const tutorStats = useTimesheetStats(allTimesheets);

  // Calculate completion rate and other stats
  const completionRate = useMemo(() => {
    const total = tutorStats.totalCount || 0;
    if (!total) return 0;
    const completed = tutorStats.statusCounts?.FINAL_CONFIRMED ?? 0;
    return completed / total;
  }, [tutorStats.statusCounts, tutorStats.totalCount]);

  const thisWeekSummary = useMemo(() => ({
    hours: dashboardData?.thisWeekHours || 0,
    pay: dashboardData?.thisWeekPay || 0
  }), [dashboardData]);

  // Enhanced stats for modern StatCard components
  const enhancedStats = useMemo(() => [
    {
      icon: <DollarIcon />,
      title: "Total Earned",
      value: tutorStats.totalPay,
      trend: {
        value: 12.5,
        isPositive: true,
        period: "from last month"
      },
      description: "All-time earnings",
      variant: "success" as const,
      'data-testid': "total-earned-card"
    },
    {
      icon: <ClockIcon />,
      title: "Total Hours",
      value: `${tutorStats.totalHours}h`,
      trend: {
        value: 8.2,
        isPositive: true,
        period: "this semester"
      },
      description: "Hours logged this semester",
      variant: "primary" as const,
      'data-testid': "total-hours-card"
    },
    {
      icon: <TrendingUpIcon />,
      title: "Average per Week",
      value: `${(tutorStats.totalHours / 16).toFixed(1)}h`,
      description: "Based on 16-week semester",
      variant: "default" as const,
      'data-testid': "avg-weekly-card"
    },
    {
      icon: <ClipboardIcon />,
      title: "Status Overview",
      value: `${tutorStats.totalCount}`,
      description: `${tutorStats.statusCounts?.DRAFT || 0} Drafts, ${Object.values(tutorStats.statusCounts || {}).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0) - (tutorStats.statusCounts?.DRAFT || 0)} In Progress`,
      variant: "warning" as const,
      'data-testid': "status-overview-card"
    }
  ], [tutorStats]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Event handlers (keeping existing ones for compatibility)
  const handleCreateTimesheet = useCallback(() => {
    setEditingTimesheet(null);
    setShowForm(true);
  }, []);

  const welcomeMessage = useMemo(() => {
    const firstName = user?.name?.split(' ')[0] || 'Tutor';
    return `Welcome back, ${firstName}!`;
  }, [user?.name]);

  // Loading state
  if (timesheetsLoading || dashboardLoading) {
    return (
      <div className={`tutor-dashboard loading ${className}`} data-testid="loading-state">
        <div className="dashboard-loading" data-testid="loading-state-container">
          <LoadingSpinner size="large" data-testid="spinner" />
          <p data-testid="loading-text">Loading your timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`dashboard-container tutor-dashboard-enhanced ${className} ${isMobile ? 'mobile-layout' : ''}`}
      data-testid="tutor-dashboard-enhanced"
      role="main"
      aria-label="Enhanced Tutor Dashboard"
    >
      {/* Modern Header Section */}
      <header className="tutor-dashboard-header mb-8">
        <div className="tutor-header__content mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="main-welcome-message">
            {welcomeMessage}
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="main-dashboard-description">
            Manage your timesheets with our enhanced dashboard
          </p>
          
          {/* This Week Summary Card */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                This Week's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {thisWeekSummary.hours}h
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Hours logged
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${formatters.currencyValue(thisWeekSummary.pay).replace(/\.00$/, '')}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Earnings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Error Display */}
      {(timesheetsError || dashboardError || actionError) && (
        <div className="mb-6 space-y-4">
          {timesheetsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200">
              <span>Failed to load timesheets: {timesheetsError}</span>
              <button 
                className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-red-800 text-sm dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200"
                onClick={() => refetchTimesheets()}
              >
                Retry
              </button>
            </div>
          )}
          {actionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200">
              <span>{actionError}</span>
              <button 
                className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-red-800 text-sm dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200"
                onClick={() => setActionError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modern Statistics Section */}
      <section className="mb-8" role="region" aria-label="Statistics Overview">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Your Statistics</h2>
          <Badge variant="outline" className="text-xs">
            Updated {new Date().toLocaleDateString()}
          </Badge>
        </div>
        
        <StatCardGroup 
          cards={enhancedStats}
          columns={4}
          gap="md"
          className="w-full"
        />
      </section>

      {/* Quick Actions Section */}
      <section className="mb-8" role="region" aria-label="Quick Actions">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-dashed hover:border-solid hover:bg-accent/5"
            onClick={handleCreateTimesheet}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Create New</h3>
                <p className="text-sm text-muted-foreground">Start a timesheet</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-dashed hover:border-solid hover:bg-accent/5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg text-green-600 dark:bg-green-900/50 dark:text-green-400">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Submit All</h3>
                <p className="text-sm text-muted-foreground">Submit drafts</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-dashed hover:border-solid hover:bg-accent/5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">View Pay</h3>
                <p className="text-sm text-muted-foreground">Check earnings</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-dashed hover:border-solid hover:bg-accent/5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Export Data</h3>
                <p className="text-sm text-muted-foreground">Download records</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Existing Timesheets Table Section - Keep original implementation */}
      <section className="timesheet-section" role="region" aria-label="My Timesheets">
        <Card className="p-6">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-semibold">My Timesheets</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {noTimesheets ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Timesheets Found</h3>
                <p className="text-muted-foreground mb-4">Create your first timesheet to get started.</p>
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  onClick={handleCreateTimesheet}
                >
                  Create First Timesheet
                </button>
              </div>
            ) : (
              <TimesheetTable
                timesheets={allTimesheets}
                loading={timesheetsLoading}
                loadingMessage="Loading timesheets..."
                actionLoading={actionLoadingId}
                onApprovalAction={(id, action) => {
                  // Keep existing action handling logic
                  console.log('Action:', action, 'on timesheet:', id);
                }}
                showActions={true}
                showTutorInfo={false}
                showCourseInfo={true}
                className="modern-timesheet-table"
                data-testid="enhanced-timesheet-table"
                actionMode="tutor"
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Status announcement for screen readers */}
      <div role="status" aria-live="polite" className="sr-only" aria-label="dashboard status">
        {timesheetsLoading && 'Loading timesheets...'}
        {dashboardLoading && 'Loading dashboard data...'}
      </div>
    </div>
  );
});

EnhancedTutorDashboard.displayName = 'EnhancedTutorDashboard';

export default EnhancedTutorDashboard;