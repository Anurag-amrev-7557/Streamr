// Switch to Local Backend for Testing
// Run this in your browser console to test the watchlist fix locally

console.log('🔄 SWITCHING TO LOCAL BACKEND FOR TESTING...\n');

// Check current backend mode
console.log('Current backend mode:', window.getCurrentBackendMode?.() || 'unknown');

// Switch to local backend
if (window.switchBackendMode) {
  const success = window.switchBackendMode('local');
  if (success) {
    console.log('✅ Successfully switched to local backend');
    console.log('New backend mode:', window.getCurrentBackendMode());
    console.log('API URL:', window.getApiUrl?.());
    
    console.log('\n🧪 NOW TEST THE WATCHLIST FIX:');
    console.log('1. Navigate to a movie page');
    console.log('2. Add a movie to your watchlist');
    console.log('3. Check if it appears immediately');
    console.log('4. Check console for sync messages');
    console.log('5. Verify backend sync works');
    
    console.log('\n📱 TEST COMMANDS:');
    console.log('// Check current state');
    console.log('window.watchlistContext.logWatchlistState()');
    console.log('');
    console.log('// Force sync to backend');
    console.log('window.watchlistContext.syncWithBackend()');
    console.log('');
    console.log('// Check pending changes');
    console.log('window.watchlistContext.debugPendingChanges()');
    
  } else {
    console.log('❌ Failed to switch backend mode');
  }
} else {
  console.log('❌ Backend switching functions not available');
  console.log('You may need to refresh the page or check if the API config is loaded');
}

console.log('\n🔍 IMPORTANT NOTES:');
console.log('- Local backend must be running on port 3001');
console.log('- Make sure you have MongoDB running locally');
console.log('- The watchlist fix is applied to local code');
console.log('- Test with local backend first, then deploy to production');
