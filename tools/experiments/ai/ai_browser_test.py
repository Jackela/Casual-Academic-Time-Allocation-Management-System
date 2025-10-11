#!/usr/bin/env python3
"""
AI-Driven Browser Automation Test
This script demonstrates AI controlling a real browser through Playwright
"""

import asyncio
import json
import random
from playwright.async_api import async_playwright, Page, BrowserContext
from datetime import datetime, timedelta

class AIBrowserTester:
    def __init__(self):
        self.frontend_url = "http://localhost:5174"
        self.backend_url = "http://localhost:8084"
        self.test_results = []
        
    async def setup_browser(self):
        """Initialize browser with Playwright"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=False,  # Show browser for visibility
            slow_mo=500  # Slow down actions for human visibility
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            record_video_dir='./test-videos'
        )
        self.page = await self.context.new_page()
        
    async def test_login_flow(self, role: str):
        """Test login for different user roles"""
        print(f"\n🔐 Testing login as {role}...")
        
        credentials = {
            'tutor': ('tutor@example.com', 'Tutor123!'),
            'lecturer': ('lecturer@example.com', 'Lecturer123!'),
            'admin': ('admin@example.com', 'Admin123!')
        }
        
        email, password = credentials.get(role, credentials['tutor'])
        
        # Navigate to login
        await self.page.goto(self.frontend_url)
        await self.page.wait_for_load_state('networkidle')
        
        # Check if we're on login page
        if 'login' not in self.page.url.lower():
            await self.page.goto(f"{self.frontend_url}/login")
        
        # Fill login form
        await self.page.fill('input[name="email"]', email)
        await self.page.fill('input[name="password"]', password)
        
        # Take screenshot before login
        await self.page.screenshot(path=f'screenshots/login_{role}_before.png')
        
        # Click login button
        await self.page.click('button[type="submit"]')
        
        # Wait for navigation
        try:
            await self.page.wait_for_url('**/dashboard/**', timeout=5000)
            print(f"✅ Login successful for {role}")
            
            # Take screenshot after login
            await self.page.screenshot(path=f'screenshots/dashboard_{role}.png')
            
            self.test_results.append({
                'test': f'login_{role}',
                'status': 'PASS',
                'timestamp': datetime.now().isoformat()
            })
            return True
        except:
            print(f"❌ Login failed for {role}")
            await self.page.screenshot(path=f'screenshots/login_{role}_failed.png')
            self.test_results.append({
                'test': f'login_{role}',
                'status': 'FAIL',
                'timestamp': datetime.now().isoformat()
            })
            return False
    
    async def test_timesheet_creation(self):
        """Test creating a new timesheet"""
        print("\n📝 Testing timesheet creation...")
        
        # Ensure we're logged in as tutor
        if 'dashboard' not in self.page.url:
            await self.test_login_flow('tutor')
        
        # Look for create button
        create_button = self.page.locator('button:has-text("Create"), button:has-text("New Timesheet")')
        
        if await create_button.count() > 0:
            await create_button.first.click()
            
            # Fill timesheet form
            await self.page.fill('input[name="hours"]', str(random.randint(5, 20)))
            await self.page.fill('input[name="hourlyRate"]', str(random.randint(40, 60)))
            await self.page.fill('textarea[name="description"], input[name="description"]', 
                               f"AI Test Timesheet - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
            
            # Select week start date
            week_start = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime('%Y-%m-%d')
            date_input = self.page.locator('input[type="date"], input[name="weekStartDate"]')
            if await date_input.count() > 0:
                await date_input.fill(week_start)
            
            # Submit form
            await self.page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")')
            
            # Check for success
            await self.page.wait_for_timeout(2000)
            
            success = await self.page.locator('.success, .alert-success, :text("success")').count() > 0
            
            if success:
                print("✅ Timesheet created successfully")
                self.test_results.append({
                    'test': 'timesheet_creation',
                    'status': 'PASS',
                    'timestamp': datetime.now().isoformat()
                })
            else:
                print("⚠️ Timesheet creation result unclear")
                self.test_results.append({
                    'test': 'timesheet_creation',
                    'status': 'UNKNOWN',
                    'timestamp': datetime.now().isoformat()
                })
        else:
            print("❌ Create button not found")
            self.test_results.append({
                'test': 'timesheet_creation',
                'status': 'FAIL',
                'error': 'Create button not found',
                'timestamp': datetime.now().isoformat()
            })
    
    async def test_navigation(self):
        """Test navigation through different pages"""
        print("\n🧭 Testing navigation...")
        
        # Test different navigation links
        nav_items = [
            ('Dashboard', 'dashboard'),
            ('Timesheets', 'timesheet'),
            ('Profile', 'profile'),
        ]
        
        for link_text, expected_url in nav_items:
            link = self.page.locator(f'a:has-text("{link_text}"), button:has-text("{link_text}")')
            
            if await link.count() > 0:
                await link.first.click()
                await self.page.wait_for_timeout(1000)
                
                if expected_url in self.page.url.lower():
                    print(f"✅ Navigation to {link_text} successful")
                else:
                    print(f"⚠️ Navigation to {link_text} - unexpected URL: {self.page.url}")
            else:
                print(f"❌ Navigation link '{link_text}' not found")
    
    async def test_logout(self):
        """Test logout functionality"""
        print("\n🚪 Testing logout...")
        
        logout_button = self.page.locator('button:has-text("Logout"), a:has-text("Logout")')
        
        if await logout_button.count() > 0:
            await logout_button.first.click()
            await self.page.wait_for_timeout(2000)
            
            if 'login' in self.page.url.lower():
                print("✅ Logout successful")
                self.test_results.append({
                    'test': 'logout',
                    'status': 'PASS',
                    'timestamp': datetime.now().isoformat()
                })
            else:
                print("❌ Logout failed - still on dashboard")
                self.test_results.append({
                    'test': 'logout',
                    'status': 'FAIL',
                    'timestamp': datetime.now().isoformat()
                })
    
    async def intelligent_exploration(self):
        """AI explores the application intelligently"""
        print("\n🤖 AI Intelligent Exploration...")
        
        # Get all interactive elements
        buttons = await self.page.locator('button:visible').all()
        links = await self.page.locator('a:visible').all()
        inputs = await self.page.locator('input:visible, textarea:visible').all()
        
        print(f"Found: {len(buttons)} buttons, {len(links)} links, {len(inputs)} inputs")
        
        # Randomly interact with elements
        if buttons:
            random_button = random.choice(buttons)
            button_text = await random_button.text_content()
            print(f"🎲 AI decides to click: '{button_text}'")
            
            # Take screenshot before action
            await self.page.screenshot(path='screenshots/ai_exploration_before.png')
            
            try:
                await random_button.click()
                await self.page.wait_for_timeout(2000)
                print(f"✅ Successfully clicked '{button_text}'")
                
                # Take screenshot after action
                await self.page.screenshot(path='screenshots/ai_exploration_after.png')
            except:
                print(f"❌ Failed to click '{button_text}'")
    
    async def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting AI-Driven Browser Tests")
        print("=" * 50)
        
        try:
            await self.setup_browser()
            
            # Test different user roles
            for role in ['tutor', 'lecturer', 'admin']:
                if await self.test_login_flow(role):
                    await self.test_navigation()
                    
                    if role == 'tutor':
                        await self.test_timesheet_creation()
                    
                    await self.intelligent_exploration()
                    await self.test_logout()
            
            # Generate report
            self.generate_report()
            
        finally:
            await self.cleanup()
    
    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 50)
        print("📊 TEST REPORT")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['status'] == 'PASS')
        failed = sum(1 for r in self.test_results if r['status'] == 'FAIL')
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total_tests*100):.1f}%")
        
        # Save results to JSON
        with open('test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        print("\nDetailed results saved to test_results.json")
        print("Screenshots saved in screenshots/")
        print("Videos saved in test-videos/")
    
    async def cleanup(self):
        """Clean up browser resources"""
        await self.context.close()
        await self.browser.close()
        await self.playwright.stop()

async def main():
    tester = AIBrowserTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    # Create directories for outputs
    import os
    os.makedirs('screenshots', exist_ok=True)
    os.makedirs('test-videos', exist_ok=True)
    
    # Run tests
    asyncio.run(main())