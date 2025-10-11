import { test, expect } from '@playwright/experimental-ct-react';
import PageLoadingIndicator from './PageLoadingIndicator';

test('PageLoadingIndicator default rendering', async ({ page, mount }) => {
  await mount(
    <div className="flex min-h-[240px] items-center justify-center bg-muted/40 p-6">
      <PageLoadingIndicator
        message="Fetching dashboard data…"
        subMessage="This should only take a moment."
        data-testid="page-loading-indicator"
      />
    </div>,
  );

  await expect(page).toHaveScreenshot('page-loading-indicator.png');
});

