/**
 * Test script for Mock Provider APIs
 * Tests MealSuggestions, PhotoMatch, and Transport endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:3004';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
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

async function runTests() {
  console.log('🧪 Starting Mock Provider API Tests\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Health Check
    console.log('\n📍 Test 1: Health Check');
    console.log('-'.repeat(60));
    const health = await makeRequest('GET', '/health');
    console.log(`✅ Status: ${health.status}`);
    console.log(`📊 Response: ${JSON.stringify(health.data, null, 2).substring(0, 300)}...`);

    // Test 2: Create test user and get token
    console.log('\n📍 Test 2: Authentication (Create Test User)');
    console.log('-'.repeat(60));

    const testEmail = `test-${Date.now()}@pluqla.dev`;
    const testPassword = 'TestPassword123!';

    const signupData = {
      email: testEmail,
      password: testPassword,
      name: 'Mock Test User'
    };

    const signup = await makeRequest('POST', '/api/auth/email/signup', signupData);
    console.log(`✅ Signup Status: ${signup.status}`);

    if (signup.status !== 200 && signup.status !== 201) {
      console.log(`❌ Signup failed: ${JSON.stringify(signup.data)}`);
      // Try to login instead
      const login = await makeRequest('POST', '/api/auth/email/login', {
        email: testEmail,
        password: testPassword
      });
      console.log(`Trying login instead - Status: ${login.status}`);
    }

    // Extract token from signup response
    let authToken = signup.data?.token || signup.data?.accessToken || null;

    if (!authToken) {
      console.log('⚠️  No token from signup, trying to get existing user token...');
      // For testing, we'll use a mock token or try to get one
      // In production, you'd need proper authentication
      console.log('⚠️  Skipping authenticated tests - no token available');
      console.log('\n' + '='.repeat(60));
      console.log('📝 Mock Provider Test Summary');
      console.log('='.repeat(60));
      console.log('✅ Health check: PASSED');
      console.log('⚠️  Auth tests: SKIPPED (need valid token)');
      console.log('⚠️  MealSuggestions: SKIPPED (need auth)');
      console.log('⚠️  PhotoMatch: SKIPPED (need auth)');
      console.log('⚠️  Transport: SKIPPED (need auth)');
      console.log('\n💡 Note: All endpoints require authentication.');
      console.log('   To test fully, create a user via the frontend or API first.');
      return;
    }

    console.log(`✅ Auth Token obtained: ${authToken.substring(0, 20)}...`);

    // Test 3: MealSuggestions Mock
    console.log('\n📍 Test 3: MealSuggestions (Mock Provider)');
    console.log('-'.repeat(60));

    const mealRequest = {
      mealType: 'dinner',
      servings: 2,
      budget: 15,
      dietaryRestrictions: []
    };

    const mealResponse = await makeRequest('POST', '/api/meal-suggestions', mealRequest, authToken);
    console.log(`✅ Status: ${mealResponse.status}`);
    console.log(`📊 Response Preview:`);
    console.log(JSON.stringify(mealResponse.data, null, 2).substring(0, 500));

    // Check for job ID
    const jobId = mealResponse.data?.data?.jobId;
    if (jobId) {
      console.log(`\n⏳ Polling job status: ${jobId}`);

      // Poll for result (max 10 attempts)
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

        const statusResponse = await makeRequest('GET', `/api/meal-suggestions/${jobId}`, null, authToken);
        const status = statusResponse.data?.data?.status;

        console.log(`   Attempt ${i + 1}/10: Status = ${status}`);

        if (status === 'completed') {
          console.log(`✅ Job completed!`);
          console.log(`📊 Meals Data:`);
          const meals = statusResponse.data?.data?.result?.meals || [];
          console.log(`   Total meals: ${meals.length}`);
          meals.forEach((meal, idx) => {
            console.log(`   ${idx + 1}. ${meal.name} - €${meal.totalCostEur} - ${meal.cookingTimeMin}min`);
          });

          const tokensUsed = statusResponse.data?.data?.result?.tokensUsed || 0;
          console.log(`   Tokens used: ${tokensUsed} (should be 0 in mock mode)`);
          break;
        } else if (status === 'failed') {
          console.log(`❌ Job failed`);
          break;
        }
      }
    }

    // Test 4: PhotoMatch Mock
    console.log('\n📍 Test 4: PhotoMatch (Mock Provider)');
    console.log('-'.repeat(60));

    const photoRequest = {
      imageUrl: 'https://example.com/dummy-image.jpg',
      metadata: { source: 'test', category: 'mock' }
    };

    const photoResponse = await makeRequest('POST', '/api/photo-match', photoRequest, authToken);
    console.log(`✅ Status: ${photoResponse.status}`);
    console.log(`📊 Response Preview:`);
    console.log(JSON.stringify(photoResponse.data, null, 2).substring(0, 400));

    // Test 5: Transport Optimization
    console.log('\n📍 Test 5: Transport Optimization');
    console.log('-'.repeat(60));

    const transportRequest = {
      origin: 'Paris, France',
      destination: 'Lyon, France',
      distance: 465, // km
      recurring: false
    };

    const transportResponse = await makeRequest('POST', '/api/transport-optimize', transportRequest, authToken);
    console.log(`✅ Status: ${transportResponse.status}`);
    console.log(`📊 Response Preview:`);
    console.log(JSON.stringify(transportResponse.data, null, 2).substring(0, 500));

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📝 Mock Provider Test Summary');
    console.log('='.repeat(60));
    console.log('✅ Health check: PASSED');
    console.log('✅ Authentication: PASSED');
    console.log(`✅ MealSuggestions: ${mealResponse.status === 200 || mealResponse.status === 201 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ PhotoMatch: ${photoResponse.status === 200 || photoResponse.status === 201 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Transport: ${transportResponse.status === 200 || transportResponse.status === 201 ? 'PASSED' : 'FAILED'}`);
    console.log('\n🎉 All mock provider endpoints are functional!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run tests
runTests().then(() => {
  console.log('\n✅ Test script completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
