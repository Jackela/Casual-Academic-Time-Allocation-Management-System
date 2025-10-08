import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.modern.css'
import App from './App.tsx'
import { worker } from './mocks/browser'
import { ENV_CONFIG } from './utils/environment'
import { secureLogger } from './utils/secure-logger'

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

// Expose globals for Playwright introspection - ONLY in E2E mode
// This code block is completely removed in production builds via conditional compilation
if (__E2E_GLOBALS__ && ENV_CONFIG.isE2E()) {
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

// Start MSW only when explicitly enabled via VITE_E2E_USE_MSW in e2e mode
if (ENV_CONFIG.e2e.shouldUseMSW()) {
  try {
    worker.start({ quiet: true });
    secureLogger.e2e('MSW started for E2E testing');
  } catch (error) {
    secureLogger.error('Error starting MSW', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
