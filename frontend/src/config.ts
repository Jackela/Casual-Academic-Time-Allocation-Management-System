/**
 * Main Configuration Entry Point
 * 
 * Provides legacy compatibility while transitioning to unified configuration system.
 * @deprecated - Migrate to unified-config.ts for new features
 */

import { API_BASE_URL as LEGACY_API_BASE_URL } from './config/migration';

// Re-export for backward compatibility
export const API_BASE_URL = LEGACY_API_BASE_URL;

// Re-export unified config for modern usage
export { getConfig, isFeatureEnabled, getApiEndpoint, getEndpoint } from './config/unified-config';
