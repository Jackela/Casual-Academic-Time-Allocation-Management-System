import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { User } from '../../types/auth';
import type { AuthManager } from '../../services/auth-manager';
import type { SecureApiClient } from '../../services/api-secure';

describe('SecureApiClient authentication integration', () => {
  let authManager: AuthManager;
  let secureApiClient: SecureApiClient;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock('../../config/unified-config', () => ({
      getConfig: () => ({
        api: { baseUrl: 'http://localhost', timeout: 5000 }
      })
    }));

    vi.doMock('../../utils/secure-logger', () => ({
      secureLogger: {
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        api: vi.fn(),
        performance: vi.fn(),
        security: vi.fn()
      }
    }));

    vi.doMock('../../utils/environment', () => ({
      ENV_CONFIG: {
        getMode: () => 'test'
      }
    }));

    const mockLocalStorage = {
      getItem: vi.fn<[string], string | null>(() => null),
      setItem: vi.fn<[string, string], void>(),
      removeItem: vi.fn<[string], void>(),
      clear: vi.fn<[], void>()
    };

    vi.stubGlobal('location', {
      href: 'http://localhost:5173/'
    } as unknown as Location);

    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      location: globalThis.location
    } as unknown as Window);

    vi.stubGlobal('localStorage', mockLocalStorage as unknown as Storage);

    const authModule = await import('../../services/auth-manager');
    authManager = authModule.authManager;

    const apiModule = await import('../../services/api-secure');
    secureApiClient = apiModule.secureApiClient;
  });

  afterEach(() => {
    vi.doUnmock('../../config/unified-config');
    vi.doUnmock('../../utils/secure-logger');
    vi.doUnmock('../../utils/environment');
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('registers secure API client with auth manager for token sync', () => {
    const mockUser: User = {
      id: 1,
      email: 'integration@test.local',
      name: 'Integration User',
      role: 'TUTOR'
    };

    expect(secureApiClient.getAuthToken()).toBeNull();

    authManager.setAuth('integration-token', mockUser);
    expect(secureApiClient.getAuthToken()).toBe('integration-token');

    authManager.clearAuth();
    expect(secureApiClient.getAuthToken()).toBeNull();
  });
});

