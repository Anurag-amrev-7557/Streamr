// Comprehensive debugging script for watchlist sync issues
// Run this in the browser console to identify the exact problem

console.log('🔍 COMPREHENSIVE WATCHLIST SYNC DEBUGGING...\n');

// Test 1: Environment Check
console.log('🌍 ENVIRONMENT CHECK:');
console.log('Current URL:', window.location.href);
console.log('Is HTTPS:', window.location.protocol === 'https:');
console.log('User Agent:', navigator.userAgent);
console.log('Timestamp:', new Date().toISOString());

// Test 2: Check if watchlist context is available
if (typeof window !== 'undefined' && window.watchlistContext) {
  console.log('\n✅ Watchlist context is available');
  const context = window.watchlistContext;
  
  // Test 3: Check authentication
  console.log('\n🔐 AUTHENTICATION CHECK:');
  const token = localStorage.getItem('accessToken');
  if (token) {
    console.log('✅ Access token found');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    // Decode JWT to check expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      console.log('Token expires:', new Date(payload.exp * 1000));
      console.log('Is expired:', Date.now() > payload.exp * 1000);
    } catch (e) {
      console.log('Could not decode token payload');
    }
  } else {
    console.log('❌ No access token found - THIS IS THE PROBLEM!');
    console.log('Authentication is required for backend sync');
  }
  
  // Test 4: Check localStorage
  console.log('\n💾 LOCALSTORAGE CHECK:');
  try {
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) {
      const parsed = JSON.parse(savedWatchlist);
      console.log(`✅ localStorage has watchlist with ${parsed.length} items`);
      console.log('Sample items:', parsed.slice(0, 3).map(item => ({ id: item.id, title: item.title })));
    } else {
      console.log('❌ No watchlist found in localStorage');
    }
  } catch (error) {
    console.error('❌ Error reading localStorage:', error);
  }
  
  // Test 5: Check current context state
  console.log('\n📊 CONTEXT STATE CHECK:');
  context.logWatchlistState();
  
  // Test 6: Check if the ref is working
  console.log('\n🔗 REF CHECK:');
  if (context.currentWatchlistRef) {
    console.log('✅ currentWatchlistRef is available');
    console.log('Ref current value length:', context.currentWatchlistRef.current.length);
    console.log('Ref current value:', context.currentWatchlistRef.current);
  } else {
    console.log('❌ currentWatchlistRef is not available');
  }
  
  // Test 7: Test API connectivity
  console.log('\n🌐 API CONNECTIVITY TEST:');
  console.log('Testing if we can reach the backend...');
  
  // Test the getWatchlist endpoint
  if (context.loadFromBackend) {
    console.log('Testing loadFromBackend...');
    context.loadFromBackend()
      .then(result => {
        console.log('✅ loadFromBackend result:', result);
      })
      .catch(error => {
        console.error('❌ loadFromBackend failed:', error);
        console.error('Error details:', error.message, error.stack);
      });
  }
  
  // Test 8: Manual sync test
  console.log('\n🔄 MANUAL SYNC TEST:');
  if (context.syncWithBackend) {
    console.log('Testing syncWithBackend...');
    context.syncWithBackend()
      .then(result => {
        console.log('✅ syncWithBackend result:', result);
      })
      .catch(error => {
        console.error('❌ syncWithBackend failed:', error);
        console.error('Error details:', error.message, error.stack);
      });
  }
  
  // Test 9: Test adding a movie manually
  console.log('\n🎬 MANUAL MOVIE ADDITION TEST:');
  const testMovie = {
    id: 999999,
    title: 'Debug Test Movie',
    poster_path: '/test-poster.jpg',
    backdrop_path: '/test-backdrop.jpg',
    overview: 'This is a test movie for debugging',
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
  
  console.log('Test movie data:', testMovie);
  console.log('Adding movie to watchlist...');
  
  // Add the movie and monitor the process
  context.addToWatchlist(testMovie)
    .then(() => {
      console.log('✅ Movie added successfully');
      
      // Check the state after addition
      setTimeout(() => {
        console.log('\n📊 STATE AFTER ADDITION:');
        context.logWatchlistState();
        
        // Check if the ref was updated
        console.log('\n🔗 REF AFTER ADDITION:');
        if (context.currentWatchlistRef) {
          console.log('Ref current value length:', context.currentWatchlistRef.current.length);
          console.log('Ref current value:', context.currentWatchlistRef.current);
        }
        
        // Test backend sync again
        console.log('\n🔄 TESTING BACKEND SYNC AFTER ADDITION:');
        context.syncWithBackend()
          .then(result => {
            console.log('✅ Manual sync result after addition:', result);
          })
          .catch(error => {
            console.error('❌ Manual sync failed after addition:', error);
          });
      }, 2000);
    })
    .catch(error => {
      console.error('❌ Failed to add movie:', error);
      console.error('Error details:', error.message, error.stack);
    });
  
} else {
  console.log('❌ Watchlist context not available');
  console.log('Make sure you are on a page that uses the WatchlistContext');
  console.log('Also check if you are in development mode');
}

// Test 10: Check for console errors
console.log('\n🚨 CONSOLE ERROR CHECK:');
console.log('Look for any error messages in the console that might indicate:');
console.log('- Network failures');
console.log('- Authentication errors');
console.log('- API endpoint issues');
console.log('- CORS problems');
console.log('- JavaScript runtime errors');

// Test 11: Network request monitoring
console.log('\n📡 NETWORK REQUEST MONITORING:');
console.log('Open the Network tab in DevTools and:');
console.log('1. Add an item to your watchlist');
console.log('2. Look for POST requests to /user/watchlist/sync');
console.log('3. Check the request payload and response');
console.log('4. Look for any failed requests or errors');

// Test 12: Manual debugging commands
console.log('\n🛠️ MANUAL DEBUGGING COMMANDS:');
console.log('1. context.logWatchlistState() - Check current state');
console.log('2. context.debugPendingChanges() - Check pending changes');
console.log('3. context.forceSync() - Force sync to backend');
console.log('4. context.forceLoad() - Force load from backend');
console.log('5. context.refreshFromBackend() - Refresh from backend');
console.log('6. context.restoreFromLocalStorage() - Restore from localStorage');

// Test 13: Check API endpoints
console.log('\n🔗 API ENDPOINT CHECK:');
console.log('Verify these endpoints are accessible:');
console.log('- GET /api/user/watchlist');
console.log('- POST /api/user/watchlist/sync');
console.log('- POST /api/user/watchlist/sync/enhanced');

// Test 14: Check backend status
console.log('\n🖥️ BACKEND STATUS CHECK:');
console.log('Ensure the backend server is running and accessible');
console.log('Check for any backend error logs or crashes');

console.log('\n📋 DEBUG SUMMARY:');
console.log('- Check authentication token');
console.log('- Verify API endpoints are reachable');
console.log('- Monitor network requests in DevTools');
console.log('- Look for console errors');
console.log('- Test manual sync operations');
console.log('- Check backend server status');

console.log('\n🚀 READY TO DEBUG!');
console.log('The test movie will be added automatically.');
console.log('Watch the console for detailed debugging information.');
console.log('Check the Network tab for API calls.');
console.log('Use the manual debugging commands to investigate further.');
