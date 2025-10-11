#!/usr/bin/env node
/**
 * AI-Driven Browser Test using Playwright
 * This demonstrates AI (Claude) controlling a real browser
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class AIBrowserTester {
  constructor() {
    this.frontendUrl = 'http://localhost:5174';
    this.backendUrl = 'http://localhost:8084';
    this.testResults = [];
  }

  async setupBrowser() {
    console.log('🚀 Launching browser...');
    this.browser = await chromium.launch({
      headless: false, // Show browser for visibility
      slowMo: 500, // Slow down for human visibility
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: './test-videos' }
    });
    
    this.page = await this.context.newPage();
  }

  async testLoginFlow(role) {
    console.log(`\n🔐 Testing login as ${role}...`);
    
    const credentials = {
      tutor: { email: 'tutor@example.com', password: 'Tutor123!' },
      lecturer: { email: 'lecturer@example.com', password: 'Lecturer123!' },
      admin: { email: 'admin@example.com', password: 'Admin123!' }
    };
    
    const { email, password } = credentials[role] || credentials.tutor;
    
    try {
      // Navigate to login
      await this.page.goto(this.frontendUrl);
      await this.page.waitForLoadState('networkidle');
      
      // Fill login form
      await this.page.fill('input[name="email"]', email);
      await this.page.fill('input[name="password"]', password);
      
      // Screenshot before login
      await this.page.screenshot({ 
        path: `screenshots/login_${role}_before.png` 
      });
      
      // Click login
      await this.page.click('button[type="submit"]');
      
      // Wait for dashboard
      await this.page.waitForURL('**/dashboard/**', { timeout: 5000 });
      
      console.log(`✅ Login successful for ${role}`);
      
      // Screenshot after login
      await this.page.screenshot({ 
        path: `screenshots/dashboard_${role}.png` 
      });
      
      this.testResults.push({
        test: `login_${role}`,
        status: 'PASS',
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.log(`❌ Login failed for ${role}: ${error.message}`);
      await this.page.screenshot({ 
        path: `screenshots/login_${role}_failed.png` 
      });
      
      this.testResults.push({
        test: `login_${role}`,
        status: 'FAIL',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  async testDashboardInteraction() {
    console.log('\n📊 Testing dashboard interaction...');
    
    try {
      // Wait for dashboard to load
      await this.page.waitForSelector('table, .dashboard', { timeout: 5000 });
      
      // Check if timesheets are displayed
      const timesheetRows = await this.page.$$('tbody tr');
      console.log(`Found ${timesheetRows.length} timesheet rows`);
      
      // Try to interact with first row if exists
      if (timesheetRows.length > 0) {
        const firstRow = timesheetRows[0];
        
        // Check for action buttons
        const buttons = await firstRow.$$('button');
        console.log(`Found ${buttons.length} action buttons in first row`);
        
        // Take screenshot of dashboard
        await this.page.screenshot({ 
          path: 'screenshots/dashboard_with_data.png' 
        });
        
        this.testResults.push({
          test: 'dashboard_interaction',
          status: 'PASS',
          data: { rows: timesheetRows.length, buttons: buttons.length },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.log(`❌ Dashboard interaction failed: ${error.message}`);
      this.testResults.push({
        test: 'dashboard_interaction',
        status: 'FAIL',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async intelligentExploration() {
    console.log('\n🤖 AI Intelligent Exploration...');
    
    try {
      // Get all clickable elements
      const buttons = await this.page.$$('button:visible');
      const links = await this.page.$$('a:visible');
      
      console.log(`Found: ${buttons.length} buttons, ${links.length} links`);
      
      // AI decides to click a random button
      if (buttons.length > 0) {
        const randomIndex = Math.floor(Math.random() * buttons.length);
        const button = buttons[randomIndex];
        const buttonText = await button.textContent();
        
        console.log(`🎲 AI decides to click: "${buttonText}"`);
        
        // Screenshot before
        await this.page.screenshot({ 
          path: 'screenshots/ai_exploration_before.png' 
        });
        
        try {
          await button.click();
          await this.page.waitForTimeout(2000);
          
          // Screenshot after
          await this.page.screenshot({ 
            path: 'screenshots/ai_exploration_after.png' 
          });
          
          console.log(`✅ Successfully clicked "${buttonText}"`);
        } catch (error) {
          console.log(`⚠️ Could not click "${buttonText}"`);
        }
      }
      
      // Check current URL
      console.log(`Current URL: ${this.page.url()}`);
      
    } catch (error) {
      console.log(`❌ Exploration failed: ${error.message}`);
    }
  }

  async testLogout() {
    console.log('\n🚪 Testing logout...');
    
    try {
      const logoutButton = await this.page.$('button:has-text("Logout"), a:has-text("Logout")');
      
      if (logoutButton) {
        await logoutButton.click();
        await this.page.waitForTimeout(2000);
        
        if (this.page.url().includes('login')) {
          console.log('✅ Logout successful');
          this.testResults.push({
            test: 'logout',
            status: 'PASS',
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('❌ Logout failed - still on dashboard');
          this.testResults.push({
            test: 'logout',
            status: 'FAIL',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.log(`❌ Logout test failed: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting AI-Driven Browser Tests');
    console.log('='.repeat(50));
    
    try {
      await this.setupBrowser();
      
      // Test with different roles
      const roles = ['tutor', 'lecturer', 'admin'];
      
      for (const role of roles) {
        const loginSuccess = await this.testLoginFlow(role);
        
        if (loginSuccess) {
          await this.testDashboardInteraction();
          await this.intelligentExploration();
          await this.testLogout();
        }
      }
      
      this.generateReport();
      
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST REPORT');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${(passed/totalTests*100).toFixed(1)}%`);
    
    // Save results
    fs.writeFileSync('test_results.json', JSON.stringify(this.testResults, null, 2));
    console.log('\nDetailed results saved to test_results.json');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    await this.context.close();
    await this.browser.close();
  }
}

// Main execution
async function main() {
  // Create directories
  ['screenshots', 'test-videos'].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  const tester = new AIBrowserTester();
  await tester.runAllTests();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AIBrowserTester };