import { expect, Locator, Page } from '@playwright/test';

export type NotificationBannerVariant = 'warning' | 'error' | 'info';

export interface NotificationBannerExpectations {
  variant: NotificationBannerVariant;
  title: string;
  message: string;
  icon?: string;
  showAction?: boolean;
  actionText?: string | RegExp;
  actionEnabled?: boolean;
  showDismiss?: boolean;
}

/**
 * Page object for the NotificationBanner component that replaced the sidebar
 * notifications panel. Encapsulates selectors and interactions that are shared
 * across Tutor dashboard tests.
 */
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
    this.title = this.banner.locator('.notification-banner__title');
    this.message = this.banner.locator('.notification-banner__description');
    this.icon = this.banner.locator('.notification-banner__icon');
    this.actionButton = page.getByTestId('notification-banner-action');
    this.dismissButton = page.getByTestId('notification-banner-dismiss');
  }

  // ---------------------------------------------------------------------------
  // Visibility helpers
  // ---------------------------------------------------------------------------

  async waitForVisible(timeout = 5000): Promise<void> {
    await this.banner.waitFor({ state: 'visible', timeout });
  }

  async waitForHidden(timeout = 5000): Promise<void> {
    await this.banner.waitFor({ state: 'hidden', timeout });
  }

  async expectVisible(): Promise<void> {
    await expect(this.banner).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.banner).toBeHidden();
  }

  async isVisible(): Promise<boolean> {
    try {
      await this.banner.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Content helpers
  // ---------------------------------------------------------------------------

  async expectTitle(text: string | RegExp): Promise<void> {
    await expect(this.title).toContainText(text);
  }

  async expectMessage(text: string | RegExp): Promise<void> {
    await expect(this.message).toContainText(text);
  }

  async expectIcon(icon: string | RegExp): Promise<void> {
    await expect(this.icon).toContainText(icon);
  }

  async getTitleText(): Promise<string> {
    return (await this.title.textContent())?.trim() ?? '';
  }

  async getMessageText(): Promise<string> {
    return (await this.message.textContent())?.trim() ?? '';
  }

  async getIconText(): Promise<string> {
    return (await this.icon.textContent())?.trim() ?? '';
  }

  // ---------------------------------------------------------------------------
  // Action helpers
  // ---------------------------------------------------------------------------

  async expectActionVisible(): Promise<void> {
    await expect(this.actionButton).toBeVisible();
  }

  async expectActionHidden(): Promise<void> {
    await expect(this.actionButton).toBeHidden();
  }

  async expectActionText(text: string | RegExp): Promise<void> {
    await expect(this.actionButton).toHaveText(text);
  }

  async expectActionEnabled(): Promise<void> {
    await expect(this.actionButton).toBeEnabled();
  }

  async expectActionDisabled(): Promise<void> {
    await expect(this.actionButton).toBeDisabled();
  }

  async clickAction(): Promise<void> {
    await this.expectActionVisible();
    await this.actionButton.click();
  }

  async expectDismissVisible(): Promise<void> {
    await expect(this.dismissButton).toBeVisible();
  }

  async clickDismiss(): Promise<void> {
    await this.expectDismissVisible();
    await this.dismissButton.click();
  }

  // ---------------------------------------------------------------------------
  // Variant helpers
  // ---------------------------------------------------------------------------

  private async expectVariantClass(variant: NotificationBannerVariant): Promise<void> {
    await expect(this.banner).toHaveClass(new RegExp(`notification-banner--${variant}`));
  }

  async expectWarningVariant(): Promise<void> {
    await this.expectVariantClass('warning');
  }

  async expectErrorVariant(): Promise<void> {
    await this.expectVariantClass('error');
  }

  async expectInfoVariant(): Promise<void> {
    await this.expectVariantClass('info');
  }

  // ---------------------------------------------------------------------------
  // Draft submission helpers
  // ---------------------------------------------------------------------------

  /**
   * Assert that the banner is prompting the user to submit outstanding drafts.
   */
  async expectSubmitDraftsAction(count: number): Promise<void> {
    await this.expectVisible();
    await this.expectWarningVariant();
    await this.expectTitle('Draft timesheets pending');

    const needsSuffix = count === 1 ? 'needs' : 'need';
    const timesheetSuffix = count === 1 ? '' : 's';
    await this.expectMessage(
      `${count} draft timesheet${timesheetSuffix} ${needsSuffix} submission`,
    );

    await this.expectActionVisible();
    await this.expectActionText(/Submit drafts/i);
    await this.expectActionEnabled();
  }

  /**
   * Click the Submit Drafts call-to-action from the banner.
   */
  async submitAllDraftsViaBanner(): Promise<void> {
    await this.expectActionVisible();
    await this.expectActionText(/Submit drafts/i);
    await this.expectActionEnabled();
    await this.clickAction();
  }

  /**
   * Convenience assertion for draft notification scenarios.
   */
  async expectDraftNotification(count: number): Promise<void> {
    await this.expectSubmitDraftsAction(count);
  }

  // ---------------------------------------------------------------------------
  // Rejection helpers
  // ---------------------------------------------------------------------------

  async expectRejectionNotification(count: number): Promise<void> {
    await this.expectVisible();
    await this.expectErrorVariant();
    await this.expectTitle('Action required');

    const timesheetSuffix = count === 1 ? '' : 's';
    await this.expectMessage(
      `${count} timesheet${timesheetSuffix} require revision before approval`,
    );

    await this.expectActionHidden();
  }

  // ---------------------------------------------------------------------------
  // State inspection helpers
  // ---------------------------------------------------------------------------

  async waitForStateChange(timeout = 3000): Promise<void> {
    const initial = await this.getTitleText();
    await this.page
      .waitForFunction(
        ({ selector, title }) => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() !== title;
        },
        { selector: '.notification-banner__title', title: initial },
        { timeout },
      )
      .catch(() => undefined);
  }

  async getDebugInfo(): Promise<Record<string, unknown>> {
    const visible = await this.isVisible();
    if (!visible) return { visible: false };

    const [title, message, icon, actionVisible, actionEnabled, dismissVisible, bannerClass] =
      await Promise.all([
        this.getTitleText(),
        this.getMessageText(),
        this.getIconText(),
        this.actionButton.isVisible(),
        this.actionButton.isEnabled(),
        this.dismissButton.isVisible(),
        this.banner.getAttribute('class'),
      ]);

    return {
      visible: true,
      title,
      message,
      icon,
      actionVisible,
      actionEnabled,
      dismissVisible,
      className: bannerClass,
    };
  }

  async expectState(expectations: NotificationBannerExpectations): Promise<void> {
    await this.expectVisible();

    switch (expectations.variant) {
      case 'warning':
        await this.expectWarningVariant();
        break;
      case 'error':
        await this.expectErrorVariant();
        break;
      case 'info':
        await this.expectInfoVariant();
        break;
    }

    await this.expectTitle(expectations.title);
    await this.expectMessage(expectations.message);

    if (expectations.icon) {
      await this.expectIcon(expectations.icon);
    }

    if (expectations.showAction) {
      await this.expectActionVisible();
      if (expectations.actionText) {
        await this.expectActionText(expectations.actionText);
      }
      if (expectations.actionEnabled === true) {
        await this.expectActionEnabled();
      }
      if (expectations.actionEnabled === false) {
        await this.expectActionDisabled();
      }
    } else if (expectations.showAction === false) {
      await this.expectActionHidden();
    }

    if (expectations.showDismiss) {
      await this.expectDismissVisible();
    }
  }
}
