/// <reference types="vite/client" />

// Conditional compilation flags defined in vite.config.ts
declare const __DEV_CREDENTIALS__: boolean;
declare const __E2E_GLOBALS__: boolean;
declare const __DEBUG_LOGGING__: boolean;
declare const __TEST_UTILITIES__: boolean;
declare const __PRODUCTION_BUILD__: boolean;
declare const __STRIP_SENSITIVE_DATA__: boolean;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_E2E: string;
  readonly VITE_E2E_BYPASS_ROLE: string;
  readonly VITE_E2E_USE_MSW: string;
  readonly VITE_E2E_TEST_FLAG: string;
  readonly NODE_ENV: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
