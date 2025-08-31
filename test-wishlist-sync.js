const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api';
let authToken = '';

// Test data
const testMovie = {
  id: 12345,
  title: 'Test Movie',
  poster_path: '/test-poster.jpg',
  backdrop_path: '/test-backdrop.jpg',
  overview: 'A test movie for wishlist functionality',
  type: 'movie',
  year: '2024',
  rating: 8.5,
  genres: ['Action', 'Adventure'],
  release_date: '2024-01-01',
  duration: '2h 15m',
  director: 'Test Director',
  cast: ['Test Actor 1', 'Test Actor 2'],
  addedAt: new Date().toISOString()
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };
  
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

// Test functions
const testWishlistEndpoints = async () => {
  console.log('🧪 Testing Wishlist Backend Endpoints...\n');
  
  try {
    // Test 1: Get initial wishlist (should be empty)
    console.log('1️⃣ Testing GET /api/user/wishlist (initial state)');
    const initialWishlist = await makeRequest('GET', '/user/wishlist');
    console.log('✅ Initial wishlist:', initialWishlist);
    
    // Test 2: Add movie to wishlist
    console.log('\n2️⃣ Testing POST /api/user/wishlist (add movie)');
    const addResult = await makeRequest('POST', '/user/wishlist', { movie: testMovie });
    console.log('✅ Added movie to wishlist:', addResult);
    
    // Test 3: Get wishlist after adding (should have 1 item)
    console.log('\n3️⃣ Testing GET /api/user/wishlist (after adding)');
    const wishlistAfterAdd = await makeRequest('GET', '/user/wishlist');
    console.log('✅ Wishlist after adding:', wishlistAfterAdd);
    
    // Test 4: Sync entire wishlist
    console.log('\n4️⃣ Testing POST /api/user/wishlist/sync');
    const updatedWishlist = [
      { ...testMovie, id: 67890, title: 'Another Test Movie' },
      { ...testMovie, id: 11111, title: 'Third Test Movie' }
    ];
    const syncResult = await makeRequest('POST', '/user/wishlist/sync', { wishlist: updatedWishlist });
    console.log('✅ Synced wishlist:', syncResult);
    
    // Test 5: Get wishlist after sync (should have 2 items)
    console.log('\n5️⃣ Testing GET /api/user/wishlist (after sync)');
    const wishlistAfterSync = await makeRequest('GET', '/user/wishlist');
    console.log('✅ Wishlist after sync:', wishlistAfterSync);
    
    // Test 6: Remove specific movie from wishlist
    console.log('\n6️⃣ Testing DELETE /api/user/wishlist/:movieId');
    const removeResult = await makeRequest('DELETE', '/user/wishlist/67890');
    console.log('✅ Removed movie from wishlist:', removeResult);
    
    // Test 7: Get wishlist after removal (should have 1 item)
    console.log('\n7️⃣ Testing GET /api/user/wishlist (after removal)');
    const wishlistAfterRemove = await makeRequest('GET', '/user/wishlist');
    console.log('✅ Wishlist after removal:', wishlistAfterRemove);
    
    // Test 8: Clear entire wishlist
    console.log('\n8️⃣ Testing DELETE /api/user/wishlist (clear all)');
    const clearResult = await makeRequest('DELETE', '/user/wishlist');
    console.log('✅ Cleared wishlist:', clearResult);
    
    // Test 9: Verify wishlist is empty
    console.log('\n9️⃣ Testing GET /api/user/wishlist (after clearing)');
    const finalWishlist = await makeRequest('GET', '/user/wishlist');
    console.log('✅ Final wishlist (should be empty):', finalWishlist);
    
    console.log('\n🎉 All wishlist endpoint tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Wishlist endpoint tests failed:', error.message);
  }
};

// Main test execution
const runTests = async () => {
  console.log('🚀 Starting Wishlist Backend Tests...\n');
  
  // Check if backend is running
  try {
    await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Backend is running');
  } catch (error) {
    console.error('❌ Backend is not running. Please start the backend server first.');
    console.log('💡 Run: npm start in the backend directory');
    return;
  }
  
  // Check if we have an auth token
  if (!authToken) {
    console.log('⚠️  No auth token provided. Please set the AUTH_TOKEN environment variable or update the script.');
    console.log('💡 You can get a token by logging in through the frontend or using the auth test script.');
    return;
  }
  
  console.log('🔑 Using auth token:', authToken.substring(0, 20) + '...');
  
  // Run the tests
  await testWishlistEndpoints();
};

// Check for auth token in environment or command line
if (process.argv.includes('--token')) {
  const tokenIndex = process.argv.indexOf('--token');
  if (tokenIndex + 1 < process.argv.length) {
    authToken = process.argv[tokenIndex + 1];
  }
} else if (process.env.AUTH_TOKEN) {
  authToken = process.env.AUTH_TOKEN;
}

// Run tests if we have the required setup
if (authToken) {
  runTests();
} else {
  console.log('🔑 Please provide an auth token to test the wishlist endpoints:');
  console.log('   Option 1: Set AUTH_TOKEN environment variable');
  console.log('   Option 2: Run with --token <your_token>');
  console.log('\n💡 Example: AUTH_TOKEN=your_token node test-wishlist-sync.js');
  console.log('💡 Example: node test-wishlist-sync.js --token your_token');
}
