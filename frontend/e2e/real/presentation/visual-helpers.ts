/**
 * Visual Enhancement Helpers for Presentation Demos
 * 
 * Provides visual feedback for demo presentations:
 * - Custom mouse cursor with click ripple effect
 * - Input field focus highlighting
 * - Element highlighting before interaction
 * - Narration console output
 */

import { Page, Locator } from '@playwright/test';
import { roleCredentials, type UserRole } from '../../api/auth-helper';
import { PRESENTATION_CONFIG } from './presentation.config';

/**
 * Inject visual enhancements into the page for presentation mode
 * - Red circular mouse cursor that follows movements
 * - Click ripple animation on mouse clicks
 * - Red outline highlight on input/button focus
 */
export async function addVisualEnhancements(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      // Create custom cursor element
      const cursor = document.createElement('div');
      cursor.id = 'demo-cursor';
      cursor.className = 'demo-cursor';
      Object.assign(cursor.style, {
        position: 'fixed',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '3px solid #ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        pointerEvents: 'none',
        zIndex: '999999',
        transform: 'translate(-50%, -50%)',
        transition: 'transform 0.15s ease-out, opacity 0.2s ease-out',
        opacity: '0',
      });
      document.body.appendChild(cursor);

      // Track mouse movement
      document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        cursor.style.opacity = '1';
      });

      // Click ripple animation
      document.addEventListener('click', (e) => {
        const ripple = document.createElement('div');
        ripple.className = 'demo-click-ripple';
        Object.assign(ripple.style, {
          position: 'fixed',
          left: e.clientX + 'px',
          top: e.clientY + 'px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: '3px solid #ef4444',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: '999998',
        });
        document.body.appendChild(ripple);

        ripple.animate(
          [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(3)', opacity: 0 },
          ],
          { duration: 400, easing: 'ease-out' }
        ).onfinish = () => ripple.remove();
      });

      // Input/button focus highlighting
      const style = document.createElement('style');
      style.textContent = `
        html, body {
          cursor: none !important;
        }
        input:focus, 
        textarea:focus, 
        button:focus,
        select:focus,
        [role="button"]:focus,
        [role="textbox"]:focus {
          outline: 3px solid #ef4444 !important;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2) !important;
          transition: box-shadow 0.2s ease-out !important;
        }
        .demo-highlight-border {
          outline: 3px solid #ef4444 !important;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.35) !important;
          border-radius: 6px !important;
          transition: box-shadow 0.2s ease-out, outline 0.2s ease-out !important;
          position: relative !important;
          z-index: 2147483000 !important;
        }
        .demo-tooltip {
          position: absolute !important;
          max-width: 320px !important;
          background: #333 !important;
          color: #fff !important;
          padding: 8px 12px !important;
          border-radius: 4px !important;
          box-shadow: 0 8px 16px rgba(0,0,0,0.35) !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          z-index: 2147483000 !important;
          pointer-events: none !important;
          opacity: 0.96 !important;
          white-space: normal !important;
          word-break: break-word !important;
          text-align: left !important;
        }
        .demo-cursor,
        #demo-cursor,
        .demo-click-ripple,
        .demo-tooltip {
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    });
  });
}

/**
 * Show a custom tooltip and border around the target element
 */
export async function showCustomHighlight(locator: Locator, message?: string): Promise<void> {
  const page = locator.page();
  // Pre-clean any old tooltip/borders to avoid leftovers
  await clearCustomHighlight(page);
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return;

  await locator.evaluate((el) => {
    el.classList.add('demo-highlight-border');
  }).catch(() => undefined);

  await page.evaluate(
    ({ box, message }) => {
      const id = 'demo-tooltip';
      let tooltip = document.getElementById(id);
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = id;
        tooltip.className = 'demo-tooltip';
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = message ?? '';

      // Positioning logic: prefer above; if not enough space, place below
      const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const padding = 8;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1080;

      // Need to measure after content applied
      tooltip.style.visibility = 'hidden';
      tooltip.style.left = '0px';
      tooltip.style.top = '0px';
      tooltip.style.maxWidth = '320px';
      tooltip.style.position = 'absolute';
      tooltip.style.display = 'block';
      tooltip.style.whiteSpace = 'normal';
      tooltip.style.wordBreak = 'break-word';
      tooltip.style.textAlign = 'left';

      document.body.appendChild(tooltip);
      const { offsetWidth, offsetHeight } = tooltip;

      const elementBottom = box.y + box.height + scrollY;
      const aboveTop = box.y + scrollY - offsetHeight - padding;
      const belowTop = box.y + scrollY + box.height + padding;
      const wouldOverflowBottom = elementBottom + offsetHeight + padding > scrollY + viewportHeight;
      let top = wouldOverflowBottom
        ? Math.max(scrollY + 8, aboveTop)
        : belowTop;
      const maxTop = scrollY + viewportHeight - offsetHeight - 8;
      top = Math.min(top, maxTop);
      top = Math.max(scrollY + 8, top);

      let left = box.x + scrollX + box.width / 2 - offsetWidth / 2;
      const minLeft = scrollX + 8;
      const maxLeft = scrollX + (document.documentElement.clientWidth || window.innerWidth || 1280) - offsetWidth - 8;
      left = Math.max(minLeft, Math.min(maxLeft, left));

      Object.assign(tooltip.style, {
        visibility: 'visible',
        left: `${left}px`,
        top: `${top}px`,
      });
    },
    { box, message },
  );
}

/**
 * Clear custom tooltip and border
 */
export async function clearCustomHighlight(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('.demo-highlight-border').forEach((el) => el.classList.remove('demo-highlight-border'));
    const tooltip = document.getElementById('demo-tooltip');
    if (tooltip) tooltip.remove();
  }).catch(() => undefined);
}

/**
 * Highlight an element, wait for visibility, then click it
 * Perfect for drawing attention to buttons/links before interaction
 */
export async function highlightAndClick(
  locator: Locator,
  description?: string,
  options: { pauseBefore?: number; pauseAfter?: number } = {}
): Promise<void> {
  const { pauseBefore = PRESENTATION_CONFIG.timing.pauseBeforeClick, pauseAfter = PRESENTATION_CONFIG.timing.pauseAfterClick } = options;

  if (description) {
    console.log(`🎯 ${description}`);
  }

  await showCustomHighlight(locator, description);
  await locator.page().waitForTimeout(pauseBefore);
  await locator.click();
  await locator.page().waitForTimeout(pauseAfter);
  await clearCustomHighlight(locator.page());
}

/**
 * Highlight an input field, wait for visibility, then fill it
 * Shows exactly where text will be entered before typing
 */
export async function highlightAndFill(
  locator: Locator,
  value: string,
  description?: string,
  options: { pauseBefore?: number; pauseAfter?: number } = {}
): Promise<void> {
  const { pauseBefore = PRESENTATION_CONFIG.timing.pauseBeforeFill, pauseAfter = PRESENTATION_CONFIG.timing.pauseAfterFill } = options;
  const page = locator.page();

  if (description) {
    console.log(`✏️  ${description}: "${value}"`);
  }

  await showCustomHighlight(locator, description);
  await page.waitForTimeout(pauseBefore);

  // Natural typing: click, select all, then type character by character
  await locator.click();
  await page.waitForTimeout(100);
  await page.keyboard.press('Control+A').catch(() => undefined);
  await page.keyboard.press('Backspace').catch(() => undefined);
  await page.keyboard.type(value, { delay: PRESENTATION_CONFIG.timing.typingDelay });
  
  // Dispatch React Hook Form compatible events for form validation
  await locator.evaluate((el: HTMLInputElement | HTMLTextAreaElement, val: string) => {
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }, value);
  await locator.blur();

  await page.waitForTimeout(pauseAfter);
  await clearCustomHighlight(page);
}

/**
 * Highlight a select element, wait, then select an option
 */
export async function highlightAndSelect(
  locator: Locator,
  value: string,
  description?: string,
  options: { pauseBefore?: number; pauseAfter?: number } = {}
): Promise<void> {
  const { pauseBefore = PRESENTATION_CONFIG.timing.pauseBeforeSelect, pauseAfter = PRESENTATION_CONFIG.timing.pauseAfterSelect } = options;
  const page = locator.page();

  const label = description ?? 'Selecting Option...';
  console.log(`🎯 ${label}`);

  await showCustomHighlight(locator, label);
  await page.waitForTimeout(pauseBefore);

  // Explicitly open dropdown so audience sees the options
  await locator.click({ force: true });
  await page.waitForTimeout(PRESENTATION_CONFIG.timing.pauseDropdownOpen);

  const waitForOptions = async () => {
    const start = Date.now();
    const timeout = 12000;
    while (Date.now() - start < timeout) {
      const count = await locator.locator('option').count().catch(() => 0);
      if (count > 0) {
        return;
      }
      await page.waitForTimeout(200);
    }
    throw new Error('Dropdown options did not load in time');
  };
  await waitForOptions();

  // Select option through the native select interaction
  await locator.selectOption(value);

  // Trigger React Hook Form events (critical for form validation)
  await locator.evaluate((el: HTMLSelectElement) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.waitForTimeout(pauseAfter);

  // Close dropdown if it remains open (best-effort tap on body)
  try {
    await page.click('body', { position: { x: 5, y: 5 }, timeout: 500 });
  } catch {
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  await clearCustomHighlight(page);
}

/**
 * Output a narration message with visual separator
 * Helps presenters follow along with demo flow
 */
export function narrateStep(message: string, icon: string = '💬'): void {
  console.log(`\n${icon} ${message}`);
}

/**
 * Add a dramatic pause for emphasis during presentation
 */
export async function dramaticPause(page: Page, duration: number = PRESENTATION_CONFIG.timing.dramaticPause): Promise<void> {
  await page.waitForTimeout(duration);
}

/**
 * Ensure browser is in fullscreen mode (F11 style)
 * Fallback for when Chrome --start-fullscreen doesn't work
 */
export async function ensureFullscreen(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.moveTo(0, 0);
    window.resizeTo(window.screen.availWidth, window.screen.availHeight);
  });
  await page.waitForTimeout(300);
}

/**
 * Cinematic login sequence for presentation demos
 * - Shows a center overlay explaining which role is authenticating
 * - Types credentials slowly
 * - Highlights the dashboard welcome/header momentarily
 */
export async function visualLogin(
  page: Page,
  usernameOrRole: UserRole | string,
  password?: string,
  roleLabel?: string,
  options: { postLoginPause?: number } = {},
): Promise<void> {
  const { postLoginPause = PRESENTATION_CONFIG.timing.postLoginPause } = options;
  const creds = typeof usernameOrRole === 'string' && ['admin','lecturer','tutor'].includes(usernameOrRole)
    ? roleCredentials(usernameOrRole as UserRole)
    : typeof usernameOrRole === 'string' && password
      ? { email: usernameOrRole, password, name: roleLabel ?? usernameOrRole }
      : roleCredentials(usernameOrRole as UserRole);

  const friendlyName = roleLabel ?? creds.name ?? (typeof usernameOrRole === 'string' ? usernameOrRole : String(usernameOrRole).toUpperCase());

  // Navigate to login
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Show on-screen overlay for audience
  await page.evaluate((message) => {
    const existing = document.getElementById('visual-login-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'visual-login-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      transform: 'none',
      padding: '14px 18px',
      background: 'rgba(17,24,39,0.9)',
      color: '#f9fafb',
      borderRadius: '12px',
      fontSize: '20px',
      fontWeight: '700',
      boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      letterSpacing: '0.2px',
      textAlign: 'center',
      maxWidth: '520px',
      lineHeight: '1.5',
    });
    overlay.textContent = message;
    document.body.appendChild(overlay);
  }, `🏷️ Authenticating as ${friendlyName}...`);

  const loginForm = page.getByTestId('login-form');
  await loginForm.waitFor({ state: 'visible', timeout: 10000 });

  const emailInput = loginForm.getByLabel(/email/i);
  await showCustomHighlight(emailInput, `Authenticating as ${friendlyName}...`);
  await emailInput.click();
  await emailInput.fill('');
  await page.keyboard.type(creds.email, { delay: PRESENTATION_CONFIG.timing.typingDelay });

  const passwordInput = loginForm.getByLabel(/password/i);
  await showCustomHighlight(passwordInput, 'Typing secure credentials...');
  await passwordInput.click();
  await passwordInput.fill('');
  await page.keyboard.type(creds.password, { delay: PRESENTATION_CONFIG.timing.typingDelay });

  const loginButton = loginForm.getByRole('button', { name: /sign in|login/i });
  await showCustomHighlight(loginButton, 'Heading to dashboard...');
  await loginButton.click();

  await page.waitForURL(/\/dashboard|\/admin\/users/i, { timeout: 15000 }).catch(() => undefined);
  if (!/\/dashboard/i.test(page.url())) {
    await page.goto('/dashboard', { waitUntil: 'load' });
  }

  const header = page.locator('[data-testid="main-dashboard-title"], [data-testid="dashboard-title"]').first();
  if (await header.isVisible().catch(() => false)) {
    await showCustomHighlight(header, `Welcome, ${friendlyName}`);
    await page.waitForTimeout(2000);
    await clearCustomHighlight(page);
  }

  // Remove overlay
  await page.evaluate(() => {
    const overlay = document.getElementById('visual-login-overlay');
    if (overlay) overlay.remove();
  }).catch(() => undefined);

  await page.waitForTimeout(postLoginPause);
}
