/* eslint-disable no-restricted-syntax */
// Presentation demos require visual timing for demo flow
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

interface CreatedTimesheetLookup {
  id: number;
  status?: string;
}

async function navigateToLoginWithFreshSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('__E2E_DISABLE_AUTH_SEED__', '1');
    } catch {
      // Ignore storage access issues when the current page is unavailable.
    }
  }).catch(() => undefined);
  await page.context().clearCookies().catch(() => undefined);
  await page.context().clearPermissions().catch(() => undefined);
  await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem('__E2E_DISABLE_AUTH_SEED__', '1');
    } catch {
      // Ignore storage access issues in test browsers.
    }
  }).catch(() => undefined);
  await page.goto('/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
}

async function waitForLoginSurface(
  page: Page,
  loginForm: Locator,
  emailInput: Locator,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await loginForm.isVisible().catch(() => false)) {
      return true;
    }
    if (await emailInput.isVisible().catch(() => false)) {
      return true;
    }

    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(250);
  }

  return false;
}

function extractTimesheetList(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const container = payload as Record<string, unknown>;
  const candidates = ['timesheets', 'content', 'items', 'data'];
  for (const key of candidates) {
    const value = container[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
    }
  }

  return [];
}

function normalizeTimesheetRecord(entry: Record<string, unknown>): CreatedTimesheetLookup | null {
  const nested = typeof entry.timesheet === 'object' && entry.timesheet !== null
    ? (entry.timesheet as Record<string, unknown>)
    : null;
  const source = nested ? { ...nested, ...entry } : entry;
  const idValue = source.id ?? source.timesheetId ?? source['timesheet_id'];
  const numericId = Number(idValue);

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return null;
  }

  const statusValue = source.status ?? source.timesheetStatus ?? source['timesheet_status'];
  return {
    id: numericId,
    status: typeof statusValue === 'string' ? statusValue.toUpperCase() : undefined,
  };
}

export async function waitForCreatedTimesheet(
  page: Page,
  options: {
    backendUrl: string;
    token: string | null;
    courseId: number;
    description: string;
    weekStartDate: string;
    timeout?: number;
    pollInterval?: number;
  },
): Promise<CreatedTimesheetLookup | null> {
  const {
    backendUrl,
    token,
    courseId,
    description,
    weekStartDate,
    timeout = 15000,
    pollInterval = 1000,
  } = options;

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const response = await page.request.get(
      `${backendUrl}/api/timesheets?courseId=${courseId}&size=200`,
      { headers },
    ).catch(() => null);

    if (response?.ok()) {
      const payload = await response.json().catch(() => null);
      const records = extractTimesheetList(payload);
      const match = records.find((entry) => {
        const nested = typeof entry.timesheet === 'object' && entry.timesheet !== null
          ? (entry.timesheet as Record<string, unknown>)
          : null;
        const source = nested ? { ...nested, ...entry } : entry;
        const entryDescription = String(source.description ?? '').trim();
        const entryWeekStart = String(source.weekStartDate ?? source.week_start_date ?? '').trim();
        return entryDescription === description && entryWeekStart === weekStartDate;
      });

      if (match) {
        const normalized = normalizeTimesheetRecord(match);
        if (normalized) {
          return normalized;
        }
      }
    }

    await page.waitForTimeout(pollInterval);
  }

  return null;
}

async function dispatchFormEvents(locator: Locator): Promise<void> {
  await locator.evaluate((element: Element) => {
    const target = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.dispatchEvent(new Event('blur', { bubbles: true }));
  }).catch(() => undefined);
}

export async function waitForLecturerRateCode(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(() => {
    const modal = document.querySelector('[data-testid="lecturer-create-modal"]');
    if (!modal) return false;
    const walker = document.createTreeWalker(modal, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let sawLabel = false;
    while (walker.nextNode()) {
      const text = (walker.currentNode as { textContent?: string | null }).textContent?.trim() || '';
      if (/^Rate Code$/i.test(text)) {
        sawLabel = true;
        continue;
      }
      if (sawLabel && text && text !== '-' && !/^Rate Code$/i.test(text)) {
        return true;
      }
    }
    return false;
  }, { timeout });
}

export async function stabilizeLecturerCreateForm(
  page: Page,
  options: {
    tutorSelect?: Locator;
    tutorValue?: string;
    courseSelect: Locator;
    courseValue: string;
    weekStartInput: Locator;
    weekStartDate: string;
    descriptionInput: Locator;
    description: string;
  },
): Promise<boolean> {
  const {
    tutorSelect,
    tutorValue,
    courseSelect,
    courseValue,
    weekStartInput,
    weekStartDate,
    descriptionInput,
    description,
  } = options;

  let repaired = false;

  const ensureSelectValue = async (
    locator: Locator | undefined,
    expectedValue: string | undefined,
    label: string,
  ): Promise<void> => {
    if (!locator || !expectedValue) {
      return;
    }
    const currentValue = await locator.inputValue().catch(() => '');
    if (currentValue === expectedValue) {
      return;
    }

    console.warn(`⚠️ ${label} reset to "${currentValue || '(empty)'}"; restoring "${expectedValue}" before submit`);
    await locator.selectOption(expectedValue).catch(() => undefined);
    await dispatchFormEvents(locator);
    repaired = true;
  };

  const ensureInputValue = async (
    locator: Locator,
    expectedValue: string,
    label: string,
  ): Promise<void> => {
    const currentValue = await locator.inputValue().catch(() => '');
    if (currentValue.trim() === expectedValue) {
      return;
    }

    console.warn(`⚠️ ${label} reset to "${currentValue || '(empty)'}"; restoring "${expectedValue}" before submit`);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click({ timeout: 5000 }).catch(() => undefined);
    await locator.fill('');
    await locator.fill(expectedValue);
    await dispatchFormEvents(locator);
    repaired = true;
  };

  await ensureSelectValue(tutorSelect, tutorValue, 'Tutor');
  await ensureSelectValue(courseSelect, courseValue, 'Course');
  await ensureInputValue(weekStartInput, weekStartDate, 'Week Starting');
  await ensureInputValue(descriptionInput, description, 'Description');

  if (repaired) {
    await page.waitForTimeout(500);
  }

  return repaired;
}

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
        /* Presentation demos do not interact with page banners; prevent click interception. */
        [data-testid="notification-banner"],
        .notification-banner,
        .notification-banner-container {
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
  const page = locator.page();

  if (description) {
    console.log(`🎯 ${description}`);
  }

  await showCustomHighlight(locator, description);
  await page.waitForTimeout(pauseBefore);
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.waitFor({ state: 'visible', timeout: 5000 });
  try {
    await locator.click({ timeout: 5000 });
  } catch {
    try {
      await locator.click({ force: true, timeout: 3000 });
    } catch {
      await locator.evaluate((el) => (el as HTMLElement).click());
    }
  }
  await page.waitForTimeout(pauseAfter);
  await clearCustomHighlight(page);
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
  await locator.fill('');
  await locator.type(value, { delay: PRESENTATION_CONFIG.timing.typingDelay });
  
  // Dispatch React-compatible events using the native setter so RHF observes the change.
  await locator.evaluate((el: HTMLInputElement | HTMLTextAreaElement, val: string) => {
    const prototype = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(el, val);
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

  // Try opening dropdown for demo visibility; continue even if viewport constraints block the click.
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  try {
    await locator.click({ timeout: 3000 });
    await page.waitForTimeout(PRESENTATION_CONFIG.timing.pauseDropdownOpen);
  } catch {
    await locator.focus().catch(() => undefined);
  }

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

  // Select the option first, then re-dispatch events using the resolved DOM value.
  // This preserves enum-backed option values when the caller selected by label text.
  await locator.selectOption(value);
  const resolvedValue = await locator.inputValue();

  // Trigger React-compatible events with the native setter (critical for RHF state sync).
  await locator.evaluate((el: HTMLSelectElement, val: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    descriptor?.set?.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }, resolvedValue);

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
  const expectedRole = typeof usernameOrRole === 'string' && ['admin', 'lecturer', 'tutor'].includes(usernameOrRole)
    ? usernameOrRole.toUpperCase()
    : '';

  const authSnapshot = async () => page.evaluate(() => {
    try {
      const hook = (window as Window & { __E2E_GET_AUTH__?: () => { isAuthenticated?: boolean; user?: { role?: string | null } | null } | null }).__E2E_GET_AUTH__;
      const state = typeof hook === 'function' ? hook() : null;
      return {
        isAuthenticated: Boolean(state?.isAuthenticated),
        role: String(state?.user?.role ?? '').toUpperCase(),
      };
    } catch {
      return { isAuthenticated: false, role: '' };
    }
  }).catch(() => ({ isAuthenticated: false, role: '' }));

  const storageSnapshot = async () => page.evaluate(() => {
    try {
      const token = window.localStorage.getItem('token') ?? '';
      const userRaw = window.localStorage.getItem('user');
      let role = '';
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw) as { role?: string | null };
          role = String(parsed?.role ?? '').toUpperCase();
        } catch {
          role = '';
        }
      }
      return {
        hasToken: token.length > 0,
        role,
      };
    } catch {
      return { hasToken: false, role: '' };
    }
  }).catch(() => ({ hasToken: false, role: '' }));

  // Presentation demos explicitly switch identities; start from a clean login surface.
  await navigateToLoginWithFreshSession(page);

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
  const emailInput = page.getByTestId('email-input').or(page.getByLabel(/email/i)).first();
  const passwordInput = page.getByTestId('password-input').or(page.getByLabel(/password/i)).first();
  const loginButton = page.getByTestId('login-submit-button').or(loginForm.getByRole('button', { name: /sign in|login/i })).first();

  const canReuseAuthenticatedState = async (): Promise<boolean> => {
    const current = await authSnapshot();
    const persisted = await storageSnapshot();
    const resolvedRole = current.role || persisted.role;
    const protectedRoute = /\/dashboard|\/admin\/users/i.test(page.url());
    return Boolean(
      expectedRole &&
      protectedRoute &&
      (current.isAuthenticated || persisted.hasToken) &&
      resolvedRole === expectedRole,
    );
  };

  const ensureLoginFormReady = async (): Promise<boolean> => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (await waitForLoginSurface(page, loginForm, emailInput, 5000)) {
        return true;
      }

      if (await canReuseAuthenticatedState()) {
        return false;
      }

      const signOutButton = page.getByRole('button', { name: /sign out/i });
      if (await signOutButton.isVisible().catch(() => false)) {
        await showCustomHighlight(signOutButton, 'Resetting session before demo login...');
        await signOutButton.click({ timeout: 5000 }).catch(() => undefined);
        await page.waitForURL(/\/login/i, { timeout: 10000 }).catch(() => undefined);
        if (await waitForLoginSurface(page, loginForm, emailInput, 5000)) {
          return true;
        }
      }

      await navigateToLoginWithFreshSession(page);
    }

    await page.goto('/login', { waitUntil: 'networkidle' }).catch(() => undefined);
    return waitForLoginSurface(page, loginForm, emailInput, 30000);
  };

  const loginFormReady = await ensureLoginFormReady();

  if (!loginFormReady) {
    if (await canReuseAuthenticatedState()) {
      await page.evaluate(() => {
        const overlay = document.getElementById('visual-login-overlay');
        if (overlay) overlay.remove();
      }).catch(() => undefined);
      await page.waitForTimeout(postLoginPause);
      return;
    }

    throw new Error(`Unable to reach login form for ${friendlyName} (currentUrl=${page.url()})`);
  }

  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await showCustomHighlight(emailInput, `Authenticating as ${friendlyName}...`);
  await emailInput.click();
  await emailInput.fill('');
  await emailInput.type(creds.email, { delay: PRESENTATION_CONFIG.timing.typingDelay });

  await showCustomHighlight(passwordInput, 'Typing secure credentials...');
  await passwordInput.click();
  await passwordInput.fill('');
  await passwordInput.type(creds.password, { delay: PRESENTATION_CONFIG.timing.typingDelay });

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
