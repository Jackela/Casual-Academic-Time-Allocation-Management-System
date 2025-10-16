# Playwright Test Remediation Plan
## Sprint 1 Notification System Refactor

### 🎯 **Executive Summary**
Following the Sprint 1 notification system refactor, 31 e2e tests are failing due to UI structural changes. This plan provides a systematic approach to update all Playwright tests to work with the new `NotificationBanner` component and consolidated Submit All Drafts functionality.

### 📊 **Impact Analysis**
- **31 test failures** across mock, real, and visual test suites
- **Primary cause**: UI element selectors and interaction patterns changed
- **Critical areas**: Tutor Dashboard, notification interactions, Submit All Drafts workflows
- **Visual regression**: 18 screenshot mismatches requiring baseline updates

---

## 🔧 **Phase 1: Core Infrastructure Updates**

### **1.1 Update Table Configuration Selectors**
**File**: `frontend/src/lib/config/table-config.ts`

```typescript
// CURRENT (broken)
export const TABLE_LAYOUT_SELECTORS = {
  pageBanner: '[data-testid="page-banner"]',
  // ...
};

// UPDATED (fixed)
export const TABLE_LAYOUT_SELECTORS = {
  pageBanner: '[data-testid="notification-banner"]',
  pageBannerAction: '[data-testid="notification-banner-action"]',
  pageBannerDismiss: '[data-testid="notification-banner-dismiss"]',
  // Legacy support for transition period
  legacyPageBanner: '[data-testid="page-banner"]',
  // ...
};
```

### **1.2 Create NotificationBanner Page Object**
**File**: `frontend/e2e/shared/pages/NotificationBannerPage.ts`

```typescript
import { Page, expect, Locator } from '@playwright/test';

export class NotificationBannerPage {
  readonly page: Page;
  readonly banner: Locator;
  readonly title: Locator;
  readonly message: Locator;
  readonly icon: Locator;
  readonly actionButton: Locator;
  readonly dismissButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.banner = page.getByTestId('notification-banner');
    this.title = page.locator('.notification-banner__title');
    this.message = page.locator('.notification-banner__description');
    this.icon = page.locator('.notification-banner__icon');
    this.actionButton = page.getByTestId('notification-banner-action');
    this.dismissButton = page.getByTestId('notification-banner-dismiss');
  }

  // Core interaction methods
  async waitForVisible(timeout = 5000) {
    await this.banner.waitFor({ state: 'visible', timeout });
  }

  async expectVisible() {
    await expect(this.banner).toBeVisible();
  }

  async expectHidden() {
    await expect(this.banner).toBeHidden();
  }

  async expectTitle(text: string) {
    await expect(this.title).toContainText(text);
  }

  async expectMessage(text: string) {
    await expect(this.message).toContainText(text);
  }

  async expectIcon(icon: string) {
    await expect(this.icon).toContainText(icon);
  }

  // Action methods
  async clickAction() {
    await expect(this.actionButton).toBeVisible();
    await this.actionButton.click();
  }

  async expectActionText(text: string) {
    await expect(this.actionButton).toContainText(text);
  }

  async expectActionEnabled() {
    await expect(this.actionButton).toBeEnabled();
  }

  async expectActionDisabled() {
    await expect(this.actionButton).toBeDisabled();
  }

  async clickDismiss() {
    await expect(this.dismissButton).toBeVisible();
    await this.dismissButton.click();
  }

  // Variant-specific expectations
  async expectWarningVariant() {
    await expect(this.banner).toHaveClass(/notification-banner--warning/);
    await this.expectIcon('⚠️');
  }

  async expectErrorVariant() {
    await expect(this.banner).toHaveClass(/notification-banner--error/);
    await this.expectIcon('⛔');
  }

  async expectInfoVariant() {
    await expect(this.banner).toHaveClass(/notification-banner--info/);
  }

  // Submit All Drafts specific methods
  async expectSubmitDraftsAction(draftCount: number) {
    await this.expectVisible();
    await this.expectWarningVariant();
    await this.expectTitle('Draft timesheets pending');
    await this.expectMessage(`${draftCount} draft timesheet${draftCount === 1 ? ' needs' : 's need'} submission`);
    await this.expectActionText('Submit drafts');
    await this.expectActionEnabled();
  }

  async submitAllDrafts() {
    await this.expectSubmitDraftsAction(1); // At least 1 draft
    await this.clickAction();
  }

  // Rejection notification methods
  async expectRejectionNotification(rejectedCount: number) {
    await this.expectVisible();
    await this.expectErrorVariant();
    await this.expectTitle('Action required');
    await this.expectMessage(`${rejectedCount} timesheet${rejectedCount === 1 ? '' : 's'} require revision`);
  }
}
```

---

## 🔧 **Phase 2: TutorDashboardPage Updates**

### **2.1 Enhanced TutorDashboardPage Class**
**File**: `frontend/e2e/shared/pages/TutorDashboardPage.ts`

```typescript
import { NotificationBannerPage } from './NotificationBannerPage';

export class TutorDashboardPage {
  // ... existing properties ...
  readonly notificationBanner: NotificationBannerPage;

  constructor(page: Page) {
    // ... existing initialization ...
    this.notificationBanner = new NotificationBannerPage(page);
  }

  // UPDATED: Remove old Submit All Drafts methods
  // REMOVE: async clickSubmitAllDrafts() - now in NotificationBanner
  // REMOVE: async expectSubmitAllDraftsButton() - now in NotificationBanner

  // NEW: Enhanced banner interaction methods
  async waitForNotificationBanner(variant?: 'warning' | 'error' | 'info') {
    await this.notificationBanner.waitForVisible();
    if (variant === 'warning') await this.notificationBanner.expectWarningVariant();
    if (variant === 'error') await this.notificationBanner.expectErrorVariant();
    if (variant === 'info') await this.notificationBanner.expectInfoVariant();
  }

  async expectDraftNotification(draftCount: number) {
    await this.notificationBanner.expectSubmitDraftsAction(draftCount);
  }

  async expectRejectionNotification(rejectedCount: number) {
    await this.notificationBanner.expectRejectionNotification(rejectedCount);
  }

  async submitAllDraftsViaBanner() {
    await this.notificationBanner.submitAllDrafts();
    // Wait for submission to complete
    await this.page.waitForResponse('**/api/approvals');
    await this.waitForMyTimesheetData();
  }

  // UPDATED: Dashboard ready detection
  async waitForDashboardReady(options: { timeout?: number } = {}) {
    const timeout = options.timeout ?? 15000;
    
    // Wait for core dashboard elements
    await Promise.race([
      this.loadingState.waitFor({ state: 'hidden', timeout }),
      this.timesheetsTable.waitFor({ state: 'visible', timeout }),
      this.emptyState.waitFor({ state: 'visible', timeout })
    ]);

    // Check for notification banner (may or may not be present)
    try {
      await this.notificationBanner.banner.waitFor({ state: 'visible', timeout: 2000 });
    } catch {
      // Banner not present - this is fine
    }

    await this.page.waitForLoadState('networkidle', { timeout });
  }

  // LEGACY SUPPORT: Temporary backwards compatibility
  async expectPageBanner() {
    console.warn('expectPageBanner() is deprecated. Use notificationBanner.expectVisible()');
    await this.notificationBanner.expectVisible();
  }
}
```

---

## 🔧 **Phase 3: Test File Updates**

### **3.1 Tutor Workflow Test Updates**
**File**: `frontend/e2e/real/modules/tutor-workflow.spec.ts`

```typescript
// BEFORE (failing)
test('allows submitting a draft timesheet for approval', async () => {
  // ... setup ...
  await tutorDashboard.clickSubmitAllDrafts(); // BROKEN
});

// AFTER (fixed)
test('allows submitting a draft timesheet for approval', async () => {
  await gotoTutorDashboard(page);
  await tutorDashboard.waitForMyTimesheetData();
  
  // Navigate to drafts tab
  await page.getByRole('button', { name: /Drafts/ }).click();
  
  // Check that draft notification banner appears
  await tutorDashboard.expectDraftNotification(1);
  
  // Submit via banner action
  await tutorDashboard.submitAllDraftsViaBanner();
  
  // Verify submission completed
  await tutorDashboard.expectTimesheetData(1, {
    status: 'PENDING_LECTURER_APPROVAL'
  });
});
```

### **3.2 P1 Tutor Confirmation Updates**
**File**: `frontend/e2e/mock/workflows/p1-tutor-confirmation.spec.ts`

```typescript
test('Tutor confirms a pending timesheet (UI only)', async ({ page }) => {
  // ... existing setup ...
  
  await tutorDashboardPage.waitForDashboardReady();
  
  // NEW: Check for notification banner if pending drafts exist
  try {
    await tutorDashboardPage.notificationBanner.expectVisible();
  } catch {
    // No notification banner - proceed with individual confirmation
  }
  
  // ... rest of test unchanged ...
});
```

### **3.3 Visual Regression Test Updates**
**File**: `frontend/e2e/visual/tutor.spec.ts`

```typescript
// BEFORE (failing due to UI changes)
test('drafts tab with bulk submission preview', async ({ page }) => {
  await prepareTutorDashboard(page);
  await page.getByRole('button', { name: /^Drafts/ }).click();
  await page.getByRole('checkbox', { name: /Select all drafts/i }).check();
  await page.getByRole('button', { name: /Submit Selected/ }).hover(); // BROKEN
  await capture(page, 'tutor-dashboard-drafts-selection.png');
});

// AFTER (fixed for new UI)
test('drafts tab with notification banner submission', async ({ page }) => {
  await prepareTutorDashboard(page);
  
  // Wait for notification banner to appear
  const tutorDashboard = new TutorDashboardPage(page);
  await tutorDashboard.waitForNotificationBanner('warning');
  
  // Navigate to drafts tab
  await page.getByRole('button', { name: /^Drafts/ }).click();
  
  // Hover over the banner submit action
  await tutorDashboard.notificationBanner.actionButton.hover();
  await page.waitForTimeout(200);
  
  await capture(page, 'tutor-dashboard-drafts-banner.png');
});
```

---

## 🔧 **Phase 4: Layout Compliance Updates**

### **4.1 Banner Overlap Test Updates**
**File**: `frontend/e2e/visual/layout-compliance.spec.ts`

```typescript
// BEFORE (broken selector)
test('Banner does not overlap with table', async ({ page }) => {
  const banner = page.locator(TABLE_LAYOUT_SELECTORS.pageBanner).first(); // BROKEN
  await expect(banner).toBeVisible();
  // ...
});

// AFTER (fixed)
test('NotificationBanner does not overlap with table', async ({ page }) => {
  const banner = page.getByTestId('notification-banner').first();
  await expect(banner).toBeVisible();
  
  const table = page.locator(TABLE_LAYOUT_SELECTORS.tableContainer).first();
  await expect(table).toBeVisible();

  const [bannerBox, tableBox] = await Promise.all([
    banner.boundingBox(),
    table.boundingBox(),
  ]);

  expect(bannerBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  
  if (bannerBox && tableBox) {
    const bannerBottom = bannerBox.y + bannerBox.height;
    const tableTop = tableBox.y;
    
    // Ensure banner appears above table with proper spacing
    expect(bannerBottom).toBeLessThan(tableTop);
    
    // Verify minimum gap between banner and table
    const gap = tableTop - bannerBottom;
    expect(gap).toBeGreaterThan(8); // Minimum 8px gap
  }
});
```

---

## 🔧 **Phase 5: Mock Backend Updates**

### **5.1 Enhanced Mock Data for Notifications**
**File**: `frontend/e2e/shared/mock-backend/timesheet-mock.ts`

```typescript
// Enhanced mock data to trigger notification banners
export const createMockTimesheetWithDrafts = (draftCount: number = 2) => {
  const mockTimesheets = [];
  
  // Add draft timesheets to trigger notification banner
  for (let i = 0; i < draftCount; i++) {
    mockTimesheets.push({
      id: 100 + i,
      status: 'DRAFT',
      tutorId: 201,
      courseId: 42,
      // ... other properties
    });
  }
  
  return mockTimesheets;
};

export const createMockTimesheetWithRejections = (rejectedCount: number = 1) => {
  const mockTimesheets = [];
  
  // Add rejected timesheets to trigger error notification banner
  for (let i = 0; i < rejectedCount; i++) {
    mockTimesheets.push({
      id: 200 + i,
      status: 'MODIFICATION_REQUESTED',
      tutorId: 201,
      courseId: 42,
      // ... other properties
    });
  }
  
  return mockTimesheets;
};
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Infrastructure (Priority 1)**
- [ ] Update `table-config.ts` selectors
- [ ] Create `NotificationBannerPage.ts` page object
- [ ] Add banner CSS class utilities
- [ ] Update TypeScript types for new selectors

### **Phase 2: Page Objects (Priority 1)**  
- [ ] Update `TutorDashboardPage.ts` with NotificationBanner integration
- [ ] Remove deprecated Submit All Drafts methods
- [ ] Add banner-specific interaction methods
- [ ] Update `waitForDashboardReady()` logic

### **Phase 3: Test Updates (Priority 2)**
- [ ] Fix 4 tutor-workflow tests
- [ ] Update p1-tutor-confirmation test
- [ ] Fix lecturer-usability test
- [ ] Update double-submission guard test
- [ ] Fix frontend-only test

### **Phase 4: Visual Regression (Priority 2)**
- [ ] Update 8 tutor dashboard visual tests
- [ ] Update 5 lecturer dashboard visual tests  
- [ ] Update 3 admin dashboard visual tests
- [ ] Fix 2 layout compliance tests
- [ ] Regenerate all screenshot baselines

### **Phase 5: Mock Backend (Priority 3)**
- [ ] Enhance mock data for notification scenarios
- [ ] Add draft/rejection count variations
- [ ] Update API response mocking

---

## 🎯 **Execution Strategy**

### **Week 1: Core Infrastructure**
1. **Day 1-2**: Update selectors and create NotificationBannerPage
2. **Day 3**: Update TutorDashboardPage with new methods
3. **Day 4-5**: Fix critical tutor-workflow tests

### **Week 2: Test Coverage**
1. **Day 1-2**: Fix remaining workflow tests 
2. **Day 3-4**: Update visual regression tests
3. **Day 5**: Regenerate screenshot baselines

### **Week 3: Validation & Cleanup**
1. **Day 1-2**: Run full test suite validation
2. **Day 3**: Fix any remaining edge cases
3. **Day 4-5**: Documentation and cleanup

---

## 🚀 **Success Metrics**

- **0 test failures** related to notification system changes
- **100% pass rate** on tutor dashboard workflows  
- **All visual regression tests** passing with updated baselines
- **Improved test coverage** for notification banner interactions
- **Backwards compatibility** during transition period

---

## 🔍 **Risk Mitigation**

### **Rollback Strategy**
- Keep legacy selectors active during transition
- Implement feature flags for gradual rollout
- Maintain screenshot baselines for both old/new UI

### **Testing Strategy**  
- Run tests in both legacy and new modes
- Cross-browser validation on updated tests
- Performance impact assessment on new page objects

---

This comprehensive plan addresses all 31 test failures while establishing a robust foundation for future notification system enhancements.