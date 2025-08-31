// Test script to verify watchlist protection mechanisms
// Run this in the browser console to test the safeguards

console.log('🧪 Testing Watchlist Protection Mechanisms...\n');

// Test 1: Check if watchlist context is available
if (typeof window !== 'undefined' && window.React) {
  console.log('✅ React is available');
} else {
  console.log('❌ React not available');
}

// Test 2: Check if watchlist context is available
if (typeof window !== 'undefined' && window.watchlistContext) {
  console.log('✅ Watchlist context is available');
  const context = window.watchlistContext;
  
  // Test the protection functions
  console.log('\n🔍 Testing protection functions...');
  
  // Test logWatchlistState
  if (context.logWatchlistState) {
    console.log('✅ logWatchlistState function available');
    context.logWatchlistState();
  } else {
    console.log('❌ logWatchlistState function not available');
  }
  
  // Test restoreFromLocalStorage
  if (context.restoreFromLocalStorage) {
    console.log('✅ restoreFromLocalStorage function available');
  } else {
    console.log('❌ restoreFromLocalStorage function not available');
  }
  
  // Test debugPendingChanges
  if (context.debugPendingChanges) {
    console.log('✅ debugPendingChanges function available');
    context.debugPendingChanges();
  } else {
    console.log('❌ debugPendingChanges function not available');
  }
  
} else {
  console.log('❌ Watchlist context not available');
  console.log('Make sure you are on a page that uses the WatchlistContext');
}

// Test 3: Check localStorage
console.log('\n💾 Checking localStorage...');
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

// Test 4: Check if we can access the context through React DevTools
console.log('\n🔧 React DevTools Access...');
console.log('To access the watchlist context in React DevTools:');
console.log('1. Open React DevTools');
console.log('2. Find the WatchlistProvider component');
console.log('3. Check the context value and state');

// Test 5: Manual context access (if available)
if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools hook available');
} else {
  console.log('❌ React DevTools hook not available');
}

console.log('\n📋 Test Summary:');
console.log('- Check the console for any error messages');
console.log('- Look for the watchlist state debug output');
console.log('- Verify that localStorage contains your watchlist data');
console.log('- Test adding/removing items to see if the protection works');

console.log('\n🚀 To test the protection:');
console.log('1. Add some items to your watchlist');
console.log('2. Check the console logs to see the protection in action');
console.log('3. If items get cleared, use restoreFromLocalStorage() to restore them');
console.log('4. Use logWatchlistState() to debug the current state');
