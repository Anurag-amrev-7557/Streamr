const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';

// Test data
const testWatchlist = [
  {
    id: 123,
    title: 'Test Movie',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    overview: 'A test movie for testing',
    type: 'movie',
    year: '2024',
    rating: 8.5,
    genres: ['Action', 'Adventure'],
    release_date: '2024-01-01',
    duration: '2h 15m',
    director: 'Test Director',
    cast: ['Actor 1', 'Actor 2'],
    addedAt: new Date().toISOString()
  }
];

const testViewingProgress = {
  'movie_123': {
    id: 123,
    title: 'Test Movie',
    type: 'movie',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    lastWatched: new Date().toISOString(),
    progress: 75
  },
  'tv_456_1_2': {
    id: 456,
    title: 'Test TV Show',
    type: 'tv',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    lastWatched: new Date().toISOString(),
    season: 1,
    episode: 2,
    episodeTitle: 'Test Episode',
    progress: 45
  }
};

async function testEndpoints() {
  try {
    console.log('🧪 Testing Sync Endpoints...\n');

    // 1. Test authentication (you'll need to provide valid credentials)
    console.log('1. Testing authentication...');
    try {
      const authResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'testuser@example.com',
        password: 'TestPass123!'
      });
      
      if (authResponse.data.success) {
        authToken = authResponse.data.data.accessToken;
        console.log('✅ Authentication successful');
        console.log('   Token received:', authToken ? 'Yes' : 'No');
      }
    } catch (error) {
      console.log('⚠️ Authentication failed (expected if no test user exists)');
      console.log('   You can create a test user or use existing credentials');
      return;
    }

    if (!authToken) {
      console.log('❌ No auth token available. Please provide valid credentials.');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Test watchlist sync
    console.log('\n2. Testing watchlist sync...');
    try {
      const watchlistResponse = await axios.post(`${BASE_URL}/user/watchlist/sync`, {
        watchlist: testWatchlist
      }, { headers });
      
      if (watchlistResponse.data.success) {
        console.log('✅ Watchlist sync successful');
        console.log(`   Synced ${watchlistResponse.data.data.watchlist.length} items`);
      }
    } catch (error) {
      console.log('❌ Watchlist sync failed:', error.response?.data?.message || error.message);
    }

    // 3. Test viewing progress sync
    console.log('\n3. Testing viewing progress sync...');
    try {
      const progressResponse = await axios.post(`${BASE_URL}/user/viewing-progress/sync`, {
        viewingProgress: testViewingProgress
      }, { headers });
      
      if (progressResponse.data.success) {
        console.log('✅ Viewing progress sync successful');
        console.log(`   Synced ${Object.keys(progressResponse.data.data.viewingProgress).length} items`);
      }
    } catch (error) {
      console.log('❌ Viewing progress sync failed:', error.response?.data?.message || error.message);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // 4. Test getting watchlist
    console.log('\n4. Testing get watchlist...');
    try {
      const getWatchlistResponse = await axios.get(`${BASE_URL}/user/watchlist`, { headers });
      
      if (getWatchlistResponse.data.success) {
        console.log('✅ Get watchlist successful');
        console.log(`   Retrieved ${getWatchlistResponse.data.data.watchlist.length} items`);
      }
    } catch (error) {
      console.log('❌ Get watchlist failed:', error.response?.data?.message || error.message);
    }

    // 5. Test getting viewing progress
    console.log('\n5. Testing get viewing progress...');
    try {
      const getProgressResponse = await axios.get(`${BASE_URL}/user/viewing-progress`, { headers });
      
      if (getProgressResponse.data.success) {
        console.log('✅ Get viewing progress successful');
        console.log(`   Retrieved ${Object.keys(getProgressResponse.data.data.viewingProgress).length} items`);
      }
    } catch (error) {
      console.log('❌ Get viewing progress failed:', error.response?.data?.message || error.message);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // 6. Test adding to watchlist
    console.log('\n6. Testing add to watchlist...');
    try {
      const addResponse = await axios.post(`${BASE_URL}/user/watchlist`, {
        movieData: {
          id: 789,
          title: 'Another Test Movie',
          poster_path: '/another-poster.jpg',
          type: 'movie',
          year: '2024',
          rating: 7.8
        }
      }, { headers });
      
      if (addResponse.data.success) {
        console.log('✅ Add to watchlist successful');
      }
    } catch (error) {
      console.log('❌ Add to watchlist failed:', error.response?.data?.message || error.message);
    }

    // 7. Test removing from watchlist
    console.log('\n7. Testing remove from watchlist...');
    try {
      const removeResponse = await axios.delete(`${BASE_URL}/user/watchlist/789`, { headers });
      
      if (removeResponse.data.success) {
        console.log('✅ Remove from watchlist successful');
      }
    } catch (error) {
      console.log('❌ Remove from watchlist failed:', error.response?.data?.message || error.message);
    }

    // 8. Test updating viewing progress
    console.log('\n8. Testing update viewing progress...');
    try {
      const updateResponse = await axios.put(`${BASE_URL}/user/viewing-progress`, {
        progressData: {
          id: 123,
          title: 'Test Movie',
          type: 'movie',
          poster_path: '/test-poster.jpg',
          progress: 90
        }
      }, { headers });
      
      if (updateResponse.data.success) {
        console.log('✅ Update viewing progress successful');
      }
    } catch (error) {
      console.log('❌ Update viewing progress failed:', error.response?.data?.message || error.message);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }

    console.log('\n🎉 Sync endpoint testing completed!');
    console.log('\nNote: Some tests may fail if the backend is not running or if there are authentication issues.');
    console.log('Make sure to:');
    console.log('1. Start the backend server');
    console.log('2. Create a test user or use existing credentials');
    console.log('3. Update the test credentials in this script');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testEndpoints();
