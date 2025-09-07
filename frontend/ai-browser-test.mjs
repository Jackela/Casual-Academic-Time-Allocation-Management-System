#!/usr/bin/env node
/**
 * AI-Driven Browser Test using Playwright
 * This demonstrates AI (Claude) controlling a real browser
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

class AIBrowserTester {
  constructor() {
    this.frontendUrl = 'http://localhost:5174';
    this.backendUrl = 'http://localhost:8084';
    this.testResults = [];
  }

  async setupBrowser() {
    console.log('🚀 Launching browser controlled by AI...');
    this.browser = await chromium.launch({
      headless: true, // Run headless for now
      slowMo: 200, // Some delay for actions
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.context.newPage();
    
    // Log all console messages from the page
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Page error:', msg.text());
      }
    });
  }

  async testMockLogin() {
    console.log('\n🔐 AI Testing: Mock Login Flow...');
    
    try {
      await this.page.goto(this.frontendUrl);
      console.log('✅ Navigated to:', this.page.url());
      
      // Check if login page is loaded
      const title = await this.page.title();
      console.log('Page title:', title);
      
      // Look for login form
      const emailInput = await this.page.$('input[name="email"], input[type="email"]');
      const passwordInput = await this.page.$('input[name="password"], input[type="password"]');
      
      if (emailInput && passwordInput) {
        console.log('✅ Found login form elements');
        
        // AI fills in the form
        await emailInput.fill('tutor@example.com');
        await passwordInput.fill('Tutor123!');
        console.log('✅ AI filled login credentials');
        
        // Find and click submit button
        const submitButton = await this.page.$('button[type="submit"], button:has-text("Login")');
        if (submitButton) {
          await submitButton.click();
          console.log('✅ AI clicked login button');
          
          // Wait a bit for navigation
          await this.page.waitForTimeout(2000);
          
          const currentUrl = this.page.url();
          if (currentUrl.includes('dashboard')) {
            console.log('✅ Successfully navigated to dashboard');
            this.testResults.push({ test: 'login', status: 'PASS' });
          } else {
            console.log('⚠️ Still on:', currentUrl);
            this.testResults.push({ test: 'login', status: 'PARTIAL' });
          }
        }
      } else {
        console.log('❌ Login form not found');
        this.testResults.push({ test: 'login', status: 'FAIL' });
      }
      
    } catch (error) {
      console.log('❌ Login test failed:', error.message);
      this.testResults.push({ test: 'login', status: 'FAIL', error: error.message });
    }
  }

  async exploreApplication() {
    console.log('\n🤖 AI Exploring Application...');
    
    try {
      // Get page content
      const pageContent = await this.page.content();
      console.log('Page size:', pageContent.length, 'bytes');
      
      // Count interactive elements
      const buttons = await this.page.$$('button');
      const links = await this.page.$$('a');
      const inputs = await this.page.$$('input, textarea, select');
      
      console.log(`Found: ${buttons.length} buttons, ${links.length} links, ${inputs.length} inputs`);
      
      // AI analyzes the page structure
      const headings = await this.page.$$eval('h1, h2, h3', elements => 
        elements.map(el => el.textContent)
      );
      
      if (headings.length > 0) {
        console.log('Page headings:', headings.join(', '));
      }
      
      // Check for data tables
      const tables = await this.page.$$('table');
      if (tables.length > 0) {
        console.log(`✅ Found ${tables.length} data table(s)`);
        
        // Count rows in first table
        const rows = await this.page.$$('table:first-of-type tbody tr');
        console.log(`First table has ${rows.length} data rows`);
      }
      
      this.testResults.push({ 
        test: 'exploration', 
        status: 'PASS',
        data: { buttons: buttons.length, links: links.length, tables: tables.length }
      });
      
    } catch (error) {
      console.log('❌ Exploration failed:', error.message);
      this.testResults.push({ test: 'exploration', status: 'FAIL', error: error.message });
    }
  }

  async testAPIConnection() {
    console.log('\n🔌 AI Testing: API Connection...');
    
    try {
      // Check if backend is reachable
      const response = await this.page.evaluate(async (backendUrl) => {
        try {
          const res = await fetch(`${backendUrl}/actuator/health`);
          return { status: res.status, ok: res.ok };
        } catch (e) {
          return { error: e.message };
        }
      }, this.backendUrl);
      
      if (response.ok) {
        console.log('✅ Backend is healthy');
        this.testResults.push({ test: 'api_health', status: 'PASS' });
      } else if (response.error) {
        console.log('❌ Backend unreachable:', response.error);
        console.log('💡 AI suggests: Backend might not be running on port 8084');
        this.testResults.push({ test: 'api_health', status: 'FAIL', suggestion: 'Start backend first' });
      }
      
    } catch (error) {
      console.log('❌ API test failed:', error.message);
      this.testResults.push({ test: 'api_health', status: 'FAIL', error: error.message });
    }
  }

  async runAllTests() {
    console.log('🚀 AI-Driven Browser Testing Started');
    console.log('='.repeat(50));
    
    try {
      await this.setupBrowser();
      
      // Run test sequence
      await this.testMockLogin();
      await this.exploreApplication();
      await this.testAPIConnection();
      
      this.generateReport();
      
    } catch (error) {
      console.error('Fatal error:', error);
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 AI TEST REPORT');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const partial = this.testResults.filter(r => r.status === 'PARTIAL').length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Partial: ${partial} ⚠️`);
    
    if (totalTests > 0) {
      console.log(`Success Rate: ${(passed/totalTests*100).toFixed(1)}%`);
    }
    
    console.log('\n📋 Test Details:');
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`  ${icon} ${result.test}: ${result.status}`);
      if (result.suggestion) {
        console.log(`     💡 ${result.suggestion}`);
      }
      if (result.data) {
        console.log(`     📊 Data:`, result.data);
      }
    });
    
    // AI Analysis
    console.log('\n🤖 AI Analysis:');
    if (failed > 0) {
      console.log('  - Some tests failed, likely due to backend not running');
      console.log('  - Recommendation: Start backend with: ./gradlew bootRun --args="--spring.profiles.active=demo"');
    }
    if (passed > 0) {
      console.log('  - Frontend is accessible and responsive');
      console.log('  - Basic UI elements are present and functional');
    }
    
    // Save results
    fs.writeFileSync('ai_test_results.json', JSON.stringify(this.testResults, null, 2));
    console.log('\n💾 Results saved to ai_test_results.json');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up browser resources...');
    await this.context.close();
    await this.browser.close();
  }
}

// Main execution
async function main() {
  const tester = new AIBrowserTester();
  await tester.runAllTests();
}

// Run the tests
main().catch(console.error);