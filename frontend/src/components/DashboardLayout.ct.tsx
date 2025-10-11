import React from 'react';
import { test, expect } from '@playwright/experimental-ct-react';
import DashboardLayout from './DashboardLayout';
import type { User } from '../types/auth';

const TEST_USER: User = {
  id: 501,
  email: 'lecturer@example.com',
  name: 'Alexandra Lecturer',
  role: 'LECTURER',
};

const mountDashboardLayout = async (
  mount: (component: React.ReactElement, options?: { hooksConfig?: unknown }) => Promise<unknown>,
  hooksConfig?: Record<string, unknown>,
) => {
  await mount(
    <DashboardLayout>
      <div data-testid="dashboard-content">Dashboard Content</div>
    </DashboardLayout>,
    {
      hooksConfig: {
        authUser: TEST_USER,
        initialPath: '/dashboard',
        ...(hooksConfig ?? {}),
      },
    },
  );
};

test.describe('DashboardLayout', () => {
  test('inactive navigation link shows hover border highlight', async ({ mount, page }) => {
    await mountDashboardLayout(mount);

    const inactiveLink = page.getByTestId('nav-timesheets');

    await expect(inactiveLink).toBeVisible();
    await inactiveLink.hover();
    await page.waitForTimeout(50);
    const borderColor = await inactiveLink.evaluate((element) => {
      return window.getComputedStyle(element).borderBottomColor;
    });
    expect(borderColor.replace(/\s+/g, '')).toContain('209,213,219');
  });

  test('user identity remains visible at mobile viewport widths', async ({ mount, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mountDashboardLayout(mount, { initialPath: '/dashboard' });

    await expect(page.getByTestId('user-name')).toBeVisible();
    await expect(page.getByTestId('user-role-badge')).toBeVisible();
  });
});
