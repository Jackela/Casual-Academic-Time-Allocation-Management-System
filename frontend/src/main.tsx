import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.modern.css'
import App from './App.tsx'
import { ENV_CONFIG } from './utils/environment'
import { secureLogger } from './utils/secure-logger'
import { authManager } from './services/auth-manager'
import type { AuthSession } from './types/api'
import { STORAGE_KEYS } from './utils/storage-keys'

type E2EDebugInfo = ReturnType<typeof ENV_CONFIG.e2e.getDebugInfo>

interface StorageSnapshot {
  tokenExists: boolean
  userExists: boolean
}

type E2EEnvironmentSnapshot = E2EDebugInfo & {
  storage: StorageSnapshot
}

declare global {
  interface Window {
    __E2E_ENV__?: E2EEnvironmentSnapshot
    __E2E_SET_AUTH__?: (session: AuthSession) => void
    __E2E_GET_AUTH__?: () => ReturnType<typeof authManager.getAuthState>
  }
}

const readStorageFlag = (key: string): boolean => {
  try {
    return !!localStorage.getItem(key)
  } catch {
    return false
  }
}

const getStorageSnapshot = (): StorageSnapshot => ({
  tokenExists: readStorageFlag('token'),
  userExists: readStorageFlag('user'),
})

// E2E visibility: surface key env and storage state during app bootstrap  
if (ENV_CONFIG.features.enableDetailedLogging()) {
  try {
    secureLogger.e2e('Environment Debug Info', ENV_CONFIG.e2e.getDebugInfo());
    secureLogger.debug('Storage snapshot (pre-render)', getStorageSnapshot());
  } catch (error) {
    secureLogger.error('Error setting up E2E debugging', error);
  }
}

// SPA bootstrap hydrator: if token+user exist in storage, hydrate auth before first render
try {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
  if (token && rawUser) {
    const current = authManager.getAuthState();
    if (!current.isAuthenticated) {
      try {
        const parsedUser = JSON.parse(rawUser);
        authManager.setAuth({ token, user: parsedUser, refreshToken: null, expiresAt: null });
        if (ENV_CONFIG.isE2E()) {
          secureLogger.e2e('Bootstrap auth hydration applied');
        }
      } catch (e) {
        secureLogger.warn('Failed to parse stored user for bootstrap auth hydration', e as Error);
      }
    }
  }
} catch (e) {
  // ignore storage access errors
}

// Expose globals for Playwright introspection - ONLY in E2E mode
// In e2e mode, always expose globals for test harness regardless of additional flags
if (ENV_CONFIG.isE2E()) {
  try {
    const e2eEnv: E2EEnvironmentSnapshot = {
      ...ENV_CONFIG.e2e.getDebugInfo(),
      storage: getStorageSnapshot(),
    };
    window.__E2E_ENV__ = e2eEnv;
    secureLogger.e2e('E2E globals exposed', e2eEnv);
  } catch (error) {
    secureLogger.error('Error exposing E2E globals', error);
  }
}

window.__E2E_SET_AUTH__ = (session: AuthSession) => {
  try {
    const global = window as typeof window & {
      __E2E_APPLY_SESSION__?: (session: AuthSession) => void;
      __E2E_SESSION_STATE__?: () => { user?: unknown; token?: string | null; isAuthenticated?: boolean };
      __E2E_AUTH_MANAGER_STATE__?: () => ReturnType<typeof authManager.getAuthState>;
      __E2E_PENDING_SESSION__?: AuthSession | null;
    };
    const before =
      global.__E2E_SESSION_STATE__?.() ??
      global.__E2E_AUTH_MANAGER_STATE__?.() ??
      authManager.getAuthState();
    if (global.__E2E_APPLY_SESSION__) {
      global.__E2E_APPLY_SESSION__(session);
    } else {
      authManager.setAuth(session);
      global.__E2E_PENDING_SESSION__ = session;
    }
    const after =
      global.__E2E_SESSION_STATE__?.() ??
      global.__E2E_AUTH_MANAGER_STATE__?.() ??
      authManager.getAuthState();
    if (ENV_CONFIG.isE2E()) {
      secureLogger.e2e('Auth state injected via __E2E_SET_AUTH__', { before, after });
      if (after && !after.isAuthenticated) {
        secureLogger.warn('E2E auth injection did not mark session authenticated', after);
      }
    }
  } catch (error) {
    secureLogger.error('Failed to inject E2E auth session', error);
  }
};
window.__E2E_GET_AUTH__ = () => {
  const global = window as typeof window & {
    __E2E_SESSION_STATE__?: () => { user?: unknown; token?: string | null; isAuthenticated?: boolean };
    __E2E_AUTH_MANAGER_STATE__?: () => ReturnType<typeof authManager.getAuthState>;
  };
  return (
    global.__E2E_SESSION_STATE__?.() ??
    global.__E2E_AUTH_MANAGER_STATE__?.() ??
    authManager.getAuthState()
  );
};

const globalForAuth = window as typeof window & {
  __E2E_AUTH_MANAGER_STATE__?: () => ReturnType<typeof authManager.getAuthState>;
};
globalForAuth.__E2E_AUTH_MANAGER_STATE__ = () => authManager.getAuthState();

// Proactively consume any pending E2E session injected before app render
try {
  const g = window as typeof window & { __E2E_PENDING_SESSION__?: AuthSession | null };
  if (g.__E2E_PENDING_SESSION__) {
    // Apply via the same public hook to keep behavior consistent
    window.__E2E_SET_AUTH__?.(g.__E2E_PENDING_SESSION__);
    g.__E2E_PENDING_SESSION__ = null;
    secureLogger.e2e?.('Consumed pending E2E session before render');
  }
} catch (err) {
  secureLogger.warn?.('Failed to consume pending E2E session', err as Error);
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const app = <App />

createRoot(rootElement).render(
  ENV_CONFIG.isE2E()
    ? app
    : (
      <StrictMode>
        {app}
      </StrictMode>
    ),
)
