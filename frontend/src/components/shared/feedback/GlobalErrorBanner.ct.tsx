import { test, expect } from '@playwright/experimental-ct-react';
import GlobalErrorBanner from './GlobalErrorBanner';

test.describe('GlobalErrorBanner visual regression', () => {
  test('renders error and warning variants', async ({ page, mount }) => {
    await mount(
      <div className="flex flex-col gap-4 p-6 bg-background">
        <GlobalErrorBanner
          title="Critical Failure"
          message="We couldn't process your request. Please retry in a moment."
          actionLabel="Retry"
          onAction={() => undefined}
          onDismiss={() => undefined}
          severity="error"
          data-testid="global-error-banner-error"
        />
        <GlobalErrorBanner
          title="Heads up"
          message="One or more services are taking longer than expected."
          actionLabel="Refresh"
          onAction={() => undefined}
          onDismiss={() => undefined}
          severity="warning"
          data-testid="global-error-banner-warning"
        />
      </div>,
    );

    await expect(page).toHaveScreenshot('global-error-banner-error.png', {
      mask: [await page.locator('[data-testid="global-error-banner-warning"]')],
    });
    await expect(page).toHaveScreenshot('global-error-banner-warning.png', {
      mask: [await page.locator('[data-testid="global-error-banner-error"]')],
    });
  });
});

