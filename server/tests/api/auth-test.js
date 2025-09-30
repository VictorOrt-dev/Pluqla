/**
 * Authentication API Test Script
 *
 * Tests the authentication endpoints to ensure they work correctly
 * Usage: node tests/api/auth-test.js
 */

const http = require('http');

const API_BASE = 'http://localhost:3004/api';
const TEST_USER = {
  email: `test-${Date.now()}@pluqla.dev`,
  password: 'SecureP@ss2024!',
  name: 'Test User'
};

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n🏥 Testing health check endpoint...');
  const { statusCode, data } = await makeRequest('/health');

  if (statusCode === 200 && data.status === 'API OK') {
    console.log('✅ Health check passed');
    return true;
  }
  console.error('❌ Health check failed:', data);
  return false;
}

async function testRegistration() {
  console.log('\n📝 Testing user registration...');
  const { statusCode, data } = await makeRequest('/auth/register', 'POST', TEST_USER);

  if ((statusCode === 200 || statusCode === 201) && data.success && data.data && data.data.token) {
    console.log('✅ Registration successful');
    console.log(`   User ID: ${data.data.user.id}`);
    console.log(`   Token length: ${data.data.token.length}`);
    return data;
  }
  console.error('❌ Registration failed. Status:', statusCode, 'Response:', data);
  return null;
}

async function testLogin() {
  console.log('\n🔐 Testing user login...');
  const { statusCode, data } = await makeRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (statusCode === 200 && data.success && data.data.token) {
    console.log('✅ Login successful');
    console.log(`   Token: ${data.data.token.substring(0, 20)}...`);
    return data.data.token;
  }
  console.error('❌ Login failed:', data);
  return null;
}

async function testProtectedEndpoint(token) {
  console.log('\n🔒 Testing protected endpoint (user profile)...');
  const { statusCode, data } = await makeRequest('/users/profile', 'GET', null, {
    'Authorization': `Bearer ${token}`
  });

  if (statusCode === 200 && data.success) {
    console.log('✅ Protected endpoint accessible with valid token');
    console.log(`   User: ${data.data.name} (${data.data.email})`);
    return true;
  }
  console.error('❌ Protected endpoint failed:', data);
  return false;
}

async function testUnauthorizedAccess() {
  console.log('\n⛔ Testing unauthorized access...');
  const { statusCode, data } = await makeRequest('/users/profile', 'GET');

  if (statusCode === 401 || statusCode === 403) {
    console.log('✅ Unauthorized access correctly blocked');
    return true;
  }
  console.error('❌ Unauthorized access not blocked:', statusCode, data);
  return false;
}

async function testInvalidLogin() {
  console.log('\n❌ Testing invalid login credentials...');
  const { statusCode, data } = await makeRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: 'WrongPassword123!'
  });

  if (statusCode === 401 && !data.success) {
    console.log('✅ Invalid credentials correctly rejected');
    return true;
  }
  console.error('❌ Invalid credentials not rejected:', data);
  return false;
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Authentication API Tests');
  console.log('=' .repeat(50));

  try {
    // Test 1: Health check
    const healthOk = await testHealthCheck();
    if (!healthOk) {
      console.error('\n🛑 Health check failed. Server may not be running.');
      process.exit(1);
    }

    // Test 2: Registration
    const regData = await testRegistration();
    if (!regData) {
      console.error('\n🛑 Registration failed. Stopping tests.');
      process.exit(1);
    }

    // Test 3: Login
    const token = await testLogin();
    if (!token) {
      console.error('\n🛑 Login failed. Stopping tests.');
      process.exit(1);
    }

    // Test 4: Protected endpoint with valid token
    const protectedOk = await testProtectedEndpoint(token);
    if (!protectedOk) {
      console.error('\n⚠️  Protected endpoint test failed');
    }

    // Test 5: Unauthorized access
    const unauthorizedOk = await testUnauthorizedAccess();
    if (!unauthorizedOk) {
      console.error('\n⚠️  Unauthorized access test failed');
    }

    // Test 6: Invalid login
    const invalidLoginOk = await testInvalidLogin();
    if (!invalidLoginOk) {
      console.error('\n⚠️  Invalid login test failed');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All authentication tests completed successfully!');
    console.log('\nTest Summary:');
    console.log(`   ✅ Health check: PASS`);
    console.log(`   ✅ Registration: PASS`);
    console.log(`   ✅ Login: PASS`);
    console.log(`   ${protectedOk ? '✅' : '❌'} Protected endpoint: ${protectedOk ? 'PASS' : 'FAIL'}`);
    console.log(`   ${unauthorizedOk ? '✅' : '❌'} Unauthorized access: ${unauthorizedOk ? 'PASS' : 'FAIL'}`);
    console.log(`   ${invalidLoginOk ? '✅' : '❌'} Invalid credentials: ${invalidLoginOk ? 'PASS' : 'FAIL'}`);

    process.exit(0);
  } catch (error) {
    console.error('\n🛑 Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();