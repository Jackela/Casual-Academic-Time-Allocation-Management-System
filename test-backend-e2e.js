#!/usr/bin/env node

// Simple script to test backend E2E endpoints
const http = require('http');

const baseUrl = 'http://localhost:8084';

async function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8084,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testBackend() {
  console.log('🧪 Testing Backend E2E Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthRes = await makeRequest('/actuator/health');
    console.log(`   Status: ${healthRes.status}`);
    if (healthRes.status === 200) {
      console.log('   ✅ Health check passed');
    } else {
      console.log('   ❌ Health check failed');
    }

    // Test 2: H2 Console (E2E profile indicator)
    console.log('\n2. Testing H2 Console (E2E profile indicator)...');
    const h2Res = await makeRequest('/h2-console');
    console.log(`   Status: ${h2Res.status}`);
    if (h2Res.status === 200) {
      console.log('   ✅ H2 Console accessible - E2E profile active');
    } else {
      console.log('   ❌ H2 Console not accessible - may not be E2E profile');
    }

    // Test 3: Login endpoint
    console.log('\n3. Testing login with E2E credentials...');
    const loginData = {
      email: 'lecturer@example.com',
      password: 'Lecturer123!'
    };
    const loginRes = await makeRequest('/api/auth/login', 'POST', loginData);
    console.log(`   Status: ${loginRes.status}`);
    console.log(`   Response: ${loginRes.data.substring(0, 200)}...`);
    
    let token = null;
    if (loginRes.status === 200) {
      try {
        const parsedLogin = JSON.parse(loginRes.data);
        token = parsedLogin.token || parsedLogin.accessToken || parsedLogin.jwt;
        console.log('   ✅ Login successful, token received');
      } catch (e) {
        console.log('   ❌ Login response not valid JSON');
      }
    } else {
      console.log('   ❌ Login failed');
    }

    // Test 4: Pending timesheets endpoint (requires auth)
    if (token) {
      console.log('\n4. Testing pending timesheets with authentication...');
      const timesheetsRes = await makeRequest('/api/timesheets/pending-approval', 'GET', null, {
        'Authorization': `Bearer ${token}`
      });
      console.log(`   Status: ${timesheetsRes.status}`);
      console.log(`   Response: ${timesheetsRes.data.substring(0, 300)}...`);
      
      if (timesheetsRes.status === 200) {
        try {
          const parsedTimesheets = JSON.parse(timesheetsRes.data);
          const count = parsedTimesheets.timesheets ? parsedTimesheets.timesheets.length : 0;
          console.log(`   ✅ Pending timesheets endpoint working - found ${count} timesheets`);
        } catch (e) {
          console.log('   ⚠️ Response received but not valid JSON');
        }
      } else {
        console.log('   ❌ Pending timesheets endpoint failed');
      }
    } else {
      console.log('\n4. Skipping timesheets test - no auth token');
    }

    console.log('\n🎯 Backend E2E Test Summary:');
    console.log('   - If all tests pass, the backend is ready for E2E testing');
    console.log('   - If health/H2 fail, backend may not be running or not in E2E profile');
    console.log('   - If login fails, test data may not be initialized');
    console.log('   - If timesheets fail, there may be no test data or permissions issue');

  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    console.error('   Make sure backend is running with: mvn spring-boot:run -Dspring-boot.run.arguments=--spring.profiles.active=e2e');
  }
}

testBackend();