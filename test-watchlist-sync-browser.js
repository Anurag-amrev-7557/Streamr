// Browser test script for watchlist sync
// Run this in the browser console after logging in

console.log('🧪 Testing Watchlist Sync in Browser...\n');

// Test 1: Check authentication state
console.log('1️⃣ Checking authentication state...');
const accessToken = localStorage.getItem('accessToken');
const user = localStorage.getItem('user');

if (accessToken) {
  console.log('✅ Access token found:', accessToken.substring(0, 20) + '...');
} else {
  console.log('❌ No access token found');
  console.log('Please log in first');
  return;
}

if (user) {
  console.log('✅ User data found:', JSON.parse(user).email || 'Unknown');
} else {
  console.log('⚠️ No user data in localStorage');
}

// Test 2: Check if WatchlistContext is available
console.log('\n2️⃣ Checking WatchlistContext availability...');
if (typeof window !== 'undefined' && window.watchlistContext) {
  console.log('✅ WatchlistContext is available');
} else {
  console.log('❌ WatchlistContext not available');
  console.log('Make sure you are on a page that uses the WatchlistContext');
  return;
}

const context = window.watchlistContext;

// Test 3: Check current watchlist state
console.log('\n3️⃣ Current watchlist state:');
console.log('Watchlist length:', context.watchlist.length);
console.log('Is syncing:', context.isSyncing);
console.log('Last backend sync:', context.lastBackendSync);
console.log('Sync error:', context.syncError);

// Test 4: Test adding a movie
console.log('\n4️⃣ Testing movie addition...');
const testMovie = {
  id: Date.now(), // Use timestamp to ensure unique ID
  title: 'Test Movie for Sync',
  poster_path: '/test-poster.jpg',
  backdrop_path: '/test-backdrop.jpg',
  overview: 'This is a test movie to verify the sync fix',
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
try {
  await context.addToWatchlist(testMovie);
  console.log('✅ Movie added successfully');
  
  // Wait a bit for state updates
  setTimeout(() => {
    console.log('\n5️⃣ State after addition:');
    console.log('Watchlist length:', context.watchlist.length);
    console.log('Is syncing:', context.isSyncing);
    console.log('Last backend sync:', context.lastBackendSync);
    console.log('Sync error:', context.syncError);
    
    // Check if the movie is in the watchlist
    const addedMovie = context.watchlist.find(m => m.id === testMovie.id);
    if (addedMovie) {
      console.log('✅ Movie found in watchlist:', addedMovie.title);
    } else {
      console.log('❌ Movie not found in watchlist');
    }
    
    // Test 6: Manual sync test
    console.log('\n6️⃣ Testing manual sync...');
    context.syncWithBackend()
      .then(result => {
        console.log('✅ Manual sync result:', result);
      })
      .catch(error => {
        console.error('❌ Manual sync failed:', error);
      });
      
  }, 1000);
  
} catch (error) {
  console.error('❌ Failed to add movie:', error);
}

// Test 7: Monitor network requests
console.log('\n7️⃣ Network monitoring:');
console.log('Open DevTools → Network tab and look for:');
console.log('- POST request to /user/watchlist/sync');
console.log('- Request payload containing the movie data');
console.log('- Response indicating success');

// Test 8: Console monitoring
console.log('\n8️⃣ Console monitoring:');
console.log('Watch the console for these messages:');
console.log('✅ "Watchlist synced to backend after addition"');
console.log('✅ "Watchlist automatically synced with backend"');

// Test 9: Manual verification commands
console.log('\n9️⃣ Manual verification commands:');
console.log('context.watchlist - Check current watchlist');
console.log('context.syncWithBackend() - Force sync to backend');
console.log('context.loadFromBackend() - Load from backend');

console.log('\n🚀 Test completed!');
console.log('Check the console and network tab for results.');
