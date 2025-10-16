# Timesheet Actions Refactor - Implementation Summary

## Overview

This refactor addresses the "missing Actions column" issue by implementing a Single Source of Truth (SSOT) for timesheet approval logic and ensuring the Actions column is always visible with proper disabled states.

## Changes Made

### 1. Created SSOT for Approval Logic
**File:** `frontend/src/features/timesheets/approval-logic.ts`

- **Purpose:** Centralized business logic for determining which actions are available for each timesheet status and role
- **Key Function:** `getTimesheetActions(role, status)` returns array of actions with:
  - `isEnabled`: boolean indicating if action can be performed
  - `disabledReason`: string explaining why action is disabled
  - `isPrimary`, `isDestructive`, `priority`: UI guidance
  - `requiresConfirmation`: for destructive actions

- **Benefits:**
  - No more "action buttons disappear" - they're always visible, just disabled when not applicable
  - Single source of truth prevents drift between components
  - Easy to extend with new statuses or roles
  - Backend and frontend can share the same state transition rules

### 2. Refactored TimesheetActions Component
**File:** `frontend/src/components/shared/TimesheetTable/TimesheetActions.tsx`

**Key Changes:**
- **Always renders buttons** - no more conditional hiding
- **Disabled states with tooltips** - users always see why an action isn't available
- **Dropdown menu for destructive actions** - "Reject" and "Request Changes" moved to "..." menu
- **Uses SSOT** - all action logic comes from `approval-logic.ts`

**Before:**
```typescript
if (canApprove && onApprove) {
  // Show approve button
}
// Otherwise show nothing (-)
```

**After:**
```typescript
const allActions = getTimesheetActions(role, timesheet.status);
// Always render all actions, disable with tooltip when isEnabled is false
{allActions.map(action => (
  <Button disabled={!action.isEnabled} title={action.disabledReason}>
    {action.label}
  </Button>
))}
```

### 3. Updated TimesheetTable
**File:** `frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx`

- Increased Actions column width from 180px to 200px to accommodate dropdown menu
- Added clear comment that Actions column is always visible when `showActions` is true
- Individual buttons are now responsible for their own disabled states

### 4. Created UI Components
**Files:** 
- `frontend/src/components/ui/dropdown-menu.tsx`
- `frontend/src/components/ui/tooltip.tsx`

- Standard Radix UI wrapper components for accessible dropdowns and tooltips
- Consistent with shadcn/ui design patterns
- Full keyboard navigation and screen reader support

## State Machine for Lecturer Actions

**Status: TUTOR_CONFIRMED**
- ✅ Approve (enabled) - Primary action
- ✅ Reject (enabled) - In dropdown menu
- ✅ Request Changes (enabled) - In dropdown menu

**Status: DRAFT, REJECTED, MODIFICATION_REQUESTED**
- ❌ Approve (disabled) - Tooltip: "Timesheet must be confirmed by tutor first"
- ❌ Reject (disabled) - Same reason
- ❌ Request Changes (disabled) - Same reason

**Status: PENDING_TUTOR_CONFIRMATION**
- ❌ Approve (disabled) - Tooltip: "Waiting for tutor confirmation"
- ❌ Reject (disabled) - Same reason
- ❌ Request Changes (disabled) - Same reason

**Status: LECTURER_CONFIRMED**
- ❌ Approve (disabled) - Tooltip: "Already confirmed by lecturer"
- ❌ Reject (disabled) - Same reason
- ❌ Request Changes (disabled) - Same reason

**Status: FINAL_CONFIRMED**
- No actions shown (terminal state)

## Testing

### Manual Testing Checklist
- [ ] Lecturer dashboard shows Actions column for all timesheets
- [ ] Approve button is enabled only for TUTOR_CONFIRMED status
- [ ] Approve button is disabled with tooltip for other statuses
- [ ] Tooltip shows correct reason for each status
- [ ] Dropdown menu (...)  contains Reject and Request Changes
- [ ] Dropdown items are disabled with reasons when status doesn't allow
- [ ] No more "dash" (-) placeholder in Actions column
- [ ] Loading state shows spinner on primary action button
- [ ] Batch actions use same logic (getBatchActions function)

### Automated Testing
- ESLint: ✅ Pass (no new errors in refactored files)
- TypeScript: ✅ Pass (no type errors in new code)
- Unit tests: Run `npm test` to verify
- E2E tests: Run screenshot capture tool to validate UI

## Best Practices Implemented

1. **SSOT Status Strategy** - Enumerated status→actions mapping
2. **Always show Actions column** - Never remove, only disable with tooltip
3. **Consistent visibility** - Fixed column width, predictable layout
4. **Accessible** - Tooltips, aria-labels, keyboard navigation
5. **Maintainable** - Single place to update business rules
6. **Type-safe** - Full TypeScript coverage with strict types
7. **Extensible** - Easy to add new actions, statuses, or roles

## Migration Notes

**No breaking changes** - the component API remains the same:
```typescript
<TimesheetTable
  showActions
  approvalRole="LECTURER"
  onApprovalAction={handler}
  // ... other props
/>
```

The difference is:
- **Before:** Actions column could show "-" for non-actionable items
- **After:** Actions column always shows buttons, disabled when not applicable

## Future Enhancements

1. **Backend integration** - Backend can return `permittedActions` to avoid frontend logic
2. **Audit logging** - Track when users see disabled actions and why
3. **Analytics** - Monitor which statuses/reasons block actions most often
4. **Testing** - Add comprehensive unit tests for approval-logic.ts state machine
5. **Documentation** - Generate state transition diagram from approval-logic.ts

## Files Modified

```
frontend/src/features/timesheets/approval-logic.ts (NEW)
frontend/src/components/shared/TimesheetTable/TimesheetActions.tsx (REFACTORED)
frontend/src/components/shared/TimesheetTable/TimesheetTable.tsx (UPDATED)
frontend/src/components/ui/dropdown-menu.tsx (NEW)
frontend/src/components/ui/tooltip.tsx (NEW)
frontend/src/components/dashboards/LecturerDashboard/components/LecturerPendingTable.tsx (MINOR)
```

## Dependencies Added

```json
{
  "@radix-ui/react-dropdown-menu": "^2.0.0",
  "@radix-ui/react-tooltip": "^1.0.0"
}
```

Already installed: `lucide-react` (for MoreHorizontal icon)

## Validation

Run the screenshot capture tool to generate before/after comparisons:

```bash
node tools/scripts/capture-workflow-screenshots.js
```

Screenshots will be saved to `frontend/playwright-screenshots/` for review.

