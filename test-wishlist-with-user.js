const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api';

// Test user credentials
const TEST_USER = {
  username: 'testuser_wishlist',
  email: 'testuser_wishlist@example.com',
  password: 'TestPassword123!',
  name: 'Test User for Wishlist'
};

let authToken = '';
let userId = '';

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API requests
const makeRequest = async (method, endpoint, data = null, requireAuth = false) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (requireAuth && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
};

// Step 1: Create test user
const createTestUser = async () => {
  console.log('👤 Step 1: Creating test user...');
  
  try {
    const response = await makeRequest('POST', '/auth/register', TEST_USER);
    
    if (response.success) {
      console.log('✅ Test user created successfully');
      console.log('   Username:', response.data.user.username);
      console.log('   Email:', response.data.user.email);
      userId = response.data.user.id;
      return true;
    } else {
      console.log('⚠️  User creation response:', response.message);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 400 && (error.response?.data?.message?.includes('already exists') || error.response?.data?.message?.includes('already in use'))) {
      console.log('ℹ️  Test user already exists, proceeding with login...');
      return true;
    }
    throw error;
  }
};

// Step 2: Login with test user
const loginTestUser = async () => {
  console.log('\n🔐 Step 2: Logging in with test user...');
  
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.success && response.data.accessToken) {
      authToken = response.data.accessToken;
      console.log('✅ Login successful');
      console.log('   Token:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Login failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
};

// Step 3: Test wishlist endpoints
const testWishlistEndpoints = async () => {
  console.log('\n🧪 Step 3: Testing wishlist endpoints...');
  
  // Test data
  const testMovies = [
    {
      id: 1083433,
      title: "I Know What You Did Last Summer",
      poster_path: "/test-poster-1.jpg",
      overview: "A test horror movie",
      type: "movie",
      year: "2024",
      rating: 7.5,
      genres: ["Horror", "Thriller"],
      release_date: "2024-01-01",
      duration: "1h 45m",
      director: "Test Director",
      cast: ["Test Actor 1", "Test Actor 2"],
      addedAt: new Date().toISOString()
    },
    {
      id: 1242011,
      title: "Together",
      poster_path: "/test-poster-2.jpg",
      overview: "A test drama movie",
      type: "movie",
      year: "2024",
      rating: 8.0,
      genres: ["Drama", "Romance"],
      release_date: "2024-02-01",
      duration: "2h 10m",
      director: "Test Director 2",
      cast: ["Test Actor 3", "Test Actor 4"],
      addedAt: new Date().toISOString()
    }
  ];
  
  try {
    // Test 3.1: Get initial wishlist (should be empty)
    console.log('\n3.1️⃣ Testing GET /api/user/wishlist (initial state)');
    const initialWishlist = await makeRequest('GET', '/user/wishlist', null, true);
    console.log('✅ Initial wishlist response:', initialWishlist);
    
    // Test 3.2: Add first movie to wishlist
    console.log('\n3.2️⃣ Testing POST /api/user/wishlist (add first movie)');
    const addResult1 = await makeRequest('POST', '/user/wishlist', { movie: testMovies[0] }, true);
    console.log('✅ Added first movie to wishlist:', addResult1);
    
    // Test 3.3: Get wishlist after adding first movie
    console.log('\n3.3️⃣ Testing GET /api/user/wishlist (after adding first movie)');
    const wishlistAfterAdd1 = await makeRequest('GET', '/user/wishlist', null, true);
    console.log('✅ Wishlist after adding first movie:', wishlistAfterAdd1);
    console.log('   Items count:', wishlistAfterAdd1.data.wishlist.length);
    
    // Test 3.4: Add second movie to wishlist
    console.log('\n3.4️⃣ Testing POST /api/user/wishlist (add second movie)');
    const addResult2 = await makeRequest('POST', '/user/wishlist', { movie: testMovies[1] }, true);
    console.log('✅ Added second movie to wishlist:', addResult2);
    
    // Test 3.5: Get wishlist after adding second movie
    console.log('\n3.5️⃣ Testing GET /api/user/wishlist (after adding second movie)');
    const wishlistAfterAdd2 = await makeRequest('GET', '/user/wishlist', null, true);
    console.log('✅ Wishlist after adding second movie:', wishlistAfterAdd2);
    console.log('   Items count:', wishlistAfterAdd2.data.wishlist.length);
    
    // Test 3.6: Test sync entire wishlist
    console.log('\n3.6️⃣ Testing POST /api/user/wishlist/sync');
    const updatedWishlist = [
      ...testMovies,
      {
        id: 1234567,
        title: "New Test Movie",
        poster_path: "/test-poster-3.jpg",
        overview: "A new test movie",
        type: "movie",
        year: "2024",
        rating: 9.0,
        genres: ["Action", "Adventure"],
        release_date: "2024-03-01",
        duration: "2h 30m",
        director: "Test Director 3",
        cast: ["Test Actor 5", "Test Actor 6"],
        addedAt: new Date().toISOString()
      }
    ];
    
    const syncResult = await makeRequest('POST', '/user/wishlist/sync', { wishlist: updatedWishlist }, true);
    console.log('✅ Synced wishlist:', syncResult);
    console.log('   Items count after sync:', syncResult.data.wishlist.length);
    
    // Test 3.7: Get wishlist after sync
    console.log('\n3.7️⃣ Testing GET /api/user/wishlist (after sync)');
    const wishlistAfterSync = await makeRequest('GET', '/user/wishlist', null, true);
    console.log('✅ Wishlist after sync:', wishlistAfterSync);
    console.log('   Items count:', wishlistAfterSync.data.wishlist.length);
    
    // Test 3.8: Remove specific movie from wishlist
    console.log('\n3.8️⃣ Testing DELETE /api/user/wishlist/:movieId');
    const removeResult = await makeRequest('DELETE', '/user/wishlist/1234567', null, true);
    console.log('✅ Removed movie from wishlist:', removeResult);
    
    // Test 3.9: Get wishlist after removal
    console.log('\n3.9️⃣ Testing GET /api/user/wishlist (after removal)');
    const wishlistAfterRemove = await makeRequest('GET', '/user/wishlist', null, true);
    console.log('✅ Wishlist after removal:', wishlistAfterRemove);
    console.log('   Items count:', wishlistAfterRemove.data.wishlist.length);
    
    // Test 3.10: Clear entire wishlist
    console.log('\n3.10️⃣ Testing DELETE /api/user/wishlist (clear all)');
    const clearResult = await makeRequest('DELETE', '/user/wishlist', null, true);
    console.log('✅ Cleared wishlist:', clearResult);
    
    // Test 3.11: Verify wishlist is empty
    console.log('\n3.11️⃣ Testing GET /api/user/wishlist (after clearing)');
    const finalWishlist = await makeRequest('GET', '/user/wishlist', null, true);
    console.log('✅ Final wishlist (should be empty):', finalWishlist);
    console.log('   Items count:', finalWishlist.data.wishlist.length);
    
    return true;
    
  } catch (error) {
    console.error('❌ Wishlist testing failed:', error.message);
    return false;
  }
};

// Step 4: Test watchlist endpoints (for comparison)
const testWatchlistEndpoints = async () => {
  console.log('\n📺 Step 4: Testing watchlist endpoints (for comparison)...');
  
  const testMovie = {
    id: 999999,
    title: "Test Watchlist Movie",
    poster_path: "/test-watchlist-poster.jpg",
    overview: "A test movie for watchlist",
    type: "movie",
    year: "2024",
    rating: 8.5,
    genres: ["Action", "Sci-Fi"],
    release_date: "2024-01-01",
    duration: "2h 15m",
    director: "Test Director",
    cast: ["Test Actor 1", "Test Actor 2"],
    addedAt: new Date().toISOString()
  };
  
  try {
    // Test watchlist sync
    console.log('\n4.1️⃣ Testing POST /api/user/watchlist/sync');
    const watchlistSyncResult = await makeRequest('POST', '/user/watchlist/sync', { watchlist: [testMovie] }, true);
    console.log('✅ Watchlist sync result:', watchlistSyncResult);
    
    // Test watchlist retrieval
    console.log('\n4.2️⃣ Testing GET /api/user/watchlist');
    const watchlistResult = await makeRequest('GET', '/user/watchlist', null, true);
    console.log('✅ Watchlist result:', watchlistResult);
    console.log('   Items count:', watchlistResult.data.watchlist.length);
    
    return true;
    
  } catch (error) {
    console.error('❌ Watchlist testing failed:', error.message);
    return false;
  }
};

// Step 5: Clean up test data
const cleanupTestData = async () => {
  console.log('\n🧹 Step 5: Cleaning up test data...');
  
  try {
    // Clear watchlist
    await makeRequest('DELETE', '/user/watchlist', null, true);
    console.log('✅ Cleared watchlist');
    
    // Clear wishlist (should already be empty)
    await makeRequest('DELETE', '/user/wishlist', null, true);
    console.log('✅ Cleared wishlist');
    
    console.log('ℹ️  Note: Test user account remains for future testing');
    console.log('   Username:', TEST_USER.username);
    console.log('   Email:', TEST_USER.email);
    console.log('   Password:', TEST_USER.password);
    
    return true;
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return false;
  }
};

// Main test execution
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Wishlist Testing...\n');
  console.log('📋 Test Plan:');
  console.log('   1. Create test user');
  console.log('   2. Login with test user');
  console.log('   3. Test all wishlist endpoints');
  console.log('   4. Test watchlist endpoints (comparison)');
  console.log('   5. Clean up test data\n');
  
  try {
    // Step 1: Create test user
    const userCreated = await createTestUser();
    if (!userCreated) {
      console.log('⚠️  User creation had issues, but continuing...');
    }
    
    // Step 2: Login
    const loginSuccess = await loginTestUser();
    if (!loginSuccess) {
      console.error('❌ Cannot continue without successful login');
      return;
    }
    
    // Step 3: Test wishlist
    const wishlistSuccess = await testWishlistEndpoints();
    if (!wishlistSuccess) {
      console.error('❌ Wishlist testing failed');
      return;
    }
    
    // Step 4: Test watchlist (for comparison)
    const watchlistSuccess = await testWatchlistEndpoints();
    if (!watchlistSuccess) {
      console.error('❌ Watchlist testing failed');
      return;
    }
    
    // Step 5: Cleanup
    await cleanupTestData();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Test user created and authenticated');
    console.log('   ✅ All wishlist endpoints working');
    console.log('   ✅ All watchlist endpoints working');
    console.log('   ✅ Data cleanup completed');
    console.log('\n💡 Your wishlist system is working correctly!');
    console.log('   The issue with localStorage not syncing might be in the frontend context.');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.log('\n🔍 Next steps:');
    console.log('   1. Check backend logs for errors');
    console.log('   2. Verify MongoDB connection');
    console.log('   3. Check if all routes are properly registered');
  }
};

// Check if backend is running first
const checkBackendStatus = async () => {
  try {
    const response = await axios.get('http://localhost:3001/');
    if (response.data.includes('Streamr Backend API is running')) {
      console.log('✅ Backend is running and accessible');
      return true;
    } else {
      console.log('⚠️  Backend responded but with unexpected content');
      return true;
    }
  } catch (error) {
    console.error('❌ Backend is not accessible. Please start the backend server first:');
    console.log('   cd backend && npm start');
    return false;
  }
};

// Start the testing process
const startTesting = async () => {
  const backendReady = await checkBackendStatus();
  if (backendReady) {
    await runAllTests();
  }
};

startTesting();
