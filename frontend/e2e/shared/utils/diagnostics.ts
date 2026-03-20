import type { Page } from '@playwright/test';

const attached = new WeakSet<Page>();
type DiagnosticSource = 'console' | 'pageerror';
type DiagnosticMatcher = RegExp | ((entry: DiagnosticEntry) => boolean);

type DiagnosticEntry = {
  source: DiagnosticSource;
  text: string;
  level?: string;
};

type DiagnosticsState = {
  entries: DiagnosticEntry[];
  allowlist: DiagnosticMatcher[];
};

const diagnosticsState = new WeakMap<Page, DiagnosticsState>();

const ensureState = (page: Page): DiagnosticsState => {
  let state = diagnosticsState.get(page);
  if (!state) {
    state = {
      entries: [],
      allowlist: [],
    };
    diagnosticsState.set(page, state);
  }
  return state;
};

const toMatcher = (input: string | RegExp): DiagnosticMatcher => {
  if (input instanceof RegExp) return input;
  return new RegExp(input, 'i');
};

const isAllowed = (entry: DiagnosticEntry, matchers: DiagnosticMatcher[]): boolean => {
  for (const matcher of matchers) {
    if (matcher instanceof RegExp) {
      if (matcher.test(entry.text)) return true;
      continue;
    }
    if (matcher(entry)) {
      return true;
    }
  }
  return false;
};

export function allowPageDiagnostics(page: Page, patterns: Array<string | RegExp>): void {
  const state = ensureState(page);
  for (const pattern of patterns) {
    state.allowlist.push(toMatcher(pattern));
  }
}

export function allowExpectedHttpErrorDiagnostics(page: Page, statuses: number[] = [400, 401, 409]): void {
  const patterns = statuses.map((status) => new RegExp(String.raw`\b${status}\b`));
  allowPageDiagnostics(page, patterns);
}

export function assertNoUnexpectedPageDiagnostics(page: Page): void {
  const state = diagnosticsState.get(page);
  if (!state || state.entries.length === 0) return;

  const allEntries = state.entries.splice(0, state.entries.length);
  const unexpected = allEntries.filter((entry) => !isAllowed(entry, state.allowlist));
  if (unexpected.length === 0) return;

  const summary = unexpected
    .slice(0, 5)
    .map((entry, index) => `${index + 1}. [${entry.source}${entry.level ? `:${entry.level}` : ''}] ${entry.text}`)
    .join('\n');

  throw new Error(
    `Unexpected browser diagnostics detected (${unexpected.length}).\n${summary}`,
  );
}

export function attachPageDiagnostics(page: Page): void {
  if (attached.has(page)) return;
  attached.add(page);
  ensureState(page);

  page.on('console', (msg) => {
    try {
      // Prefix to make it easy to spot in traces
      console.log(`[BROWSER:${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        const state = ensureState(page);
        state.entries.push({
          source: 'console',
          level: msg.type(),
          text: msg.text(),
        });
      }
    } catch {
      // ignore
    }
  });

  page.on('pageerror', (err) => {
    try {
      const text = err?.message || String(err);
      console.log(`[PAGEERROR] ${text}`);
      const state = ensureState(page);
      state.entries.push({
        source: 'pageerror',
        text,
      });
    } catch {
      // ignore
    }
  });
}

