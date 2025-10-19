# Tutor Dashboard Migration Plan: `.dashboard-grid` → `.macro-grid`

**Objective**: Migrate Tutor dashboard from legacy `.dashboard-grid` system to modern `.macro-grid` architecture for consistency with Admin and Lecturer dashboards.

**Effort**: 2-4 hours  
**Risk Level**: Low-Medium  
**Priority**: Medium  
**Dependencies**: None

---

## Table of Contents
1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Migration Steps](#migration-steps)
3. [Code Changes](#code-changes)
4. [Testing Strategy](#testing-strategy)
5. [Rollback Plan](#rollback-plan)
6. [Success Criteria](#success-criteria)

---

## Pre-Migration Checklist

### ✅ Prerequisites
- [ ] Review `unified-grid.css` to understand `.macro-grid` system
- [ ] Read `AdminDashboardShell.tsx` and `LecturerDashboardShell.tsx` for reference
- [ ] Backup current `TutorDashboard.tsx` file
- [ ] Ensure all tests are passing before migration
- [ ] Create feature branch: `feature/tutor-dashboard-macro-grid-migration`

### 📊 Current State Assessment
- **File**: `frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx`
- **Lines**: 720+ lines
- **Current Classes**: `.dashboard-grid`, `.dashboard-grid__hero`, `.dashboard-grid__content`, `.dashboard-grid__main`, `.dashboard-grid__aside`
- **Sidebar**: Always enabled with 3 widgets (UpcomingDeadlines, PaySummary, SupportResources)
- **Layout**: Quick Actions grid + QuickStats + CompletionProgress + EarningsBreakdown + TimesheetTable

### 🎯 Target State
- **New Classes**: `.macro-grid`, `.macro-grid-hero`, `.macro-grid-content`, `.macro-grid-main`, `.macro-grid-sidebar`
- **Sidebar Control**: Always enabled via `has-sidebar` class
- **Layout**: Same content, improved alignment and styling
- **Responsive**: Enhanced breakpoint handling

---

## Migration Steps

### Phase 1: Preparation (15 minutes)

#### Step 1.1: Create Feature Branch
```bash
git checkout -b feature/tutor-dashboard-macro-grid-migration
git status
```

#### Step 1.2: Backup Current Implementation
```bash
cp frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx \
   frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx.backup
```

#### Step 1.3: Run Baseline Tests
```bash
cd frontend
npm run test -- TutorDashboard.test.tsx
npm run lint
npm run typecheck
```

**Expected**: All tests passing, no lint/type errors

---

### Phase 2: Class Name Migration (30 minutes)

#### Step 2.1: Update Root Container (Line 461)
**Before:**
```tsx
<div className={`dashboard-grid ${className}`} data-testid="tutor-dashboard">
```

**After:**
```tsx
<div className={`macro-grid ${className}`} data-testid="tutor-dashboard">
```

**File**: `TutorDashboard.tsx:461`

---

#### Step 2.2: Update Hero Section (Line 462)
**Before:**
```tsx
<header className="dashboard-grid__hero">
```

**After:**
```tsx
<header className="macro-grid-hero">
```

**File**: `TutorDashboard.tsx:462`

---

#### Step 2.3: Update Content Container (Line 471)
**Before:**
```tsx
<div className="dashboard-grid__content">
```

**After:**
```tsx
<main className="macro-grid-content has-sidebar">
```

**Changes**:
- `<div>` → `<main>` (semantic HTML improvement)
- Added `has-sidebar` class to enable 2-column layout
- This triggers CSS Grid: `grid-template-columns: 1fr 360px` on desktop

**File**: `TutorDashboard.tsx:471`

---

#### Step 2.4: Update Main Section (Line 472)
**Before:**
```tsx
<section className="dashboard-grid__main" role="region" aria-label="Tutor dashboard content">
```

**After:**
```tsx
<section className="macro-grid-main" role="region" aria-label="Tutor dashboard content">
```

**File**: `TutorDashboard.tsx:472`

---

#### Step 2.5: Update Sidebar (Lines 664-667)
**Before:**
```tsx
<aside
  className="dashboard-grid__aside"
  data-testid="dashboard-sidebar"
  aria-label="Tutor essentials"
>
```

**After:**
```tsx
<aside
  className="macro-grid-sidebar"
  data-testid="dashboard-sidebar"
  aria-label="Tutor essentials"
>
```

**File**: `TutorDashboard.tsx:664-667`

---

#### Step 2.6: Close Main Element (Line 680)
**Before:**
```tsx
        </div>
      </div>
```

**After:**
```tsx
        </main>
      </div>
```

**File**: `TutorDashboard.tsx:680`

---

#### Step 2.7: Update Loading State (Lines 410-416)
**Before:**
```tsx
<div className={`dashboard-grid ${className}`} data-testid="loading-state">
  <section className="dashboard-grid__hero" data-testid="loading-state-container">
```

**After:**
```tsx
<div className={`macro-grid ${className}`} data-testid="loading-state">
  <div className="macro-grid-hero" data-testid="loading-state-container">
```

**Note**: Changed `<section>` → `<div>` since loading state doesn't need sectioning semantics

**File**: `TutorDashboard.tsx:411-412`

---

### Phase 3: Style Adjustments (45 minutes)

#### Step 3.1: Verify Quick Actions Grid Responsiveness
**Current Code** (Line 475):
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
```

**Action**: No change needed - Tailwind responsive grid is compatible with `.macro-grid`

---

#### Step 3.2: Check Content Width Constraints
**Analysis**: `.macro-grid-main` automatically applies:
```css
max-width: 100%;
min-width: 0;
```

**Action**: Remove any manual width constraints that conflict with `.macro-grid` system

**Search for**:
```bash
grep -n "max-w-" frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx
grep -n "w-full" frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx
```

**Expected**: Component cards already have proper width handling via Tailwind utilities

---

#### Step 3.3: Verify Sidebar Width on Desktop
**CSS** (`unified-grid.css:169-173`):
```css
@media (min-width: 1024px) {
  .macro-grid-content.has-sidebar {
    grid-template-columns: 1fr 360px;
    gap: 2rem;
  }
}
```

**Action**: Test that sidebar width (360px) accommodates:
- UpcomingDeadlines widget
- PaySummary widget  
- SupportResources widget

**Manual Test**: Resize browser to 1024px+ and verify no overflow

---

#### Step 3.4: Add Max-Width to Sidebar Widgets (Defensive CSS)
**Recommended Addition** to each sidebar widget component:

```tsx
// In UpcomingDeadlines.tsx, PaySummary.tsx, SupportResources.tsx
<Card className="w-full max-w-full">
  {/* widget content */}
</Card>
```

**Files to Update**:
- `frontend/src/components/dashboards/TutorDashboard/components/UpcomingDeadlines.tsx`
- `frontend/src/components/dashboards/TutorDashboard/components/PaySummary.tsx`
- `frontend/src/components/dashboards/TutorDashboard/components/SupportResources.tsx`

---

### Phase 4: Responsive Behavior Testing (60 minutes)

#### Step 4.1: Mobile Layout (320px - 767px)
**Expected Behavior**:
- Sidebar stacks below main content (single column)
- Quick Actions grid: 1 column
- QuickStats cards: 1 column
- Table: Horizontal scroll

**Test Cases**:
```typescript
// In TutorDashboard.test.tsx
describe('Responsive Behavior', () => {
  it('should stack sidebar below main content on mobile', () => {
    // Set viewport to 375px width
    // Verify grid-template-columns: 1fr
    // Verify grid-template-rows: auto auto
  });
});
```

**Manual Test**:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone SE (375x667)
4. Verify layout stacks vertically

---

#### Step 4.2: Tablet Layout (768px - 1023px)
**Expected Behavior**:
- Sidebar still stacked (single column)
- Quick Actions grid: 2 columns
- QuickStats cards: 2 columns

**Test**:
1. Set viewport to 768px
2. Verify Quick Actions show 2 columns
3. Verify sidebar below main content

---

#### Step 4.3: Desktop Layout (1024px+)
**Expected Behavior**:
- Two-column layout: Main (1fr) + Sidebar (360px)
- Quick Actions grid: 3 columns
- Sidebar sticky on scroll

**Test**:
1. Set viewport to 1366px
2. Verify main content and sidebar side-by-side
3. Scroll down and verify sidebar sticks to top

---

#### Step 4.4: Large Desktop (1440px+)
**Expected Behavior**:
- Two-column layout: Main (1fr) + Sidebar (400px)
- All content properly aligned

**CSS** (`unified-grid.css:176-179`):
```css
@media (min-width: 1440px) {
  .macro-grid-content.has-sidebar {
    grid-template-columns: 1fr 400px;
  }
}
```

---

### Phase 5: Alignment Verification (30 minutes)

#### Step 5.1: Visual Alignment Check
**Goal**: Verify hero banner and main content align perfectly

**Manual Test**:
1. Open Tutor dashboard in browser
2. Use DevTools Inspect mode
3. Hover over `.macro-grid-hero`
4. Hover over `.macro-grid-main`
5. Verify left edges align (considering `--hero-content-alignment` offset)

**Expected Measurements**:
```javascript
// Run in DevTools Console
const hero = document.querySelector('.macro-grid-hero');
const main = document.querySelector('.macro-grid-main');
console.log({
  heroOffset: hero.offsetLeft,
  heroInnerEdge: hero.offsetLeft + parseInt(getComputedStyle(hero).paddingLeft),
  mainOffset: main.offsetLeft
});
// heroInnerEdge should ≈ mainOffset
```

---

#### Step 5.2: Sidebar Overflow Check
**Goal**: Ensure sidebar widgets don't overflow container

**Test**:
```javascript
// Run in DevTools Console
const sidebar = document.querySelector('.macro-grid-sidebar');
const widgets = sidebar.querySelectorAll('.card');
widgets.forEach((widget, i) => {
  console.log(`Widget ${i}:`, {
    width: widget.offsetWidth,
    sidebarWidth: sidebar.offsetWidth,
    overflows: widget.offsetWidth > sidebar.offsetWidth
  });
});
```

**Expected**: All widgets fit within sidebar width (360px or 400px)

---

#### Step 5.3: Z-Index Layering Verification
**Goal**: Confirm correct stacking order

**Expected Layers** (bottom to top):
1. Background gradient (`--z-background: -1`)
2. Hero banner (`--z-elevated: 2`)
3. Main content (`--z-content: 1`)
4. Sidebar (`--z-content: 1`)
5. Modals (`--z-modal: 1000`)

**Test**:
```javascript
// Run in DevTools Console
const elements = {
  hero: document.querySelector('.macro-grid-hero'),
  main: document.querySelector('.macro-grid-main'),
  sidebar: document.querySelector('.macro-grid-sidebar'),
  modal: document.querySelector('.elevation-modal')
};

Object.entries(elements).forEach(([name, el]) => {
  if (el) {
    console.log(`${name}:`, getComputedStyle(el).zIndex);
  }
});
```

---

### Phase 6: Testing & Validation (45 minutes)

#### Step 6.1: Run Component Tests
```bash
npm run test -- TutorDashboard.test.tsx
```

**Expected**: All existing tests pass without modification

**If Tests Fail**: Update test selectors from `.dashboard-grid` to `.macro-grid`

---

#### Step 6.2: Visual Regression Testing
**Goal**: Ensure layout looks correct across all viewports

**Manual Checklist**:
- [ ] Hero banner displays with gradient background
- [ ] Quick Actions grid shows 1/2/3 columns responsively
- [ ] QuickStats cards display properly
- [ ] CompletionProgress bar renders correctly
- [ ] EarningsBreakdown chart shows properly
- [ ] TimesheetTable scrolls horizontally when needed
- [ ] Sidebar widgets stack vertically with proper spacing
- [ ] PaySummary displays earnings correctly
- [ ] UpcomingDeadlines shows deadline items
- [ ] SupportResources links are clickable

---

#### Step 6.3: Accessibility Testing
**Tools**: axe DevTools, Lighthouse

**Checklist**:
- [ ] No ARIA errors
- [ ] Keyboard navigation works (Tab, Shift+Tab)
- [ ] Screen reader announcements make sense
- [ ] Semantic HTML maintained (`<header>`, `<main>`, `<aside>`)
- [ ] Focus indicators visible

**Run Lighthouse**:
1. Open DevTools → Lighthouse tab
2. Select "Accessibility" only
3. Run audit
4. Expected score: 95+

---

#### Step 6.4: Cross-Browser Testing
**Browsers to Test**:
- [ ] Chrome 120+ (primary)
- [ ] Firefox 120+
- [ ] Safari 17+ (macOS/iOS)
- [ ] Edge 120+

**Test Matrix**:
- Desktop (1920x1080)
- Laptop (1366x768)
- Tablet (768x1024)
- Mobile (375x667)

---

### Phase 7: Performance Validation (15 minutes)

#### Step 7.1: Check Render Performance
**Goal**: Ensure migration doesn't degrade performance

**Metrics to Measure**:
```javascript
// Add to component temporarily
useEffect(() => {
  const renderTime = performance.now();
  console.log('[TutorDashboard] Initial render:', renderTime);
}, []);
```

**Baseline**: Compare before/after migration render times  
**Expected**: No significant change (±5ms acceptable)

---

#### Step 7.2: Layout Shift Check
**Goal**: Verify no cumulative layout shift (CLS)

**Test**:
1. Open Chrome DevTools → Performance tab
2. Start recording
3. Refresh page
4. Stop recording after 3 seconds
5. Check for layout shifts in timeline

**Expected**: CLS score < 0.1 (good)

---

### Phase 8: Documentation & Cleanup (30 minutes)

#### Step 8.1: Update Component Documentation
**File**: `TutorDashboard.tsx` (top comment block)

**Add Migration Note**:
```tsx
/**
 * TutorDashboard Component
 *
 * Optimized tutor dashboard with timesheet management, self-service features,
 * pay tracking, and course integration for student tutors.
 *
 * @architecture Uses `.macro-grid` layout system (migrated from `.dashboard-grid` on 2025-10-19)
 * @layout Two-column responsive grid with sidebar (UpcomingDeadlines, PaySummary, SupportResources)
 * @responsive Mobile: stacked, Tablet: stacked, Desktop: 2-column (1fr + 360px), Large: 2-column (1fr + 400px)
 */
```

---

#### Step 8.2: Remove Backup File
```bash
rm frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx.backup
```

---

#### Step 8.3: Update Migration Plan Status
**File**: `TUTOR_DASHBOARD_MIGRATION_PLAN.md`

**Add Completion Record**:
```markdown
## Migration Completed

**Date**: 2025-10-19  
**Migrated By**: [Your Name]  
**Commit**: [commit hash]  
**Tests Passing**: ✅  
**Visual QA**: ✅  
**Performance**: ✅
```

---

## Code Changes

### Summary of File Modifications

| File | Lines Changed | Type | Description |
|------|---------------|------|-------------|
| `TutorDashboard.tsx` | ~10 | Class names | `.dashboard-grid` → `.macro-grid` |
| `TutorDashboard.tsx` | 2 | HTML tags | `<div>` → `<main>` |
| `UpcomingDeadlines.tsx` | 1 | CSS class | Add `w-full max-w-full` |
| `PaySummary.tsx` | 1 | CSS class | Add `w-full max-w-full` |
| `SupportResources.tsx` | 1 | CSS class | Add `w-full max-w-full` |
| `TutorDashboard.test.tsx` | ~5 | Test selectors | Update class name assertions |

---

### Detailed Code Changes

#### Change 1: Root Container
**File**: `TutorDashboard.tsx`  
**Line**: 461

```diff
- <div className={`dashboard-grid ${className}`} data-testid="tutor-dashboard">
+ <div className={`macro-grid ${className}`} data-testid="tutor-dashboard">
```

---

#### Change 2: Hero Section
**File**: `TutorDashboard.tsx`  
**Line**: 462

```diff
- <header className="dashboard-grid__hero">
+ <header className="macro-grid-hero">
```

---

#### Change 3: Content Container
**File**: `TutorDashboard.tsx`  
**Line**: 471

```diff
- <div className="dashboard-grid__content">
+ <main className="macro-grid-content has-sidebar">
```

---

#### Change 4: Main Section
**File**: `TutorDashboard.tsx`  
**Line**: 472

```diff
- <section className="dashboard-grid__main" role="region" aria-label="Tutor dashboard content">
+ <section className="macro-grid-main" role="region" aria-label="Tutor dashboard content">
```

---

#### Change 5: Sidebar
**File**: `TutorDashboard.tsx`  
**Lines**: 664-667

```diff
  <aside
-   className="dashboard-grid__aside"
+   className="macro-grid-sidebar"
    data-testid="dashboard-sidebar"
    aria-label="Tutor essentials"
  >
```

---

#### Change 6: Close Main Element
**File**: `TutorDashboard.tsx`  
**Line**: 680

```diff
-       </div>
+       </main>
      </div>
```

---

#### Change 7: Loading State Container
**File**: `TutorDashboard.tsx`  
**Lines**: 411-412

```diff
- <div className={`dashboard-grid ${className}`} data-testid="loading-state">
-   <section className="dashboard-grid__hero" data-testid="loading-state-container">
+ <div className={`macro-grid ${className}`} data-testid="loading-state">
+   <div className="macro-grid-hero" data-testid="loading-state-container">
```

---

#### Change 8: Loading State Close Tag
**File**: `TutorDashboard.tsx`  
**Line**: 415

```diff
-     </section>
+     </div>
```

---

#### Change 9: Add Widget Width Constraints
**File**: `PaySummary.tsx`  
**Line**: ~15 (CardContent wrapper)

```diff
- <Card data-testid="pay-summary">
+ <Card className="w-full max-w-full" data-testid="pay-summary">
```

**Repeat for**:
- `UpcomingDeadlines.tsx`
- `SupportResources.tsx`

---

#### Change 10: Update Test Assertions
**File**: `TutorDashboard.test.tsx`  
**Lines**: Various

```diff
- expect(container.querySelector('.dashboard-grid')).toBeInTheDocument();
+ expect(container.querySelector('.macro-grid')).toBeInTheDocument();

- expect(container.querySelector('.dashboard-grid__hero')).toBeInTheDocument();
+ expect(container.querySelector('.macro-grid-hero')).toBeInTheDocument();

- expect(container.querySelector('.dashboard-grid__aside')).toBeInTheDocument();
+ expect(container.querySelector('.macro-grid-sidebar')).toBeInTheDocument();
```

---

## Testing Strategy

### Automated Tests

#### Unit Tests
```bash
npm run test -- TutorDashboard.test.tsx
```

**Test Coverage**:
- Component renders without errors
- Sidebar widgets display correctly
- Quick Actions grid renders
- TimesheetTable shows data
- Modal opens/closes properly

---

#### Integration Tests
```bash
npm run test:integration -- tutor-dashboard.integration.test.ts
```

**Test Scenarios**:
- Create new timesheet flow
- Submit draft timesheet
- Edit existing timesheet
- Bulk submit drafts
- Filter timesheets by tab

---

#### Visual Regression Tests (Optional)
**Tool**: Playwright + Percy

```bash
npm run test:visual -- tutor-dashboard
```

**Snapshots**:
- Desktop: 1920x1080
- Laptop: 1366x768
- Tablet: 768x1024
- Mobile: 375x667

---

### Manual Tests

#### Test Case 1: Layout Structure
**Steps**:
1. Navigate to Tutor dashboard
2. Open DevTools Inspector
3. Verify DOM structure matches:
   ```html
   .unified-container
     .macro-grid
       .macro-grid-hero
       .macro-grid-content.has-sidebar
         .macro-grid-main
         .macro-grid-sidebar
   ```

**Expected**: All classes present and correctly nested

---

#### Test Case 2: Responsive Sidebar
**Steps**:
1. Resize browser to 375px width
2. Verify sidebar below main content
3. Resize to 1024px width
4. Verify sidebar beside main content (right side)
5. Resize to 1440px width
6. Verify sidebar width increases to 400px

**Expected**: Smooth responsive transitions

---

#### Test Case 3: Hero Alignment
**Steps**:
1. Open DevTools
2. Inspect `.macro-grid-hero` element
3. Note padding-left value (e.g., 44px)
4. Inspect `.macro-grid-main` element
5. Measure distance from viewport edge
6. Calculate: hero.offsetLeft + hero.paddingLeft ≈ main.offsetLeft

**Expected**: Alignment within 2px tolerance

---

#### Test Case 4: Sidebar Overflow
**Steps**:
1. Open Tutor dashboard
2. Resize to 1024px width (minimum for 2-column)
3. Inspect `.macro-grid-sidebar`
4. Verify no horizontal scrollbar
5. Verify all widgets fully visible

**Expected**: No overflow, all content fits

---

#### Test Case 5: Z-Index Layering
**Steps**:
1. Open Tutor dashboard
2. Click "Create New Timesheet"
3. Verify modal appears above all content
4. Verify background overlay dims content
5. Close modal
6. Verify content still accessible

**Expected**: Proper z-index stacking

---

### Performance Tests

#### Test Case 6: Initial Load Time
**Tool**: Chrome DevTools Performance tab

**Steps**:
1. Open Performance tab
2. Click "Reload and Record"
3. Wait for page load
4. Stop recording
5. Check metrics:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Time to Interactive (TTI)

**Expected**:
- FCP < 1.8s
- LCP < 2.5s
- TTI < 3.8s

---

#### Test Case 7: Layout Stability
**Tool**: Chrome DevTools Performance tab

**Steps**:
1. Open Performance tab
2. Enable "Experience" section
3. Reload page
4. Check Cumulative Layout Shift (CLS)

**Expected**: CLS < 0.1

---

### Accessibility Tests

#### Test Case 8: Keyboard Navigation
**Steps**:
1. Press Tab repeatedly
2. Verify focus moves through:
   - Quick Action buttons
   - Create New button
   - Tab navigation (All, Drafts, etc.)
   - Timesheet table rows
   - Sidebar widgets
3. Press Shift+Tab to reverse
4. Press Enter on focused elements

**Expected**: Logical tab order, all interactive elements accessible

---

#### Test Case 9: Screen Reader
**Tool**: NVDA (Windows) or VoiceOver (macOS)

**Steps**:
1. Enable screen reader
2. Navigate through dashboard
3. Verify announcements:
   - "Tutor Dashboard, main"
   - "Quick Actions, region"
   - "Your Statistics, region"
   - "My Timesheets, region"
   - "Tutor essentials, complementary"

**Expected**: Clear, meaningful announcements

---

## Rollback Plan

### If Migration Fails

#### Option 1: Git Revert (Immediate)
```bash
# If committed
git revert HEAD
git push

# If not committed
git checkout .
git clean -fd
```

**Time**: < 1 minute  
**Risk**: None

---

#### Option 2: Restore Backup (Fast)
```bash
# If backup file exists
cp frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx.backup \
   frontend/src/components/dashboards/TutorDashboard/TutorDashboard.tsx

npm run test
npm run build
```

**Time**: < 5 minutes  
**Risk**: Low

---

#### Option 3: Manual Rollback (Controlled)
**Steps**:
1. Revert class names: `.macro-grid` → `.dashboard-grid`
2. Revert HTML tags: `<main>` → `<div>`
3. Remove `has-sidebar` class
4. Run tests to verify
5. Commit rollback

**Time**: 15-30 minutes  
**Risk**: Low (manual review ensures correctness)

---

### Rollback Criteria

**Trigger Rollback If**:
- [ ] Any automated test fails after migration
- [ ] Visual layout breaks on any viewport
- [ ] Performance degrades >20%
- [ ] Accessibility score drops below 90
- [ ] Critical bug discovered in production
- [ ] Sidebar widgets overflow container

---

## Success Criteria

### ✅ Migration Complete When:

#### Code Quality
- [ ] All class names updated to `.macro-grid` system
- [ ] Semantic HTML improvements applied (`<main>`, proper `<header>`)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Code passes review

#### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual tests completed (all 9 test cases)
- [ ] Accessibility score ≥95
- [ ] Performance metrics within acceptable range

#### Visual Quality
- [ ] Layout matches Admin/Lecturer alignment
- [ ] No visual regressions
- [ ] Responsive behavior correct at all breakpoints
- [ ] Sidebar widgets fit properly
- [ ] No overflow or scrolling issues

#### Documentation
- [ ] Component docstring updated
- [ ] Migration notes added
- [ ] Commit message descriptive
- [ ] PR description complete

---

## Post-Migration Tasks

### Immediate (Same Day)
1. [ ] Monitor error logs for 24 hours
2. [ ] Check analytics for bounce rate changes
3. [ ] Review user feedback/support tickets

### Short-term (1 Week)
1. [ ] Deprecate `.dashboard-grid` CSS if no other components use it
2. [ ] Update design system documentation
3. [ ] Share migration learnings with team

### Long-term (Next Sprint)
1. [ ] Consider extracting shared dashboard layout component
2. [ ] Add visual regression testing to CI/CD pipeline
3. [ ] Document responsive design patterns

---

## Risk Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Sidebar overflow on small screens | Medium | Medium | Add `max-w-full` to widgets |
| Layout shift during load | Low | Low | Test CLS metric |
| Performance degradation | Low | Medium | Compare render times before/after |
| Accessibility regression | Low | High | Run Lighthouse audit |
| Test failures | Medium | High | Update test selectors proactively |
| Browser compatibility | Low | Medium | Test on all major browsers |

### Contingency Plans

**If sidebar overflows**:
- Add `overflow: hidden` to `.macro-grid-sidebar`
- Reduce widget padding/margins
- Consider collapsible widgets

**If tests fail**:
- Update test selectors from `.dashboard-grid` to `.macro-grid`
- Check for timing issues in async tests
- Verify mock data still valid

**If performance degrades**:
- Profile with Chrome DevTools
- Check for unnecessary re-renders
- Verify `memo()` still effective

---

## Timeline

### Estimated Schedule (4 hours total)

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Preparation | 15 min | 0:00 | 0:15 |
| Class Migration | 30 min | 0:15 | 0:45 |
| Style Adjustments | 45 min | 0:45 | 1:30 |
| Responsive Testing | 60 min | 1:30 | 2:30 |
| Alignment Verification | 30 min | 2:30 | 3:00 |
| Testing & Validation | 45 min | 3:00 | 3:45 |
| Documentation | 15 min | 3:45 | 4:00 |

**Buffer**: +30 minutes for unexpected issues  
**Total**: 4.5 hours max

---

## Additional Resources

### Reference Files
- `frontend/src/components/dashboards/AdminDashboard/AdminDashboardShell.tsx` (modern `.macro-grid` example)
- `frontend/src/components/dashboards/LecturerDashboard/LecturerDashboardShell.tsx` (sidebar example)
- `frontend/src/styles/unified-grid.css` (CSS Grid system documentation)
- `frontend/src/styles/design-tokens.css` (design token reference)

### Useful Commands
```bash
# Run specific test file
npm run test -- TutorDashboard.test.tsx

# Run tests in watch mode
npm run test:watch -- TutorDashboard

# Type checking
npm run typecheck

# Linting
npm run lint

# Build production bundle
npm run build

# Start dev server
npm run dev
```

### Browser DevTools Tips
- **Grid Inspector**: Firefox has excellent CSS Grid visualization
- **Computed Styles**: Check actual CSS values applied
- **Layout Panel**: View box model, padding, margins
- **Performance Tab**: Measure render times and layout shifts

---

## Approval Checklist

### Before Starting Migration
- [ ] Product Owner approval
- [ ] Tech Lead review of plan
- [ ] QA team notified
- [ ] Backup created
- [ ] Feature branch created

### Before Merging to Main
- [ ] Code review approved
- [ ] All tests passing
- [ ] Visual QA complete
- [ ] Accessibility audit passed
- [ ] Performance validated
- [ ] Documentation updated

### After Deployment
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Validate analytics
- [ ] Update team knowledge base

---

## Contact & Support

**Questions?** Contact:
- **Frontend Lead**: [Name]
- **Design System Owner**: [Name]
- **QA Lead**: [Name]

**Resources**:
- Design System Docs: `/docs/design-system.md`
- Component Library: `/docs/components.md`
- Testing Guide: `/docs/testing.md`

---

## Appendix

### A. CSS Grid Comparison

#### `.dashboard-grid` (Legacy)
```css
.dashboard-grid {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--grid-gap-primary);
}

.dashboard-grid__content {
  display: grid;
  gap: var(--grid-gap-primary);
}

@media (min-width: 1024px) {
  .dashboard-grid__content {
    grid-template-columns: minmax(0, 1fr) minmax(var(--aside-w), 1fr);
  }
}
```

#### `.macro-grid` (Modern)
```css
.macro-grid {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: var(--grid-gap-primary);
}

.macro-grid-content {
  position: relative;
  z-index: var(--z-content);
  display: grid;
  gap: var(--grid-gap-primary);
  margin-left: var(--hero-content-alignment);
  margin-right: var(--hero-content-alignment);
}

.macro-grid-content.has-sidebar {
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
}

@media (min-width: 1024px) {
  .macro-grid-content.has-sidebar {
    grid-template-columns: 1fr 360px;
    gap: 2rem;
  }
}
```

### B. Design Token Reference

```css
:root {
  --grid-container-max-width: 1400px;
  --grid-container-padding: clamp(1rem, 4vw, 2.5rem);
  --grid-hero-padding: clamp(1.75rem, 3vw, 2.75rem);
  --grid-content-padding: clamp(1.25rem, 2.5vw, 2rem);
  --hero-content-alignment: calc(var(--grid-hero-padding) - var(--grid-content-padding));
  --grid-gap-primary: clamp(1.75rem, 3vw, 2.75rem);
  --grid-gap-secondary: clamp(1.25rem, 2vw, 2rem);
  
  --z-background: -1;
  --z-base: 0;
  --z-content: 1;
  --z-elevated: 2;
  --z-modal: 1000;
}
```

### C. Troubleshooting Guide

**Problem**: Sidebar overflows on tablet  
**Solution**: Verify `max-w-full` on all widget components

**Problem**: Content doesn't align with hero  
**Solution**: Check `--hero-content-alignment` calculation in DevTools

**Problem**: Tests fail with "cannot find element"  
**Solution**: Update test selectors from `.dashboard-grid` to `.macro-grid`

**Problem**: Z-index issues with modal  
**Solution**: Verify `elevation-modal` class applied correctly

**Problem**: Responsive breakpoints not working  
**Solution**: Check Tailwind config and CSS media queries

---

**End of Migration Plan**

**Version**: 1.0  
**Last Updated**: 2025-10-19  
**Status**: Ready for Implementation
