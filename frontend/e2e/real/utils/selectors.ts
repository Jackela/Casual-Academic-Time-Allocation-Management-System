/**
 * Selector helpers centralized for stable data-testid usage.
 */
import { Page, Locator } from '@playwright/test';

export const byTestId = (page: Page, id: string): Locator => page.getByTestId(id);

export const within = (root: Locator, testId: string): Locator => root.getByTestId(testId);

export const withRole = (page: Page, role: Parameters<Page['getByRole']>[0], name?: string) =>
  page.getByRole(role, name ? { name } : undefined);

export const hasText = (page: Page, text: string): Locator => page.locator(`text=${text}`);

export default { byTestId, within, withRole, hasText };

