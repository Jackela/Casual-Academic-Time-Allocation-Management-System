import { test, expect } from '@playwright/test'

// Minimal red smoke to ensure backend health and a protected navigation flow

test('health endpoint should be reachable (red if backend not started)', async ({ request }) => {
  const res = await request.get('/actuator/health')
  expect(res.ok()).toBeTruthy()
})

test('protected route should redirect when not authenticated (red until app guards enforced)', async ({ page }) => {
  await page.goto('/')
  // This expectation may fail depending on current app routing/guards
  await expect(page).toHaveURL(/login|signin/i)
})