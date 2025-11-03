/**
 * Comprehensive health checking utilities for E2E test setup
 * Ensures backend is fully initialized before running tests
 */

import { E2E_CONFIG, API_ENDPOINTS } from '../config/e2e.config';
import net from 'node:net';
import { URL } from 'node:url';
import type { HealthResponse } from '../../src/types/api';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isHealthResponse = (value: unknown): value is HealthResponse => {
  if (!isRecord(value)) {
    return false;
  }
  const components = (value as { components?: unknown }).components;
  return typeof value.status === 'string' && isRecord(components);

};
export interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  responseTime: number;
  details?: HealthResponse | Record<string, unknown> | null;
  error?: string;
}

export interface BackendReadinessResult {
  isReady: boolean;
  overallStatus: 'ready' | 'partial' | 'failed';
  checks: HealthCheckResult[];
  totalTime: number;
}

/**
 * Performs a single health check against an endpoint
 */
async function performHealthCheck(
  endpoint: string, 
  expectedStatus: number = 200,
  timeout: number = E2E_CONFIG.BACKEND.TIMEOUTS.HEALTH_CHECK
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.status === expectedStatus) {
      const data = await response.json().catch(() => null);
      const details = isHealthResponse(data)
        ? data
        : isRecord(data)
          ? (data as Record<string, unknown>)
          : null;
      return {
        endpoint,
        status: 'healthy',
        responseTime,
        details,
      };
    }

    // Log non-200 with limited body to aid diagnostics
    let bodyText: string | undefined;
    try {
      bodyText = await response.text();
    } catch {}
    return {
      endpoint,
      status: 'unhealthy',
      responseTime,
      error: `Expected status ${expectedStatus}, got ${response.status}${bodyText ? `; body: ${bodyText.slice(0,200)}` : ''}`
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        endpoint,
        status: 'timeout',
        responseTime,
        error: `Request timed out after ${timeout}ms`
      };
    }
    
    return {
      endpoint,
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Tests authentication endpoint with test credentials
 */
async function checkAuthEndpoint(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const { email, password } = E2E_CONFIG.USERS.admin;
    const url = new URL(API_ENDPOINTS.AUTH_LOGIN);
    const isHttps = url.protocol === 'https:';
    const agent = isHttps ? { httpsAgent: new (await import('node:https')).Agent({ keepAlive: true }) }
                          : { httpAgent: new (await import('node:http')).Agent({ keepAlive: true }) };
    const resp = await (await import('axios')).default.post(API_ENDPOINTS.AUTH_LOGIN, { email, password }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: E2E_CONFIG.BACKEND.TIMEOUTS.HEALTH_CHECK,
      validateStatus: () => true,
      ...agent,
    });

    const responseTime = Date.now() - startTime;

    if (resp.status === 200) {
      return {
        endpoint: API_ENDPOINTS.AUTH_LOGIN,
        status: 'healthy',
        responseTime,
        details: { message: 'Auth login succeeded' }
      };
    }

    const bodyStr = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    return {
      endpoint: API_ENDPOINTS.AUTH_LOGIN,
      status: 'unhealthy',
      responseTime,
      error: `Expected 200, got ${resp.status}${bodyStr ? `; body: ${bodyStr.slice(0,200)}` : ''}`
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: API_ENDPOINTS.AUTH_LOGIN,
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * TCP port probe as a network-level fallback when HTTP fetch fails due to environment quirks.
 */
async function checkTcpPort(urlString: string, timeoutMs = 1000): Promise<HealthCheckResult> {
  const started = Date.now();
  try {
    const url = new URL(urlString);
    const host = url.hostname || '127.0.0.1';
    const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host, port });
      const to = setTimeout(() => {
        socket.destroy();
        reject(new Error(`TCP timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      socket.once('connect', () => {
        clearTimeout(to);
        socket.end();
        resolve();
      });
      socket.once('error', (err) => {
        clearTimeout(to);
        reject(err);
      });
    });
    return {
      endpoint: `${host}:${port} (tcp)`,
      status: 'healthy',
      responseTime: Date.now() - started,
      details: { message: 'TCP port reachable' }
    };
  } catch (err) {
    return {
      endpoint: 'tcp-probe',
      status: 'unhealthy',
      responseTime: Date.now() - started,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Comprehensive backend readiness check
 */
export async function checkBackendReadiness(): Promise<BackendReadinessResult> {
  const startTime = Date.now();
  const checks: HealthCheckResult[] = [];
  
  console.log('🔍 Starting comprehensive backend readiness check...');
  
  // 1. Basic health endpoint check (best-effort)
  console.log('  🏥 Checking health endpoint...');
  const healthCheck = await performHealthCheck(API_ENDPOINTS.HEALTH);
  checks.push(healthCheck);
  
  // 2. Authentication endpoint functionality check
  console.log('  🔐 Validating authentication endpoint...');
  const authCheck = await checkAuthEndpoint();
  checks.push(authCheck);

  // 3. TCP fallback if both HTTP probes failed (environmental fetch issues)
  if (healthCheck.status !== 'healthy' && authCheck.status !== 'healthy') {
    const tcpProbe = await checkTcpPort(E2E_CONFIG.BACKEND.URL);
    checks.push(tcpProbe);
  }
  
  // 3. Database connectivity check (via health endpoint details)
  // If auth endpoint is working, we can assume database is functional
  console.log('  💾 Verifying database connectivity...');
  const healthDetails = isHealthResponse(healthCheck.details) ? healthCheck.details : null;
  const databaseStatus = healthDetails?.components?.db?.status;
  if (authCheck.status === 'healthy' || databaseStatus === 'UP') {
    checks.push({
      endpoint: 'Database connectivity (inferred from auth endpoint)',
      status: 'healthy',
      responseTime: 0,
      details: { message: 'Database connectivity verified via auth endpoint functionality' }
    });
  } else {
    checks.push({
      endpoint: 'Database connectivity',
      status: 'unhealthy',
      responseTime: 0,
      error: 'Database status cannot be verified'
    });
  }
  
  const totalTime = Date.now() - startTime;
  // Consider backend "ready" if auth endpoint succeeds OR health endpoint is healthy.
  const authHealthy = authCheck.status === 'healthy';
  const healthHealthy = healthCheck.status === 'healthy';
  const tcpHealthy = checks.find(c => c.endpoint.includes('(tcp)'))?.status === 'healthy';
  // Only consider backend ready when an HTTP-based probe passes.
  // TCP-only success indicates partial availability and should not unblock tests.
  const isReady = authHealthy || healthHealthy;
  const healthyChecks = checks.filter(check => check.status === 'healthy').length;
  const overallStatus: 'ready' | 'partial' | 'failed' = isReady ? 'ready' : (healthyChecks > 0 ? 'partial' : 'failed');
  
  console.log(`  ✅ Backend readiness check completed in ${totalTime}ms`);
  console.log(`  📊 Status: ${overallStatus} (${healthyChecks}/${checks.length} checks passed)`);
  
  return {
    isReady,
    overallStatus,
    checks,
    totalTime
  };
}

/**
 * Waits for backend to become ready with retry logic
 */
export async function waitForBackendReady(): Promise<BackendReadinessResult> {
  const fastFail = (process.env.E2E_FAST_FAIL === '1' || process.env.E2E_FAST_FAIL === 'true');
  const maxAttempts = fastFail ? 1 : Math.max(60, E2E_CONFIG.TEST.MAX_HEALTH_CHECK_ATTEMPTS);
  const interval = Math.max(1000, E2E_CONFIG.TEST.HEALTH_CHECK_INTERVAL);
  
  console.log(`⏱️  Waiting for backend readiness (max ${maxAttempts} attempts, ${interval}ms interval)...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await checkBackendReadiness();
    
    if (result.isReady) {
      console.log(`🎉 Backend is ready after ${attempt} attempt(s)!`);
      return result;
    }
    
    if (attempt % 10 === 0) {
      console.log(`  ⏳ Still waiting... (attempt ${attempt}/${maxAttempts})`);
      const failedChecks = result.checks.filter(check => check.status !== 'healthy');
      failedChecks.forEach(check => {
        console.log(`    ❌ ${check.endpoint}: ${check.error || 'unhealthy'}`);
      });
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  // Final attempt to get detailed error information
  const finalResult = await checkBackendReadiness();
  console.error('❌ Backend failed to become ready within timeout period');
  console.error('📋 Final health check results:');
  finalResult.checks.forEach(check => {
    const status = check.status === 'healthy' ? '✅' : '❌';
    console.error(`  ${status} ${check.endpoint} (${check.responseTime}ms)`);
    if (check.error) {
      console.error(`      Error: ${check.error}`);
    }
  });
  
  throw new Error(
    `Backend not ready after ${maxAttempts} attempts. ` +
    `Overall status: ${finalResult.overallStatus}. ` +
    `Failed checks: ${finalResult.checks.filter(c => c.status !== 'healthy').length}/${finalResult.checks.length}`
  );
}
