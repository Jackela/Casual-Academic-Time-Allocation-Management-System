import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { worker } from './mocks/browser'

// E2E visibility: surface key env and storage state during app bootstrap
try {
  // eslint-disable-next-line no-console
  console.log('[E2E] import.meta.env.MODE =', (() => { try { /* @ts-ignore */ return import.meta?.env?.MODE } catch { return undefined } })())
  // eslint-disable-next-line no-console
  console.log('[E2E] VITE_E2E_AUTH_BYPASS_ROLE =', (() => { try { /* @ts-ignore */ return import.meta?.env?.VITE_E2E_AUTH_BYPASS_ROLE } catch { return undefined } })())
  // eslint-disable-next-line no-console
  console.log('[E2E] storage snapshot (pre-render) =', {
    token: (() => { try { return localStorage.getItem('token') } catch { return null } })(),
    user: (() => { try { return localStorage.getItem('user') } catch { return null } })(),
  })
  try {
    // Expose env and storage snapshot for Playwright to introspect
    // @ts-ignore
    ;(window as any).__E2E_ENV__ = {
      // @ts-ignore
      mode: (() => { try { return import.meta?.env?.MODE } catch { return undefined } })(),
      // @ts-ignore
      bypassRole: (() => { try { return import.meta?.env?.VITE_E2E_AUTH_BYPASS_ROLE } catch { return undefined } })(),
      storage: {
        token: (() => { try { return localStorage.getItem('token') } catch { return null } })(),
        user: (() => { try { return localStorage.getItem('user') } catch { return null } })(),
      }
    }
  } catch {}
} catch {}

// Start MSW only when explicitly enabled via VITE_E2E_USE_MSW in e2e mode
try {
  // @ts-ignore
  const isE2E = typeof import.meta !== 'undefined' && import.meta?.env?.MODE === 'e2e'
  // @ts-ignore
  const useMsw = (() => { try { return String(import.meta?.env?.VITE_E2E_USE_MSW || '').toLowerCase() } catch { return '' } })()
  if (isE2E && (useMsw === 'true' || useMsw === '1')) {
    worker.start({ quiet: true })
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
