/**
 * Comprehensive health checking utilities for E2E test setup
 * Ensures backend is fully initialized before running tests
 */

import { E2E_CONFIG, API_ENDPOINTS } from '../config/e2e.config';

export interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'timeout';
  responseTime: number;
  details?: any;
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
      return {
        endpoint,
        status: 'healthy',
        responseTime,
        details: data
      };
    } else {
      return {
        endpoint,
        status: 'unhealthy',
        responseTime,
        error: `Expected status ${expectedStatus}, got ${response.status}`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if ((error as Error).name === 'AbortError') {
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
      error: (error as Error).message
    };
  }
}

/**
 * Tests authentication endpoint with test credentials
 */
async function checkAuthEndpoint(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Prefer seeded E2E credentials to avoid backend WARN logs from invalid attempts
    const email = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.E2E_ADMIN_PASSWORD || 'Admin123!';
    const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const responseTime = Date.now() - startTime;
    
    // Expect success for seeded credentials
    if (response.status === 200) {
      return {
        endpoint: API_ENDPOINTS.AUTH_LOGIN,
        status: 'healthy',
        responseTime,
        details: { message: 'Auth endpoint accepting requests and processing authentication' }
      };
    } else {
      return {
        endpoint: API_ENDPOINTS.AUTH_LOGIN,
        status: 'unhealthy',
        responseTime,
        error: `Unexpected status ${response.status} when authenticating with seeded credentials`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: API_ENDPOINTS.AUTH_LOGIN,
      status: 'unhealthy',
      responseTime,
      error: (error as Error).message
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
  
  // 1. Basic health endpoint check
  console.log('  🏥 Checking health endpoint...');
  const healthCheck = await performHealthCheck(API_ENDPOINTS.HEALTH);
  checks.push(healthCheck);
  
  if (healthCheck.status !== 'healthy') {
    return {
      isReady: false,
      overallStatus: 'failed',
      checks,
      totalTime: Date.now() - startTime
    };
  }
  
  // 2. Authentication endpoint functionality check
  console.log('  🔐 Validating authentication endpoint...');
  const authCheck = await checkAuthEndpoint();
  checks.push(authCheck);
  
  // 3. Database connectivity check (via health endpoint details)
  // If auth endpoint is working, we can assume database is functional
  console.log('  💾 Verifying database connectivity...');
  if (authCheck.status === 'healthy' || healthCheck.details?.components?.db?.status === 'UP') {
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
  const healthyChecks = checks.filter(check => check.status === 'healthy').length;
  const isReady = healthyChecks === checks.length;
  const overallStatus: 'ready' | 'partial' | 'failed' = 
    isReady ? 'ready' : healthyChecks > 0 ? 'partial' : 'failed';
  
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
  const maxAttempts = (process.env.E2E_FAST_FAIL === '1' || process.env.E2E_FAST_FAIL === 'true')
    ? 1
    : E2E_CONFIG.TEST.MAX_HEALTH_CHECK_ATTEMPTS;
  const interval = E2E_CONFIG.TEST.HEALTH_CHECK_INTERVAL;
  
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
