// SIMPLE FRONTEND WATCHLIST TEST
// Run this in your browser console to test the watchlist functionality

console.log('🧪 TESTING FRONTEND WATCHLIST FUNCTIONALITY...\n');

// Step 1: Check backend configuration
console.log('🔍 STEP 1: CHECK BACKEND CONFIGURATION');
if (window.getCurrentBackendMode) {
  const mode = window.getCurrentBackendMode();
  console.log('Backend mode:', mode);
  
  if (mode === 'local') {
    console.log('✅ Using local backend (localhost:3001)');
    console.log('API URL:', window.getApiUrl?.());
  } else {
    console.log('❌ NOT using local backend!');
    console.log('Current mode:', mode);
    console.log('Please change mode to "local" in frontend/src/config/api.js');
    return;
  }
} else {
  console.log('❌ Backend mode functions not available');
  console.log('Check if the API config is loaded');
  return;
}

// Step 2: Check watchlist context
console.log('\n🔍 STEP 2: CHECK WATCHLIST CONTEXT');
if (typeof window !== 'undefined' && window.watchlistContext) {
  console.log('✅ Watchlist context is available');
  const context = window.watchlistContext;
  
  // Step 3: Check authentication
  console.log('\n🔍 STEP 3: CHECK AUTHENTICATION');
  const token = localStorage.getItem('accessToken');
  if (token) {
    console.log('✅ Access token found');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ No access token found');
    console.log('Please log in to your Streamr account first');
    return;
  }
  
  // Step 4: Check current watchlist state
  console.log('\n🔍 STEP 4: CHECK CURRENT WATCHLIST STATE');
  if (context.logWatchlistState) {
    context.logWatchlistState();
  } else {
    console.log('❌ logWatchlistState function not available');
    console.log('Available functions:', Object.keys(context));
  }
  
  // Step 5: Test adding a movie
  console.log('\n🎬 STEP 5: TEST ADDING MOVIE TO WATCHLIST');
  const testMovie = {
    id: 999999,
    title: 'Test Movie for Frontend Test',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    overview: 'This is a test movie to verify the watchlist fix works',
    type: 'movie',
    year: '2024',
    rating: 8.5,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    release_date: '2024-01-01',
    duration: '2h 15m',
    director: 'Test Director',
    cast: ['Test Actor 1', 'Test Actor 2', 'Test Actor 3'],
    addedAt: new Date().toISOString()
  };
  
  console.log('Test movie data:', testMovie);
  console.log('Adding movie to watchlist...');
  
  // Add the movie
  if (context.addToWatchlist) {
    context.addToWatchlist(testMovie);
    console.log('✅ addToWatchlist function called');
    
    // Wait and check state after addition
    setTimeout(() => {
      console.log('\n📊 STATE AFTER ADDITION:');
      if (context.logWatchlistState) {
        context.logWatchlistState();
      }
      
      console.log('\n🎉 TEST COMPLETED!');
      console.log('Check the console logs above for results.');
      console.log('Expected behavior:');
      console.log('✅ Movie should appear in frontend immediately');
      console.log('✅ Console should show sync messages');
      console.log('✅ Network requests should be made to localhost:3001');
      
      console.log('\n📱 MANUAL TESTING:');
      console.log('1. Navigate to a movie page in your app');
      console.log('2. Click "Add to Watchlist" button');
      console.log('3. Check if the movie appears in your watchlist');
      console.log('4. Check console for sync messages');
      console.log('5. Check Network tab for API calls to localhost:3001');
      
    }, 3000);
    
  } else {
    console.log('❌ addToWatchlist function not available');
    console.log('Available functions:', Object.keys(context));
  }
  
} else {
  console.log('❌ Watchlist context not available');
  console.log('Make sure you are on a page that uses the WatchlistContext');
  console.log('Also check if you are in development mode');
}

console.log('\n📋 TEST SUMMARY:');
console.log('- Backend mode should be "local"');
console.log('- API URL should be "http://localhost:3001/api"');
console.log('- Watchlist context should be available');
console.log('- Authentication token should be present');
console.log('- addToWatchlist function should work');
console.log('- Movies should sync to local backend');

console.log('\n🚀 READY TO TEST!');
console.log('This test will verify the basic watchlist functionality.');
console.log('After the test, try manually adding movies in your app UI.');
console.log('The fix should now work correctly with the local backend!');
