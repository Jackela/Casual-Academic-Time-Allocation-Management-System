import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../environment', () => ({
  ENV_CONFIG: {
    isProduction: () => false,
    features: { enableDetailedLogging: () => false },
    getMode: () => 'test',
  },
}));

import ErrorLogger from '../error-logger';

describe('error-logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logError records entry and logs in non-prod', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = new ErrorLogger({ enableConsoleLogging: true, enableLocalStorage: false, enableExternalReporting: false });
    const err = new Error('boom');
    el.logError(err, {
      errorId: 't1',
      level: 'component',
      timestamp: new Date().toISOString(),
      userAgent: 'test',
      url: 'http://localhost/',
    });
    expect(el.getErrors().length).toBeGreaterThan(0);
  });
});
