import { secureLogger } from './src/utils/secure-logger';
import { ENV_CONFIG } from './src/utils/environment';

process.env.SECURE_LOGGER_FORCE_PROD = 'true';
(ENV_CONFIG as any).isProduction = () => false;
(ENV_CONFIG as any).isDevelopment = () => false;

const logs: any[] = [];
const originalInfo = console.info;
console.info = (...args: any[]) => { logs.push(args); };

const err = new Error('Authentication failed with token jwt-123');
secureLogger.info('Login error', err);

console.info = originalInfo;
console.log(JSON.stringify(logs[0], null, 2));
