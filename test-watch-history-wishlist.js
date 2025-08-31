const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

let authToken = null;

// Helper function to make authenticated requests
const makeAuthRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const testAuthentication = async () => {
  console.log('\n🔐 Testing Authentication...');
  
  try {
    // Login
    const loginResponse = await makeAuthRequest('POST', '/auth/login', TEST_USER);
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get profile to verify token
    const profileResponse = await makeAuthRequest('GET', '/user/profile');
    console.log('✅ Profile retrieved:', profileResponse.data.username);
    
    return true;
  } catch (error) {
    console.log('❌ Authentication failed');
    return false;
  }
};

const testWatchlistOperations = async () => {
  console.log('\n📝 Testing Watchlist Operations...');
  
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
        backdropPath: '/52AfXWuXCHn3UjD17rBruA9f5qb.jpg',
        releaseDate: '1999-10-15',
        rating: 8.8,
        genres: ['Drama'],
        runtime: 139
      }
    };

    // Add to watchlist
    console.log('Adding movie to watchlist...');
    const addResponse = await makeAuthRequest('POST', '/user/watchlist', testMovie);
    console.log('✅ Added to watchlist:', addResponse.data.title);
    
    // Get watchlist
    console.log('Fetching watchlist...');
    const watchlistResponse = await makeAuthRequest('GET', '/user/watchlist');
    console.log('✅ Watchlist retrieved:', watchlistResponse.data.count, 'items');
    
    // Remove from watchlist
    const contentId = addResponse.data.contentId;
    console.log('Removing from watchlist...');
    await makeAuthRequest('DELETE', `/user/watchlist/${contentId}`);
    console.log('✅ Removed from watchlist');
    
    return true;
  } catch (error) {
    console.log('❌ Watchlist operations failed');
    return false;
  }
};

const testWatchHistoryOperations = async () => {
  console.log('\n📺 Testing Watch History Operations...');
  
  try {
    // Test movie data
    const testMovie = {
      tmdbId: 13,
      type: 'movie',
      contentData: {
        title: 'Forrest Gump',
        name: 'Forrest Gump',
        overview: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.',
        posterPath: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
        backdropPath: '/yE5d3BUhE8hCnkMUJOoBrQDotDZ.jpg',
        releaseDate: '1994-06-23',
        rating: 8.8,
        genres: ['Drama', 'Romance'],
        runtime: 142
      }
    };

    // Update watch history with different progress values
    console.log('Updating watch history...');
    await makeAuthRequest('POST', '/user/watch-history', { ...testMovie, progress: 25 });
    console.log('✅ Progress updated to 25%');
    
    await makeAuthRequest('POST', '/user/watch-history', { ...testMovie, progress: 75 });
    console.log('✅ Progress updated to 75%');
    
    // Get watch history
    console.log('Fetching watch history...');
    const historyResponse = await makeAuthRequest('GET', '/user/watch-history');
    console.log('✅ Watch history retrieved:', historyResponse.data.count, 'items');
    
    // Get watch stats
    console.log('Fetching watch statistics...');
    const statsResponse = await makeAuthRequest('GET', '/user/watch-stats');
    console.log('✅ Watch stats retrieved:', {
      totalWatched: statsResponse.data.totalWatched,
      totalWatchlist: statsResponse.data.totalWatchlist,
      averageRating: statsResponse.data.averageRating
    });
    
    return true;
  } catch (error) {
    console.log('❌ Watch history operations failed');
    return false;
  }
};

const testContentModel = async () => {
  console.log('\n🎬 Testing Content Model...');
  
  try {
    // Test TV show data
    const testTVShow = {
      tmdbId: 1399,
      type: 'tv',
      contentData: {
        title: 'Game of Thrones',
        name: 'Game of Thrones',
        overview: 'Seven noble families fight for control of the mythical land of Westeros.',
        posterPath: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
        backdropPath: '/jBJWaqoSCiARW26VzXsSQfnMowa.jpg',
        firstAirDate: '2011-04-17',
        rating: 9.3,
        genres: ['Drama', 'Action & Adventure', 'Sci-Fi & Fantasy'],
        numberOfSeasons: 8,
        numberOfEpisodes: 73
      }
    };

    // Add to watchlist to test content creation
    console.log('Adding TV show to watchlist...');
    const addResponse = await makeAuthRequest('POST', '/user/watchlist', testTVShow);
    console.log('✅ TV show added to watchlist:', addResponse.data.title);
    
    // Remove it
    const contentId = addResponse.data.contentId;
    await makeAuthRequest('DELETE', `/user/watchlist/${contentId}`);
    console.log('✅ TV show removed from watchlist');
    
    return true;
  } catch (error) {
    console.log('❌ Content model test failed');
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Watch History and Wishlist Tests...\n');
  
  try {
    // Test authentication first
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }
    
    // Run all tests
    const results = await Promise.all([
      testWatchlistOperations(),
      testWatchHistoryOperations(),
      testContentModel()
    ]);
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('Authentication:', authSuccess ? '✅ PASS' : '❌ FAIL');
    console.log('Watchlist Operations:', results[0] ? '✅ PASS' : '❌ FAIL');
    console.log('Watch History Operations:', results[1] ? '✅ PASS' : '❌ FAIL');
    console.log('Content Model:', results[2] ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = results.every(result => result);
    if (allPassed) {
      console.log('\n🎉 All tests passed! Watch history and wishlist functionality is working correctly.');
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
  testAuthentication,
  testWatchlistOperations,
  testWatchHistoryOperations,
  testContentModel
};
