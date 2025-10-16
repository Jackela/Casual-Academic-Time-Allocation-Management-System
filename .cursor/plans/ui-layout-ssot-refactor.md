<!-- 2fe1f1b6-f219-456f-b81f-c43bb58332de 0bf16bcf-4d7d-4b30-b03f-01b96787252a -->
# UI Layout SSOT Refactor - Engineering Best Practices Plan

## Executive Summary

This plan addresses critical UI/UX issues (notification overlap, table width/jitter) through a progressive, SSOT-driven refactor across two sprints (10-14h total). The plan incorporates **4 critical red-line fixes** and **3 key architectural decisions** based on stakeholder feedback.

### ✅ Must-Fix Items Applied (Pre-Merge)

1. **Relative Time Policy Consistency**: Absolute time mandate scoped to historical fields only (Submitted/Updated); time-sensitive contexts (Deadlines/Reminders) explicitly allowed to use relative time ("Due in 3 hours"). All verification criteria and CI assertions updated to reflect this scope.

2. **Design Tokens for Layout Parameters**: All breakpoints (768/1024/1280/1440/1920), column widths (Status: 160px, Actions: 200px, etc.), and Toast constraints (≥80px clearance, 420px max-width) centralized in `design-tokens.css`. CSS and tests reference tokens instead of magic numbers, ensuring single source of truth for layout stability.

### Red-Line Fixes Applied

1. **SSOT Boundary Separation**: UI metadata separated into `ui-config.ts` (not extended into `statusMap.ts`) to prevent domain/presentation contamination
2. **Toast Safe Zone Constraint**: Toast > Modal z-index requires geometric non-overlap assertions for modal interactive areas (header, close button, primary CTA)
3. **Scoped Absolute Time Mandate**: Relative time prohibited ONLY for historical events (Submitted/Updated), allowed for time-sensitive contexts (Deadlines with "Due in X hours")
4. **Naming Contract Enforcement**: Column class names exported from `table-config.ts` for test consistency, preventing selector drift

### Key Architectural Decisions

1. **Progressive SSOT Migration**: Gradual migration with feature flags, no big-bang replacement
2. **Responsive Dual-Track for Timestamps**: ≥1280px shows Last Updated column, <1280px hides column and shows data in Status badge tooltip (with touch/keyboard accessibility)
3. **Two-Sprint Card View**: Sprint 1 uses horizontal scroll with sticky columns, Sprint 2 implements card view (<1024px)

### Recommended Enhancements (Non-Blocking)

1. **Copy & Formatting Standards**: Consistent pluralization, AUD currency prefix, date format enforcement via quick test cases
2. **Accessibility Enhancements**: Banner `role="alert"`, Toast focus management, Status tooltip multi-input accessibility (hover/touch/keyboard)
3. **Telemetry & Monitoring**: Analytics for column folding/card view activation/batch failures; 48h error rate monitoring post-deployment

These recommendations are documented in the plan (Constraints section) but do not block Sprint execution.

### Success Metrics

- Table width: ~1650px → ~1470px (Activity column removed)
- Status/Actions columns: No jitter (fixed width with `flex-wrap: nowrap`)
- Notifications: Dual-track system (Banner in-flow + Toast fixed) with zero overlap
- Test coverage: 100% layout compliance via new CI quality gates
- Rollback capability: Feature flags enable instant revert
- **Layout parameter consistency**: All breakpoints/widths defined once in design tokens, consumed everywhere

## Engineering Principles Applied

1. **Test-Driven Development (TDD)**: Write tests before implementation
2. **Progressive Enhancement**: Additive changes first, deprecation later
3. **Backward Compatibility**: No breaking changes until Sprint 2
4. **Feature Flags**: Gradual rollout with ability to rollback
5. **Single Responsibility**: Separate concerns (domain logic vs UI config vs formatting)
6. **Documentation-First**: Update docs inline with changes

## Sprint 1: Critical Layout Fixes & Notification System (4-6h)

### Task 1.1: Fix z-index Hierarchy (30min)

**Critical Bug**: Current z-index values are inverted (toast:20 > modal:13)

**File**: `frontend/src/styles/design-tokens.css`

**Location**: Lines 22-33

**Current State**:

```css
--z-toast: 20;
--z-modal: 13;
```

**Change**:

```css
/* Corrected z-index stack: lowest to highest */
--z-background: -1;
--z-base: 0;
--z-content: 1;
--z-elevated: 2;
--z-sticky: 4;
--z-header: 100;        /* NEW: header bar */
--z-banner: 200;        /* NEW: page-level banners */
--z-popover: 400;       /* UPDATED from 8 */
--z-overlay: 900;       /* UPDATED from 10 */
--z-modal-backdrop: 950; /* NEW: modal backdrop */
--z-modal: 1000;        /* UPDATED from 13 */
--z-toast: 1500;        /* UPDATED from 20 - above modals for critical notifications */
--z-tooltip: 2000;      /* UPDATED from 30 */

/* MUST-FIX: Responsive Breakpoints (eliminate magic numbers) */
--breakpoint-mobile: 768px;
--breakpoint-tablet: 1024px;
--breakpoint-tablet-landscape: 1280px;
--breakpoint-desktop: 1440px;
--breakpoint-desktop-wide: 1920px;

/* MUST-FIX: Table Column Fixed Widths (SSOT for layout stability) */
--col-week-starting-width: 140px;
--col-hours-width: 100px;
--col-rate-width: 110px;
--col-total-pay-width: 130px;
--col-status-width: 160px;
--col-actions-width: 200px;
--col-last-updated-width: 150px;

/* MUST-FIX: Toast Safe Zone Constraints */
--toast-top-clearance: 80px;
--toast-max-width: 420px;
--toast-right-offset: 16px;
```

**RED LINE FIX**: Toast > Modal requires safety constraint

**Rationale**: Toast above modals allows critical error notifications during modal operations, BUT must not obstruct modal interaction zones

**Safety Constraints**:
1. Toast positioned `top-right` with minimum 80px clearance from modal header area
2. Toast max-width: 420px to avoid covering modal close button
3. Modal headers must use safe area padding on right side when toast is visible
4. CI test must verify no geometric overlap between toast bounds and modal interactive elements (header, close button, primary CTA)

**Verification**: 
- Test modal + toast interaction at 1920px, 1280px, 1024px, 768px viewports
- Verify toast does not obstruct modal close button or header
- Add CI geometric assertion for toast safe zone

---

### Task 1.2: Remove Activity (Timeline) Column (45min)

**Problem**: Activity column adds 180px width but provides redundant information

**Step 1**: Create deprecation feature flag

**File**: `frontend/src/lib/config/feature-flags.ts` (new file)

```typescript
export const FEATURE_FLAGS = {
  ENABLE_ACTIVITY_COLUMN: false, // Set to false to hide column
  ENABLE_LAST_UPDATED_COLUMN: true, // New consolidated column
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};
```

**Step 2**: Update column definition

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`

**Location**: Lines 803-810 (timeline column definition)

**Change**:

```typescript
// Conditional rendering based on feature flag
if (isFeatureEnabled('ENABLE_ACTIVITY_COLUMN')) {
  dynamicColumns.push(createColumn({
    key: 'timeline',
    label: 'Activity',
    width: 180,
    sortable: true,
    visible: true,
    priority: 'medium',
  }));
}
```

**Step 3**: Update CSS

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.css`

**Change**: Add deprecation styles

```css
/* DEPRECATED: Will be removed in Sprint 2 */
.timeline-cell,
.timeline-header {
  /* Keep styles for rollback capability */
}
```

**Verification**: Table width reduces from ~1650px to ~1470px when flag is false

---

### Task 1.3: Implement Last Updated Column (Responsive Dual-Track) (1.5h)

**Design**: Show as column ≥1280px, hide <1280px and show in Status tooltip

**RED LINE FIX**: Separate UI config from domain logic - create new file instead of extending statusMap.ts

**Step 1**: Create UI Configuration (NEW FILE - SSOT Boundary Separation)

**File**: `frontend/src/lib/config/ui-config.ts` (new file)

**Rationale**: Keep domain logic (statusMap.ts) separate from UI metadata to prevent cross-contamination

```typescript
/**
 * UI Configuration - Presentation Layer SSOT
 * 
 * CRITICAL: This file contains ONLY UI/presentation metadata.
 * Domain logic (status transitions, permissions) stays in statusMap.ts
 */

import type { TimesheetStatus } from './statusMap';

export interface StatusUIMetadata {
  chipMinWidth: number; // px - ensures no jitter
  showTimestampInTooltip: boolean; // For responsive behavior
}

export const STATUS_UI_METADATA: Record<TimesheetStatus, StatusUIMetadata> = {
  DRAFT: {
    chipMinWidth: 120,
    showTimestampInTooltip: false, // Draft doesn't have submission time
  },
  PENDING_TUTOR_CONFIRMATION: {
    chipMinWidth: 160,
    showTimestampInTooltip: true,
  },
  TUTOR_CONFIRMED: {
    chipMinWidth: 140,
    showTimestampInTooltip: true,
  },
  LECTURER_CONFIRMED: {
    chipMinWidth: 160,
    showTimestampInTooltip: true,
  },
  FINAL_CONFIRMED: {
    chipMinWidth: 140,
    showTimestampInTooltip: true,
  },
  REJECTED: {
    chipMinWidth: 100,
    showTimestampInTooltip: true,
  },
  MODIFICATION_REQUESTED: {
    chipMinWidth: 180,
    showTimestampInTooltip: true,
  },
};

export const getStatusUIMetadata = (status: TimesheetStatus): StatusUIMetadata => {
  return STATUS_UI_METADATA[status];
};
```

**Step 2**: Create date formatter utility

**File**: `frontend/src/lib/formatters/date-formatters.ts` (new file)

**RED LINE FIX**: Absolute time mandate applies ONLY to historical events, not to deadlines/reminders

```typescript
/**
 * Date formatting utilities following Australian locale
 * 
 * CRITICAL RULE: Absolute timestamps for HISTORICAL events (Submitted/Updated)
 *                Relative time ALLOWED for TIME-SENSITIVE events (Deadlines/Reminders)
 */

export const LOCALE = 'en-AU';

export interface DateFormatOptions {
  includeTime?: boolean;
  includeYear?: boolean;
}

/**
 * Format absolute date/time: "15 Jan 2025, 2:30 PM"
 * USE FOR: Historical events (Submitted, Updated, Created)
 */
export const formatAbsoluteDateTime = (
  date: Date | string | null | undefined,
  options: DateFormatOptions = { includeTime: true, includeYear: true }
): string => {
  if (!date) return '—';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    ...(options.includeYear && { year: 'numeric' }),
    ...(options.includeTime && {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  }).format(dateObj);
};

/**
 * Format week starting date: "15 Jan 2025"
 */
export const formatWeekDate = (date: Date | string | null | undefined): string => {
  return formatAbsoluteDateTime(date, { includeTime: false, includeYear: true });
};

/**
 * Format currency in AUD
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format relative time for TIME-SENSITIVE contexts (deadlines, reminders)
 * USE FOR: Upcoming deadlines ("Due in 3 hours"), reminders, time-critical alerts
 * NEVER USE FOR: Historical events (Submitted/Updated timestamps)
 * 
 * @param date - Future date to calculate relative time from
 * @param context - Context type: 'deadline' | 'reminder' | 'alert'
 */
export const formatRelativeTime = (
  date: Date | string,
  context: 'deadline' | 'reminder' | 'alert'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  
  // Guard: Only for future dates
  if (diffMs < 0) {
    throw new Error(
      'formatRelativeTime() is only for future dates. ' +
      'For past events, use formatAbsoluteDateTime().'
    );
  }
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 7) {
    // Beyond 7 days, show absolute date
    return formatAbsoluteDateTime(dateObj, { includeTime: false });
  }
  
  if (diffDays > 0) {
    return `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  
  if (diffHours > 0) {
    return `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `Due in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
};

/**
 * This function is DEPRECATED - use formatRelativeTime() with proper context
 * @deprecated Renamed to formatRelativeTime() with context parameter
 */
export const formatHistoricalRelativeTime = (): never => {
  throw new Error(
    'Historical relative time formatting is prohibited. ' +
    'Use formatAbsoluteDateTime() for past events, ' +
    'or formatRelativeTime(date, context) for future deadlines.'
  );
};
```

**Step 3**: Update StatusBadge to support tooltip

**File**: `frontend/src/components/shared/StatusBadge/StatusBadge.tsx`

**Location**: Update StatusBadgeProps interface (after line 30)

**Change**:

```typescript
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { formatAbsoluteDateTime } from '@/lib/formatters/date-formatters';
import { getStatusUIMetadata } from '@/lib/config/ui-config'; // RED LINE FIX: UI metadata from ui-config.ts

export interface StatusBadgeProps {
  status: TimesheetStatus;
  className?: string;
  dataTestId?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  // NEW: For responsive timestamp display
  lastModified?: Date | string | null;
  submittedAt?: Date | string | null;
  showTimestampTooltip?: boolean; // Controlled by parent based on viewport width
}
```

**Location**: Update component render (lines 48-95)

**Change**:

```typescript
const StatusBadge = memo<StatusBadgeProps>(({
  status,
  className = '',
  dataTestId,
  size = 'medium',
  showIcon = false,
  lastModified,
  submittedAt,
  showTimestampTooltip = false,
}) => {
  const config = getStatusConfig(status);
  const uiMetadata = getStatusUIMetadata(status);
  const testId = dataTestId ?? `status-badge-${status.toLowerCase()}`;
  const sizeClassName = SIZE_CLASS_MAP[size] ?? SIZE_CLASS_MAP.medium;
  const iconSizeClassName = ICON_SIZE_CLASS_MAP[size] ?? ICON_SIZE_CLASS_MAP.medium;
  
  const composedClassName = cn(
    STATUS_BADGE_BASE_CLASS,
    `${STATUS_BADGE_BASE_CLASS}--${size}`,
    'inline-flex items-center gap-1 rounded-md border font-medium leading-tight tracking-normal whitespace-nowrap select-none cursor-default transition-none shadow-none',
    'max-w-none',
    sizeClassName,
    className,
  );

  // Apply min-width from UI metadata to prevent jitter
  const customStyle = {
    backgroundColor: config.bgColor,
    borderColor: config.color,
    color: config.textColor,
    minWidth: `${uiMetadata.chipMinWidth}px`, // NEW: Prevents column width jitter
  };

  // Build tooltip content
  const tooltipContent = uiMetadata.showTimestampInTooltip && (lastModified || submittedAt) ? (
    <div className="text-sm">
      {submittedAt && (
        <div>
          <strong>Submitted:</strong> {formatAbsoluteDateTime(submittedAt)}
        </div>
      )}
      {lastModified && (
        <div>
          <strong>Last updated:</strong> {formatAbsoluteDateTime(lastModified)}
        </div>
      )}
    </div>
  ) : null;

  const badge = (
    <Badge
      variant={config.variant}
      className={composedClassName}
      style={customStyle}
      title={config.description}
      data-testid={testId}
      aria-label={`Status: ${config.label}. ${config.description}`}
    >
      {showIcon ? (
        <span
          aria-hidden="true"
          className={cn(`${STATUS_BADGE_BASE_CLASS}__icon text-current`, iconSizeClassName)}
        >
          •
        </span>
      ) : null}
      {config.label}
    </Badge>
  );

  // Only wrap in tooltip if responsive mode is active AND content exists
  if (showTimestampTooltip && tooltipContent) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" align="center">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
});
```

**Step 4**: Add Last Updated column to TimesheetTable

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`

**Location**: After status column definition (after line 793), before description

**Add**:

```typescript
// NEW: Last Updated column (responsive - hidden <1280px)
if (isFeatureEnabled('ENABLE_LAST_UPDATED_COLUMN')) {
  dynamicColumns.push(createColumn({
    key: 'lastUpdated',
    label: 'Last updated',
    width: 150,
    sortable: true,
    visible: true,
    priority: 'medium',
    // This column will be CSS-hidden at <1280px breakpoint
  }));
}
```

**Step 5**: Update TimesheetTable render logic for responsive StatusBadge

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`

**Location**: Find the status cell rendering (search for "status-cell")

**Add window width state** (at component top):

```typescript
const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

useEffect(() => {
  if (typeof window === 'undefined') return;
  
  const handleResize = () => setWindowWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Update status cell render**:

```typescript
// In renderDefaultCell or wherever status is rendered
case 'status':
  return (
    <StatusBadge
      status={timesheet.status}
      lastModified={timesheet.lastModified}
      submittedAt={timesheet.submittedAt}
      showTimestampTooltip={windowWidth < 1280} // Responsive tooltip
      dataTestId={`status-badge-${timesheet.id}`}
    />
  );

case 'lastUpdated':
  const lastUpdateDate = timesheet.lastModified || timesheet.submittedAt;
  return (
    <span className="text-sm text-foreground/80">
      {formatAbsoluteDateTime(lastUpdateDate)}
    </span>
  );
```

**Step 6**: Add responsive CSS

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.css`

**Add**:

```css
/* Last Updated column - responsive visibility - use breakpoint tokens */
.last-updated-cell,
.last-updated-header {
  width: var(--col-last-updated-width);
  min-width: var(--col-last-updated-width);
}

@media (max-width: calc(var(--breakpoint-tablet-landscape) - 1px)) {
  .last-updated-cell,
  .last-updated-header {
    display: none;
  }
}
```

**Verification**:

- ≥1280px: Last Updated column visible
- <1280px: Column hidden, timestamps in Status badge tooltip
- **Touch Accessibility**: On touch devices, long-press Status badge triggers tooltip (not just hover)
- Verify tooltip accessible via keyboard (focus + Enter/Space)

---

### Task 1.4: Fix Status and Actions Column Width + Numeric Alignment (1h)

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.css`

**Location**: Find column-specific styles (search for ".status-cell" and ".action-buttons")

**Changes**:

```css
/* MUST-FIX: Use design tokens instead of magic numbers */

/* Status column - fixed width prevents jitter */
.status-cell,
.status-header {
  width: var(--col-status-width);
  min-width: var(--col-status-width);
  max-width: var(--col-status-width);
  flex-shrink: 0;
}

/* Actions column - enforce no-wrap */
.action-cell,
.action-header {
  width: var(--col-actions-width);
  min-width: var(--col-actions-width);
  max-width: var(--col-actions-width);
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap; /* CRITICAL: Prevents button line breaks */
  align-items: center;
  justify-content: flex-start;
}

/* Numeric columns - right alignment + tabular numbers */
.hours-cell,
.rate-cell,
.total-pay-cell {
  text-align: right;
  font-variant-numeric: tabular-nums; /* Equal-width digits prevent jitter */
  padding-right: 1rem;
}

/* Fixed widths for numeric columns - use design tokens */
.week-starting-cell { 
  width: var(--col-week-starting-width);
  min-width: var(--col-week-starting-width);
}

.hours-cell { 
  width: var(--col-hours-width);
  min-width: var(--col-hours-width);
}

.rate-cell { 
  width: var(--col-rate-width);
  min-width: var(--col-rate-width);
}

.total-pay-cell { 
  width: var(--col-total-pay-width);
  min-width: var(--col-total-pay-width);
}
```

**Verification**: No visual jitter when status changes or numbers update

---

### Task 1.5: Implement Dual-Track Notification System (1.5h)

**Design**: Page-level Banner (in-flow, occupies space) + Transient Toast (fixed position)

**Step 1**: Move NotificationsPanel from sidebar to main content area

**File**: `frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx`

**Location**: Lines 593-598 (current NotificationsPanel in sidebar)

**Changes**:

1. **Remove from sidebar** (delete lines 593-598)

2. **Add to main content area** (find the macro-grid-main div, around line 500):
```tsx
<main className="macro-grid-main" ref={mainContentRef}>
  {/* NEW: Page-level banner - in-flow, occupies layout space */}
  {(visibleDraftCount > 0 || visibleRejectedCount > 0) && (
    <div className="page-banner-container" data-testid="page-banner">
      <div className="page-banner page-banner--warning" role="alert">
        <div className="page-banner__icon">
          {/* Use existing icon component or inline SVG */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="page-banner__content">
          <div className="page-banner__title">Action Required</div>
          <div className="page-banner__description">
            {visibleDraftCount > 0 && (
              <span>{visibleDraftCount} draft timesheet{visibleDraftCount > 1 ? 's' : ''} need submission. </span>
            )}
            {visibleRejectedCount > 0 && (
              <span>{visibleRejectedCount} rejected timesheet{visibleRejectedCount > 1 ? 's' : ''} need revision.</span>
            )}
          </div>
        </div>
        <button
          className="page-banner__dismiss"
          onClick={handleNotificationDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  )}

  {/* Existing table content */}
  <TimesheetTable {...props} />
</main>
```


**Step 2**: Add Banner styles

**File**: `frontend/src/styles/dashboard-shell.css`

**Location**: After macro-grid-main styles

**Add**:

```css
/* Page Banner - In-flow notification system */
.page-banner-container {
  padding: 0 var(--grid-content-padding);
  margin-bottom: 1.5rem;
}

.page-banner {
  position: relative; /* In-flow, not position: absolute */
  z-index: var(--z-banner);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  border-left: 4px solid;
  background: hsl(var(--card));
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.page-banner--warning {
  border-left-color: hsl(var(--warning));
  background: hsl(var(--warning) / 0.1);
}

.page-banner--error {
  border-left-color: hsl(var(--destructive));
  background: hsl(var(--destructive) / 0.05);
}

.page-banner--info {
  border-left-color: hsl(var(--info));
  background: hsl(var(--info) / 0.05);
}

.page-banner__icon {
  flex-shrink: 0;
  color: hsl(var(--warning));
}

.page-banner__content {
  flex: 1;
  min-width: 0;
}

.page-banner__title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.page-banner__description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.page-banner__dismiss {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  border: none;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.page-banner__dismiss:hover {
  background: hsl(var(--muted));
}
```

**Step 3**: Verify Toast library z-index

**File**: Check current toast implementation (likely Sonner or react-hot-toast)

**If using Sonner** - verify/update in component that renders Toaster:

```tsx
<Toaster 
  position="top-right"
  toastOptions={{
    style: {
      zIndex: 'var(--z-toast)', // Should be 1500
    },
  }}
/>
```

**Verification**:

- Banner appears in-flow above table, occupies space
- Banner and table never overlap
- Toast appears fixed at top-right, above modals

---

### Task 1.6: Implement Priority-Based Responsive Column Folding (1h)

**Design**: Progressive hiding: Rate (1280px) → Hours (1024px) → Description (1024px)

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.css`

**Location**: Existing responsive breakpoints section (around lines 702-763)

**Replace with**:

```css
/* =============================================================================
 * Responsive Column Folding - Priority-Based (MUST-FIX: Use breakpoint tokens)
 * ============================================================================= */

/* Full desktop: All columns visible */
/* Default state - no media query needed */

/* Tablet landscape: Hide Rate column */
@media (max-width: calc(var(--breakpoint-desktop) - 1px)) and (min-width: var(--breakpoint-tablet-landscape)) {
  .rate-cell,
  .rate-header {
    display: none;
  }
  
  /* Rate value can be calculated (Hours × Total Pay) if needed */
  .total-pay-cell::after {
    content: attr(data-rate-hint);
    display: block;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }
}

/* Tablet portrait: Hide Rate + Hours */
@media (max-width: calc(var(--breakpoint-tablet-landscape) - 1px)) and (min-width: var(--breakpoint-tablet)) {
  .rate-cell,
  .rate-header,
  .hours-cell,
  .hours-header {
    display: none;
  }
}

/* Mobile/Small tablet: Horizontal scroll with sticky columns */
@media (max-width: calc(var(--breakpoint-tablet) - 1px)) {
  /* Sprint 1: Enable horizontal scroll */
  /* Sprint 2: Will replace with card view */
  
  .timesheet-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Hide lowest priority columns */
  .description-cell,
  .description-header,
  .rate-cell,
  .rate-header,
  .hours-cell,
  .hours-header,
  .last-updated-cell,
  .last-updated-header {
    display: none;
  }
  
  /* Sticky first and last columns for context */
  .course-cell,
  .course-header {
    position: sticky;
    left: 0;
    background: hsl(var(--background));
    z-index: var(--z-sticky);
  }
  
  .actions-cell,
  .actions-header {
    position: sticky;
    right: 0;
    background: hsl(var(--background));
    z-index: var(--z-sticky);
  }
}

/* Extra small screens: Minimal table before card view in Sprint 2 */
@media (max-width: calc(var(--breakpoint-mobile) - 1px)) {
  /* Further simplification */
  .details-cell,
  .details-header {
    display: none;
  }
}
```

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`

**Add dynamic class based on viewport** (update component logic):

```typescript
const getResponsiveClassName = useCallback((width: number): string => {
  if (width >= 1440) return 'layout-full';
  if (width >= 1280) return 'layout-hide-rate';
  if (width >= 1024) return 'layout-hide-rate-hours';
  return 'layout-mobile-scroll';
}, []);

const responsiveClass = getResponsiveClassName(windowWidth);

// In render:
<div className={cn('timesheet-table-container', responsiveClass, className)}>
```

**Verification**:

- 1440+: All columns visible
- 1280-1439: Rate hidden
- 1024-1279: Rate + Hours hidden
- <1024: Horizontal scroll with sticky Course and Actions

---

### Task 1.7: Simplify Sidebar to 3 Core Cards (30min)

**File**: `frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx`

**Location**: Sidebar section (lines 590-611)

**Change**:

```tsx
<aside 
  className="macro-grid-sidebar"
  data-testid="dashboard-sidebar"
  aria-label="Dashboard summary"
>
  {/* Keep only 3 core cards */}
  <UpcomingDeadlines deadlines={visibleDeadlines} />
  
  <div ref={paySummaryRef} tabIndex={-1}>
    <PaySummary
      totalEarned={tutorStats.totalPay}
      thisWeekPay={thisWeekSummary.pay}
      averagePerTimesheet={tutorStats.averagePayPerTimesheet}
      paymentStatus={tutorStats.statusCounts || {}}
    />
  </div>
  
  <SupportResources resources={supportResources} />
</aside>
```

**Remove**: CompletionProgress, EarningsBreakdown (moved to separate analytics page in future sprint)

**Verification**: Sidebar contains exactly 3 cards with `gap: 1rem`

---

## Sprint 2: Configuration-Driven Architecture & Card View (6-8h)

### Task 2.1: Create Column Configuration System (2h)

**Principle**: Configuration-driven columns for AI-friendly modifications

**File**: `frontend/src/lib/config/table-config.ts` (new file)

```typescript
/**
 * Column Configuration System
 * 
 * Single source of truth for table column definitions.
 * Supports responsive behavior, formatting, and priority-based folding.
 */

export type ColumnType = 'text' | 'number' | 'date' | 'status' | 'actions' | 'custom';
export type Alignment = 'left' | 'right' | 'center';
export type Priority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 1=highest (never hide)

export interface ColumnConfig {
  key: string;
  label: string;
  type: ColumnType;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  priority: Priority; // Controls responsive folding order
  align?: Alignment;
  formatterKey?: keyof typeof import('../formatters/date-formatters'); // Type-safe formatter reference
  hiddenBreakpoints?: number[]; // Pixel widths where column should hide
  ellipsis?: boolean;
  maxLines?: number; // For text truncation
  sortable?: boolean;
  tooltip?: string; // Accessible description
}

/**
 * Timesheet Table Column Definitions
 * 
 * Priority Guide:
 * 1-2: Critical (Status, Actions) - never hide
 * 3-4: High priority (Course, Total Pay) - hide last
 * 5-6: Medium priority (Week, Last Updated) - hide at tablet
 * 7-8: Low priority (Rate, Hours, Description) - hide at mobile
 * 9: Very low priority (Activity) - deprecated
 */
/**
 * MUST-FIX: Reference design tokens for widths and breakpoints
 * Note: Actual pixel values resolved at runtime from CSS custom properties
 */
export const TIMESHEET_COLUMNS: ColumnConfig[] = [
  {
    key: 'course',
    label: 'Course',
    type: 'text',
    priority: 3,
    ellipsis: true,
    sortable: true,
    tooltip: 'Course name and code',
  },
  {
    key: 'weekStartDate',
    label: 'Week Starting',
    type: 'date',
    width: 140, // Maps to --col-week-starting-width
    minWidth: 140,
    priority: 5,
    formatterKey: 'formatWeekDate',
    sortable: true,
  },
  {
    key: 'hours',
    label: 'Hours',
    type: 'number',
    width: 100, // Maps to --col-hours-width
    minWidth: 100,
    priority: 7,
    align: 'right',
    hiddenBreakpoints: [1024], // Maps to --breakpoint-tablet
    sortable: true,
  },
  {
    key: 'hourlyRate',
    label: 'Rate',
    type: 'number',
    width: 110, // Maps to --col-rate-width
    minWidth: 110,
    priority: 8,
    align: 'right',
    formatterKey: 'formatCurrency',
    hiddenBreakpoints: [1280], // Maps to --breakpoint-tablet-landscape
    sortable: true,
  },
  {
    key: 'totalPay',
    label: 'Total Pay',
    type: 'number',
    width: 130, // Maps to --col-total-pay-width
    minWidth: 130,
    priority: 4,
    align: 'right',
    formatterKey: 'formatCurrency',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'status',
    width: 160, // Maps to --col-status-width
    minWidth: 160,
    maxWidth: 160,
    priority: 1, // Never hide
    sortable: true,
  },
  {
    key: 'actions',
    label: 'Actions',
    type: 'actions',
    width: 200, // Maps to --col-actions-width
    minWidth: 200,
    maxWidth: 200,
    priority: 1, // Never hide
    sortable: false,
  },
  {
    key: 'description',
    label: 'Description',
    type: 'text',
    priority: 8,
    ellipsis: true,
    maxLines: 2,
    hiddenBreakpoints: [1024], // Maps to --breakpoint-tablet
    sortable: false,
  },
  {
    key: 'lastUpdated',
    label: 'Last updated',
    type: 'date',
    width: 150, // Maps to --col-last-updated-width
    minWidth: 150,
    priority: 6,
    formatterKey: 'formatAbsoluteDateTime',
    hiddenBreakpoints: [1280], // Maps to --breakpoint-tablet-landscape
    sortable: true,
  },
];

/**
 * Get columns visible at a given viewport width
 */
export const getVisibleColumns = (
  columns: ColumnConfig[],
  viewportWidth: number
): ColumnConfig[] => {
  return columns.filter(col => {
    if (!col.hiddenBreakpoints) return true;
    return !col.hiddenBreakpoints.some(bp => viewportWidth < bp);
  });
};

/**
 * Sort columns by priority (for fallback ordering)
 */
export const sortByPriority = (a: ColumnConfig, b: ColumnConfig): number => {
  return a.priority - b.priority;
};

/**
 * RED LINE FIX: Export class name mapping for test consistency
 * Ensures tests use same naming contract as implementation
 */
export const COLUMN_CLASS_NAMES = TIMESHEET_COLUMNS.reduce((acc, col) => {
  acc[col.key] = {
    cell: `${col.key}-cell`,
    header: `${col.key}-header`,
  };
  return acc;
}, {} as Record<string, { cell: string; header: string }>);

/**
 * Helper for tests to generate type-safe selectors
 */
export const getColumnSelector = (key: string, type: 'cell' | 'header' = 'cell'): string => {
  const mapping = COLUMN_CLASS_NAMES[key];
  if (!mapping) {
    throw new Error(`Unknown column key: ${key}. Update TIMESHEET_COLUMNS in table-config.ts`);
  }
  return `.${mapping[type]}`;
};
```

**Verification**: 
- Type-safe, no magic strings in implementation or tests
- Clear priority system
- **Naming contract enforced**: Tests use exported selectors from config

---

### Task 2.2: Migrate TimesheetTable to Use Configuration (2h)

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`

**Location**: Replace columns definition (lines 728-836)

**Strategy**: Gradual migration with feature flag

**Step 1**: Add migration flag to feature-flags.ts:

```typescript
ENABLE_CONFIG_DRIVEN_COLUMNS: true, // Toggle to rollback if needed
```

**Step 2**: Create renderer registry (add before component):

```typescript
import { TIMESHEET_COLUMNS, getVisibleColumns } from '@/lib/config/table-config';
import type { ColumnConfig } from '@/lib/config/table-config';
import { formatAbsoluteDateTime, formatWeekDate, formatCurrency } from '@/lib/formatters/date-formatters';

/**
 * Cell Renderer Registry
 * Maps column types to render functions
 */
type CellRenderer = (timesheet: Timesheet, config: ColumnConfig) => React.ReactNode;

const CELL_RENDERERS: Record<string, CellRenderer> = {
  status: (timesheet, config) => (
    <StatusBadge
      status={timesheet.status}
      lastModified={timesheet.lastModified}
      submittedAt={timesheet.submittedAt}
      showTimestampTooltip={windowWidth < 1280}
      dataTestId={`status-badge-${timesheet.id}`}
    />
  ),
  
  actions: (timesheet, config) => (
    <ActionsCell
      timesheet={timesheet}
      onApprove={handleApprove}
      onReject={handleReject}
      onEdit={handleEdit}
      actionsDisabled={actionsDisabled}
      actionsDisabledReason={actionsDisabledReason}
      // ... other props
    />
  ),
  
  // Default handlers for standard types
  text: (timesheet, config) => {
    const value = timesheet[config.key as keyof Timesheet];
    return <span className={config.ellipsis ? 'truncate' : ''}>{value || '—'}</span>;
  },
  
  number: (timesheet, config) => {
    let value = timesheet[config.key as keyof Timesheet] as number;
    
    // Apply formatter if specified
    if (config.formatterKey === 'formatCurrency') {
      return <span className="font-mono">{formatCurrency(value)}</span>;
    }
    
    return <span className="font-mono">{value}</span>;
  },
  
  date: (timesheet, config) => {
    const value = timesheet[config.key as keyof Timesheet] as string | Date;
    
    if (config.formatterKey === 'formatWeekDate') {
      return <span>{formatWeekDate(value)}</span>;
    }
    if (config.formatterKey === 'formatAbsoluteDateTime') {
      return <span>{formatAbsoluteDateTime(value)}</span>;
    }
    
    return <span>{formatAbsoluteDateTime(value)}</span>;
  },
};
```

**Step 3**: Replace column generation logic:

```typescript
const columns = useMemo<Column[]>(() => {
  if (!isFeatureEnabled('ENABLE_CONFIG_DRIVEN_COLUMNS')) {
    // Legacy column generation (keep for rollback)
    return generateLegacyColumns(); // Existing logic
  }

  // New config-driven approach
  const visibleConfigs = getVisibleColumns(TIMESHEET_COLUMNS, windowWidth);
  
  return visibleConfigs.map(config => ({
    key: config.key,
    label: config.label,
    width: config.width,
    minWidth: config.minWidth,
    maxWidth: config.maxWidth,
    sortable: config.sortable ?? false,
    visible: true,
    priority: config.priority <= 4 ? 'high' : config.priority <= 6 ? 'medium' : 'low',
    headerClassName: `${config.key}-header`,
    cellClassName: `${config.key}-cell`,
    render: (timesheet: Timesheet) => {
      const renderer = CELL_RENDERERS[config.type] || CELL_RENDERERS.text;
      return renderer(timesheet, config);
    },
  }));
}, [windowWidth, /* other dependencies */]);
```

**Migration checklist**:

- [ ] Old and new column systems produce identical output
- [ ] Feature flag allows instant rollback
- [ ] All existing tests pass with both configurations
- [ ] Performance is equal or better (memoization)

---

### Task 2.3: Implement Card View for Mobile (<1024px) (2.5h)

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetCard.tsx` (new file)

```tsx
import { memo } from 'react';
import type { Timesheet } from '@/types/api';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatWeekDate, formatCurrency } from '@/lib/formatters/date-formatters';
import { cn } from '@/lib/utils';

interface TimesheetCardProps {
  timesheet: Timesheet;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (id: string) => void;
  actionsDisabled?: boolean;
  actionsDisabledReason?: string;
  className?: string;
}

export const TimesheetCard = memo<TimesheetCardProps>(({
  timesheet,
  onApprove,
  onReject,
  onEdit,
  actionsDisabled,
  actionsDisabledReason,
  className,
}) => {
  const totalPay = timesheet.hours * timesheet.hourlyRate;

  return (
    <article
      className={cn(
        'timesheet-card',
        'rounded-lg border border-border bg-card p-4',
        'shadow-sm hover:shadow-md transition-shadow',
        className
      )}
      data-testid={`timesheet-card-${timesheet.id}`}
    >
      {/* Header: Course + Status */}
      <header className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-base leading-tight flex-1 min-w-0">
          {timesheet.course}
        </h3>
        <StatusBadge
          status={timesheet.status}
          size="small"
          lastModified={timesheet.lastModified}
          submittedAt={timesheet.submittedAt}
          showTimestampTooltip={true}
        />
      </header>

      {/* Key metrics */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div>
          <dt className="text-muted-foreground font-medium">Week</dt>
          <dd className="font-semibold">{formatWeekDate(timesheet.weekStartDate)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-muted-foreground font-medium">Total Pay</dt>
          <dd className="font-semibold text-green-600 dark:text-green-400 font-mono">
            {formatCurrency(totalPay)}
          </dd>
        </div>
      </dl>

      {/* Description (if exists) */}
      {timesheet.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {timesheet.description}
        </p>
      )}

      {/* Actions footer */}
      <footer className="flex gap-2 pt-3 border-t border-border">
        <ActionsCell
          timesheet={timesheet}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          actionsDisabled={actionsDisabled}
          actionsDisabledReason={actionsDisabledReason}
          variant="compact" // Prop to show icon-only or compact buttons
        />
      </footer>
    </article>
  );
});

TimesheetCard.displayName = 'TimesheetCard';
```

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`

**Add card view logic**:

```typescript
const shouldUseCardView = windowWidth < 1024 && isFeatureEnabled('ENABLE_CARD_VIEW');

return (
  <div className={cn('timesheet-table-container', className)}>
    {shouldUseCardView ? (
      // Card view for mobile
      <div className="timesheet-card-grid" data-testid="timesheet-card-view">
        {timesheets.map((timesheet, index) => (
          <TimesheetCard
            key={timesheet.id}
            timesheet={timesheet}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={handleEdit}
            actionsDisabled={actionsDisabled}
            actionsDisabledReason={actionsDisabledReason}
          />
        ))}
      </div>
    ) : (
      // Table view (existing logic)
      <table className="timesheet-table">
        {/* ... existing table markup */}
      </table>
    )}
  </div>
);
```

**File**: `frontend/src/components/shared/TimesheetTable/TimesheetTable.css`

**Add card grid styles**:

```css
/* Card View Grid */
.timesheet-card-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) and (max-width: 1023px) {
  .timesheet-card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

**Verification**: <1024px switches to card view, maintains all functionality

---

### Task 2.4: Create CI Layout Compliance Tests (1.5h)

**Test-Driven Development**: Tests define acceptance criteria

**File**: `frontend/e2e/visual/layout-compliance.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';
import { login } from '../shared/auth-helpers';
import { getColumnSelector } from '@/lib/config/table-config'; // RED LINE FIX: Use exported selectors

test.describe('Layout Compliance - Quality Gates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'tutor');
    await page.goto('/tutor/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Actions column is always present and does not wrap', async ({ page }) => {
    // Use config-driven selector instead of hardcoded string
    const actionsHeaders = page.locator(getColumnSelector('actions', 'header'));
    
    // Actions column must exist
    await expect(actionsHeaders.first()).toBeVisible();
    
    // Check no line wrapping in action cells
    const actionsCells = page.locator(getColumnSelector('actions', 'cell'));
    for (const cell of await actionsCells.all()) {
      const box = await cell.boundingBox();
      // Single-row height threshold (adjust based on your button height)
      expect(box?.height).toBeLessThan(60);
    }
  });

  test('Activity/Timeline column does not exist', async ({ page }) => {
    // Timeline/Activity column should not exist (removed in Sprint 1)
    const timelineHeaders = page.locator('.timeline-header, .activity-header');
    await expect(timelineHeaders).toHaveCount(0);
  });

  test('Numeric columns are right-aligned with tabular-nums', async ({ page }) => {
    // Use config-driven selectors
    const numericSelectors = [
      getColumnSelector('hours', 'cell'),
      getColumnSelector('hourlyRate', 'cell'),
      getColumnSelector('totalPay', 'cell'),
    ].join(', ');
    const numericCell = page.locator(numericSelectors).first();
    
    // Check text-align
    const textAlign = await numericCell.evaluate(el => 
      window.getComputedStyle(el).textAlign
    );
    expect(textAlign).toBe('right');
    
    // Check font-variant-numeric for equal-width digits
    const fontVariant = await numericCell.evaluate(el =>
      window.getComputedStyle(el).fontVariantNumeric
    );
    expect(fontVariant).toContain('tabular-nums');
  });

  test('Banner does not overlap with table', async ({ page }) => {
    const banner = page.locator('.page-banner, [data-testid="page-banner"]');
    const table = page.locator('.timesheet-table, [data-testid="timesheet-table"]');
    
    if (await banner.isVisible()) {
      const bannerBox = await banner.boundingBox();
      const tableBox = await table.boundingBox();
      
      // Banner bottom must be above (or at) table top
      expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(tableBox!.y + 1); // +1 for rounding
    }
  });

  test('Toast has correct z-index and positioning', async ({ page }) => {
    // Trigger a toast (simulate submit success)
    const submitButton = page.locator('[data-testid="submit-button"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Wait for toast to appear
      const toast = page.locator('[data-sonner-toast], [role="status"]').first();
      await expect(toast).toBeVisible({ timeout: 5000 });
      
      // Check fixed positioning
      const position = await toast.evaluate(el =>
        window.getComputedStyle(el).position
      );
      expect(position).toBe('fixed');
      
      // Check z-index is in correct range (above modal)
      const zIndex = await toast.evaluate(el =>
        parseInt(window.getComputedStyle(el).zIndex)
      );
      expect(zIndex).toBeGreaterThan(1000); // Above modal (1000)
      expect(zIndex).toBeLessThan(2000); // Below tooltip (2000)
    }
  });

  test('Toast Safe Zone: Does not obstruct modal interactive areas', async ({ page }) => {
    // RED LINE FIX: Toast > Modal requires safety constraint verification
    
    // Open a modal (e.g., timesheet form)
    const createButton = page.locator('[data-testid="create-timesheet"]');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const modal = page.locator('[role="dialog"], .modal').first();
      await expect(modal).toBeVisible({ timeout: 3000 });
      
      // Trigger a toast while modal is open
      // (In real scenario, this might be a validation error)
      await page.evaluate(() => {
        // Assuming using Sonner or similar
        if (window.toast) {
          window.toast.error('Test error message');
        }
      });
      
      // Wait for toast
      const toast = page.locator('[data-sonner-toast], [role="status"]').first();
      if (await toast.isVisible()) {
        const toastBox = await toast.boundingBox();
        
        // Get modal interactive elements
        const modalHeader = modal.locator('header, [data-modal-header]').first();
        const modalCloseBtn = modal.locator('[aria-label*="close"], button[aria-label*="Close"]').first();
        
        if (await modalHeader.isVisible()) {
          const headerBox = await modalHeader.boundingBox();
          
          // Toast must not overlap modal header
          const noOverlap = 
            !toastBox || !headerBox ||
            toastBox.x + toastBox.width < headerBox.x || // Toast is left of header
            toastBox.x > headerBox.x + headerBox.width || // Toast is right of header
            toastBox.y + toastBox.height < headerBox.y || // Toast is above header
            toastBox.y > headerBox.y + headerBox.height;   // Toast is below header
          
          expect(noOverlap).toBeTruthy();
        }
        
        if (await modalCloseBtn.isVisible()) {
          const closeBtnBox = await modalCloseBtn.boundingBox();
          
          // Toast must not overlap close button (critical interaction)
          const noOverlap = 
            !toastBox || !closeBtnBox ||
            toastBox.x + toastBox.width < closeBtnBox.x ||
            toastBox.x > closeBtnBox.x + closeBtnBox.width ||
            toastBox.y + toastBox.height < closeBtnBox.y ||
            toastBox.y > closeBtnBox.y + closeBtnBox.height;
          
          expect(noOverlap).toBeTruthy();
        }
        
        // Verify minimum clearance (80px from top, per design constraint)
        if (toastBox) {
          expect(toastBox.y).toBeGreaterThan(80);
        }
      }
    }
  });

  test('No relative time formatting in HISTORICAL timestamps (Submitted/Updated)', async ({ page }) => {
    // RED LINE FIX: Only prohibit relative time for historical events, not deadlines
    
    // Get Last Updated column (if visible at this viewport)
    const lastUpdatedCells = page.locator(getColumnSelector('lastUpdated', 'cell'));
    const lastUpdatedCount = await lastUpdatedCells.count();
    
    if (lastUpdatedCount > 0) {
      // Verify Last Updated column uses absolute time format
      const cellText = await lastUpdatedCells.first().textContent();
      
      // MUST NOT contain relative time patterns
      expect(cellText).not.toMatch(/\d+\s+(hour|minute|day)s?\s+ago/i);
      expect(cellText).not.toMatch(/in\s+\d+\s+(hour|minute|day)s?/i);
      
      // MUST contain absolute date like "15 Jan 2025" or "15 Jan 2025, 2:30 PM"
      expect(cellText).toMatch(/\d{1,2}\s+\w{3}\s+\d{4}/);
    }
    
    // Also check Status badge tooltips (when Last Updated column is hidden)
    const statusBadges = page.locator('.status-badge');
    if (await statusBadges.first().isVisible()) {
      await statusBadges.first().hover();
      await page.waitForTimeout(400); // Wait for tooltip
      
      const tooltip = page.locator('[role="tooltip"]');
      if (await tooltip.isVisible()) {
        const tooltipText = await tooltip.textContent();
        
        // Tooltip timestamp fields (Submitted/Last updated) must be absolute
        if (tooltipText && tooltipText.includes('Submitted')) {
          expect(tooltipText).not.toMatch(/\d+\s+(hour|minute|day)s?\s+ago/i);
          expect(tooltipText).toMatch(/\d{1,2}\s+\w{3}\s+\d{4}/);
        }
      }
    }
    
    // Note: Deadline fields (if present elsewhere) are ALLOWED to use relative time like "Due in 3 hours"
  });

  test('Responsive column folding follows priority order', async ({ page }) => {
    // Use config-driven selectors for consistency
    
    // 1440px: All columns visible
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300); // Allow re-render
    await expect(page.locator(getColumnSelector('hourlyRate', 'header'))).toBeVisible();
    await expect(page.locator(getColumnSelector('hours', 'header'))).toBeVisible();
    
    // 1280px: Rate hidden, others visible
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(300);
    const rateVisible = await page.locator(getColumnSelector('hourlyRate', 'header')).isVisible().catch(() => false);
    expect(rateVisible).toBeFalsy();
    await expect(page.locator(getColumnSelector('hours', 'header'))).toBeVisible();
    
    // 1024px: Rate + Hours hidden
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(300);
    const hoursVisible = await page.locator(getColumnSelector('hours', 'header')).isVisible().catch(() => false);
    expect(hoursVisible).toBeFalsy();
    
    // <1024px: Card view (Sprint 2) or horizontal scroll (Sprint 1)
    await page.setViewportSize({ width: 768, height: 900 });
    await page.waitForTimeout(300);
    const isCardView = await page.locator('.timesheet-card').isVisible().catch(() => false);
    const isScrollTable = await page.locator('.timesheet-table').isVisible().catch(() => false);
    
    // Should be either card view OR scrollable table
    expect(isCardView || isScrollTable).toBeTruthy();
    
    // ADDITIONAL: Verify sticky columns work in scroll mode
    if (isScrollTable) {
      const courseHeader = page.locator(getColumnSelector('course', 'header'));
      const actionsHeader = page.locator(getColumnSelector('actions', 'header'));
      
      // Check sticky positioning
      const coursePosition = await courseHeader.evaluate(el =>
        window.getComputedStyle(el).position
      );
      const actionsPosition = await actionsHeader.evaluate(el =>
        window.getComputedStyle(el).position
      );
      
      expect(coursePosition).toBe('sticky');
      expect(actionsPosition).toBe('sticky');
    }
  });

  test('Status badge has fixed min-width (no jitter)', async ({ page }) => {
    const statusBadges = page.locator('.status-badge').first();
    await expect(statusBadges).toBeVisible();
    
    // Get min-width from computed styles
    const minWidth = await statusBadges.evaluate(el =>
      window.getComputedStyle(el).minWidth
    );
    
    // Should have explicit min-width (not 'auto' or '0px')
    expect(parseInt(minWidth)).toBeGreaterThan(100); // At least 100px
  });
});

test.describe('Accessibility Compliance', () => {
  test('Banner has correct ARIA role', async ({ page }) => {
    await login(page, 'tutor');
    await page.goto('/tutor/dashboard');
    
    const banner = page.locator('.page-banner, [data-testid="page-banner"]');
    if (await banner.isVisible()) {
      const role = await banner.getAttribute('role');
      expect(role).toBe('alert');
    }
  });

  test('Status badges have accessible labels', async ({ page }) => {
    await login(page, 'tutor');
    await page.goto('/tutor/dashboard');
    
    const statusBadges = page.locator('.status-badge');
    const firstBadge = statusBadges.first();
    
    await expect(firstBadge).toBeVisible();
    
    // Should have aria-label or title
    const ariaLabel = await firstBadge.getAttribute('aria-label');
    const title = await firstBadge.getAttribute('title');
    
    expect(ariaLabel || title).toBeTruthy();
  });
});
```

**File**: `frontend/playwright.config.ts`

**Update testMatch**:

```typescript
testMatch: [
  '**/e2e/real/**/*.spec.ts',
  '**/e2e/mock/**/*.spec.ts',
  '**/e2e/visual/layout-compliance.spec.ts', // NEW: Layout quality gates
],
```

**Verification**: All layout compliance tests pass in CI before merge

---

## Acceptance Criteria

### Sprint 1 Completion Gates

- [ ] z-index hierarchy: header(100) < banner(200) < popover(400) < modal(1000) < toast(1500)
- [ ] Activity column hidden via feature flag (table width ≤1500px)
- [ ] Last Updated column visible ≥1280px, hidden <1280px with data in Status tooltip
- [ ] Status badge min-width prevents jitter
- [ ] Actions column never wraps (flex-wrap: nowrap)
- [ ] Numeric columns right-aligned with tabular-nums
- [ ] Banner renders in-flow above table (no overlap)
- [ ] Toast positioned fixed at top-right
- [ ] Responsive folding: Rate@1280px → Hours@1024px → Description@1024px
- [ ] Sidebar contains exactly 3 cards
- [ ] All existing unit tests pass
- [ ] No console errors or warnings

### Sprint 2 Completion Gates

- [ ] `table-config.ts` defines all column metadata
- [ ] TimesheetTable uses config-driven column generation
- [ ] Feature flag allows rollback to legacy column system
- [ ] All dates/currency use formatter functions
- [ ] **Relative time policy enforced**: Prohibited for historical fields (Submitted/Updated), allowed for time-sensitive contexts (Deadlines/Reminders)
- [ ] Card view renders <1024px
- [ ] Card view maintains all functionality (actions, status, tooltips)
- [ ] `layout-compliance.spec.ts` all tests pass
- [ ] CI blocks merge if Activity column reappears
- [ ] CI blocks merge if Actions column wraps
- [ ] CI blocks merge if z-index inverted
- [ ] **CI blocks merge if relative time detected IN HISTORICAL FIELDS ONLY** (Last Updated column, Status tooltip)
- [ ] Lighthouse accessibility score ≥95
- [ ] No regressions in existing E2E tests

## Key Constraints & Non-Negotiables

1. **SSOT Separation (RED LINE FIX)**:
   - Domain logic: `statusMap.ts` (status definitions, transitions, permissions)
   - UI metadata: `ui-config.ts` (chip widths, tooltip behavior) - SEPARATE FILE
   - Column config: `table-config.ts` (column definitions, responsive rules, test selectors export)
   - Formatters: `date-formatters.ts` (presentation logic only)

2. **z-index Stack with Toast Safe Zone (RED LINE FIX)**:
   ```
   header(100) < banner(200) < popover(400) < modal(1000) < toast(1500) < tooltip(2000)
   ```
   **Toast Safety Constraints**:
   - Positioned `top-right` with ≥80px top clearance
   - Max-width 420px
   - Must not geometrically overlap modal header/close button/primary CTA
   - CI enforces no-overlap assertion at 1920px, 1280px, 1024px, 768px

3. **Absolute Time Mandate for HISTORICAL Events (RED LINE FIX)**:
   - **Historical events** (Submitted/Updated/Created): Format `d MMM yyyy, h:mm a` (e.g., "15 Jan 2025, 2:30 PM")
   - **Time-sensitive events** (Deadlines/Reminders): ALLOWED to use relative time (e.g., "Due in 3 hours")
   - Formatter guards: `formatRelativeTime()` only for future dates with context parameter
   - CI only prohibits relative time in historical timestamp fields (Last Updated column, Status tooltip)

4. **Actions Column Permanence**:

                                                                                                                                                                                                - Column always present (never conditionally removed)
                                                                                                                                                                                                - Buttons disabled with tooltip explanation when not applicable
                                                                                                                                                                                                - Never use flex-wrap: wrap (always nowrap)

5. **Responsive Priority (Breakpoints from Design Tokens)**:
   - Breakpoints: 768px (mobile), 1024px (tablet), 1280px (tablet-landscape), 1440px (desktop), 1920px (desktop-wide)
   - Folding order: Rate (@1280px) → Hours (@1024px) → Description (@1024px) → Card view (<1024px)
   - Status and Actions never hidden at any breakpoint
   - All breakpoint values defined in `--breakpoint-*` tokens to eliminate magic numbers

6. **Feature Flags for Rollback**:

                                                                                                                                                                                                - `ENABLE_ACTIVITY_COLUMN`: false (can re-enable if needed)
                                                                                                                                                                                                - `ENABLE_LAST_UPDATED_COLUMN`: true
                                                                                                                                                                                                - `ENABLE_CONFIG_DRIVEN_COLUMNS`: true (Sprint 2)
                                                                                                                                                                                                - `ENABLE_CARD_VIEW`: true (Sprint 2)

7. **Backward Compatibility**:

                                                                                                                                                                                                - Sprint 1: All changes are additive or behind flags
                                                                                                                                                                                                - Sprint 2: Deprecation warnings before removal
                                                                                                                                                                                                - Test suite validates both old and new paths during migration

8. **Performance Budget**:
   - Table render time: <50ms for 100 rows
   - Responsive recalculation: <16ms (60fps)
   - No layout thrashing (measure-mutate-measure)

9. **Copy & Formatting Standards (RECOMMENDED)**:
   - **Currency**: Always prefix with "AUD" (e.g., "AUD 1,234.56")
   - **Dates**: Consistent format `d MMM yyyy, h:mm a` for timestamps (e.g., "15 Jan 2025, 2:30 PM")
   - **Pluralization**: Use proper singular/plural forms (e.g., "1 timesheet", "3 timesheets")
   - **Number formatting**: Use `Intl.NumberFormat` with locale 'en-AU' for consistency
   - Quick test cases: Verify 0/1/2 counts display correct pluralization

10. **Accessibility Baselines (RECOMMENDED)**:
    - **Banner**: Must have `role="alert"` for screen reader announcement
    - **Toast**: Implement focus management (focus doesn't trap in toast, can dismiss with Esc)
    - **Status Tooltip**: Accessible via hover, touch (long-press), and keyboard (Tab + Enter/Space)
    - **Target**: Lighthouse accessibility score ≥95
    - **Color contrast**: All text meets WCAG AA minimum (4.5:1 for normal text)

11. **Telemetry & Rollback Strategy (RECOMMENDED)**:
    - Add analytics events for: column folding trigger, card view activation, batch action failures
    - Feature flags remain toggleable in production for instant rollback
    - Monitor error rates for 48h after deployment before removing rollback capability

## Rollback Procedures

### If Sprint 1 Issues Arise:

1. Set `ENABLE_ACTIVITY_COLUMN: true` (restore old layout)
2. Set `ENABLE_LAST_UPDATED_COLUMN: false` (revert to separate columns)
3. Revert z-index changes in `design-tokens.css` (1 file change)

### If Sprint 2 Issues Arise:

1. Set `ENABLE_CONFIG_DRIVEN_COLUMNS: false` (use legacy column logic)
2. Set `ENABLE_CARD_VIEW: false` (force table view on mobile)
3. All old code paths remain intact for instant rollback

## Migration Validation Checklist

Before declaring complete:

### Functional Tests
- [ ] Run full E2E suite (real + mock + visual)
- [ ] Run layout compliance tests at 1920px, 1440px, 1280px, 1024px, 768px
- [ ] Manual testing: Desktop Chrome, Firefox, Safari
- [ ] Manual testing: Mobile Chrome, Safari (iOS)
- [ ] **Touch Accessibility**: Verify Status badge tooltip accessible via long-press on mobile

### Layout Compliance (Supplemental Acceptance Criteria)
- [ ] **Toast Safe Zone**: At 1280px/1024px/768px, toast does not overlap modal header/close/CTA (geometric assertion)
- [ ] **Sticky Verification**: <1024px horizontal scroll, verify Course and Actions columns sticky and not covered by Banner/Toast
- [ ] **Naming Contract Test**: CI validates table-config keys match CSS class names and test selectors
- [ ] **Historical Time Format**: CI blocks merge if relative time detected in Last Updated column or Status tooltip
- [ ] **Activity Column**: CI blocks merge if Activity/Timeline column reappears

### Performance & Quality
- [ ] Accessibility audit with axe DevTools (score ≥95)
- [ ] Performance profile (Chrome DevTools)
- [ ] **Performance Baseline**: 100-row table render <50ms baseline documented for future comparison
- [ ] Check bundle size impact (<10KB increase)
- [ ] Verify no new console warnings/errors

### Documentation & Maintenance
- [ ] Confirm all feature flags documented
- [ ] Update PROJECT_DOCS.md with architecture changes
- [ ] Document SSOT file boundaries (domain vs UI vs formatters vs config)

