import type { Page } from '@playwright/test';

const attached = new WeakSet<Page>();

export function attachPageDiagnostics(page: Page): void {
  if (attached.has(page)) return;
  attached.add(page);

  page.on('console', (msg) => {
    try {
      // Prefix to make it easy to spot in traces
      console.log(`[BROWSER:${msg.type()}] ${msg.text()}`);
    } catch {
      // ignore
    }
  });

  page.on('pageerror', (err) => {
    try {
      console.log(`[PAGEERROR] ${err?.message || String(err)}`);
    } catch {
      // ignore
    }
  });
}

