import { secureLogger } from './src/utils/secure-logger';
import { ENV_CONFIG } from './src/utils/environment';

console.log('default isProduction', ENV_CONFIG.isProduction());

// Force production mode
(ENV_CONFIG as any).isProduction = () => true;
(ENV_CONFIG as any).isDevelopment = () => false;
(ENV_CONFIG.features as any).enableDetailedLogging = () => false;

secureLogger.info('Test message', { token: 'secret-token', password: 'abc', nested: { credentials: { token: 'jwt-123' } } });
