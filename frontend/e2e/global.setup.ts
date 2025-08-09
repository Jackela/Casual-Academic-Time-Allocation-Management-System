import { FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { waitForBackendReady } from './utils/health-checker';
import { E2E_CONFIG } from './config/e2e.config';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Enhanced E2E Test Setup - Comprehensive Backend Readiness Check');
  console.log(`📡 Backend URL: ${E2E_CONFIG.BACKEND.URL}`);
  console.log(`🌐 Frontend URL: ${E2E_CONFIG.FRONTEND.URL}`);
  
  // Optional bypass for mocked-only runs (e.g., local quick checks)
  if (process.env.E2E_SKIP_BACKEND === 'true' || process.env.E2E_SKIP_BACKEND === '1') {
    console.log('⚠️  Skipping backend readiness check due to E2E_SKIP_BACKEND flag');
    // Prepare storage state for tutor to enable protected dashboard access without backend
    try {
      const currentFile = fileURLToPath(import.meta.url);
      const currentDir = dirname(currentFile);
      const authDir = join(currentDir, '.auth');
      try { mkdirSync(authDir, { recursive: true }); } catch {}
      const storageStatePath = join(authDir, 'tutor.storage-state.json');
      const tutorUser = { id: 201, email: 'tutor@example.com', name: 'John Doe', role: 'TUTOR' };
      const storageState = {
        cookies: [],
        origins: [
          {
            origin: E2E_CONFIG.FRONTEND.URL,
            localStorage: [
              { name: 'token', value: 'tutor-mock-token' },
              { name: 'user', value: JSON.stringify(tutorUser) }
            ]
          }
        ]
      } as any;
      writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2), 'utf-8');
      console.log(`🔑 Wrote tutor storage state to ${storageStatePath}`);
    } catch (e) {
      console.warn('⚠️  Failed to write storage state for mocked run:', e);
    }
    return;
  }

  try {
    // Comprehensive backend readiness check with retry logic
    const readinessResult = await waitForBackendReady();
    
    console.log('✅ Backend comprehensive readiness check passed!');
    console.log(`📊 Total readiness check time: ${readinessResult.totalTime}ms`);
    console.log(`🔍 All ${readinessResult.checks.length} health checks passed:`);
    
    readinessResult.checks.forEach(check => {
      console.log(`  ✅ ${check.endpoint} (${check.responseTime}ms)`);
      if (check.details?.message) {
        console.log(`      ${check.details.message}`);
      }
    });
    
    console.log('🎯 Backend is fully ready for E2E test execution!');
    
  } catch (error) {
    console.error('❌ Backend readiness check failed:', error);
    console.error('💡 Ensure the Spring Boot backend is running on port 8084 with E2E profile');
    console.error('💡 Run: mvn spring-boot:run -Dspring-boot.run.arguments=--spring.profiles.active=e2e');
    throw error;
  }
}

export default globalSetup;