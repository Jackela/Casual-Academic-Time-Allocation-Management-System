import { test, expect } from '@playwright/test'

// Example: '@p0 @timesheet USX: Short description'
// - Include priority tag (@p0/@p1) and domain tag when useful
// - Keep specs thin: actions in POMs, assertions via helpers

test.describe.skip('@p1 @domain USX: Replace with user story', () => {
  test('happy path', async ({ page }) => {
    // Example selectors policy: prefer getByTestId
    await page.goto('/')
    await expect(page.getByTestId('app-root')).toBeVisible()
  })
})

