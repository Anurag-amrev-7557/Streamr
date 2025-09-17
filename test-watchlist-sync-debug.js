const axios = require('axios');

// Configuration
const BASE_URL = 'https://streamr-jjj9.onrender.com/api';
let authToken = null;

// Helper function to make requests
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error ${method} ${endpoint}:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
      errors: error.response?.data?.errors,
      headers: error.response?.headers
    });
    throw error;
  }
};

// Test authentication flow
const testAuth = async () => {
  console.log('🔐 Testing Authentication...');
  
  try {
    // Test user data
    const testUser = {
      username: 'watchlisttest',
      email: 'watchlisttest@example.com',
      password: 'TestPassword123!'
    };

    // Try to register the user
    console.log('📝 Registering test user...');
    try {
      const registerResponse = await makeRequest('POST', '/auth/register', testUser);
      console.log('✅ User registered:', registerResponse.data.username);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ User already exists, proceeding with login...');
      } else {
        console.log('❌ Registration failed with details:', error.response?.data);
        throw error;
      }
    }

    // Login
    console.log('🔑 Logging in...');
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    
    authToken = loginResponse.data.accessToken;
    console.log('✅ Login successful, token received');
    console.log('🔑 Token preview:', authToken ? `${authToken.substring(0, 20)}...` : 'No token');
    
    return true;
  } catch (error) {
    console.log('❌ Authentication failed');
    return false;
  }
};

// Test watchlist functionality
const testWatchlist = async () => {
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }

  console.log('\n📝 Testing Watchlist Functionality...');
  
  try {
    // Test movie data
    const testMovie = {
      id: 550,
      title: 'Fight Club',
      type: 'movie',
      poster_path: '/pB8BM7pdM6DU9m0sr0X0FfHKgYo.jpg',
      backdrop_path: '/52AfXWuXCHn3DU9m0sr0X0FfHKgYo.jpg',
      overview: 'A ticking-time-bomb insomniac and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
      year: '1999',
      rating: 8.8,
      genres: ['Drama'],
      release_date: '1999-10-15',
      duration: '2h 19m',
      addedAt: new Date().toISOString()
    };

    // Test 1: Add movie to watchlist
    console.log('📝 Test 1: Adding movie to watchlist...');
    const addResponse = await makeRequest('POST', '/user/watchlist', 
      { movieData: testMovie },
      { 'Authorization': `Bearer ${authToken}` }
    );
    console.log('✅ Movie added to watchlist:', addResponse.message);

    // Test 2: Get watchlist
    console.log('📝 Test 2: Getting watchlist...');
    const getResponse = await makeRequest('GET', '/user/watchlist', 
      null,
      { 'Authorization': `Bearer ${authToken}` }
    );
    console.log('✅ Watchlist retrieved:', getResponse.data.watchlist.length, 'items');

    // Test 3: Sync watchlist
    console.log('📝 Test 3: Syncing watchlist...');
    const syncResponse = await makeRequest('POST', '/user/watchlist/sync', 
      { watchlist: [testMovie] },
      { 'Authorization': `Bearer ${authToken}` }
    );
    console.log('✅ Watchlist synced:', syncResponse.message);

    // Test 4: Remove movie from watchlist
    console.log('📝 Test 4: Removing movie from watchlist...');
    const removeResponse = await makeRequest('DELETE', `/user/watchlist/${testMovie.id}`, 
      null,
      { 'Authorization': `Bearer ${authToken}` }
    );
    console.log('✅ Movie removed from watchlist:', removeResponse.message);

    return true;
  } catch (error) {
    console.log('❌ Watchlist test failed');
    return false;
  }
};

// Test without authentication
const testUnauthenticated = async () => {
  console.log('\n🚫 Testing Unauthenticated Access...');
  
  try {
    // Test 1: Try to get watchlist without token
    console.log('📝 Test 1: Getting watchlist without token...');
    try {
      await makeRequest('GET', '/user/watchlist');
      console.log('❌ Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    // Test 2: Try to sync watchlist without token
    console.log('📝 Test 2: Syncing watchlist without token...');
    try {
      await makeRequest('POST', '/user/watchlist/sync', { watchlist: [] });
      console.log('❌ Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthenticated request');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    return true;
  } catch (error) {
    console.log('❌ Unauthenticated test failed');
    return false;
  }
};

// Main test function
const runTests = async () => {
  console.log('🧪 Starting Watchlist Sync Debug Tests...\n');
  
  try {
    // Test 1: Authentication
    const authSuccess = await testAuth();
    if (!authSuccess) {
      console.log('❌ Authentication failed, cannot continue with watchlist tests');
      return;
    }

    // Test 2: Watchlist functionality
    const watchlistSuccess = await testWatchlist();
    if (!watchlistSuccess) {
      console.log('❌ Watchlist tests failed');
      return;
    }

    // Test 3: Unauthenticated access
    await testUnauthenticated();

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
};

// Run the tests
runTests();
