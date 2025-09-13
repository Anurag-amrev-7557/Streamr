// COMPREHENSIVE WATCHLIST FIX TEST (LOCAL BACKEND)
// Run this in your browser console AFTER switching to local backend
// This will test the complete watchlist fix we implemented

console.log('🧪 TESTING WATCHLIST FIX WITH LOCAL BACKEND...\n');

// Step 1: Verify backend mode
console.log('🔍 STEP 1: VERIFY BACKEND MODE');
if (window.getCurrentBackendMode && window.getCurrentBackendMode() === 'local') {
  console.log('✅ Using local backend (localhost:3001)');
  console.log('API URL:', window.getApiUrl?.());
} else {
  console.log('❌ NOT using local backend!');
  console.log('Current mode:', window.getCurrentBackendMode?.());
  console.log('Please run the switch-to-local-backend.js script first');
  return;
}

// Step 2: Check if watchlist context is available
console.log('\n🔍 STEP 2: VERIFY WATCHLIST CONTEXT');
if (typeof window !== 'undefined' && window.watchlistContext) {
  console.log('✅ Watchlist context is available');
  const context = window.watchlistContext;
  
  // Step 3: Check authentication
  console.log('\n🔍 STEP 3: VERIFY AUTHENTICATION');
  const token = localStorage.getItem('accessToken');
  if (token) {
    console.log('✅ Access token found');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ No access token found');
    console.log('You need to be logged in to test watchlist functionality');
    console.log('Please log in first and then run this test again');
    return;
  }
  
  // Step 4: Check current watchlist state
  console.log('\n🔍 STEP 4: CHECK CURRENT WATCHLIST STATE');
  context.logWatchlistState();
  
  // Step 5: Test adding a movie
  console.log('\n🎬 STEP 5: TEST ADDING MOVIE TO WATCHLIST');
  const testMovie = {
    id: 999999,
    title: 'Test Movie for Local Backend Fix',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    overview: 'This is a test movie to verify the watchlist fix works with local backend',
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
  context.addToWatchlist(testMovie);
  
  // Wait and check state after addition
  setTimeout(() => {
    console.log('\n📊 STATE AFTER ADDITION:');
    context.logWatchlistState();
    
    // Step 6: Test adding another movie
    console.log('\n🎬 STEP 6: TEST ADDING SECOND MOVIE');
    const testMovie2 = {
      id: 999998,
      title: 'Second Test Movie for Local Backend',
      poster_path: '/test-poster-2.jpg',
      backdrop_path: '/test-backdrop-2.jpg',
      overview: 'This is a second test movie',
      type: 'movie',
      year: '2024',
      rating: 7.8,
      genres: ['Comedy', 'Romance'],
      release_date: '2024-02-01',
      duration: '1h 45m',
      director: 'Second Test Director',
      cast: ['Second Actor 1', 'Second Actor 2'],
      addedAt: new Date().toISOString()
    };
    
    context.addToWatchlist(testMovie2);
    
    // Wait and check state after second addition
    setTimeout(() => {
      console.log('\n📊 STATE AFTER SECOND ADDITION:');
      context.logWatchlistState();
      
      // Step 7: Test backend sync
      console.log('\n🔄 STEP 7: TESTING BACKEND SYNC');
      context.syncWithBackend()
        .then(result => {
          console.log('✅ Manual sync result:', result);
          
          // Step 8: Test removing a movie
          console.log('\n🗑️ STEP 8: TESTING MOVIE REMOVAL');
          context.removeFromWatchlist(999998);
          
          // Wait and check state after removal
          setTimeout(() => {
            console.log('\n📊 STATE AFTER REMOVAL:');
            context.logWatchlistState();
            
            // Step 9: Test loading from backend
            console.log('\n📥 STEP 9: TESTING LOAD FROM BACKEND');
            context.loadFromBackend()
              .then(result => {
                console.log('✅ Load from backend result:', result);
                
                // Step 10: Final state check
                console.log('\n📊 STEP 10: FINAL STATE CHECK');
                context.logWatchlistState();
                
                console.log('\n🎉 ALL TESTS COMPLETED!');
                console.log('Check the console logs above for results.');
                
                // Step 11: Verify the fix worked
                console.log('\n🔧 STEP 11: VERIFY THE FIX WORKED');
                console.log('Expected behavior:');
                console.log('✅ Movies should appear in frontend immediately');
                console.log('✅ Backend sync should happen automatically');
                console.log('✅ Console should show detailed sync messages');
                console.log('✅ Network requests should be made to localhost:3001');
                console.log('✅ Backend should receive and store watchlist data');
                console.log('✅ Removal should work correctly');
                console.log('✅ Loading from backend should work');
                
                console.log('\n🚀 IF ALL TESTS PASS:');
                console.log('The watchlist fix is working correctly with local backend!');
                console.log('Next step: Deploy the fix to production.');
                
              })
              .catch(error => {
                console.error('❌ Load from backend failed:', error);
              });
          }, 2000);
          
        })
        .catch(error => {
          console.error('❌ Manual sync failed:', error);
        });
    }, 2000);
    
  }, 2000);
  
} else {
  console.log('❌ Watchlist context not available');
  console.log('Make sure you are on a page that uses the WatchlistContext');
  console.log('Also check if you are in development mode');
}

// Step 12: Monitor console for sync messages
console.log('\n📡 CONSOLE MONITORING:');
console.log('Watch the console for these messages:');
console.log('✅ "Added movie to watchlist: Test Movie for Local Backend Fix"');
console.log('✅ "Added movie to watchlist: Second Test Movie for Local Backend"');
console.log('✅ "Watchlist automatically synced with backend"');
console.log('✅ "Removed pending change for removal"');
console.log('✅ "Manual sync result"');
console.log('✅ "Load from backend result"');

// Step 13: Check network requests
console.log('\n🌐 NETWORK REQUEST CHECK:');
console.log('Open the Network tab in DevTools and:');
console.log('1. Look for POST requests to http://localhost:3001/api/user/watchlist/sync');
console.log('2. Check the request payload contains the movie data');
console.log('3. Verify response indicates success');
console.log('4. Look for GET requests to http://localhost:3001/api/user/watchlist');

// Step 14: Manual verification commands
console.log('\n🛠️ MANUAL VERIFICATION COMMANDS:');
console.log('1. context.logWatchlistState() - Check current state');
console.log('2. context.syncWithBackend() - Force sync to backend');
console.log('3. context.loadFromBackend() - Load from backend');
console.log('4. context.refreshFromBackend() - Refresh from backend');
console.log('5. context.debugPendingChanges() - Check pending changes');

console.log('\n🚨 IF TESTS FAIL:');
console.log('1. Check console for error messages');
console.log('2. Verify local backend is running on port 3001');
console.log('3. Check if MongoDB is connected locally');
console.log('4. Monitor network requests for failures');
console.log('5. Use debug functions to investigate further');

console.log('\n🚀 READY TO TEST THE FIX!');
console.log('This comprehensive test will verify the watchlist fix works with local backend.');
console.log('Watch the console for detailed results.');
console.log('Check the Network tab for API calls to localhost:3001.');
console.log('The fix should resolve both the data clearing and sync issues!');
