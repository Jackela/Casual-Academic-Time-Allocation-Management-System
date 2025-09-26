import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.modern.css'
import App from './App.tsx'
import { worker } from './mocks/browser'
import { ENV_CONFIG } from './utils/environment'
import { secureLogger } from './utils/secure-logger'

// E2E visibility: surface key env and storage state during app bootstrap  
if (ENV_CONFIG.features.enableDetailedLogging()) {
  try {
    secureLogger.e2e('Environment Debug Info', ENV_CONFIG.e2e.getDebugInfo());
    secureLogger.debug('Storage snapshot (pre-render)', {
      tokenExists: (() => { try { return !!localStorage.getItem('token') } catch { return false } })(),
      userExists: (() => { try { return !!localStorage.getItem('user') } catch { return false } })(),
    });
  } catch (error) {
    secureLogger.error('Error setting up E2E debugging', error);
  }
}

// Expose globals for Playwright introspection - ONLY in E2E mode
// This code block is completely removed in production builds via conditional compilation
if (__E2E_GLOBALS__ && ENV_CONFIG.isE2E()) {
  try {
    (window as any).__E2E_ENV__ = {
      ...ENV_CONFIG.e2e.getDebugInfo(),
      storage: {
        tokenExists: (() => { try { return !!localStorage.getItem('token') } catch { return false } })(),
        userExists: (() => { try { return !!localStorage.getItem('user') } catch { return false } })(),
      }
    };
    secureLogger.e2e('E2E globals exposed', (window as any).__E2E_ENV__);
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
