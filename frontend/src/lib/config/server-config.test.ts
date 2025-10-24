import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/unified-config', () => ({
  getConfig: () => ({
    api: {
      endpoints: {
        timesheets: {
          config: '/api/timesheets/config',
        },
      },
    },
  }),
}));

vi.mock('../../utils/environment', () => ({
  ENV_CONFIG: {
    isE2E: () => false,
    getMode: () => 'development',
    isTest: () => false,
  },
}));

vi.mock('../../utils/secure-logger', () => ({
  secureLogger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    api: vi.fn(),
  },
}));

const mockedSecureClient = {
  get: vi.fn(),
};

vi.mock('../../services/api-secure', () => ({
  secureApiClient: mockedSecureClient,
}));

afterEach(() => {
  vi.resetModules();
  mockedSecureClient.get.mockReset();
});

describe('server-config', () => {
  it('returns validated overrides when payload matches schema', async () => {
    mockedSecureClient.get.mockResolvedValue({
      data: {
        hours: { max: 48 },
        weekStart: { mondayOnly: true },
        currency: 'AUD',
      },
    });

    const module = await import('./server-config');
    const result = await module.fetchTimesheetConstraints();

    expect(result).toEqual({
      hours: { max: 48 },
      weekStart: { mondayOnly: true },
      currency: 'AUD',
    });
    expect(mockedSecureClient.get).toHaveBeenCalledWith('/api/config', { signal: undefined });
  });

  it('returns null for payloads that violate schema', async () => {
    mockedSecureClient.get
      .mockResolvedValueOnce({
        data: {
          currency: 'USD',
          hours: { max: -10 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          hours: { max: -5 },
        },
      });

    const module = await import('./server-config');
    const result = await module.fetchTimesheetConstraints();

    expect(result).toBeNull();
    expect(mockedSecureClient.get).toHaveBeenNthCalledWith(1, '/api/config', { signal: undefined });
    expect(mockedSecureClient.get).toHaveBeenNthCalledWith(2, '/api/timesheets/config', { signal: undefined });
  });

  it('falls back to secondary endpoint when primary fails', async () => {
    mockedSecureClient.get
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        data: {
          hours: { max: 50 },
          weekStart: { mondayOnly: false },
          currency: 'AUD',
        },
      },
    );

    const module = await import('./server-config');
    const result = await module.fetchTimesheetConstraints();

    expect(result).toEqual({
      hours: { max: 50 },
      weekStart: { mondayOnly: false },
      currency: 'AUD',
    });
    expect(mockedSecureClient.get).toHaveBeenNthCalledWith(1, '/api/config', { signal: undefined });
    expect(mockedSecureClient.get).toHaveBeenNthCalledWith(2, '/api/timesheets/config', { signal: undefined });
  });
});
