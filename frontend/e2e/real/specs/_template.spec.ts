import { test, expect } from '@playwright/test'

// Example: '@p0 @timesheet USX: Short description'
// - Include priority tag (@p0/@p1) and domain tag when useful
// - Keep specs thin: actions in POMs, assertions via helpers

test.describe('@p1 @domain USX: Template Smoke', () => {
  // Keep this spec deterministic under the real project shared-auth setup.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('login route renders expected shell for unauthenticated user', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('login-form')).toBeVisible()
  })

  test('protected dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId('login-form')).toBeVisible()
  })
})

