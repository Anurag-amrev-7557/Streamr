const { userAPI } = require('./frontend/src/services/api');

// Test script to verify watchlist backend sync
async function testWatchlistSync() {
  console.log('Testing watchlist backend sync...');
  
  try {
    // Test 1: Get current watchlist
    console.log('\n1. Getting current watchlist...');
    const currentResponse = await userAPI.getWatchlist();
    console.log('Current watchlist response:', currentResponse);
    
    if (currentResponse.success) {
      console.log('Current watchlist items:', currentResponse.data.watchlist?.length || 0);
    }
    
    // Test 2: Add a test movie
    console.log('\n2. Adding test movie...');
    const testMovie = {
      id: 999999,
      title: 'Test Movie for Sync',
      type: 'movie',
      poster_path: '/test-poster.jpg',
      overview: 'Test movie to verify backend sync',
      year: 2024,
      rating: 8.5,
      genres: ['Action', 'Adventure'],
      release_date: '2024-01-01',
      addedAt: new Date().toISOString()
    };
    
    const addResponse = await userAPI.syncWatchlist([testMovie]);
    console.log('Add response:', addResponse);
    
    // Test 3: Verify movie was added
    console.log('\n3. Verifying movie was added...');
    const verifyAddResponse = await userAPI.getWatchlist();
    console.log('Verify add response:', verifyAddResponse);
    
    if (verifyAddResponse.success) {
      const addedMovie = verifyAddResponse.data.watchlist?.find(m => m.id === 999999);
      console.log('Added movie found:', !!addedMovie);
    }
    
    // Test 4: Remove the test movie
    console.log('\n4. Removing test movie...');
    const removeResponse = await userAPI.syncWatchlist([]);
    console.log('Remove response:', removeResponse);
    
    // Test 5: Verify movie was removed
    console.log('\n5. Verifying movie was removed...');
    const verifyRemoveResponse = await userAPI.getWatchlist();
    console.log('Verify remove response:', verifyRemoveResponse);
    
    if (verifyRemoveResponse.success) {
      const removedMovie = verifyRemoveResponse.data.watchlist?.find(m => m.id === 999999);
      console.log('Removed movie found:', !!removedMovie);
    }
    
    console.log('\n✅ Watchlist sync test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWatchlistSync();
