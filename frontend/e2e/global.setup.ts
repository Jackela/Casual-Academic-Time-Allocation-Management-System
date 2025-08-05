import { FullConfig } from '@playwright/test';
import { waitForBackendReady } from './utils/health-checker';
import { E2E_CONFIG } from './config/e2e.config';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Enhanced E2E Test Setup - Comprehensive Backend Readiness Check');
  console.log(`📡 Backend URL: ${E2E_CONFIG.BACKEND.URL}`);
  console.log(`🌐 Frontend URL: ${E2E_CONFIG.FRONTEND.URL}`);
  
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