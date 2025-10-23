const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
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
      data: error.response?.data
    });
    throw error;
  }
};

// Test user registration and login
const testAuth = async () => {
  console.log('🔐 Testing Authentication...');
  
  try {
    // Test user data
    const testUser = {
      username: 'watchlisttest',
      email: 'watchlisttest@example.com',
      password: 'testpassword123'
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
        throw error;
      }
    }

    // Login
    console.log('🔑 Logging in...');
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
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
      tmdbId: 550,
      type: 'movie',
      contentData: {
        title: 'Fight Club',
        name: 'Fight Club',
        overview: 'A ticking-time-bomb insomniac and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
        posterPath: '/pB8BM7pdM6DU9m0sr0X0FfHKgYo.jpg',
        backdropPath: '/52AfXWuXCHn3DU9m0sr0X0FfHKgYo.jpg',
        releaseDate: '1999-10-15',
        rating: 8.8,
        genres: ['Drama'],
        runtime: 139
      }
    };

    // Add to watchlist
    console.log('➕ Adding movie to watchlist...');
    const addResponse = await makeRequest('POST', '/user/watchlist', testMovie, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('✅ Added to watchlist:', addResponse.data.title);
    
    // Get watchlist
    console.log('📋 Fetching watchlist...');
    const watchlistResponse = await makeRequest('GET', '/user/watchlist', null, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('✅ Watchlist retrieved:', watchlistResponse.data.count, 'items');
    
    // Remove from watchlist
    const contentId = addResponse.data.contentId;
    console.log('🗑️ Removing from watchlist...');
    await makeRequest('DELETE', `/user/watchlist/${contentId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('✅ Removed from watchlist');
    
    return true;
  } catch (error) {
    console.log('❌ Watchlist test failed');
    return false;
  }
};

// Test watch history functionality
const testWatchHistory = async () => {
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }

  console.log('\n📺 Testing Watch History Functionality...');
  
  try {
    // Test movie data
    const testMovie = {
      tmdbId: 13,
      type: 'movie',
      contentData: {
        title: 'Forrest Gump',
        name: 'Forrest Gump',
        overview: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.',
        posterPath: '/arw2CU9m0sr0X0FfHKgYo.jpg',
        backdropPath: '/yE5d3BUhE8hCnkMUJOoBrQDotDZ.jpg',
        releaseDate: '1994-06-23',
        rating: 8.8,
        genres: ['Drama', 'Romance'],
        runtime: 142
      }
    };

    // Update watch history
    console.log('📺 Updating watch history...');
    const historyResponse = await makeRequest('POST', '/user/watch-history', {
      ...testMovie,
      progress: 75
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('✅ Watch history updated:', historyResponse.data.progress, '%');
    
    // Get watch history
    console.log('📚 Fetching watch history...');
    const getHistoryResponse = await makeRequest('GET', '/user/watch-history', null, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('✅ Watch history retrieved:', getHistoryResponse.data.count, 'items');
    
    // Get watch stats
    console.log('📊 Fetching watch statistics...');
    const statsResponse = await makeRequest('GET', '/user/watch-stats', null, {
      'Authorization': `Bearer ${authToken}`
    });
    console.log('✅ Watch stats retrieved:', {
      totalWatched: statsResponse.data.totalWatched,
      totalWatchlist: statsResponse.data.totalWatchlist,
      averageRating: statsResponse.data.averageRating
    });
    
    return true;
  } catch (error) {
    console.log('❌ Watch history test failed');
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Watchlist Authentication Tests...\n');
  
  try {
    // Test authentication first
    const authSuccess = await testAuth();
    if (!authSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }
    
    // Run all tests
    const results = await Promise.all([
      testWatchlist(),
      testWatchHistory()
    ]);
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('Authentication:', authSuccess ? '✅ PASS' : '❌ FAIL');
    console.log('Watchlist Operations:', results[0] ? '✅ PASS' : '❌ FAIL');
    console.log('Watch History Operations:', results[1] ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = results.every(result => result);
    if (allPassed) {
      console.log('\n🎉 All tests passed! Watch history and wishlist functionality is working correctly.');
      console.log('\n🔍 If the frontend is still not working, check:');
      console.log('1. Frontend is using the correct API URL (localhost:3001)');
      console.log('2. User is properly authenticated in the frontend');
      console.log('3. Browser console for any JavaScript errors');
      console.log('4. Network tab for API request/response details');
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed with error:', error.message);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testAuth,
  testWatchlist,
  testWatchHistory
};
