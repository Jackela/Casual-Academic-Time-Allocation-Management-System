/**
 * TutorDashboard Component
 *
 * Optimized tutor dashboard with timesheet management, self-service features,
 * pay tracking, and course integration for student tutors.
 */

import { memo, useCallback, useRef, useState } from 'react';
import { useTutorDashboardViewModel } from './hooks/useTutorDashboardViewModel';
import TimesheetTable from '../../shared/TimesheetTable/TimesheetTable';

import LoadingSpinner from '../../shared/LoadingSpinner/LoadingSpinner';
import { secureLogger } from '../../../utils/secure-logger';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import type { Timesheet } from '../../../types/api';
import { TimesheetService } from '../../../services/timesheets';
import { Button } from '../../ui/button';
import {
  TutorHeader,
  QuickStats,
  PaySummary,
  SupportResources,
  QuickAction,
  CompletionProgress,
  UpcomingDeadlines,
  NotificationsPanel,
  EarningsBreakdown,
  TimesheetForm
} from './components';
import type { TimesheetFormData } from './components';
import '../../../styles/dashboard-shell.css';

// =============================================================================
// Component Props & Types
// =============================================================================

export interface TutorDashboardProps {
  className?: string;
}

// =============================================================================
// Main TutorDashboard Component
// =============================================================================

const TutorDashboard = memo<TutorDashboardProps>(({ className = '' }) => {
  const {
    user,
    welcomeMessage,
    completionRate,
    thisWeekSummary,
    quickStats,
    supportResources,
    tabs,
    currentTab,
    handleTabChange,
    filteredTimesheets,
    allTimesheets,
    selectedTimesheets,
    setSelectedTimesheets,
    handleNotificationDismiss,
    visibleDeadlines,
    visibleDraftCount,
    visibleRejectedCount,

    timesheetsQuery,
    dashboardQuery,
    createMutation,
    updateMutation,
    tutorStats
  } = useTutorDashboardViewModel();

  const [showForm, setShowForm] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const paySummaryRef = useRef<HTMLDivElement | null>(null);
  const actionLockRef = useRef(false);
  const ACTION_LOCK_MESSAGE = 'Please wait for the current timesheet action to finish before starting another.';

  const {
    loading: timesheetsLoading,
    error: timesheetsError,
    refetch: refetchTimesheets
  } = timesheetsQuery;

  const noTimesheets = !timesheetsLoading && filteredTimesheets.length === 0;

  const {
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = dashboardQuery;

  const {
    loading: createLoading,
    error: createError,
    createTimesheet,
    reset: resetCreate
  } = createMutation;

  const {
    loading: updateLoading,
    error: updateError,
    updateTimesheet,
    reset: resetUpdate
  } = updateMutation;

  const isFormSubmitting = createLoading || updateLoading;
  const isTimesheetActionInFlight = actionLoadingId !== null;

  const handleCreateTimesheet = useCallback(() => {
    setEditingTimesheet(null);
    setShowForm(true);
  }, []);

  const handleEditTimesheet = useCallback((timesheet: Timesheet) => {
    setEditingTimesheet(timesheet);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(async (data: TimesheetFormData) => {
    if (createLoading || updateLoading) {
      return;
    }

    try {
      secureLogger.debug('createTimesheet fn', Boolean(createTimesheet));
      if (editingTimesheet) {
        await updateTimesheet(editingTimesheet.id, {
          ...data,
          tutorId: user?.id || 0,
          hourlyRate: editingTimesheet.hourlyRate
        });
      } else {
        await createTimesheet({
          ...data,
          tutorId: user?.id || 0,
          hourlyRate: 35.5 // Default rate - would come from course data
        });
      }

      await Promise.all([refetchTimesheets(), refetchDashboard()]);
      setShowForm(false);
      setEditingTimesheet(null);
    } catch (error) {
      secureLogger.error('Failed to save timesheet', error);
    }
  }, [createLoading, createTimesheet, editingTimesheet, refetchDashboard, refetchTimesheets, updateLoading, updateTimesheet, user?.id]);

  const clearActionFeedback = useCallback(() => {
    setActionError(null);
    setActionNotice(null);
  }, [setActionError, setActionNotice]);

  const BULK_SUBMISSION_ACTION_ID = -101;

  const submitDraftTimesheets = useCallback(async (timesheetIds: number[]) => {
    if (timesheetIds.length === 0) {
      return false;
    }

    if (actionLockRef.current || actionLoadingId !== null) {
      setActionNotice(ACTION_LOCK_MESSAGE);
      return false;
    }

    actionLockRef.current = true;
    setActionLoadingId(BULK_SUBMISSION_ACTION_ID);
    clearActionFeedback();

    try {
      await TimesheetService.batchApproveTimesheets(
        timesheetIds.map((id) => ({
          timesheetId: id,
          action: 'SUBMIT_DRAFT' as const,
        })),
      );
      await Promise.all([refetchTimesheets(), refetchDashboard()]);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit drafts';
      setActionError(message);
      return false;
    } finally {
      actionLockRef.current = false;
      setActionLoadingId(null);
    }
  }, [ACTION_LOCK_MESSAGE, actionLoadingId, clearActionFeedback, refetchDashboard, refetchTimesheets, setActionNotice]);

  const handleSubmitTimesheet = useCallback(async (timesheetId: number) => {
    if (actionLockRef.current || actionLoadingId !== null) {
      if (actionLoadingId === timesheetId) {
        return;
      }
      setActionNotice(ACTION_LOCK_MESSAGE);
      return;
    }

    actionLockRef.current = true;
    setActionLoadingId(timesheetId);
    clearActionFeedback();
    try {
      await TimesheetService.approveTimesheet({
        timesheetId,
        action: 'SUBMIT_DRAFT'
      });
      await Promise.all([refetchTimesheets(), refetchDashboard()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit timesheet';
      setActionError(message);
    } finally {
      actionLockRef.current = false;
      setActionLoadingId(null);
    }
  }, [ACTION_LOCK_MESSAGE, actionLoadingId, clearActionFeedback, refetchDashboard, refetchTimesheets, setActionNotice]);

  const handleConfirmTimesheet = useCallback(async (timesheetId: number) => {
    if (actionLockRef.current || actionLoadingId !== null) {
      if (actionLoadingId === timesheetId) {
        return;
      }
      setActionNotice(ACTION_LOCK_MESSAGE);
      return;
    }

    actionLockRef.current = true;
    setActionLoadingId(timesheetId);
    clearActionFeedback();
    try {
      await TimesheetService.approveTimesheet({
        timesheetId,
        action: 'TUTOR_CONFIRM'
      });
      await Promise.all([refetchTimesheets(), refetchDashboard()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm timesheet';
      setActionError(message);
    } finally {
      actionLockRef.current = false;
      setActionLoadingId(null);
    }
  }, [ACTION_LOCK_MESSAGE, actionLoadingId, clearActionFeedback, refetchDashboard, refetchTimesheets, setActionNotice]);

  const handleSubmitSelectedTimesheets = useCallback(async () => {
    if (actionLockRef.current || actionLoadingId !== null) {
      setActionNotice(ACTION_LOCK_MESSAGE);
      return;
    }

    const success = await submitDraftTimesheets(selectedTimesheets);
    if (success) {
      setSelectedTimesheets([]);
    }
  }, [actionLoadingId, selectedTimesheets, setActionNotice, setSelectedTimesheets, submitDraftTimesheets]);

  const handleSubmitAllDrafts = useCallback(async () => {
    if (actionLockRef.current || actionLoadingId !== null) {
      setActionNotice(ACTION_LOCK_MESSAGE);
      return;
    }

    const draftIds = allTimesheets
      .filter(t => t.status === 'DRAFT')
      .map(t => t.id);

    const success = await submitDraftTimesheets(draftIds);
    if (success) {
      setSelectedTimesheets([]);
    }
  }, [actionLoadingId, allTimesheets, setActionNotice, setSelectedTimesheets, submitDraftTimesheets]);

  const handleQuickAction = useCallback((action: string) => {
    clearActionFeedback();

    if ((actionLockRef.current || isTimesheetActionInFlight) && (action === 'submitDrafts' || action === 'refresh')) {
      setActionNotice(ACTION_LOCK_MESSAGE);
      return;
    }

    switch (action) {
      case 'create':
        handleCreateTimesheet();
        break;
      case 'submitDrafts':
        handleSubmitAllDrafts();
        break;
      case 'refresh':
        Promise.all([refetchTimesheets(), refetchDashboard()]).catch(console.error);
        break;
      case 'viewPay':
        if (paySummaryRef.current) {
          paySummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const target = paySummaryRef.current;
          const focusTarget = () => {
            target.focus?.({ preventScroll: true });
          };
          if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(focusTarget);
          } else {
            focusTarget();
          }
        } else {
          setActionNotice('Pay summary section is unavailable at the moment.');
        }
        break;
      case 'export':
        setActionNotice('Timesheet data export is coming soon.');
        break;
      default:
        break;
    }
  }, [ACTION_LOCK_MESSAGE, clearActionFeedback, handleCreateTimesheet, handleSubmitAllDrafts, isTimesheetActionInFlight, refetchDashboard, refetchTimesheets, setActionNotice]);

  // Loading state
  if (timesheetsLoading || dashboardLoading) {
    return (
      <div className="unified-container">
        <div className={`macro-grid ${className}`} data-testid="loading-state">
          <div className="macro-grid-hero" data-testid="loading-state-container">
            <LoadingSpinner size="large" data-testid="spinner" />
            <p data-testid="loading-text">Loading your timesheets...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasPrimaryErrors = timesheetsError || dashboardError || createError || updateError;
  const hasAnyErrors = Boolean(hasPrimaryErrors || actionError);
  const actionInFlightMessage = ACTION_LOCK_MESSAGE;
  const canSubmitAllDrafts = allTimesheets.some(t => t.status === 'DRAFT' || t.status === 'MODIFICATION_REQUESTED');
  const feedbackStack = (hasAnyErrors || actionNotice) ? (
    <div className="space-y-4">
      {timesheetsError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
          <span>Failed to load timesheets: {timesheetsError}</span>
          <Button variant="destructive" size="sm" className="ml-4" data-testid="retry-button-timesheets" onClick={() => refetchTimesheets()}>Retry</Button>
        </div>
      )}
      {dashboardError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
          <span>Failed to load dashboard: {dashboardError}</span>
          <Button variant="destructive" size="sm" className="ml-4" data-testid="retry-button-dashboard" onClick={refetchDashboard}>Retry</Button>
        </div>
      )}
      {(createError || updateError) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
          <span>{createError || updateError}</span>
          <Button variant="ghost" size="sm" className="ml-4" onClick={() => { resetCreate(); resetUpdate(); }}>Dismiss</Button>
        </div>
      )}
      {actionError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" data-testid="error-message">
          <span>{actionError}</span>
          <Button variant="ghost" size="sm" className="ml-4" onClick={clearActionFeedback}>Dismiss</Button>
        </div>
      )}
      {actionNotice && (
        <div className="rounded-md border border-primary/40 bg-primary/10 p-4 text-sm text-primary" data-testid="action-notice">
          <span>{actionNotice}</span>
          <Button variant="ghost" size="sm" className="ml-4" onClick={() => setActionNotice(null)}>Dismiss</Button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="unified-container">
      <div
        className={`macro-grid ${className}`}
        data-testid="tutor-dashboard"
        role="main"
        aria-label="Tutor Dashboard"
      >
        <header className="macro-grid-hero">
          <TutorHeader
            welcomeMessage={welcomeMessage}
            title="Tutor Dashboard"
            description="Here's an overview of your timesheets and earnings. Let's get started."
          />
          {feedbackStack}
        </header>

        <main className="macro-grid-content has-sidebar">
          <section
            className="macro-grid-main"
            role="region"
            aria-label="Tutor dashboard content"
          >
          <section className="mb-8" role="region" aria-label="Quick Actions">
            <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="quick-actions">
              <QuickAction
                label="Create New Timesheet"
                description="Start a new timesheet entry"
                icon="📝"
                onClick={() => handleQuickAction('create')}
                shortcut="Ctrl+N"
              />

              <QuickAction
                label="Refresh Data"
                description="Reload the latest timesheets"
                icon="🔄"
                onClick={() => handleQuickAction('refresh')}
                disabled={isTimesheetActionInFlight}
                disabledReason={actionInFlightMessage}
              />

              <QuickAction
                label="Submit All Drafts"
                description="Submit all draft timesheets"
                icon="📤"
                onClick={() => handleQuickAction('submitDrafts')}
                disabled={!canSubmitAllDrafts || isTimesheetActionInFlight}
                disabledReason={!canSubmitAllDrafts ? 'There are no draft timesheets to submit.' : actionInFlightMessage}
              />

              <QuickAction
                label="View Pay Summary"
                description="Check earnings and payments"
                icon="💰"
                onClick={() => handleQuickAction('viewPay')}
              />

              <QuickAction
                label="Export My Data"
                description="Download timesheet records (coming soon)"
                icon="📊"
                onClick={() => handleQuickAction('export')}
              />
            </div>
          </section>

          <QuickStats
            heading="Your Statistics"
            ariaLabel="Your Statistics"
            stats={quickStats}
          />

          <section aria-label="My Timesheets">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle data-testid="timesheets-section-title">My Timesheets</CardTitle>
                      <span
                        className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        data-testid="count-badge"
                      >
                        {allTimesheets.length} total
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manage all your work logs here.
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateTimesheet}
                    disabled={isFormSubmitting}
                    title={isFormSubmitting ? 'Please wait while we finish saving your timesheet.' : undefined}
                  >
                    Create New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 border-b">
                  <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                          currentTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                        }`}
                        onClick={() => handleTabChange(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {currentTab === 'drafts' && (
                  <div className="bulk-actions">
                    <label>
                      <input
                        type="checkbox"
                        checked={filteredTimesheets.length > 0 && selectedTimesheets.length === filteredTimesheets.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTimesheets(filteredTimesheets.map(t => t.id));
                          } else {
                            setSelectedTimesheets([]);
                          }
                        }}
                        aria-label="Select all drafts"
                      />
                      Select All Drafts
                    </label>
                    <Button
                      className="submit-selected-btn"
                      onClick={handleSubmitSelectedTimesheets}
                      disabled={selectedTimesheets.length === 0 || isTimesheetActionInFlight}
                      title={selectedTimesheets.length === 0
                        ? 'Select at least one draft to submit.'
                        : (isTimesheetActionInFlight ? actionInFlightMessage : undefined)}
                    >
                      {actionLoadingId === BULK_SUBMISSION_ACTION_ID
                        ? 'Submitting drafts...'
                        : `Submit Selected (${selectedTimesheets.length})`}
                    </Button>
                    {selectedTimesheets.length > 0 && (
                      <div className="submission-preview">
                        <strong>Confirm Submission</strong>
                        <p>{selectedTimesheets.length} timesheets will be submitted</p>
                      </div>
                    )}
                  </div>
                )}

                {noTimesheets ? (
                  <div className="py-12 text-center" data-testid="empty-state">
                    <div className="mx-auto max-w-xs">
                      <h3 className="text-lg font-semibold" data-testid="empty-state-title">
                        No Timesheets Found
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground" data-testid="empty-state-description">
                        Create your first timesheet to get started.
                      </p>
                      <Button
                        className="mt-4"
                        onClick={handleCreateTimesheet}
                        disabled={isFormSubmitting}
                        title={isFormSubmitting ? 'Please wait while we finish saving your timesheet.' : undefined}
                      >
                        Create First Timesheet
                      </Button>
                    </div>
                  </div>
                ) : (
                  <TimesheetTable
                    timesheets={filteredTimesheets}
                    loading={timesheetsLoading}
                    loadingMessage="Loading timesheets to review..."
                    actionLoading={actionLoadingId}
                    onApprovalAction={(id, action) => {
                      const timesheet = filteredTimesheets.find(t => t.id === id);
                      if (!timesheet) return;

                      if (action === 'EDIT') {
                        handleEditTimesheet(timesheet);
                        return;
                      }

                      if (action === 'SUBMIT_DRAFT') {
                        handleSubmitTimesheet(id);
                        return;
                      }

                      if (action === 'TUTOR_CONFIRM') {
                        handleConfirmTimesheet(id);
                      }
                    }}
                    showActions
                    showTutorInfo={false}
                    showCourseInfo
                    showSelection={currentTab === 'drafts'}
                    selectedIds={selectedTimesheets}
                    onSelectionChange={setSelectedTimesheets}
                    className="tutor-timesheet-table"
                    data-testid="timesheet-table"
                    actionMode="tutor"
                    actionsDisabled={isTimesheetActionInFlight}
                    actionsDisabledReason={actionInFlightMessage}
                  />
                )}
              </CardContent>
            </Card>
          </section>
          </section>

          <aside
            className="macro-grid-sidebar"
            data-testid="dashboard-sidebar"
            aria-label="Tutor support summary"
          >
            <NotificationsPanel
              rejectedCount={visibleRejectedCount}
              draftCount={visibleDraftCount}
              deadlines={visibleDeadlines}
              onDismiss={handleNotificationDismiss}
            />
            <UpcomingDeadlines deadlines={visibleDeadlines} />
            <CompletionProgress completionRate={completionRate} />
            <div ref={paySummaryRef} tabIndex={-1}>
              <PaySummary
                totalEarned={tutorStats.totalPay}
                thisWeekPay={thisWeekSummary.pay}
                averagePerTimesheet={tutorStats.averagePayPerTimesheet}
                paymentStatus={tutorStats.statusCounts || {}}
              />
            </div>
            <EarningsBreakdown timesheets={allTimesheets} />
            <SupportResources resources={supportResources} />
          </aside>
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 elevation-modal" onClick={() => setShowForm(false)}>
          <div className="relative w-full max-w-lg rounded-lg bg-card shadow-lg" onClick={e => e.stopPropagation()}>
            <TimesheetForm
              isEdit={!!editingTimesheet}
              initialData={editingTimesheet || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingTimesheet(null);
              }}
              loading={createLoading || updateLoading}
              error={createError || updateError}
            />
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only" aria-label="dashboard status">
        {createLoading && 'Creating timesheet...'}
        {updateLoading && 'Updating timesheet...'}
        {timesheetsLoading && 'Loading timesheets...'}
      </div>
    </div>
  );
});

TutorDashboard.displayName = 'TutorDashboard';

export default TutorDashboard;
